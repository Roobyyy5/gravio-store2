import { OrderStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { calculateSalePrice } from "./pricing";

const BASE_URL = "https://developers.cjdropshipping.com/api2.0/v1";

// CJ enforces QPS = 1 (max 1 request/second) across the v2 API. A tiny
// serialized queue keeps every call (auth, catalog, orders) under that
// limit without the caller having to think about it. The interval is kept
// a bit above 1000ms as a safety margin against clock/event-loop jitter.
const MIN_INTERVAL_MS = 1200;

/** CJ's error code for "Too Many Requests, QPS limit is 1 time/1second". */
const QPS_LIMIT_CODE = 1600200;
const MAX_QPS_RETRIES = 4;
let lastRequestAt = 0;
let requestQueue: Promise<unknown> = Promise.resolve();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function throttle<T>(fn: () => Promise<T>): Promise<T> {
  const run = async (): Promise<T> => {
    const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();
    return fn();
  };

  const result = requestQueue.then(run, run);
  requestQueue = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

export class CJApiError extends Error {
  code?: number;

  constructor(message: string, code?: number) {
    super(message);
    this.name = "CJApiError";
    this.code = code;
  }
}

interface CJEnvelope<T> {
  code: number;
  result: boolean;
  message: string;
  data: T;
  requestId?: string;
}

async function cjFetch<T>(
  path: string,
  options: {
    method?: "GET" | "POST";
    params?: Record<string, string | number | undefined>;
    body?: unknown;
    auth?: boolean;
  } = {}
): Promise<T> {
  const { method = "GET", params, body, auth = true } = options;

  let url = `${BASE_URL}${path}`;
  if (params) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) query.set(key, String(value));
    }
    const qs = query.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (auth) {
    headers["CJ-Access-Token"] = await ensureAccessToken();
  }

  for (let attempt = 0; attempt <= MAX_QPS_RETRIES; attempt++) {
    const response = await throttle(() =>
      fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        cache: "no-store",
      })
    );

    let json: CJEnvelope<T>;
    try {
      json = (await response.json()) as CJEnvelope<T>;
    } catch {
      throw new CJApiError(`CJ API returned a non-JSON response for ${path} (HTTP ${response.status})`);
    }

    if (!response.ok || json.code !== 200 || json.result !== true) {
      // CJ's QPS limiter occasionally trips even when our own throttle is
      // respected (clock jitter, shared account-level limits). Back off
      // and retry instead of failing the whole sync run over a blip.
      if (json.code === QPS_LIMIT_CODE && attempt < MAX_QPS_RETRIES) {
        await sleep(MIN_INTERVAL_MS * (attempt + 2));
        continue;
      }
      throw new CJApiError(json.message ?? `CJ API request failed: ${path}`, json.code);
    }

    return json.data;
  }

  throw new CJApiError(`CJ API request failed after retries: ${path}`);
}

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------
//
// CJ's current docs recommend authenticating with a single `apiKey` in the
// format "CJUserNum@api@xxxxx" (CJ_API_KEY). Older accounts can still
// authenticate with email + password (CJ_EMAIL / CJ_PASSWORD) - both are
// sent to the same /authentication/getAccessToken endpoint.

interface CJTokenData {
  openId?: number;
  accessToken: string;
  accessTokenExpiryDate: string;
  refreshToken: string;
  refreshTokenExpiryDate: string;
  createDate?: string;
}

interface CachedToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

// Module-level cache survives within a single server process; CjAuthToken in
// the DB survives across restarts/serverless cold starts.
let cachedToken: CachedToken | null = null;

const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;

function parseCJDate(value: string | undefined, fallbackMs: number): Date {
  if (!value) return new Date(Date.now() + fallbackMs);
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? new Date(Date.now() + fallbackMs) : date;
}

async function persistToken(data: CJTokenData): Promise<string> {
  const expiresAt = parseCJDate(data.accessTokenExpiryDate, FIFTEEN_DAYS_MS);

  cachedToken = {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresAt: expiresAt.getTime(),
  };

  const existing = await prisma.cjAuthToken.findFirst();
  if (existing) {
    await prisma.cjAuthToken.update({
      where: { id: existing.id },
      data: { accessToken: data.accessToken, refreshToken: data.refreshToken, expiresAt },
    });
  } else {
    await prisma.cjAuthToken.create({
      data: { accessToken: data.accessToken, refreshToken: data.refreshToken, expiresAt },
    });
  }

  return data.accessToken;
}

async function login(): Promise<string> {
  const apiKey = process.env.CJ_API_KEY;
  const email = process.env.CJ_EMAIL;
  const password = process.env.CJ_PASSWORD;

  let body: Record<string, string>;
  if (apiKey) {
    body = { apiKey };
  } else if (email && password) {
    body = { email, password };
  } else {
    throw new CJApiError(
      "Set CJ_API_KEY (recommended, format CJUserNum@api@xxxx) or CJ_EMAIL + CJ_PASSWORD"
    );
  }

  const data = await cjFetch<CJTokenData>("/authentication/getAccessToken", {
    method: "POST",
    auth: false,
    body,
  });

  return persistToken(data);
}

/**
 * Forces a token refresh. Called every 6h by the sync cron and safe to call
 * on demand. Falls back to a full login if the refresh token is missing or
 * has been rejected by CJ.
 */
export async function refreshAccessToken(): Promise<string> {
  const refreshToken =
    cachedToken?.refreshToken ?? (await prisma.cjAuthToken.findFirst())?.refreshToken ?? undefined;

  if (refreshToken) {
    try {
      const data = await cjFetch<CJTokenData>("/authentication/refreshAccessToken", {
        method: "POST",
        auth: false,
        body: { refreshToken },
      });
      return persistToken(data);
    } catch {
      // Refresh token expired/invalid - fall back to a fresh login below.
    }
  }

  return login();
}

/** Returns a valid access token, logging in or restoring from the DB as needed. */
async function ensureAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.accessToken;
  }

  const stored = await prisma.cjAuthToken.findFirst({ orderBy: { updatedAt: "desc" } });
  if (stored && stored.expiresAt.getTime() > Date.now() + 60_000) {
    cachedToken = {
      accessToken: stored.accessToken,
      refreshToken: stored.refreshToken ?? undefined,
      expiresAt: stored.expiresAt.getTime(),
    };
    return cachedToken.accessToken;
  }

  if (stored?.refreshToken) {
    cachedToken = {
      accessToken: stored.accessToken,
      refreshToken: stored.refreshToken,
      expiresAt: stored.expiresAt.getTime(),
    };
    return refreshAccessToken();
  }

  return login();
}

// ---------------------------------------------------------------------------
// Product catalog
// ---------------------------------------------------------------------------

export interface CJProductListItem {
  pid: string;
  productName: string;
  productNameEn?: string;
  productSku?: string;
  productImage?: string;
  sellPrice?: string | number;
  categoryId?: string;
  categoryName?: string;
  listedNum?: number;
  isFreeShipping?: boolean;
  saleStatus?: number;
}

export interface CJProductListData {
  pageNum: number;
  pageSize: number;
  total: number;
  list: CJProductListItem[];
}

export async function getProductList(params: {
  pageNum?: number;
  pageSize?: number;
  categoryId?: string;
  productName?: string;
}): Promise<CJProductListData> {
  return cjFetch<CJProductListData>("/product/list", {
    method: "GET",
    params: {
      pageNum: params.pageNum ?? 1,
      pageSize: params.pageSize ?? 50,
      categoryId: params.categoryId,
      productName: params.productName,
    },
  });
}

/** Per-warehouse inventory for a variant, as returned by /product/query. */
export interface CJVariantInventory {
  countryCode?: string;
  totalInventory?: number;
  cjInventory?: number;
  factoryInventory?: number;
  verifiedWarehouse?: number;
}

export interface CJVariant {
  vid: string;
  pid?: string;
  variantSku: string;
  variantNameEn?: string;
  /** e.g. "Color:Red;Size:M" */
  variantKey?: string;
  variantSellPrice?: string | number;
  variantWeight?: string | number;
  variantLength?: number;
  variantWidth?: number;
  variantHeight?: number;
  variantVolume?: number;
  inventories?: CJVariantInventory[];
}

export interface CJProductDetail {
  pid: string;
  productNameEn?: string;
  productSku?: string;
  productImageSet?: string[];
  productWeight?: string | number;
  categoryId?: string;
  categoryName?: string;
  description?: string;
  variants: CJVariant[];
}

export async function getProductDetail(productId: string): Promise<CJProductDetail> {
  return cjFetch<CJProductDetail>("/product/query", {
    method: "GET",
    params: { pid: productId },
  });
}

/** Sums a variant's per-warehouse inventory into a single stock number. */
export function sumVariantInventory(variant: Pick<CJVariant, "inventories">): number {
  return (variant.inventories ?? []).reduce((total, inv) => total + (inv.totalInventory ?? 0), 0);
}

// ---------------------------------------------------------------------------
// Stock lookup (inventory only - CJ does not return price on this endpoint)
// ---------------------------------------------------------------------------

export interface CJStockInfo {
  vid: string;
  quantity: number;
}

interface CJStockAreaRaw {
  vid?: string;
  areaId?: number;
  areaEn?: string;
  countryCode?: string;
  totalInventoryNum?: number;
  cjInventoryNum?: number;
  factoryInventoryNum?: number;
}

/**
 * Real-time inventory lookup for a single CJ variant id, summed across all
 * warehouses. Does NOT return price - use getProductDetail for that.
 */
export async function getVariantStock(vid: string): Promise<CJStockInfo> {
  const data = await cjFetch<CJStockAreaRaw[]>("/product/stock/queryByVid", {
    method: "GET",
    params: { vid },
  });

  const areas = Array.isArray(data) ? data : [data];
  const quantity = areas.reduce((total, area) => total + (area?.totalInventoryNum ?? 0), 0);

  return { vid, quantity };
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export interface CJCreateOrderInput {
  /** Our internal order id, echoed back by CJ as `orderNumber`. */
  orderNumber: string;
  shippingCountryCode: string;
  /** Full country name, e.g. "Ukraine" - required by createOrderV2. */
  shippingCountry: string;
  shippingProvince: string;
  shippingCity: string;
  shippingAddress: string;
  shippingAddress2?: string;
  shippingCustomerName: string;
  shippingPhone?: string;
  shippingZip?: string;
  email?: string;
  remark?: string;
  /** Two-letter shipping origin code. Defaults to CJ_FROM_COUNTRY_CODE or "CN". */
  fromCountryCode?: string;
  /** 1 = page payment, 2 = pay from CJ balance, 3 = create only (no payment). */
  payType?: number;
  logisticName?: string;
  products: Array<{ vid: string; quantity: number }>;
}

export interface CJCreateOrderResult {
  orderId: string;
  orderNumber?: string;
  cjPayUrl?: string;
  orderStatus?: string;
  orderAmount?: number | string;
  productAmount?: number | string;
  postageAmount?: number | string;
  actualPayment?: number | string;
}

export async function createOrder(input: CJCreateOrderInput): Promise<CJCreateOrderResult> {
  const { fromCountryCode, logisticName, ...rest } = input;

  return cjFetch<CJCreateOrderResult>("/shopping/order/createOrderV2", {
    method: "POST",
    body: {
      ...rest,
      fromCountryCode: fromCountryCode ?? process.env.CJ_FROM_COUNTRY_CODE ?? "CN",
      logisticName: logisticName ?? "CJPacket Ordinary",
    },
  });
}

/** orderStatus lifecycle values per CJ docs. */
export type CJOrderStatus =
  | "CREATED"
  | "IN_CART"
  | "UNPAID"
  | "UNSHIPPED"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | string;

export interface CJOrderDetail {
  orderId: string;
  orderNum?: string;
  cjOrderId?: string;
  orderStatus: CJOrderStatus;
  logisticName?: string;
  trackNumber?: string;
  trackingUrl?: string;
  orderAmount?: number | string;
  postageAmount?: number | string;
  /** Set once CJ has actually charged the order (e.g. via payType 2 balance deduction). */
  paymentDate?: string | null;
}

/** `orderId` accepts either our internal order number or CJ's own order id. */
export async function getOrderDetail(orderId: string): Promise<CJOrderDetail> {
  return cjFetch<CJOrderDetail>("/shopping/order/getOrderDetail", {
    method: "GET",
    params: { orderId },
  });
}

// ---------------------------------------------------------------------------
// Tracking
// ---------------------------------------------------------------------------

export interface CJTrackInfo {
  trackingNumber?: string;
  logisticName?: string;
  trackingFrom?: string;
  trackingTo?: string;
  deliveryDay?: string;
  deliveryTime?: string;
  trackingStatus?: string;
  lastMileCarrier?: string;
  lastTrackNumber?: string;
}

/** Looks up live tracking status for a CJ tracking number (from getOrderDetail.trackNumber). */
export async function getTrackInfo(trackNumber: string): Promise<CJTrackInfo> {
  const data = await cjFetch<CJTrackInfo[] | CJTrackInfo>("/logistic/getTrackInfo", {
    method: "GET",
    params: { trackNumber },
  });
  return Array.isArray(data) ? data[0] ?? {} : data;
}

// ---------------------------------------------------------------------------
// Mapping helpers — CJ payloads -> internal Product/Variant shapes
// ---------------------------------------------------------------------------

export interface MappedVariant {
  cjVariantId: string;
  sku: string;
  price: number;
  salePrice: number;
  stock: number;
  weight: number;
  attributes: Record<string, string>;
}

export interface MappedProduct {
  cjProductId: string;
  name: string;
  description: string;
  images: string[];
  categoryId: string;
  variants: MappedVariant[];
}

/** Parses CJ's "Color:Red;Size:M" variant key into an attributes object. */
function parseVariantAttributes(variantKey?: string): Record<string, string> {
  if (!variantKey) return {};
  return variantKey.split(";").reduce<Record<string, string>>((acc, pair) => {
    const [key, value] = pair.split(":");
    if (key && value) acc[key.trim()] = value.trim();
    return acc;
  }, {});
}

/** Maps a /product/query response into the internal Product+Variant shape. */
export function mapProductDetailToInternal(detail: CJProductDetail): MappedProduct {
  return {
    cjProductId: detail.pid,
    name: detail.productNameEn ?? detail.pid,
    description: detail.description ?? "",
    images: detail.productImageSet ?? [],
    categoryId: detail.categoryId ?? "",
    variants: (detail.variants ?? []).map((variant) => {
      const cost = Number(variant.variantSellPrice ?? 0);
      return {
        cjVariantId: variant.vid,
        sku: variant.variantSku,
        price: cost,
        salePrice: calculateSalePrice(cost),
        stock: sumVariantInventory(variant),
        weight: Number(variant.variantWeight ?? detail.productWeight ?? 0),
        attributes: parseVariantAttributes(variant.variantKey ?? variant.variantNameEn),
      };
    }),
  };
}

const CJ_STATUS_MAP: Record<string, OrderStatus> = {
  CREATED: "PROCESSING",
  IN_CART: "PROCESSING",
  UNPAID: "PROCESSING",
  UNSHIPPED: "PROCESSING",
  PROCESSING: "PROCESSING",
  SHIPPED: "SHIPPED",
  IN_TRANSIT: "SHIPPED",
  DELIVERED: "DELIVERED",
  COMPLETED: "DELIVERED",
  CANCELLED: "CANCELLED",
  CANCELED: "CANCELLED",
  CLOSED: "CANCELLED",
};

/** Maps a CJ order status string to our OrderStatus enum, or null if unrecognized. */
export function mapCJStatus(cjStatus: string | null | undefined): OrderStatus | null {
  if (!cjStatus) return null;
  return CJ_STATUS_MAP[cjStatus.toUpperCase()] ?? null;
}

// ---------------------------------------------------------------------------
// Convenience namespace used by lib/sync.ts
// ---------------------------------------------------------------------------

export const cjApi = {
  login,
  refreshAccessToken,
  getProductList,
  getProductDetail,
  getStock: getVariantStock,
  getVariantStock,
  createOrder,
  getOrderDetail,
  getTracking: getTrackInfo,
  getTrackInfo,
  mapProductDetailToInternal,
  mapCJStatus,
};

const PAYPAL_API_BASE =
  process.env.PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

export class PayPalApiError extends Error {
  details?: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = "PayPalApiError";
    this.details = details;
  }
}

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.accessToken;
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) {
    throw new PayPalApiError("Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET");
  }

  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  const json = await response.json();
  if (!response.ok) {
    throw new PayPalApiError(json.error_description ?? "PayPal auth failed", json);
  }

  cachedToken = {
    accessToken: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return cachedToken.accessToken;
}

async function paypalFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(`${PAYPAL_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new PayPalApiError(json.message ?? `PayPal API request failed: ${path}`, json);
  }
  return json as T;
}

export interface CreatePayPalOrderInput {
  /** Our internal order id - sent as reference_id so we can find the order again. */
  orderId: string;
  totalPrice: number;
  returnUrl: string;
  cancelUrl: string;
}

interface PayPalOrderLink {
  href: string;
  rel: string;
  method: string;
}

interface PayPalCreateOrderResponse {
  id: string;
  status: string;
  links: PayPalOrderLink[];
}

/** Creates a PayPal order and returns the buyer-approval URL to redirect to. */
export async function createOrder(input: CreatePayPalOrderInput): Promise<{ id: string; approveUrl: string }> {
  const result = await paypalFetch<PayPalCreateOrderResponse>("/v2/checkout/orders", {
    method: "POST",
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: input.orderId,
          amount: { currency_code: "USD", value: input.totalPrice.toFixed(2) },
        },
      ],
      application_context: {
        return_url: input.returnUrl,
        cancel_url: input.cancelUrl,
        shipping_preference: "GET_FROM_FILE",
        user_action: "PAY_NOW",
        brand_name: "Univa Store",
      },
    }),
  });

  const approveUrl = result.links.find((link) => link.rel === "approve")?.href;
  if (!approveUrl) throw new PayPalApiError("PayPal did not return an approval URL", result);

  return { id: result.id, approveUrl };
}

export interface PayPalCaptureResult {
  id: string;
  status: string;
  referenceId?: string;
  payerEmail?: string;
  payerName?: string;
  shipping?: {
    name?: string;
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
}

interface PayPalCaptureResponse {
  id: string;
  status: string;
  payer?: {
    email_address?: string;
    name?: { given_name?: string; surname?: string };
  };
  purchase_units?: Array<{
    reference_id?: string;
    shipping?: {
      name?: { full_name?: string };
      address?: {
        address_line_1?: string;
        address_line_2?: string;
        admin_area_2?: string;
        admin_area_1?: string;
        postal_code?: string;
        country_code?: string;
      };
    };
  }>;
}

/** Captures a previously-approved order, actually charging the buyer. */
export async function captureOrder(orderId: string): Promise<PayPalCaptureResult> {
  const result = await paypalFetch<PayPalCaptureResponse>(`/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
  });

  const unit = result.purchase_units?.[0];
  const address = unit?.shipping?.address;

  return {
    id: result.id,
    status: result.status,
    referenceId: unit?.reference_id,
    payerEmail: result.payer?.email_address,
    payerName: [result.payer?.name?.given_name, result.payer?.name?.surname].filter(Boolean).join(" "),
    shipping: address
      ? {
          name: unit?.shipping?.name?.full_name,
          line1: address.address_line_1,
          line2: address.address_line_2,
          city: address.admin_area_2,
          state: address.admin_area_1,
          postalCode: address.postal_code,
          country: address.country_code,
        }
      : undefined,
  };
}

export const paypalApi = { createOrder, captureOrder };

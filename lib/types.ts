/** Shape of Order.shippingAddress, captured from PayPal checkout. */
export interface ShippingAddress {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  /** ISO 3166-1 alpha-2 country code, e.g. "UA". */
  country: string;
}

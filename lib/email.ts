import { Resend } from "resend";
import { getCountryName } from "./countries";
import type { ShippingAddress } from "./types";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "orders@example.com";

interface OrderEmailItem {
  name: string;
  quantity: number;
  price: number;
}

function formatAddress(address: ShippingAddress): string {
  const lines = [
    address.line1,
    address.line2,
    [address.city, address.state].filter(Boolean).join(", ") + (address.postalCode ? ` ${address.postalCode}` : ""),
    getCountryName(address.country),
  ];

  return lines.filter(Boolean).join("<br/>");
}

/** Sent once a Stripe Checkout session for the order completes successfully. */
export async function sendOrderConfirmationEmail(params: {
  to: string;
  orderId: string;
  items: OrderEmailItem[];
  totalPrice: number;
  shippingAddress: ShippingAddress;
}) {
  if (!process.env.RESEND_API_KEY || !params.to) return;

  const itemsHtml = params.items
    .map((item) => `<li>${item.name} &times; ${item.quantity} &mdash; $${(item.price * item.quantity).toFixed(2)}</li>`)
    .join("");

  await resend.emails.send({
    from: FROM_EMAIL,
    to: params.to,
    subject: `Order confirmation #${params.orderId}`,
    html: `
      <h1>Thank you for your order!</h1>
      <p>Your order #${params.orderId} has been received and is now being processed.</p>
      <ul>${itemsHtml}</ul>
      <p><strong>Total: $${params.totalPrice.toFixed(2)}</strong></p>
      <h2>Shipping to</h2>
      <p>${formatAddress(params.shippingAddress)}</p>
    `,
  });
}

/** Sent the first time CJ provides a tracking number for an order. */
export async function sendShippingNotificationEmail(params: {
  to: string;
  orderId: string;
  trackingNumber: string;
}) {
  if (!process.env.RESEND_API_KEY || !params.to) return;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: params.to,
    subject: `Your order #${params.orderId} has shipped`,
    html: `
      <h1>Your order is on its way!</h1>
      <p>Order #${params.orderId} has shipped.</p>
      <p>Tracking number: <strong>${params.trackingNumber}</strong></p>
    `,
  });
}

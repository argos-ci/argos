/**
 * The customer page in the Stripe dashboard, where the trial, the card and the
 * invoices actually live — the questions the staff tables raise are answered
 * there.
 */
export function getStripeCustomerURL(stripeCustomerId: string) {
  return `https://dashboard.stripe.com/customers/${stripeCustomerId}`;
}

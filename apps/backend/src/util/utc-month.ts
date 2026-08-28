/**
 * The first instant of the month `offset` months from `date`, in UTC.
 *
 * Deliberately not the calendar helpers, which work in the process's own
 * timezone: Stripe timestamps every invoice in UTC, so a server running on
 * anything else would cut its months hours away from where Stripe cuts them and
 * file the invoices either side of a boundary in the wrong one.
 *
 * Here rather than beside the reader that needs it most, so the seeds can cut
 * their months the same way without the database layer importing the billing
 * one to do it.
 */
export function startOfUTCMonth(date: Date, offset: number): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1),
  );
}

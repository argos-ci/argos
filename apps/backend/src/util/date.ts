import moment from "moment";

/**
 * Get the 20 minutes slot from the input date.
 */
export function get20MinutesSlot(date: Date) {
  const result = moment(date).startOf("hour").toDate();
  const minutes = Math.floor(date.getMinutes() / 20) * 20;
  result.setMinutes(minutes);
  return result;
}

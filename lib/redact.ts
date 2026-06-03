/**
 * Remove / mask sensitive data (credit-card-like numbers) from free text
 * before it is persisted. We never store full card numbers.
 */
export function redactSensitive(input: string | null | undefined): string | null {
  if (!input) return null;

  // 13–16 digit sequences, possibly separated by spaces or dashes.
  return input.replace(/\b(?:\d[ -]?){13,16}\b/g, (match) => {
    const digits = match.replace(/\D/g, "");
    const last4 = digits.slice(-4);
    return `**** **** **** ${last4}`;
  });
}

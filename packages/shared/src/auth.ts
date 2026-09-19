/**
 * Phone-based auth without an SMS provider: Supabase's native phone identity
 * requires an SMS vendor wired up just to enable it. Instead, a phone number
 * is normalized to E.164 and mapped to a synthetic email so the existing
 * email/password auth (signUp / signInWithPassword / admin.createUser) works
 * unchanged. The real number still lives in `profiles.phone` for display.
 */

export const SYNTHETIC_PHONE_EMAIL_DOMAIN = "phone.internal";

/** Default country code applied to local Pakistani formats (03xxxxxxxxx). */
const DEFAULT_COUNTRY_CODE = "92";

export function isLikelyEmail(value: string): boolean {
  return value.includes("@");
}

/** Normalizes a Pakistani phone number to E.164, e.g. "0300-1234567" -> "+923001234567". */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (raw.trim().startsWith("+")) return `+${digits}`;
  if (digits.startsWith("0")) return `+${DEFAULT_COUNTRY_CODE}${digits.slice(1)}`;
  if (digits.startsWith(DEFAULT_COUNTRY_CODE)) return `+${digits}`;
  return `+${DEFAULT_COUNTRY_CODE}${digits}`;
}

/** Converts a normalized phone number into the synthetic email used for auth. */
export function phoneToSyntheticEmail(phone: string): string {
  const digits = normalizePhone(phone).replace("+", "");
  return `${digits}@${SYNTHETIC_PHONE_EMAIL_DOMAIN}`;
}

/**
 * Resolves a user-entered identifier (email or phone) to the email string to
 * pass to Supabase auth calls, plus the normalized phone to store in the
 * profile (if the identifier was a phone number).
 */
export function resolveAuthIdentifier(identifier: string): {
  authEmail: string;
  phone: string | null;
} {
  const trimmed = identifier.trim();
  if (isLikelyEmail(trimmed)) return { authEmail: trimmed, phone: null };
  const phone = normalizePhone(trimmed);
  return { authEmail: phoneToSyntheticEmail(phone), phone };
}

export function isSyntheticPhoneEmail(email: string): boolean {
  return email.endsWith(`@${SYNTHETIC_PHONE_EMAIL_DOMAIN}`);
}

/** Reverses a synthetic phone email back to "+92...", or returns a real email as-is. */
export function displayIdentifier(authEmail: string): string {
  if (!isSyntheticPhoneEmail(authEmail)) return authEmail;
  return `+${authEmail.split("@")[0]}`;
}

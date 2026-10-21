/** Generate a cryptographically-random 4-digit OTP string */
export function generateOtp(): string {
  // crypto.getRandomValues gives better entropy than Math.random
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(array[0] % 10_000).padStart(4, "0");
}

/** OTP expiry timestamp — 10 minutes from now */
export function otpExpiry(): Date {
  return new Date(Date.now() + 10 * 60 * 1000);
}

/** Check whether an OTP expiry date has passed */
export function isOtpExpired(expiry: Date): boolean {
  return new Date() > expiry;
}

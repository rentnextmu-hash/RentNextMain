// Booking references (CR-20260924-001) are sequential, so anyone could
// guess the next one. The confirmation page therefore also needs a key:
// an HMAC of the reference, only ever handed to the person who made the
// booking (in the create-booking response and their confirmation email).
// Stateless — nothing to store, and get-booking can verify it without a
// lookup. Signed with BOOKING_LINK_SECRET (set via `supabase secrets set`).

const encoder = new TextEncoder();

async function hmacKey(): Promise<CryptoKey> {
  const secret = Deno.env.get("BOOKING_LINK_SECRET");
  if (!secret) throw new Error("BOOKING_LINK_SECRET is not set");
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

function toBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> | null {
  try {
    const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = new Uint8Array(new ArrayBuffer(binary.length));
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

export async function signBookingReference(reference: string): Promise<string> {
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(), encoder.encode(reference));
  return toBase64Url(new Uint8Array(sig));
}

/** Constant-time check via crypto.subtle.verify. */
export async function verifyBookingKey(reference: string, key: string): Promise<boolean> {
  const sig = fromBase64Url(key);
  if (!sig) return false;
  return crypto.subtle.verify("HMAC", await hmacKey(), sig, encoder.encode(reference));
}

// Shared request/response plumbing for every Edge Function. The browser
// calls check-availability, create-booking and get-booking directly (via
// supabase.functions.invoke), so CORS has to allow the site's origin.
import type { BookingApiError } from "@/lib/validation";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function apiError(
  status: number,
  code: BookingApiError["error"]["code"],
  message: string,
  fields?: Record<string, string[]>,
): Response {
  const body: BookingApiError = { error: { code, message, ...(fields ? { fields } : {}) } };
  return json(body, status);
}

/** Wraps a handler with CORS preflight, POST-only, JSON parsing and a last-resort 500. */
export function serve(handler: (body: unknown, req: Request) => Promise<Response>) {
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return apiError(405, "invalid_request", "Use POST.");

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError(400, "invalid_request", "Request body must be JSON.");
    }

    try {
      return await handler(body, req);
    } catch (err) {
      console.error(err);
      return apiError(500, "server_error", "Something went wrong on our side. Please try again in a moment.");
    }
  });
}

// check-availability — per-category available counts for a pickup location
// and window, for the public site. Runs lib/availability.ts's
// getAvailableCategories() with the service role (the vehicles table is
// staff-only RLS) and returns only { categoryId, availableCount } pairs:
// no vehicle ids, codes or registrations ever leave this function.
import { getAvailableCategories } from "@/lib/availability";
import { availabilityRequestSchema } from "@/lib/validation";
import { createAdminClient } from "../_shared/admin.ts";
import { apiError, json, serve } from "../_shared/http.ts";

serve(async (body) => {
  const parsed = availabilityRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "invalid_request", "Choose a pickup location and valid dates.");
  }

  const { locationId, from, to } = parsed.data;
  const categories = await getAvailableCategories(createAdminClient(), locationId, from, to);
  return json({ categories });
});

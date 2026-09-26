// Client-safe helpers for the audit log (labels + detail-page links). The
// capture itself lives in the DB trigger (migration 0014); this is only how the
// admin viewer presents it.

export const AUDIT_ENTITIES = [
  "bookings",
  "vehicles",
  "vehicle_categories",
  "add_ons",
  "locations",
  "hotels",
  "settings",
  "customers",
  "payments",
] as const;

export const ENTITY_LABEL: Record<string, string> = {
  bookings: "Booking",
  vehicles: "Vehicle",
  vehicle_categories: "Category",
  add_ons: "Add-on",
  locations: "Location",
  hotels: "Hotel",
  settings: "Setting",
  customers: "Customer",
  payments: "Payment",
};

export const AUDIT_ACTIONS = ["insert", "update", "delete"] as const;

export const ACTION_LABEL: Record<string, string> = {
  insert: "Created",
  update: "Updated",
  delete: "Deleted",
};

/** The detail page for an audited row, or null when there isn't one. */
export function auditEntityHref(entity: string, entityId: string | null): string | null {
  if (!entityId) return null;
  switch (entity) {
    case "bookings":
      return `/admin/bookings/${encodeURIComponent(entityId)}`;
    case "vehicles":
      return `/admin/fleet/${entityId}`;
    case "customers":
      return `/admin/customers/${entityId}`;
    case "locations":
      return `/admin/locations/${entityId}`;
    case "hotels":
      return `/admin/hotels/${entityId}`;
    default:
      return null;
  }
}

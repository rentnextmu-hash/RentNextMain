// Literal-union types for every text-plus-CHECK-constraint column in
// supabase/migrations/0001_initial_schema.sql. The schema uses `text check
// (x in (...))` rather than native Postgres enums, so `npm run types:gen`
// can only infer these columns as plain `string` — this file is hand-
// maintained and must be kept in sync with the CHECK constraints if the
// schema changes.
export type VehicleCategoryClass = "economy" | "comfort" | "suv" | "premium";
export type Transmission = "automatic" | "manual";
export type FuelType = "petrol" | "diesel" | "hybrid" | "electric";
export type VehicleStatus = "available" | "booked" | "maintenance" | "inactive";
export type LocationType = "branch" | "airport" | "hotel" | "custom";
export type ContractStatus = "active" | "pending" | "inactive";
export type BookingStatus = "requested" | "confirmed" | "active" | "completed" | "cancelled";
export type BookingSource = "website" | "phone" | "hotel" | "walk_in";
export type AddOnPriceType = "per_day" | "per_booking";
export type PaymentMethod = "cash" | "card" | "transfer" | "online";
export type PaymentStatus = "pending" | "paid" | "refunded" | "failed";
export type StaffRole = "owner" | "manager" | "staff";

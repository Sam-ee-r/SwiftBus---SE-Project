# SwiftBus — Database Scripts

## Technology
- **Database:** PostgreSQL (hosted on Supabase)
- **Security:** Row Level Security (RLS) enabled on all tables
- **Schema:** Custom `pakistan_city` enum for type-safe city references

---

## Table Overview

| Table       | Purpose                                               |
|-------------|-------------------------------------------------------|
| `profiles`  | Extended user info (role: passenger / driver / admin) |
| `buses`     | Bus fleet registry (bus number, capacity, driver)     |
| `routes`    | City-pair routes with road distances in km            |
| `schedules` | Trips linking a bus to a route on a specific date     |
| `bookings`  | Passenger seat reservations against a schedule        |
| `notifications` | In-app alerts for passengers and drivers         |

---

## Execution Order

> **Run scripts in the numbered order below.** Each script depends on the ones before it.

### Step 1 — Core Schema (Tables, Enums, RLS)
```
20251207194451_81005a16-e64c-4672-8027-3c07178cb5d6.sql
```
- Creates the `pakistan_city` enum with all city values
- Creates all base tables: `profiles`, `buses`, `routes`, `schedules`, `bookings`, `notifications`
- Applies Row Level Security policies (passengers see only their own bookings, drivers see only assigned buses, admins see everything)

---

### Step 2 — Schema Patches (apply in order)
```
20251208120000_remove_buses_route_id.sql
20251208123000_add_schedule_seat_price.sql
20260427_add_schedule_status.sql
20260503_audit_fixes.sql
20260503_p0_fixes.sql
```
- Removes the deprecated `route_id` column from `buses` (routes are now linked via `schedules`)
- Adds `seat_price` column to `schedules`
- Adds `status` column to `schedules` (`scheduled` / `in_transit` / `completed`)
- Fixes RLS audit issues and permission gaps found during testing

---

### Step 3 — Feature: Bus Maintenance Tracking
```
20260505_bus_maintenance.sql
```
- Adds `total_km_driven`, `km_since_service`, `last_serviced_at`, `alert_dismissed` columns to `buses`
- Implements automated odometer logic: km is added to the bus record each time a schedule is marked `completed`
- Triggers a maintenance alert when `km_since_service >= 8,000 km` and an overdue alert at `>= 10,000 km`

---

### Step 4 — City Code Standardisation
```
20260505_city_codes.sql
```
- Renames all `pakistan_city` enum values to IATA-style 3-letter codes:
  - `Karachi` → `KHI`, `Lahore` → `LHE`, `Islamabad` → `ISB`, `Rawalpindi` → `RWP`, etc.
- Script is **idempotent** — safe to run multiple times without errors

---

### Step 5 — Realistic Route Distances & Pricing
```
20260505_realistic_distances_prices.sql
```
- Updates `distance_km` on all routes to real Pakistani highway distances (e.g., KHI→LHE = 1,212 km)
- Calculates and updates `seat_price` on all schedules using the formula: `PKR 2.5 × distance_km`, rounded to the nearest 50, minimum PKR 150
- Enables Supabase Realtime on the `schedules` table for live trip tracking

---

### Step 6 — Realtime
```
20260505_enable_realtime_schedules.sql
```
- Enables Supabase Realtime publication on `schedules` so the driver dashboard and live tracking page update instantly when trip status changes.

---

### Step 7 — Seed Data (Demo / Development Only)
```
20260505_seed_schedules.sql
```
- Inserts one scheduled trip per route per day for the **next 7 days** for the top 8 Pakistani cities
- Covers all 56 directional city pairs (8 × 7)
- **Safe to re-run** — skips any schedule that already exists for that route and date
- ⚠️ Run this script **last**, after all schema and data patches are applied

---

## Design Patterns Used
- **Repository Pattern:** All data access goes through Supabase client queries, not raw SQL in components
- **Row Level Security (RLS):** Database-enforced access control — passengers, drivers, and admins each have different read/write permissions at the database layer
- **Idempotent Migrations:** All schema changes are wrapped in existence checks so they can be safely re-run
- **Event-Driven Updates:** Supabase Realtime subscriptions allow the UI to respond to database changes without polling

# 🚌 SwiftBus — Intercity Bus Management System

A full-stack intercity bus booking and management platform built with React, TypeScript, Supabase, and Tailwind CSS. Designed to serve three distinct user roles: **Passengers**, **Drivers**, and **Administrators**.

---

## 📋 Table of Contents

- [Tech Stack](#tech-stack)
- [User Roles & Portals](#user-roles--portals)
- [Feature Overview](#feature-overview)
- [User Workflows](#user-workflows)
- [Database Schema](#database-schema)
- [Project Structure](#project-structure)
- [Routes Reference](#routes-reference)
- [Database Migrations](#database-migrations)
- [Environment Setup](#environment-setup)
- [Local Development](#local-development)
- [Submission Deliverables](#submission-deliverables)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend Framework | React 18 + TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS + shadcn/ui |
| Backend / DB | Supabase (PostgreSQL + Auth + Realtime + Storage) |
| State / Data | TanStack Query (@tanstack/react-query) |
| Routing | React Router DOM v6 |
| PDF Generation | jsPDF |
| Date Utilities | date-fns |
| Notifications | Sonner (toast) |
| Icons | Google Material Symbols |
| Fonts | Plus Jakarta Sans (Google Fonts) |

---

## User Roles & Portals

SwiftBus has three distinct user roles, each with a dedicated portal:

| Role | Entry Point | Key Capabilities |
|---|---|---|
| **Passenger** | `/` → `/auth` | Search, book, track, cancel, refund, chat |
| **Driver** | `/driver` | View schedule, update odometer, mark arrivals |
| **Admin** | `/admin` | Full CRUD on all entities, support inbox, refunds |

Role assignment is managed via the `user_roles` table with a `app_role` enum (`admin`, `driver`, `passenger`). All new sign-ups are assigned `passenger` by default via a database trigger.

---

## Feature Overview

### 🧑‍💼 Passenger Portal

- **Landing Page** — Animated hero with live bus search, feature highlights, and city stats.
- **Authentication** — Email/password sign-up and login via Supabase Auth.
- **Bus Search** — Filter by departure city, destination city, and travel date. Displays available schedules with live seat counts.
- **Seat Selection** — Interactive seat grid showing booked vs. available seats. Multi-seat selection supported.
- **Payment Gateway** — Simulated checkout with JazzCash and Easypaisa (modal flow with PIN entry). Wallet balance option appears automatically if funds are sufficient.
- **My Bookings** — Lists all past and upcoming bookings with status, route, seat number, travel date, and departure time.
  - **View Ticket** — Opens a premium e-ticket dialog with route, seat, date, time, price, and booking reference.
  - **Download PDF** — Generates and downloads a branded `SwiftBus-Ticket-XXXXXXXX.pdf`.
  - **Cancel & Refund** — Triggers the Cancellation & Refund Policy dialog before cancellation.
- **Refund Policy** — Time-based tiered refund calculated automatically:
  - 24+ hours before departure → **100% refund**
  - 12–24 hours → **50% refund**
  - 6–12 hours → **25% refund**
  - Under 6 hours → **No refund**
- **Wallet** — Displays current wallet balance (store credit from refunds) and full transaction history. Wallet balance can be used at checkout.
- **Live Bus Tracking** — Real-time bus position on a route map using Supabase Realtime.
- **Support Chat** — Floating support widget (bubble icon) for ticket-based messaging with admins. Supports creating new tickets, replying, and viewing ticket history.
- **Notifications** — Bell icon in the navbar with unread badge. Notifications for booking confirmations, refund approvals/rejections, and admin support replies.
- **Profile** — Edit name, phone, and view account details.

### 🚗 Driver Portal

- **Dashboard** — Shows the driver's assigned schedule for today.
- **Odometer Update** — Driver logs current odometer reading. Auto-triggers maintenance notification if thresholds (8,000 km / 10,000 km) are crossed.
- **Trip Status** — Marks bus as In Transit or Arrived at destination.

### 🛡️ Admin Portal

- **Dashboard** — KPI cards: total routes, buses, drivers, and bookings. Recent activity feed.
- **Manage Routes** — Full CRUD for bus routes between Pakistani cities (IATA-style 3-letter codes: KHI, LHE, ISB, etc.). Pricing is calculated at PKR 2.5/km.
- **Manage Buses** — Assign buses to routes. View bus numbers and capacities.
- **Manage Drivers** — Assign drivers to buses. View license numbers.
- **Manage Schedules** — Create and manage departure schedules. Set seat prices and departure times.
- **View Bookings** — Browse all passenger bookings across all routes with filters.
- **Manage Users** — List all registered users with their roles.
- **Support Inbox** — Split-panel ticket management inbox. View passenger messages, reply in real-time, change ticket status (Open / In Progress / Resolved). Passenger's recent bookings shown as context.
- **Manage Refunds** — Review all refund requests with filter tabs (Pending / Approved / Rejected). Approve: credits passenger's wallet and sends notification. Reject: sends notification with optional admin note.

---

## User Workflows

### Passenger: Book a Ticket

```
1. Visit / (landing page)
2. Enter departure city, destination, date → Click "Search"
3. Select a schedule from results
4. Click on available seats in the seat map
5. Click "Book Seats"
6. Payment dialog opens:
   a. If wallet balance ≥ total → "SwiftBus Wallet" option shown (instant)
   b. Otherwise → Select JazzCash or Easypaisa → Enter mobile/PIN → Confirm
7. Booking confirmed → Confirmation dialog with details
8. View in My Bookings → Download PDF ticket
```

### Passenger: Cancel & Request Refund

```
1. Go to My Bookings
2. Click "Cancel" on an active booking
3. Refund Policy dialog appears:
   - Shows 4 refund tiers
   - Auto-calculates refund amount based on hours until departure
4. Click "Confirm Cancellation"
5. Booking marked cancelled, refund request created (status: Pending)
6. Booking card shows "Refund Pending" badge
7. Admin approves → Wallet balance credited → Push notification sent
8. Go to Wallet page to see updated balance + transaction log
```

### Passenger: Support Chat

```
1. Click the floating chat bubble (bottom-right on any page)
2. View existing tickets or click "New Ticket"
3. Enter subject + message → Submit
4. Admin receives notification in Support Inbox
5. Admin replies → Passenger gets notified → Reply appears in real-time
6. Admin can mark ticket as In Progress or Resolved
```

### Admin: Approve Refund

```
1. Click "Refunds" in sidebar
2. See all pending refund requests with passenger, route, seat, and amounts
3. Optionally add an admin note
4. Click "Approve & Credit Wallet" or "Reject"
5. On approval:
   - profiles.wallet_balance incremented
   - wallet_transactions record created
   - Notification sent to passenger
```

### Driver: Complete a Trip

```
1. Log in → Redirected to /driver
2. View today's assigned schedule
3. Click "Start Trip" → Status changes to In_Transit
4. Enter current odometer reading
5. Maintenance notification auto-fires if km threshold crossed
6. Click "Mark Arrived" → Trip completed
```

---

## Database Schema

### Core Tables

| Table | Description |
|---|---|
| `profiles` | User profile info + `wallet_balance` |
| `user_roles` | Maps users to `app_role` enum (admin/driver/passenger) |
| `routes` | City-to-city routes with `distance_km` |
| `buses` | Bus fleet with `bus_no`, `capacity`, `current_odometer` |
| `drivers` | Driver records linked to buses |
| `schedules` | Departure schedules with `seat_price`, `status`, `departure_time` |
| `bookings` | Passenger seat reservations |
| `payments` | Payment records linked to bookings |
| `notifications` | In-app notification feed per user |

### New Tables (Recent Additions)

| Table | Description |
|---|---|
| `support_tickets` | Ticket-based support threads (passenger ↔ admin) |
| `support_messages` | Individual messages inside a ticket |
| `refund_requests` | Cancellation refund requests with tier % and amount |
| `wallet_transactions` | Full ledger of credits (refund) and debits (payment) |

### Key Functions & Triggers

- `public.has_role(user_id, role)` — Used in all RLS policies for admin/driver access control
- `public.handle_new_user()` trigger — Auto-inserts a `profiles` row and assigns `passenger` role on sign-up
- `auto_notify_maintenance()` trigger — Fires on odometer update to create maintenance notifications

### Row Level Security

All tables have RLS enabled. Policies follow the pattern:
- Passengers: read/write **own rows only** (`auth.uid() = passenger_id`)
- Admins: full access via `public.has_role(auth.uid(), 'admin')`
- Drivers: scoped access via `public.has_role(auth.uid(), 'driver')`

---

## Project Structure

```
swiftbus-manager/
├── src/
│   ├── App.tsx                    # Route definitions
│   ├── index.css                  # Global styles, design tokens, dark/light theme
│   ├── main.tsx                   # App entry point
│   │
│   ├── components/
│   │   ├── AdminLayout.tsx        # Admin sidebar, top bar, mobile nav
│   │   ├── PassengerNav.tsx       # Passenger top nav + mobile bottom bar + SupportWidget mount
│   │   ├── PaymentGateway.tsx     # JazzCash/Easypaisa/Wallet payment modal
│   │   ├── SupportWidget.tsx      # Floating support chat bubble for passengers
│   │   ├── SwiftBusLogo.tsx       # Branded SVG logo component
│   │   ├── ThemeToggle.tsx        # Dark/light mode toggle
│   │   └── ui/                    # shadcn/ui component library
│   │
│   ├── hooks/
│   │   ├── useAuth.tsx            # Auth context: user, isAdmin, isDriver, signOut
│   │   └── use-mobile.tsx         # Responsive breakpoint hook
│   │
│   ├── integrations/supabase/
│   │   ├── client.ts              # Supabase client instance
│   │   └── types.ts               # Auto-generated DB types
│   │
│   ├── lib/
│   │   ├── constants.ts           # PAKISTAN_CITIES, CITY_NAMES map (IATA codes)
│   │   └── utils.ts               # Tailwind merge utility
│   │
│   └── pages/
│       ├── Index.tsx              # Landing / home page
│       ├── Auth.tsx               # Sign in / sign up
│       ├── Search.tsx             # Bus search results
│       ├── Book.tsx               # Seat selection + booking
│       ├── MyBookings.tsx         # Booking history + ticket viewer + refund dialog
│       ├── Wallet.tsx             # Wallet balance + transaction history
│       ├── TrackBus.tsx           # Live bus tracking map
│       ├── ProfileDashboard.tsx   # Passenger profile editor
│       ├── NotFound.tsx           # 404 page
│       │
│       ├── admin/
│       │   ├── AdminDashboard.tsx # KPI overview + recent activity
│       │   ├── ManageBuses.tsx    # Bus CRUD
│       │   ├── ManageRoutes.tsx   # Route CRUD
│       │   ├── ManageDrivers.tsx  # Driver CRUD
│       │   ├── ManageSchedules.tsx# Schedule CRUD
│       │   ├── ViewBookings.tsx   # All bookings view
│       │   ├── ManageUsers.tsx    # User role management
│       │   ├── SupportInbox.tsx   # Passenger support ticket inbox
│       │   └── ManageRefunds.tsx  # Refund approval/rejection
│       │
│       └── driver/
│           └── DriverDashboard.tsx# Driver schedule + odometer + trip status
│
├── supabase/
│   └── migrations/                # All SQL migration files (run in order)
│
├── SQLScripts/                    # Submission copy of all SQL scripts
├── tailwind.config.ts             # Tailwind theme + custom colors
├── vite.config.ts                 # Vite config with path aliases
└── package.json
```

---

## Routes Reference

### Public Routes

| Path | Component | Description |
|---|---|---|
| `/` | `Index` | Landing page |
| `/auth` | `Auth` | Sign in / Sign up |

### Passenger Routes (requires auth)

| Path | Component | Description |
|---|---|---|
| `/search` | `Search` | Search for buses |
| `/book/schedule/:scheduleId` | `Book` | Seat selection and booking |
| `/my-bookings` | `MyBookings` | Booking history, tickets, refunds |
| `/wallet` | `Wallet` | Wallet balance and transactions |
| `/profile` | `ProfileDashboard` | Edit profile |
| `/track/:scheduleId` | `TrackBus` | Live bus tracking |

### Admin Routes (requires admin role)

| Path | Component | Description |
|---|---|---|
| `/admin` | `AdminDashboard` | Overview dashboard |
| `/admin/buses` | `ManageBuses` | Bus fleet management |
| `/admin/routes` | `ManageRoutes` | Route management |
| `/admin/schedules` | `ManageSchedules` | Schedule management |
| `/admin/drivers` | `ManageDrivers` | Driver management |
| `/admin/bookings` | `ViewBookings` | All bookings |
| `/admin/users` | `ManageUsers` | User management |
| `/admin/support` | `SupportInbox` | Support ticket inbox |
| `/admin/refunds` | `ManageRefunds` | Refund requests |

### Driver Routes (requires driver role)

| Path | Component | Description |
|---|---|---|
| `/driver` | `DriverDashboard` | Driver portal |

---

## Database Migrations

Run these in order in the Supabase SQL Editor:

| File | Description |
|---|---|
| `20251207194451_*.sql` | Core schema: profiles, user_roles, routes, buses, drivers, schedules, bookings, payments, notifications, has_role(), RLS policies |
| `20251208120000_*.sql` | Remove legacy `route_id` from buses table |
| `20251208123000_*.sql` | Add `seat_price` column to schedules |
| `20260427_add_schedule_status.sql` | Add `status` to schedules (pending/in_transit/completed) |
| `20260503_p0_fixes.sql` | Critical RLS and schema corrections |
| `20260503_audit_fixes.sql` | Audit and permission fixes |
| `20260505_city_codes.sql` | IATA-style city code enum for Pakistani cities |
| `20260505_realistic_distances_prices.sql` | Update routes with real km distances, pricing at PKR 2.5/km |
| `20260505_bus_maintenance.sql` | Odometer tracking + auto-maintenance notifications trigger |
| `20260505_enable_realtime_schedules.sql` | Enable Supabase Realtime on schedules table |
| `20260505_seed_schedules.sql` | Seed realistic schedule data for all routes |
| `20260505_support_tickets.sql` | `support_tickets` + `support_messages` tables with RLS |
| `20260505_refund_wallet.sql` | `refund_requests` + `wallet_transactions` tables, `wallet_balance` on profiles |

All files are also available in the `SQLScripts/` directory for the submission ZIP.

---

## Environment Setup

Create a `.env.local` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

These values are found in your Supabase project under **Settings → API**.

---

## Local Development

```bash
# 1. Clone the repo
git clone https://github.com/Sam-ee-r/SwiftBus---SE-Project.git
cd swiftbus-manager

# 2. Install dependencies
npm install

# 3. Set up environment variables (see above)
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# 4. Run all SQL migrations in Supabase SQL Editor (in the order listed above)

# 5. Start the dev server
npm run dev

# App runs at http://localhost:8080
```

### Creating Test Users

After running migrations, create users via the Supabase Auth dashboard or the `/auth` sign-up page.

To assign admin or driver roles, run this in the Supabase SQL Editor:

```sql
-- Replace <user_id> with the UUID from auth.users
INSERT INTO public.user_roles (user_id, role)
VALUES ('<user_id>', 'admin');  -- or 'driver'
```

---

## Submission Deliverables

Per the SE Project rubric, the submission ZIP should contain:

```
📁 SwiftBus_Submission/
├── 📁 ProjectCode/        ← Full source (this repo)
├── 📁 SQLScripts/         ← All .sql files from SQLScripts/
├── 📁 Doc/                ← SRS, design documents
└── 📁 PPT/                ← Final presentation slides
```

**Deadline:** May 5, 2025, 9:00 AM

---

## Design System

SwiftBus uses a custom dark-first design system:

- **Primary Accent:** Electric Violet (`#8a75f0`)
- **Secondary Accent:** Emerald Spark (`hsl(165, 80%, 50%)`)
- **Background:** Deep Space (`#0f0d15`)
- **Surface:** Various levels of dark translucent panels with `backdrop-blur`
- **Typography:** Plus Jakarta Sans
- **Icons:** Google Material Symbols (Rounded)
- **Theme:** System-aware dark/light mode via `ThemeProvider`

---

*Built with ❤️ for FAST-NUCES Software Engineering Project — May 2025*

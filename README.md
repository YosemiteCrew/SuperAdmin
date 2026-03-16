# Super Admin Dashboard

A production-grade admin dashboard for the Yosemite Crew platform, built with Next.js 16, React 19, Tailwind CSS v4, Zustand, and Recharts. Designed for managing leads, businesses, support tickets, team members, analytics, and security governance across the Yosemite Crew pet care ecosystem.

## Documentation

- **Live Docs:** [super-admin-docs.vercel.app](https://super-admin-docs.vercel.app)
- **Docs Repo:** [github.com/eng-AhmedMahmoud/super-admin-docs](https://github.com/eng-AhmedMahmoud/super-admin-docs)

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Next.js 16 | Framework (App Router) |
| React 19 | UI Library |
| Tailwind CSS v4 | Styling (design tokens via @theme) |
| Zustand | State Management (per-feature stores) |
| Recharts | Data Visualization |
| Axios | HTTP Client (with auth interceptors) |
| TypeScript | Type Safety (strict mode) |

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+

### Install & Run

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
pnpm build
pnpm start
```

### Demo Credentials

| Field | Value |
|-------|-------|
| Email | `admin@yosemitecrew.com` |
| Password | `Admin@123` |
| MFA Code | Any 6-digit code (e.g. `123456`) |

## Project Structure

```
apps/admin/src/app/
├── (routes)/
│   ├── (public)/              # Login, MFA verification
│   └── (app)/                 # Protected dashboard routes
├── features/                  # Feature modules
│   ├── auth/                  # Authentication (login + MFA)
│   ├── dashboard/             # Overview with charts & stats
│   ├── leads/                 # Lead management (CRUD)
│   ├── businesses/            # Business approve/suspend/deactivate
│   ├── support/               # Support ticket management
│   ├── team/                  # Team member management
│   ├── analytics/             # KPI tiles & trend charts
│   ├── users/                 # Unified user directory
│   ├── developers/            # Developer portal
│   ├── break-glass/           # Time-bound audited access
│   └── audit/                 # Immutable activity log
├── ui/                        # Reusable component library
│   ├── primitives/            # Button, Input, Badge, PageHeader
│   ├── tables/                # GenericTable with pagination
│   ├── cards/                 # StatCard, DetailCard
│   ├── overlays/              # Modal, Toast, Loader
│   ├── inputs/                # Search, Select, OtpInput
│   └── layout/                # Sidebar, Header, ProtectedRoute
├── services/                  # HTTP client + mock API layer
├── stores/                    # Zustand stores (one per feature)
├── hooks/                     # Custom hooks (one per feature)
├── lib/                       # Logger, permissions, validators
├── types/                     # TypeScript type definitions
└── constants/                 # Route config with icons
```

### Feature Pattern

Every feature follows a consistent 4-layer architecture:

```
Store → Hook → Feature Page → Route Page
```

1. `stores/xxxStore.ts` — Zustand store with state + actions
2. `hooks/useXxx.ts` — Fetches data on mount, returns filtered data
3. `features/xxx/pages/` — List and detail page components
4. `(routes)/(app)/xxx/page.tsx` — Thin route file rendering the feature

## Features

- **Authentication** — Mock Cognito login + 6-digit MFA verification
- **Dashboard** — Stat cards, area/bar charts, recent leads & tickets tables
- **Leads** — List with search/filter, detail view, status updates, assignment
- **Businesses** — List with type/status/invited filters, approve/suspend/deactivate
- **Support** — Ticket list with priority/status, assignment, detail view
- **Team** — Member list with add/remove, role-based badges
- **Analytics** — KPI tiles with trends, user/business/lead growth charts
- **Users** — Read-only unified user directory with type/status filters
- **Developers** — Developer list with nested apps table
- **Break Glass** — Time-bound access grants with audit trail
- **Audit Log** — Searchable activity log with action/actor filtering

## Design System

- **Font:** Satoshi (300–900 weights, loaded locally)
- **Colors:** Yosemite-Crew design tokens via CSS variables
- **Border Radius:** 16px (cards/buttons), 12px (smaller elements)
- **Responsive:** Mobile hamburger menu, adaptive grids, horizontal scroll for tables

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm format` | Format with Prettier |
| `pnpm turbo type-check --filter admin` | Type-check |

## Merge Plan

This project is designed to merge into the [Yosemite-Crew](https://github.com/YosemiteCrew/Yosemite-Crew) monorepo as `apps/super-admin`. See the [full documentation](https://super-admin-docs.vercel.app) for detailed next steps.

## License

Proprietary — Yosemite Crew

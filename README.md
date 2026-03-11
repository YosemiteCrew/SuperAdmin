# Super Admin Dashboard

A monorepo admin dashboard built with **Turborepo**, **Next.js 16**, **React 19**, **Tailwind CSS**, and **pnpm**.

## Tech Stack

- **Monorepo:** Turborepo
- **Package manager:** pnpm
- **Framework:** Next.js 16 (App Router)
- **UI:** React 19, Tailwind CSS v4, Recharts
- **State:** Zustand

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+

### Install & Run

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

### Scripts

| Command    | Description                |
|-----------|----------------------------|
| `pnpm dev`   | Start development servers |
| `pnpm build` | Build all apps            |
| `pnpm start` | Start production servers  |
| `pnpm lint`  | Run linting               |
| `pnpm format`| Format code with Prettier |

## Project Structure

```
SuperAdmin/
├── apps/
│   └── admin/          # Admin dashboard app
├── package.json
└── turbo.json
```

See [apps/admin/README.md](apps/admin/README.md) for the admin app documentation.

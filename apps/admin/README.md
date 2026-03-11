# Super Admin – Admin Dashboard

Admin dashboard app built with **Next.js 16**, **React 19**, **Tailwind CSS**, and **Recharts**.

## Features

### Authentication
- **Login** – Email/password
- **Scan QR** – QR code instructions
- **Verify Code** – 4-digit OTP verification  
Root (`/`) redirects to `/login`; after verification, users land on `/dashboard`.

### Dashboard
- Welcome intro with notifications
- Stat cards (appointments, team members, time metrics)
- **New User Trend** – Area chart with tooltip
- **User Engagement** – Horizontal bar chart
- Assessments, Analytics, Social Media, Total Revenue
- Activity Logs

### Client & CRM
- Sidebar nav: All Businesses, Hospitals, Groomers, Breeders, Sitters, Pet Parents, Developers, Support Tickets, Business Leads
- **All Businesses** tab includes:
  - Stat cards (users, signups, MRR, etc.)
  - Pending Verifications
  - New Leads Overview
  - Practice Activity Overview
  - Pet Parent Activity Overview
  - Support Tickets (Professionals / Pet Parents) with status popup
  - New User Trend & User Engagement charts

### Other
- User dropdown: Profile, Settings, Account, Logout
- Clash Grotesk font (via Fontshare)
- Responsive layout with sidebar and header

## Getting Started

From the repo root:

```bash
pnpm dev
```

Or from this directory:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tech Stack

- Next.js 16 (App Router)
- React 19
- Tailwind CSS v4
- Recharts
- Zustand

## Project Structure

```
apps/admin/
├── app/
│   ├── login/              # Login page
│   ├── scan-qr/            # QR scan instructions
│   ├── verify-code/        # OTP verification
│   ├── dashboard/          # Main dashboard
│   ├── client-crm/         # CRM (All Businesses, Hospitals, etc.)
│   ├── profile/
│   ├── settings/
│   ├── account/
│   └── layout.tsx
├── components/
│   ├── auth-layout/        # Auth page layout
│   ├── dashboard/          # Dashboard components
│   └── ui/                 # Button, Input, OTP
├── store/
│   └── use-auth-store.ts   # Zustand auth state
└── public/assets/          # Images, logo, etc.
```

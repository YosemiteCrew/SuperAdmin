import type { IconType } from 'react-icons';
import {
  IoAnalyticsOutline,
  IoBusinessOutline,
  IoChatboxEllipsesOutline,
  IoCheckmarkCircleOutline,
  IoFileTrayFullOutline,
  IoFingerPrintOutline,
  IoGridOutline,
  IoLogoDiscord,
  IoMegaphoneOutline,
  IoPeopleOutline,
  IoPersonAddOutline,
  IoPlanetOutline,
  IoPulseOutline,
  IoSettingsOutline,
  IoShareSocialOutline,
  IoShieldCheckmarkOutline,
  IoTimeOutline,
} from 'react-icons/io5';

export type RouteItem = {
  name: string;
  href: string;
  icon: IconType;
  /**
   * Extra terms the command palette matches on, beyond the route name and its
   * group label. Synonyms only — never a phrase that claims what a page does.
   */
  keywords?: string;
  /** One-line description shown under the name in the command palette. */
  description?: string;
};

export type RouteGroup = {
  label: string;
  routes: RouteItem[];
};

/**
 * The panel's single navigation model. The sidebar renders it and the command
 * palette searches it, so a route added here is reachable and findable at once;
 * a second hand-written page list in the palette is what let the two drift into
 * 17 sidebar destinations against 5 searchable ones (#556).
 *
 * Groups, order, labels and icons all follow the design's own nav model. Every
 * group label must stay unique: the sidebar render keys off it, so a duplicate
 * silently collides two groups into one React key.
 */
export const ROUTE_GROUPS: RouteGroup[] = [
  {
    label: 'Overview',
    routes: [
      {
        name: 'Dashboard',
        href: '/dashboard',
        icon: IoGridOutline,
        description: 'Stats overview, recent signups',
        keywords: 'overview home stats signups',
      },
    ],
  },
  {
    label: 'People & access',
    routes: [
      {
        name: 'Users',
        href: '/users',
        icon: IoPeopleOutline,
        description: 'Browse all users, search by email, paginate',
        keywords: 'people accounts members search list',
      },
      {
        name: 'Approvals',
        href: '/approvals',
        icon: IoCheckmarkCircleOutline,
        keywords: 'approve review queue pending',
      },
      {
        name: 'Organizations',
        href: '/organizations',
        icon: IoBusinessOutline,
        description: 'Manage tenants and organizations',
        keywords: 'orgs tenants companies workspaces clinics',
      },
      {
        name: 'Invites',
        href: '/invites',
        icon: IoPersonAddOutline,
        keywords: 'invitations invite onboarding',
      },
      {
        name: 'Admins',
        href: '/admins',
        icon: IoShieldCheckmarkOutline,
        keywords: 'administrators staff roles permissions',
      },
    ],
  },
  {
    label: 'CRM',
    routes: [
      {
        name: 'Campaigns',
        href: '/crm',
        icon: IoMegaphoneOutline,
        keywords: 'marketing outreach newsletter',
      },
      {
        name: 'Requests',
        href: '/crm/requests',
        icon: IoChatboxEllipsesOutline,
        keywords: 'contact enquiries messages leads',
      },
      {
        name: 'Discord',
        href: '/crm/discord',
        icon: IoLogoDiscord,
        keywords: 'community chat server',
      },
      {
        name: 'Social',
        href: '/social',
        icon: IoShareSocialOutline,
        keywords: 'posts publishing instagram reels',
      },
    ],
  },
  {
    label: 'Privacy',
    routes: [
      {
        name: 'Consent',
        href: '/consent',
        icon: IoFingerPrintOutline,
        keywords: 'gdpr permissions opt-in subjects',
      },
      {
        name: 'Data requests',
        href: '/privacy/requests',
        icon: IoFileTrayFullOutline,
        keywords: 'gdpr dsar subject access erasure',
      },
    ],
  },
  {
    label: 'Insights',
    routes: [
      {
        name: 'Analytics',
        href: '/analytics',
        icon: IoAnalyticsOutline,
        description: 'Reports, metrics and trends',
        keywords: 'metrics reports insights dashboards trends',
      },
      {
        name: 'Audit log',
        href: '/audit',
        icon: IoTimeOutline,
        keywords: 'events history trail activity',
      },
      {
        name: 'Health',
        href: '/health',
        icon: IoPulseOutline,
        keywords: 'status uptime checks diagnostics',
      },
    ],
  },
  {
    label: 'Platform',
    routes: [
      {
        name: 'Federation',
        href: '/ap',
        icon: IoPlanetOutline,
        keywords: 'activitypub fediverse actors',
      },
    ],
  },
  {
    label: 'Account',
    routes: [
      {
        name: 'Settings',
        href: '/settings',
        icon: IoSettingsOutline,
        description: 'Account and admin configuration',
        keywords: 'preferences configuration account admin',
      },
    ],
  },
];

export type NavRoute = RouteItem & { group: string };

/** Every sidebar destination, flattened, each carrying its group label. */
export const NAV_ROUTES: NavRoute[] = ROUTE_GROUPS.flatMap((group) =>
  group.routes.map((route) => ({ ...route, group: group.label }))
);

import {
  RiDashboardLine,
  RiUserLine,
  RiTeamLine,
  RiBarChartLine,
  RiFileListLine,
  RiCodeLine,
  RiCustomerServiceLine,
  RiBuildingLine,
  RiAlarmWarningLine,
} from "react-icons/ri";
import type { IconType } from "react-icons";

export type RouteItem = {
  name: string;
  href: string;
  icon: IconType;
};

export const appRoutes: RouteItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: RiDashboardLine },
  { name: "Leads", href: "/leads", icon: RiUserLine },
  { name: "Businesses", href: "/businesses", icon: RiBuildingLine },
  { name: "Support", href: "/support", icon: RiCustomerServiceLine },
  { name: "Team", href: "/team", icon: RiTeamLine },
  { name: "Analytics", href: "/analytics", icon: RiBarChartLine },
  { name: "Users", href: "/users", icon: RiUserLine },
  { name: "Developers", href: "/developers", icon: RiCodeLine },
  {
    name: "Break Glass",
    href: "/break-glass",
    icon: RiAlarmWarningLine,
  },
  { name: "Audit", href: "/audit", icon: RiFileListLine },
];

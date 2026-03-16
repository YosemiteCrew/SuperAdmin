export type TeamRole = "SUPER_ADMIN" | "ADMIN" | "SUPPORT";
export type TeamMemberStatus = "active" | "inactive";

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  status: TeamMemberStatus;
  joinedAt: string;
};

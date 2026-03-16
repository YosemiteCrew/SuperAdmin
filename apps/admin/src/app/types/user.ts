export type UserType = "pet_parent" | "business_owner" | "developer" | "admin";
export type UserStatus = "active" | "inactive" | "suspended";
export type AuthProvider = "cognito" | "firebase" | "both";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  type: UserType;
  status: UserStatus;
  authProvider: AuthProvider;
  lastLoginAt: string;
  createdAt: string;
};

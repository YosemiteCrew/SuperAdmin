export type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: "SUPER_ADMIN" | "ADMIN";
  permissions: string[];
  mfaEnabled: boolean;
  lastLoginAt: string;
  createdAt: string;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

export type MfaChallenge = {
  session: string;
  challengeType: "SOFTWARE_TOKEN_MFA";
};

import { create } from "zustand";
import {
  CognitoUser,
  CognitoUserPool,
  CognitoUserSession,
  ICognitoUserPoolData,
  AuthenticationDetails,
} from "amazon-cognito-identity-js";

const poolData: ICognitoUserPoolData = {
  UserPoolId: process.env.NEXT_PUBLIC_COGNITO_USERPOOLID || "",
  ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENTID || "",
};

let userPool: CognitoUserPool | undefined = undefined;

if (poolData.UserPoolId && poolData.ClientId) {
  userPool = new CognitoUserPool(poolData);
}

type AuthStore = {
  user: CognitoUser | null;
  session: CognitoUserSession | null;
  loading: boolean;
  error: string | null;
  role: string | null;
  isMfaSetupRequired?: boolean;
  totpSecret?: string | null;
  isMfaCodeRequired?: boolean;

  signIn: (
    username: string,
    password: string
  ) => Promise<CognitoUserSession | null>;
  associateSoftwareToken: (cognitoUser: CognitoUser) => Promise<void>;
  verifyTotpCode: (cognitoUser: CognitoUser, code: string) => Promise<void>;
  checkSession: () => Promise<CognitoUserSession | null>;
  signout: () => void;
  forgotPassword: (email: string) => Promise<{
    CodeDeliveryDetails: {
      AttributeName: string;
      DeliveryMedium: string;
      Destination: string;
    };
  } | null>;
  resetPassword: (
    email: string,
    code: string,
    password: string
  ) => Promise<string | null>;
};

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  session: null,
  loading: false,
  error: null,
  role: null,
  isMfaSetupRequired: false,
  totpSecret: null,
  isMfaCodeRequired: false,

  signIn: async (email, password) => {
    if (!userPool) {
      throw new Error("UserPool is not initialized");
    }
    set({ loading: true, error: null });
    const authenticationDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    });
    const userData = {
      Username: email,
      Pool: userPool,
    };
    const cognitoUser = new CognitoUser(userData);

    return new Promise((resolve, reject) => {
      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (session) => {
          const idTokenPayload = session.getIdToken().decodePayload();
          const role = idTokenPayload["custom:role"] || "";
          set({
            user: cognitoUser,
            session,
            loading: false,
            error: null,
            role,
          });
          resolve(session);
        },
        onFailure: (err) => {
          set({
            loading: false,
            error: err.message || "Authentication failed",
            user: null,
            session: null,
            role: null,
          });
          reject(err);
        },
        mfaRequired: (challengeName) => {
          set({ isMfaCodeRequired: true, user: cognitoUser });
        },
        totpRequired: (challengeName, challengeParameters) => {
          console.log("TOTP required:", challengeName, challengeParameters);
          set({ isMfaSetupRequired: true, user: cognitoUser });
          get()
            .associateSoftwareToken(cognitoUser)
            .then(() => {
              console.log(
                "TOTP secret set in state, waiting for user code verification"
              );
              resolve(null);
            })
            .catch((err) => {
              console.error("Failed to associate software token:", err);
              set({ error: err.message, loading: false });
              reject(err);
            });
        },
      });
    });
  },
  associateSoftwareToken: async (cognitoUser: CognitoUser) => {
    return new Promise((resolve, reject) => {
      cognitoUser.associateSoftwareToken({
        associateSecretCode: (secretCode) => {
          set({ totpSecret: secretCode });
          resolve();
        },
        onFailure: (err) => {
          reject(err);
        },
      });
    });
  },
  verifyTotpCode: (cognitoUser: CognitoUser, code: string) => {
    return new Promise((resolve, reject) => {
      cognitoUser.verifySoftwareToken(code, "My Device", {
        onSuccess: () => {
          cognitoUser.setUserMfaPreference(
            null,
            { Enabled: true, PreferredMfa: true },
            (err: Error | undefined, result?: string) => {
              if (err) {
                reject(err);
              } else {
                set({ isMfaSetupRequired: false });
                resolve();
              }
            }
          );
        },
        onFailure: (err) => reject(err),
      });
    });
  },
  checkSession: async () => {
    if (!userPool) {
      throw new Error("UserPool is not initialized");
    }
    set({ loading: true, error: null });

    return new Promise((resolve, reject) => {
      const cognitoUser = userPool.getCurrentUser();
      if (!cognitoUser) {
        set({
          user: null,
          session: null,
          loading: false,
        });
        return resolve(null);
      }
      cognitoUser.getSession(
        (err: Error | null, session: CognitoUserSession) => {
          if (err || !session?.isValid()) {
            set({
              user: null,
              session: null,
              loading: false,
              error: err?.message || null,
            });
            return resolve(null);
          }
          const idTokenPayload = session.getIdToken().decodePayload();
          const role = idTokenPayload["custom:role"] || "";
          set({
            user: cognitoUser,
            session,
            loading: false,
            error: null,
            role,
          });
          resolve(session);
        }
      );
    });
  },
  signout: () => {
    const user = get().user;
    if (user) {
      user.getSession(
        (err: Error | null, session: CognitoUserSession | null) => {
          if (err || !session?.isValid()) {
            set({ user: null, session: null });
            return;
          }
          user.globalSignOut({
            onSuccess: () => {
              set({ user: null, session: null });
            },
            onFailure: (err: Error | null) => {
              set({ user: null, session: null });
            },
          });
        }
      );
    } else {
      set({ user: null, session: null });
    }
  },
  forgotPassword: async (email: string) => {
    if (!userPool) {
      throw new Error("UserPool is not initialized");
    }
    return new Promise((resolve, reject) => {
      const userData = {
        Username: email,
        Pool: userPool,
      };
      const cognitoUser = new CognitoUser(userData);
      cognitoUser.forgotPassword({
        onSuccess: (data) => {
          console.log(data);
          resolve(data);
        },
        onFailure: (err) => reject(err),
      });
    });
  },
  resetPassword: async (email: string, code: string, newPassword: string) => {
    if (!userPool) {
      throw new Error("UserPool is not initialized");
    }
    return new Promise((resolve, reject) => {
      const userData = {
        Username: email,
        Pool: userPool,
      };
      const cognitoUser = new CognitoUser(userData);
      cognitoUser.confirmPassword(code, newPassword, {
        onSuccess: () => resolve("success"),
        onFailure: (err) => reject(err),
      });
    });
  },
}));

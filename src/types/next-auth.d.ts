import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    institutionId: string;
    roleKey: string;
    roleName: string;
    permissions: string[];
  }

  interface Session {
    user: {
      id: string;
      institutionId: string;
      roleKey: string;
      roleName: string;
      permissions: string[];
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    institutionId: string;
    roleKey: string;
    roleName: string;
    permissions: string[];
  }
}

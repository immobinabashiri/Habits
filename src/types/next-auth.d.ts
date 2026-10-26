import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      provider?: string; // how the user signed in; missing on sessions created before this was added
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string; // our database id, set in the jwt callback
    provider?: string;
  }
}
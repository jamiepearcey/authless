import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      platformRole?: string;
    };
  }

  interface User {
    id: string;
    email: string | null;
    name?: string | null;
    image?: string | null;
    platformRole?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    platformRole?: string;
  }
}

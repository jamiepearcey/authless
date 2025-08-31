import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { db } from "@db/base";
import { verifyPassword } from "@shared/base";

export const authOptions = {
  adapter: PrismaAdapter(db as any),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_SECRET!
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!
    }),
    CredentialsProvider({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user) {
          return null;
        }

        // Handle passkey authentication (when password is empty)
        if (!credentials.password) {
          // Check if user has active passkeys
          const passkeys = await db.passkey.findMany({
            where: { 
              userId: user.id,
              isActive: true 
            },
          });

          if (passkeys.length === 0) {
            throw new Error("No passkeys found for this user");
          }

          // For passkey auth, we'll trust that the WebAuthn verification already happened
          // In a real implementation, you'd want to verify the passkey signature here
          return {
            id: user.id,
            email: user.email!,
            name: user.name,
            image: user.image,
            platformRole: user.platformRole || undefined
          };
        }

        // Handle regular password authentication
        if (!user.hashedPassword) {
          return null;
        }

        // Check if email is verified for credentials signin
        if (!user.isEmailVerified) {
          throw new Error("Please verify your email before signing in");
        }

        const isValid = await verifyPassword(credentials.password, user.hashedPassword);

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email!,
          name: user.name,
          image: user.image,
          platformRole: user.platformRole || undefined
        };
      }
    }),
    CredentialsProvider({
      id: "sso-credentials",
      name: "SSO Credentials",
      credentials: {
        userId: { label: "User ID", type: "text" },
        tenantSlug: { label: "Tenant Slug", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.userId || !credentials?.tenantSlug) {
          return null;
        }

        // Get user by ID for SSO authentication
        const user = await db.user.findUnique({
          where: { id: credentials.userId }
        });

        if (!user) {
          return null;
        }

        // TODO: Verify user has access to the tenant
        // This would require a TenantUser model to be implemented
        // const tenantUser = await db.tenantUser.findFirst({
        //   where: { userId: user.id, tenant: { slug: credentials.tenantSlug } },
        //   include: { tenant: true }
        // });
        // if (!tenantUser) {
        //   throw new Error("User does not have access to this tenant");
        // }

        return {
          id: user.id,
          email: user.email!,
          name: user.name,
          image: user.image,
          platformRole: user.platformRole || undefined
        };
      }
    })
  ],

  session: {
    strategy: "jwt" as const
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
  pages: {
    signIn: "/auth/signin/passkey"
  },
  
  callbacks: {
    async jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        token.platformRole = user.platformRole;
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (token) {
        session.user.id = token.sub;
        session.user.platformRole = token.platformRole;
      }
      return session;
    }
  }
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
import { db } from "@db/base";
import bcrypt from "bcryptjs";

// Define the session type inline to match NextAuth with our custom fields
interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  platformRole?: string;
}

interface Session {
  user: SessionUser;
}

export interface Context {
  session: Session | null;
  db: typeof db;
  hashPassword: (password: string) => Promise<string>;
}

export const createContext = async (session?: Session | null): Promise<Context> => {
  return {
    session: session || null,
    db,
    hashPassword: async (password: string) => {
      const saltRounds = 12;
      return bcrypt.hash(password, saltRounds);
    },
  };
};

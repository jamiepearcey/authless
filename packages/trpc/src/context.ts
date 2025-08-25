import { db } from "@db/base";
import bcrypt from "bcryptjs";

export interface Context {
  session: any;
  db: typeof db;
  hashPassword: (password: string) => Promise<string>;
}

export const createContext = async (session?: any): Promise<Context> => {
  return {
    session: session || {},
    db,
    hashPassword: async (password: string) => {
      const saltRounds = 12;
      return bcrypt.hash(password, saltRounds);
    },
  };
};

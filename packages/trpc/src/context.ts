import { getServerSession } from "next-auth";
import { db } from "@db/base";
// Note: authOptions will be imported differently in the actual implementation
// This is a placeholder for now
const authOptions = {} as any;

export interface Context {
  session: any;
  db: typeof db;
}

export const createContext = async (): Promise<Context> => {
  const session = await getServerSession(authOptions);

  return {
    session,
    db,
  };
};

import { getServerSession } from "next-auth";
import { authOptions } from "../../../apps/web/app/api/auth/[...nextauth]/route";
import { db } from "@db/base";

export const createContext = async () => {
  const session = await getServerSession(authOptions);
  return {
    session,
    db,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

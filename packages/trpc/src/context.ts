import * as bcrypt from "bcryptjs";
// import { authOptions } from "../../../apps/web/app/api/auth/[...nextauth]/route";
import { db } from "@db/base";
import { getTrpcOutboxService, type TrpcOutboxService } from "./outbox-service";
import { generateTraceId, extractTraceId, type TraceContext } from "@shared/base";

// Define the session type inline to match NextAuth with our custom fields
interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  platformRole?: string;
  tenantId?: string;
}

interface Session {
  user: SessionUser;
}

export interface Context {
  session: Session | null;
  db: typeof db;
  hashPassword: (password: string) => Promise<string>;
  outbox: TrpcOutboxService;
  trace: TraceContext;
}

export const createContext = async (
  session?: Session | null,
  headers?: Record<string, string | string[] | undefined>
): Promise<Context> => {
  const traceId = headers ? extractTraceId(headers) : undefined;
  
  return {
    session: session || null,
    db,
    hashPassword: async (password: string) => {
      const saltRounds = 12;
      return bcrypt.hash(password, saltRounds);
    },
    outbox: getTrpcOutboxService(db),
    trace: {
      traceId: traceId || generateTraceId(),
    },
  };
};

// Development-only context that bypasses authentication
export const createDevContext = async (): Promise<Context> => {
  // Create a mock admin session for development testing
  const mockSession: Session = {
    user: {
      id: "cm5qmqzrb000008ld7k1tdl1a", // Use the seed admin user ID
      email: "admin@authless.uk",
      name: "Dev Admin",
      platformRole: "admin"
    }
  };

  return {
    session: mockSession,
    db,
    hashPassword: async (password: string) => {
      const saltRounds = 12;
      return bcrypt.hash(password, saltRounds);
    },
    outbox: getTrpcOutboxService(db),
    trace: {
      traceId: generateTraceId(),
    },
  };
};

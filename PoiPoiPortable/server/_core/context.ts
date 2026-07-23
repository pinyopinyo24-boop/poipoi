import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  console.log("[Context] Request cookies:", opts.req.headers.cookie);
  console.log("[Context] Request URL:", opts.req.url);
  console.log("[Context] Request method:", opts.req.method);

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    console.log("[Context] Authentication error:", String(error));
    user = null;
  }

  console.log("[Context] Authenticated user:", user?.id, user?.name);

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}

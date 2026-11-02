import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { randomUUID } from "node:crypto";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  trace?: (stage: string) => void;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // Trace only chat/code operations; never log cookies, inputs or URL query strings.
  const procedure = (opts.req.url ?? "").split("?")[0];
  const tracked = /(?:^|[,/])(?:streaming\.chat|chat\.processMessage|unifiedTools\.codePreview|unifiedTools\.applyCodePreview)(?:,|$)/.test(procedure);
  const requestId = randomUUID();
  const startedAt = Date.now();
  const trace = tracked ? (stage: string) => {
    console.info("[PoiPoi request]", {
      requestId, stage, elapsedMs: Date.now() - startedAt,
    });
  } : undefined;
  if (trace) {
    trace("received");
    opts.res.once("finish", () => trace("response." + opts.res.statusCode));
    opts.res.once("close", () => {
      if (!opts.res.writableFinished) trace("connection.closed-before-response");
    });
  }

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    trace?.("authentication.unavailable");
    user = null;
  }

  trace?.(user ? "authentication.ready" : "authentication.guest");

  return {
    req: opts.req,
    res: opts.res,
    user,
    trace,
  };
}

import { z } from "zod";
import { publicProcedure } from "./trpc";
import { hashPassword, verifyPassword, createSessionToken, getSessionCookieOptions, COOKIE_NAME } from "./localAuth";
import { ENV } from "./env";
import * as db from "../db";
// Password storage moved to database

const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

const registerSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  name: z.string(),
  email: z.string().email().optional().nullable(),
});



export const localAuthRouter = {
  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const existingUser = await db.getUserByUsername(input.username);
        if (existingUser) {
          throw new Error("このユーザー名は既に使用されています");
        }

        const passwordHash = hashPassword(input.password);

        const result = await db.createUser({
          username: input.username,
          passwordHash,
          name: input.name,
          email: input.email || "",
          loginMethod: "local",
          role: "user",
        });

        // Password hash is now stored in database via createUser

        const cookieOptions = getSessionCookieOptions(ctx.req);
        console.log("[LocalAuth] Creating session token with:", { openId: result.openId, name: input.name, appId: ENV.appId });
        const sessionToken = await createSessionToken(
          {
            openId: result.openId,
            name: input.name,
            appId: ENV.appId,
          },
          ENV.cookieSecret
        );
        console.log("[LocalAuth] Session token created:", sessionToken.substring(0, 50) + "...");
        ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);
        console.log("[LocalAuth] Cookie set with options:", cookieOptions);

        return {
          success: true,
          user: {
            id: result.id,
            username: input.username,
            name: result.name,
            email: result.email,
            role: result.role,
          },
        };
      } catch (error: any) {
        console.error("[LocalAuth] Register error:", error);
        throw new Error(error.message || "登録に失敗しました");
      }
    }),

  login: publicProcedure
    .input(loginSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const user = await db.getUserByUsername(input.username);
        if (!user) {
          throw new Error("ユーザー名またはパスワードが正しくありません");
        }

        // Verify password from database
        if (!user.passwordHash || !verifyPassword(input.password, user.passwordHash)) {
          throw new Error("ユーザー名またはパスワードが正しくありません");
        }

        await db.updateLastSignedIn(user.id);

        const cookieOptions = getSessionCookieOptions(ctx.req);
        const sessionToken = await createSessionToken(
          {
            openId: user.openId,
            name: user.name || input.username,
            appId: ENV.appId,
          },
          ENV.cookieSecret
        );
        ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);

        return {
          success: true,
          user: {
            id: user.id,
            username: input.username,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        };
      } catch (error: any) {
        console.error("[LocalAuth] Login error:", error);
        throw new Error(error.message || "ログインに失敗しました");
      }
    }),

  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      return null;
    }

    // Extract username from openId (format: local_username_timestamp)
    const usernameMatch = ctx.user.openId.match(/^local_(.+?)_\d+$/);
    const username = usernameMatch ? usernameMatch[1] : "";

    return {
      id: ctx.user.id,
      username,
      name: ctx.user.name,
      email: ctx.user.email,
      role: ctx.user.role,
    };
  }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    ctx.res.clearCookie(COOKIE_NAME, {
      path: "/",
      maxAge: -1,
      secure: true,
      sameSite: "none",
      httpOnly: true,
    });
    return { success: true };
  }),
};

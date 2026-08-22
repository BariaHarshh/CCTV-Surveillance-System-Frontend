import { z } from "zod";
import { NextRequest } from "next/server";
import { ensureDbReady } from "@/lib/auth/init-super-admin";
import { logAuthActivity } from "@/lib/auth/activity";
import { authConfig } from "@/lib/auth/config";
import { verifyPassword } from "@/lib/auth/password";
import { checkRateLimit, getClientIp } from "@/lib/auth/rate-limit";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { toSafeUserMinimal } from "@/lib/auth/sanitize-user";
import { apiError, apiSuccess, handleApiError } from "@/lib/api/response";
import { User } from "@/models/User";

const loginSchema = z.object({
  userIdOrEmail: z.string().min(1, "Please enter your User ID or email."),
  password: z.string().min(1, "Please enter your password."),
  rememberMe: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    await ensureDbReady();

    const ip = getClientIp(request);
    const userAgent = request.headers.get("user-agent") ?? "";

    const rateLimit = checkRateLimit(`login:${ip}`, 20, 15 * 60 * 1000);
    if (!rateLimit.allowed) {
      return apiError(
        "Too many login attempts. Please try again later.",
        429,
        "RATE_LIMITED",
        { retryAfterSeconds: rateLimit.retryAfterSeconds }
      );
    }

    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Invalid request.";
      return apiError(firstError, 400, "VALIDATION_ERROR");
    }

    const { userIdOrEmail, password, rememberMe } = parsed.data;
    const identifier = userIdOrEmail.trim().toLowerCase();

    const user = await User.findOne({
      $or: [{ userId: identifier }, { email: identifier }],
    }).select("+passwordHash");

    if (!user) {
      await logAuthActivity({
        type: "LOGIN_FAILED",
        ipAddress: ip,
        userAgent,
        metadata: { reason: "user_not_found", identifier },
      });
      return apiError("Invalid User ID or password.", 401, "INVALID_CREDENTIALS");
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await logAuthActivity({
        type: "LOGIN_FAILED",
        userId: user._id,
        ipAddress: ip,
        userAgent,
        metadata: { reason: "account_locked", lockedUntil: user.lockedUntil },
      });
      return apiError(
        "Account Temporarily Locked",
        423,
        "ACCOUNT_LOCKED",
        {
          lockedUntil: user.lockedUntil.toISOString(),
          message:
            "Your account has been temporarily locked due to multiple failed login attempts. Please try again later.",
        }
      );
    }

    if (user.status === "SUSPENDED") {
      return apiError(
        "Account Suspended",
        403,
        "ACCOUNT_SUSPENDED",
        {
          message:
            "Your access to AI Campus Guardian has been temporarily suspended. Contact your organization administrator.",
        }
      );
    }

    if (user.status === "INACTIVE") {
      return apiError("Account Inactive", 403, "ACCOUNT_INACTIVE", {
        message: "Your account is inactive. Contact your organization administrator.",
      });
    }

    if (user.status === "LOCKED") {
      return apiError("Account Temporarily Locked", 423, "ACCOUNT_LOCKED", {
        message: "Your account is locked. Contact your organization administrator.",
      });
    }

    if (user.status === "PENDING") {
      return apiError("Account Pending", 403, "ACCOUNT_PENDING", {
        message: "Your account is pending activation. Contact your organization administrator.",
      });
    }

    if (user.status !== "ACTIVE") {
      return apiError("Account access denied.", 403, "ACCOUNT_DENIED");
    }

    const passwordValid = await verifyPassword(password, user.passwordHash);

    if (!passwordValid) {
      user.failedLoginAttempts += 1;

      if (user.failedLoginAttempts >= authConfig.maxLoginAttempts) {
        user.lockedUntil = new Date(Date.now() + authConfig.lockoutMinutes * 60 * 1000);
        user.failedLoginAttempts = 0;
        await user.save();

        await logAuthActivity({
          type: "ACCOUNT_LOCKED",
          userId: user._id,
          ipAddress: ip,
          userAgent,
          metadata: { lockoutMinutes: authConfig.lockoutMinutes },
        });

        return apiError(
          "Account Temporarily Locked",
          423,
          "ACCOUNT_LOCKED",
          {
            lockedUntil: user.lockedUntil.toISOString(),
            message:
              "Your account has been temporarily locked due to multiple failed login attempts. Please try again later.",
          }
        );
      }

      await user.save();

      await logAuthActivity({
        type: "LOGIN_FAILED",
        userId: user._id,
        ipAddress: ip,
        userAgent,
        metadata: { reason: "invalid_password", attempts: user.failedLoginAttempts },
      });

      return apiError("Invalid User ID or password.", 401, "INVALID_CREDENTIALS");
    }

    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    user.lastLogin = new Date();
    user.lastActive = new Date();
    await user.save();

    const token = await createSession(
      user._id.toString(),
      rememberMe,
      userAgent,
      ip
    );
    await setSessionCookie(token, rememberMe);

    await logAuthActivity({
      type: "LOGIN_SUCCESS",
      userId: user._id,
      ipAddress: ip,
      userAgent,
      metadata: { rememberMe },
    });

    if (user.role === "SUPER_ADMIN") {
      const { logAuditEvent } = await import("@/lib/audit/log");
      await logAuditEvent({
        actor: user,
        action: "SUPER_ADMIN_LOGIN",
        description: "Super Admin logged in to the platform",
        ipAddress: ip,
        userAgent,
      });
    }

    return apiSuccess({
      authenticated: true,
      user: toSafeUserMinimal(user),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

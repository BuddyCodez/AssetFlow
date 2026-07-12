import { createPrismaClient } from "@odoo-hackathon-2026/db";
import { env } from "@odoo-hackathon-2026/env/server";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins/email-otp";
import { organization } from "better-auth/plugins";

export function createAuth() {
  const prisma = createPrismaClient();

  return betterAuth({
    appName: "AssetFlow ERP",
    database: prismaAdapter(prisma, {
      provider: "postgresql",
    }),

    trustedOrigins: [env.CORS_ORIGIN],
    emailAndPassword: {
      enabled: true,
    },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    databaseHooks: {
      user: {
        create: {
          after: async (user: any) => {
            const db = createPrismaClient();
            await db.employee.create({
              data: {
                userId: user.id,
                organizationId: "",
                role: "EMPLOYEE",
                isActive: true,
              },
            });
          },
        },
      },
      member: {
        create: {
          after: async (member: any) => {
            const db = createPrismaClient();
            const existing = await db.employee.findUnique({
              where: { userId: member.userId },
            });
            const role = member.role === "owner" ? "ADMIN" : "EMPLOYEE";
            if (!existing) {
              await db.employee.create({
                data: {
                  userId: member.userId,
                  organizationId: member.organizationId,
                  role: role,
                  isActive: true,
                },
              });
            } else {
              await db.employee.update({
                where: { userId: member.userId },
                data: {
                  organizationId: member.organizationId,
                  role: member.role === "owner" ? "ADMIN" : existing.role,
                },
              });
            }
          },
        },
      },
    } as any,
    advanced: {
      defaultCookieAttributes: {
        sameSite: "none",
        secure: true,
        httpOnly: true,
      },
    },
    plugins: [
      organization({
        allowUserToCreateOrganization: true,
        // The creator of an org is automatically assigned the "owner" role by Better Auth.
        // Our app maps "owner" → ADMIN Employee (created via onboarding flow).
        // Invited members → EMPLOYEE role (set via invite acceptance flow).
        sendInvitationEmail: async ({ invitation, inviter, organization }) => {
          // TODO: wire up Resend when RESEND_API_KEY is available
          console.log(
            `[org.invite] org=${organization.name} inviter=${inviter.user.email} invitee=${invitation.email}`,
          );
        },
      }),
      emailOTP({
        async sendVerificationOTP({
          email,
          otp,
          type,
        }: {
          email: string;
          otp: string;
          type: string;
        }) {
          // TODO: wire up Resend when RESEND_API_KEY is available
          console.log(`[emailOTP] type=${type} email=${email} otp=${otp}`);
        },
        expiresIn: 300, // 5 minutes
      }),
    ],
  });
}

export const auth = createAuth();
export type Auth = typeof auth;

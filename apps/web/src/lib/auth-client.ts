import { env } from "@odoo-hackathon-2026/env/web";
import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";
import { organizationClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: env.VITE_SERVER_URL,
  plugins: [
    emailOTPClient(),
    organizationClient(),
  ],
});

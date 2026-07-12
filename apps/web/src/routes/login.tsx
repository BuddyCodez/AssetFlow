import { createFileRoute, redirect } from "@tanstack/react-router";

import { AuthPanel } from "@/components/auth/form";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/login")({
  component: RouteComponent,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) return; // not logged in, show login page

    // Logged in — check if they have an org
    const orgs = await authClient.organization.list();
    if (!orgs.data || orgs.data.length === 0) {
      // Has account but no org — send to onboarding
      throw redirect({ to: "/onboarding" });
    }

    // Fully set up — send to dashboard
    throw redirect({ to: "/dashboard" });
  },
});

function RouteComponent() {
  return (
    <AuthPanel
      brandName="AssetFlow ERP"
      brandDescriptor="Enterprise Asset & Resource Management"
    />
  );
}

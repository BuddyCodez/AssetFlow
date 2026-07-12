import { createFileRoute, redirect } from "@tanstack/react-router";
import { AnimatePresence } from "motion/react";
import { authClient } from "@/lib/auth-client";
import { CreateOrgModal } from "@/components/auth/create-org-modal";

export const Route = createFileRoute("/onboarding")({
  component: RouteComponent,
  beforeLoad: async () => {
    // Must be logged in to reach onboarding
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({ to: "/login" });
    }
    // If they already have an org, send them to dashboard
    const orgs = await authClient.organization.list();
    if (orgs.data && orgs.data.length > 0) {
      throw redirect({ to: "/dashboard" });
    }
  },
});

function RouteComponent() {
  const navigate = Route.useNavigate();

  return (
    <div
      className="antialiased h-screen flex items-center justify-center px-4"
      style={{
        background:
          "radial-gradient(ellipse 90% 70% at 50% -10%, oklch(0.22 0 0) 0%, oklch(0.09 0 0) 100%)",
      }}
    >
      {/* Brand watermark */}
      <div className="absolute top-6 left-6 flex items-center gap-2.5 select-none">
        <div className="h-7 w-7 rounded-lg bg-neutral-100 flex items-center justify-center">
          <span className="text-sm font-bold text-neutral-900 leading-none">E</span>
        </div>
        <span className="text-sm font-semibold text-neutral-200 tracking-tight">
          AssetFlow ERP
        </span>
      </div>

      {/* Inline card */}
      <AnimatePresence>
        <CreateOrgModal
          inline
          onSuccess={() => navigate({ to: "/dashboard" })}
        />
      </AnimatePresence>
    </div>
  );
}

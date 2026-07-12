import { createFileRoute } from "@tanstack/react-router";
import AuditPage from "@/components/audits/audits-page";

export const Route = createFileRoute("/_auth/asset_manager/audits")({
  component: RouteComponent,
});

function RouteComponent() {
  return <AuditPage />;
}

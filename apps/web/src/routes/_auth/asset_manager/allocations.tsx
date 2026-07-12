import { createFileRoute } from "@tanstack/react-router";
import { AllocationsPage } from "@/components/allocations/allocations-page";

export const Route = createFileRoute("/_auth/asset_manager/allocations")({
  component: RouteComponent,
});

function RouteComponent() {
  return <AllocationsPage isAdmin={false} />;
}

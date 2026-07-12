import { createFileRoute } from "@tanstack/react-router";
import { AllocationsPage } from "@/components/allocations/allocations-page";

export const Route = createFileRoute("/_auth/(admin)/allocations")({
  component: RouteComponent,
});

function RouteComponent() {
  return <AllocationsPage isAdmin={true} />;
}

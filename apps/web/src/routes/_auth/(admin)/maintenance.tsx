import { createFileRoute } from "@tanstack/react-router";
import MaintenancePage from "@/components/maintenance/maintenance-page";

export const Route = createFileRoute("/_auth/(admin)/maintenance")({
  component: RouteComponent,
});

function RouteComponent() {
  return <MaintenancePage />;
}

import { createFileRoute } from "@tanstack/react-router";
import { AssetsPage } from "@/components/assets/assets-page";

export const Route = createFileRoute("/_auth/asset_manager/assets")({
  component: RouteComponent,
});

function RouteComponent() {
  return <AssetsPage isAdmin={false} />;
}

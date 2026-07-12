import { Loader } from "@odoo-hackathon-2026/ui/components/motion/loader";

export default function RouteLoader() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Loader variant="ascii-braille" size={24} />
    </div>
  );
}

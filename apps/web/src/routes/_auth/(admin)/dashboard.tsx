import { createFileRoute } from "@tanstack/react-router";
import {
  Package,
  ArrowLeftRight,
  Wrench,
  CalendarCheck,
  ArrowRightLeft,
  Clock,
  AlertTriangle,
  Plus,
  CalendarPlus,
  ClipboardPlus,
} from "lucide-react";

export const Route = createFileRoute("/_auth/(admin)/dashboard")({
  component: RouteComponent,
});

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: "emerald" | "blue" | "amber" | "violet" | "rose" | "sky";
  description?: string;
}

const COLOR_MAP = {
  emerald: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    icon: "text-emerald-400",
    value: "text-emerald-300",
  },
  blue: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    icon: "text-blue-400",
    value: "text-blue-300",
  },
  amber: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    icon: "text-amber-400",
    value: "text-amber-300",
  },
  violet: {
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    icon: "text-violet-400",
    value: "text-violet-300",
  },
  rose: {
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    icon: "text-rose-400",
    value: "text-rose-300",
  },
  sky: {
    bg: "bg-sky-500/10",
    border: "border-sky-500/20",
    icon: "text-sky-400",
    value: "text-sky-300",
  },
};

function KpiCard({ label, value, icon, color, description }: KpiCardProps) {
  const c = COLOR_MAP[color];
  return (
    <div
      className={`rounded-xl border ${c.border} ${c.bg} p-4 flex flex-col gap-3 hover:brightness-110 transition-all duration-150`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-neutral-500 uppercase tracking-widest">
          {label}
        </p>
        <span className={`${c.icon}`}>{icon}</span>
      </div>
      <p className={`text-3xl font-bold tabular-nums ${c.value}`}>{value}</p>
      {description && (
        <p className="text-xs text-neutral-600">{description}</p>
      )}
    </div>
  );
}

function QuickActionButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-lg border border-neutral-800 bg-neutral-900
        px-3.5 py-2.5 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100
        transition-colors duration-100 cursor-pointer"
    >
      <span className="text-neutral-500">{icon}</span>
      {label}
    </button>
  );
}

function RouteComponent() {
  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-neutral-100">Dashboard</h1>
        <p className="text-sm text-neutral-500 mt-0.5">
          Real-time operational snapshot for your organization.
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <KpiCard
          label="Assets Available"
          value="—"
          icon={<Package size={16} />}
          color="emerald"
          description="Ready to be allocated"
        />
        <KpiCard
          label="Assets Allocated"
          value="—"
          icon={<ArrowLeftRight size={16} />}
          color="blue"
          description="Currently assigned"
        />
        <KpiCard
          label="Maintenance Today"
          value="—"
          icon={<Wrench size={16} />}
          color="amber"
          description="Scheduled for today"
        />
        <KpiCard
          label="Active Bookings"
          value="—"
          icon={<CalendarCheck size={16} />}
          color="violet"
          description="Ongoing or upcoming"
        />
        <KpiCard
          label="Pending Transfers"
          value="—"
          icon={<ArrowRightLeft size={16} />}
          color="sky"
          description="Awaiting approval"
        />
        <KpiCard
          label="Upcoming Returns"
          value="—"
          icon={<Clock size={16} />}
          color="rose"
          description="Due in next 7 days"
        />
      </div>

      {/* Overdue alert */}
      <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 flex items-center gap-3">
        <AlertTriangle size={16} className="text-rose-400 shrink-0" />
        <div>
          <p className="text-sm font-medium text-rose-300">Overdue Returns</p>
          <p className="text-xs text-neutral-500">
            No overdue returns detected. Allocations with past expected return dates will appear here.
          </p>
        </div>
        <span className="ml-auto text-2xl font-bold tabular-nums text-rose-300">0</span>
      </div>

      {/* Quick Actions */}
      <div>
        <p className="text-xs font-medium text-neutral-600 uppercase tracking-widest mb-2.5">
          Quick Actions
        </p>
        <div className="flex flex-wrap gap-2">
          <QuickActionButton label="Register Asset" icon={<Plus size={14} />} />
          <QuickActionButton label="Book Resource" icon={<CalendarPlus size={14} />} />
          <QuickActionButton label="Raise Maintenance Request" icon={<ClipboardPlus size={14} />} />
        </div>
      </div>

      {/* Getting started card */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-200">Getting Started</h2>
          <span className="inline-flex items-center rounded-full bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-xs text-blue-400">
            Setup Guide
          </span>
        </div>
        <ol className="space-y-2 text-sm text-neutral-500 list-none">
          {[
            { n: 1, text: "Set up your departments in Organization Setup" },
            { n: 2, text: "Create asset categories (Electronics, Furniture, Vehicles…)" },
            { n: 3, text: "Register your first asset in the Asset Registry" },
            { n: 4, text: "Invite employees and assign department heads" },
            { n: 5, text: "Start allocating assets and booking resources" },
          ].map(({ n, text }) => (
            <li key={n} className="flex items-start gap-2.5">
              <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-[10px] text-neutral-500 font-medium">
                {n}
              </span>
              {text}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

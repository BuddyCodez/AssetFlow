import {
  Outlet,
  createFileRoute,
  redirect,
  useNavigate,
  useLocation,
  Link,
  useMatches,
} from "@tanstack/react-router";
import {
  Settings,
  User,
  LogOut,
  ChevronRight,
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  CalendarCheck,
  Wrench,
  ClipboardList,
  BarChart3,
  Bell,
  Building2,
  ChevronsUpDown,
  Plus,
} from "lucide-react";
import { SidebarLeftIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { motion, AnimatePresence, MotionConfig } from "motion/react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@odoo-hackathon-2026/ui/components/dropdown-menu";

import { authClient } from "@/lib/auth-client";

// ─── Nav definition ──────────────────────────────────────────────────────────────
interface NavItem {
  label: string;
  url: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  { label: "Dashboard",      url: "/dashboard",    icon: <LayoutDashboard size={16} /> },
  { label: "Org Setup",      url: "/org-setup",    icon: <Building2 size={16} />,       adminOnly: true },
  { label: "Assets",         url: "/assets",       icon: <Package size={16} /> },
  { label: "Allocations",    url: "/allocations",  icon: <ArrowLeftRight size={16} /> },
  { label: "Bookings",       url: "/bookings",     icon: <CalendarCheck size={16} /> },
  { label: "Maintenance",    url: "/maintenance",  icon: <Wrench size={16} /> },
  { label: "Audits",         url: "/audits",       icon: <ClipboardList size={16} /> },
  { label: "Reports",        url: "/reports",      icon: <BarChart3 size={16} /> },
  { label: "Activity",       url: "/activity",     icon: <Bell size={16} /> },
  { label: "Settings",       url: "/settings",     icon: <Settings size={16} /> },
];

const ROUTE_LABELS: Record<string, string> = {
  "/_auth/dashboard":   "Dashboard",
  "/_auth/org-setup":   "Organization Setup",
  "/_auth/assets":      "Assets",
  "/_auth/allocations": "Allocations",
  "/_auth/bookings":    "Resource Bookings",
  "/_auth/maintenance": "Maintenance",
  "/_auth/audits":      "Audits",
  "/_auth/reports":     "Reports & Analytics",
  "/_auth/activity":    "Activity & Notifications",
  "/_auth/settings":    "Settings",
  "/_auth/profile":     "Profile",
};

// ─── Route ────────────────────────────────────────────────────────────────────
export const Route = createFileRoute("/_auth")({
  component: AuthLayout,
  errorComponent: AuthError,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({ to: "/login" });
    }
    // Check org membership — if none, redirect to onboarding
    const orgs = await authClient.organization.list();
    if (!orgs.data || orgs.data.length === 0) {
      throw redirect({ to: "/onboarding" });
    }
    return { session };
  },
});

function AuthError({ error }: { error: any }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center bg-neutral-950 text-neutral-100">
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 max-w-md w-full">
        <h2 className="text-lg font-semibold text-red-500 mb-2">Something went wrong</h2>
        <p className="text-sm text-neutral-400 break-words font-mono">
          {error?.message || "An unexpected error occurred."}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 rounded-md bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-200 hover:bg-neutral-700 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────
function AuthLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { session } = Route.useRouteContext();
  const matches = useMatches();

  const { data: activeOrg } = authClient.useActiveOrganization();
  const { data: orgList } = authClient.useListOrganizations();

  const [collapsed, setCollapsed] = useState(false);
  // Track which nav item the cursor is hovering (for the sliding bg)
  const [hoveredUrl, setHoveredUrl] = useState<string | null>(null);

  const user = session.data?.user;
  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const handleSignOut = async () => {
    await authClient.signOut();
    toast.success("Signed out");
    navigate({ to: "/login" });
  };

  const crumbs = matches
    .filter((m) => ROUTE_LABELS[m.routeId])
    .map((m) => ({ label: ROUTE_LABELS[m.routeId], path: m.pathname }));

  return (
    <MotionConfig reducedMotion="user">
      <div className="h-full flex overflow-hidden bg-neutral-950 text-neutral-100">

        {/* ══════════════════════════════════════════════
            SIDEBAR — full height, flat, no radius
        ══════════════════════════════════════════════ */}
        <motion.aside
          animate={{ width: collapsed ? 56 : 224 }}
          transition={{ type: "spring", stiffness: 260, damping: 28 }}
          className="shrink-0 flex flex-col overflow-hidden border-r border-neutral-800/70 bg-neutral-900"
        >
          {/* Brand/Org Switcher — same height as header for alignment */}
          <div className="flex h-12 shrink-0 items-center border-b border-neutral-800/70 px-2 gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger className="w-full flex items-center justify-between gap-2.5 h-9 rounded-lg px-2 text-left hover:bg-neutral-800/60 transition-colors duration-100 outline-none cursor-pointer select-none">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-6.5 w-6.5 shrink-0 flex items-center justify-center rounded-md bg-neutral-100 shadow-sm">
                    <span className="text-xs font-bold text-neutral-900 leading-none select-none">
                      {activeOrg?.logo ? (
                        <img src={activeOrg.logo} alt="" className="h-full w-full object-cover rounded-md" />
                      ) : (
                        (activeOrg?.name || "A")[0].toUpperCase()
                      )}
                    </span>
                  </div>
                  <AnimatePresence initial={false}>
                    {!collapsed && (
                      <motion.div
                        key="org-info"
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.15 }}
                        className="flex flex-col overflow-hidden whitespace-nowrap min-w-0 text-left"
                      >
                        <span className="font-semibold text-xs text-neutral-150 truncate leading-tight">
                          {activeOrg?.name || "AssetFlow ERP"}
                        </span>
                        <span className="text-[10px] text-neutral-500 font-mono truncate leading-none mt-0.5">
                          {activeOrg?.slug || "erp"}
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                {!collapsed && (
                  <ChevronsUpDown className="h-3 w-3 text-neutral-500 shrink-0" />
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="bottom" sideOffset={4} className="w-56 bg-neutral-900 border-neutral-800 text-neutral-200">
                <DropdownMenuLabel className="text-neutral-500 text-[10px] uppercase tracking-wider font-mono">
                  Organizations
                </DropdownMenuLabel>
                <DropdownMenuGroup className="p-0.5 space-y-0.5">
                  {orgList?.map((org) => (
                    <DropdownMenuItem
                      key={org.id}
                      onClick={async () => {
                        try {
                          await authClient.organization.setActive({ organizationId: org.id });
                          toast.success(`Switched to ${org.name}`);
                          window.location.reload();
                        } catch (err: any) {
                          toast.error(err?.message || "Failed to switch organization");
                        }
                      }}
                      className={`gap-2 cursor-pointer rounded-md ${
                        org.id === activeOrg?.id
                          ? "bg-neutral-800 text-neutral-150 font-medium"
                          : "text-neutral-400 hover:text-neutral-200"
                      }`}
                    >
                      <Building2 className="h-3.5 w-3.5" />
                      <div className="flex flex-col text-left">
                        <span className="text-xs">{org.name}</span>
                        <span className="text-[9px] text-neutral-500 font-mono leading-none">{org.slug}</span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="border-neutral-800" />
                <DropdownMenuItem
                  onClick={() => navigate({ to: "/onboarding" })}
                  className="gap-2 cursor-pointer text-neutral-400 hover:text-neutral-200 p-2"
                >
                  <Plus className="h-3.5 w-3.5 text-neutral-500" />
                  <span className="text-xs">Create new organization</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Nav */}
          <nav
            className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2 space-y-0.5"
            onMouseLeave={() => setHoveredUrl(null)}
          >
            {NAV.map((item) => {
              const active =
                pathname === item.url || pathname.startsWith(`${item.url}/`);
              const hovered = hoveredUrl === item.url;

              return (
                <div
                  key={item.url}
                  className="relative"
                  onMouseEnter={() => setHoveredUrl(item.url)}
                >
                  {/* Sliding hover background — shared layoutId creates the glide */}
                  {hovered && !active && (
                    <motion.span
                      layoutId="nav-hover-bg"
                      className="absolute inset-0 rounded-md bg-neutral-800/60"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  {/* Active background — separate, no layoutId */}
                  {active && (
                    <motion.span
                      className="absolute inset-0 rounded-md bg-neutral-800"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.15 }}
                    />
                  )}

                  <Link
                    to={item.url as "/dashboard"}
                    className={`
                      relative z-10 flex items-center gap-3 h-8 rounded-md px-2.5
                      text-sm outline-none select-none
                      focus-visible:ring-1 focus-visible:ring-neutral-600
                      transition-colors duration-100
                      ${active
                        ? "text-neutral-100 font-medium"
                        : "text-neutral-400 hover:text-neutral-200"
                      }
                    `}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    <AnimatePresence initial={false}>
                      {!collapsed && (
                        <motion.span
                          key={`lbl-${item.url}`}
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: "auto" }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={{ duration: 0.15 }}
                          className="overflow-hidden whitespace-nowrap"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Link>
                </div>
              );
            })}
          </nav>

          {/* Bottom: user */}
          <div className="shrink-0 border-t border-neutral-800/70 p-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                className="w-full flex items-center gap-3 h-8 rounded-md px-2.5
                  text-sm text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-200
                  transition-colors duration-100 outline-none cursor-pointer select-none"
              >
                <span className="h-5 w-5 shrink-0 flex items-center justify-center rounded-full bg-neutral-700 text-[10px] font-semibold text-neutral-200">
                  {initials}
                </span>
                <AnimatePresence initial={false}>
                  {!collapsed && (
                    <motion.span
                      key="user-lbl"
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden whitespace-nowrap"
                    >
                      <span className="block truncate text-neutral-200 text-xs font-medium">
                        {user?.name}
                      </span>
                    </motion.span>
                  )}
                </AnimatePresence>
              </DropdownMenuTrigger>
              <UserMenuContent user={user} handleSignOut={handleSignOut} side="top" align="start" />
            </DropdownMenu>
          </div>
        </motion.aside>

        {/* ══════════════════════════════════════════════
            RIGHT PANEL — header + scrollable content
        ══════════════════════════════════════════════ */}
        <div className="flex flex-1 flex-col min-w-0">

          {/* Header — breadcrumb on same level as sidebar brand */}
          <header className="flex h-12 shrink-0 items-center gap-3 border-b border-neutral-800/70 px-4 bg-neutral-950">

            {/* Collapse toggle — same icon as original MacOSSidebar */}
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="flex h-7 w-7 items-center justify-center rounded-md
                text-neutral-500 hover:bg-neutral-800/60 hover:text-neutral-300
                transition-colors duration-100 outline-none cursor-pointer
                focus-visible:ring-1 focus-visible:ring-neutral-600 shrink-0"
            >
              <HugeiconsIcon icon={SidebarLeftIcon} className="size-4" />
            </button>

            {/* Divider */}
            <div className="h-4 w-px bg-neutral-800" />

            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="flex-1 min-w-0">
              <ol className="flex items-center gap-1.5 text-sm">
                <li>
                  <Link
                    to="/dashboard"
                    className="text-neutral-500 hover:text-neutral-200 transition-colors"
                  >
                    Home
                  </Link>
                </li>
                {crumbs.map((crumb, i) => (
                  <li key={crumb.path} className="flex items-center gap-1.5">
                    <ChevronRight className="h-3.5 w-3.5 text-neutral-700 shrink-0" />
                    {i === crumbs.length - 1 ? (
                      <span className="font-medium text-neutral-200">{crumb.label}</span>
                    ) : (
                      <Link
                        to={crumb.path as "/dashboard"}
                        className="text-neutral-500 hover:text-neutral-200 transition-colors"
                      >
                        {crumb.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ol>
            </nav>

            {/* User avatar dropdown (header) */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center justify-center rounded-md p-1 
                text-sm text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-200 
                transition-colors outline-none cursor-pointer shrink-0">
                <span className="h-7 w-7 flex items-center justify-center rounded-full bg-neutral-700 text-xs font-semibold text-neutral-200">
                  {initials}
                </span>
              </DropdownMenuTrigger>
              <UserMenuContent user={user} handleSignOut={handleSignOut} side="bottom" align="end" />
            </DropdownMenu>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>

      </div>
    </MotionConfig>
  );
}

// ─── Shared Animated Dropdown Content ─────────────────────────────────────────
function UserMenuContent({
  user,
  handleSignOut,
  side,
  align,
}: {
  user: any;
  handleSignOut: () => void;
  side: "top" | "bottom";
  align: "start" | "end";
}) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // We map the items to manage hover state manually
  const items = [
    { id: "profile", label: "Profile", icon: <User className="h-3.5 w-3.5" /> },
    { id: "settings", label: "Settings", icon: <Settings className="h-3.5 w-3.5" /> },
  ];

  return (
    <DropdownMenuContent side={side} align={align} sideOffset={6}>
      <div className="px-2.5 py-2.5 text-xs">
        <div className="font-semibold text-neutral-200">{user?.name}</div>
        <div className="text-neutral-500 font-normal truncate mt-0.5">{user?.email}</div>
      </div>
      <DropdownMenuSeparator />
      <DropdownMenuGroup onMouseLeave={() => setHoveredItem(null)} className="p-0.5">
        {items.map((item) => (
          <div key={item.id} className="relative" onMouseEnter={() => setHoveredItem(item.id)}>
            {hoveredItem === item.id && (
              <motion.div
                layoutId="dropdown-hover-bg"
                className="absolute inset-0 bg-neutral-800 rounded-md"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              />
            )}
            <DropdownMenuItem className="relative z-10 gap-2 cursor-pointer focus:bg-transparent">
              {item.icon} {item.label}
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuGroup onMouseLeave={() => setHoveredItem(null)} className="p-0.5">
        <div className="relative" onMouseEnter={() => setHoveredItem("signout")}>
          {hoveredItem === "signout" && (
            <motion.div
              layoutId="dropdown-hover-bg"
              className="absolute inset-0 bg-red-500/10 rounded-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
            />
          )}
          <DropdownMenuItem
            variant="destructive"
            className="relative z-10 gap-2 cursor-pointer focus:bg-transparent"
            onClick={handleSignOut}
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </DropdownMenuItem>
        </div>
      </DropdownMenuGroup>
    </DropdownMenuContent>
  );
}

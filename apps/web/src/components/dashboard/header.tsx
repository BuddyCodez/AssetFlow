import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@odoo-hackathon-2026/ui/components/dropdown-menu";
import { useMatches, Link } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { LogOut, Settings, User, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

// Map route IDs to human-readable crumb labels
const ROUTE_LABELS: Record<string, string> = {
  "/_auth/dashboard": "Dashboard",
  "/_auth/settings": "Settings",
  "/_auth/profile": "Profile",
};

interface DashboardHeaderProps {
  userName?: string;
  userEmail?: string;
}

export function DashboardHeader({ userName, userEmail }: DashboardHeaderProps) {
  const navigate = useNavigate();
  const matches = useMatches();

  // Build breadcrumbs from matched routes, skipping the root + _auth layout segments
  const crumbs = matches
    .filter((m) => ROUTE_LABELS[m.routeId])
    .map((m) => ({ label: ROUTE_LABELS[m.routeId], path: m.pathname }));

  const handleSignOut = async () => {
    await authClient.signOut();
    toast.success("Signed out");
    navigate({ to: "/login" });
  };

  const initials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <header className="sticky top-0 z-20 flex h-11 shrink-0 items-center justify-between border-b border-neutral-200 dark:border-neutral-800/80 bg-neutral-50 dark:bg-neutral-950 px-4">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-1 text-sm">
          <li>
            <Link
              to="/dashboard"
              className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
            >
              Home
            </Link>
          </li>
          {crumbs.map((crumb, i) => (
            <li key={crumb.path} className="flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5 text-neutral-400 dark:text-neutral-600 shrink-0" />
              {i === crumbs.length - 1 ? (
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  to={crumb.path as "/dashboard"}
                  className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* Profile dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex items-center gap-2.5 rounded-none px-2 py-1.5 text-sm
            hover:bg-neutral-200 dark:hover:bg-neutral-800
            focus:outline-none transition-colors cursor-pointer"
        >
          {/* Avatar */}
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full
              bg-neutral-300 dark:bg-neutral-700 text-xs font-semibold
              text-neutral-800 dark:text-neutral-200 select-none"
          >
            {initials}
          </span>
          <span className="max-w-[140px] truncate font-medium text-neutral-800 dark:text-neutral-200">
            {userName ?? "Account"}
          </span>
        </DropdownMenuTrigger>

        <DropdownMenuContent side="bottom" align="end" sideOffset={6}>
          {/* Identity */}
          <DropdownMenuLabel>
            <div className="font-semibold text-foreground leading-tight">
              {userName}
            </div>
            <div className="text-muted-foreground font-normal mt-0.5 truncate">
              {userEmail}
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuItem className="gap-2 cursor-pointer">
              <User className="h-3.5 w-3.5" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 cursor-pointer">
              <Settings className="h-3.5 w-3.5" />
              Settings
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            variant="destructive"
            className="gap-2 cursor-pointer"
            onClick={handleSignOut}
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import {
  Bell,
  Activity,
  CheckCheck,
  CheckCircle2,
  Package,
  ArrowLeftRight,
  Wrench,
  CalendarCheck,
  ClipboardList,
  Building2,
  UserCheck,
  Clock,
  Filter,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import { orpc } from "@/utils/orpc";

function formatDate(date: Date) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const pad = (n: number) => String(n).padStart(2, "0");
  const d = date.getDate();
  const m = months[date.getMonth()];
  const y = date.getFullYear();
  const h = date.getHours();
  const min = date.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${m} ${d}, ${y} ${h12}:${pad(min)} ${ampm}`;
}

export const Route = createFileRoute("/_auth/(admin)/activity")({
  component: RouteComponent,
});

// ─── Activity Action Icons ──────────────────────────────────────────────────
const ACTION_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  ASSET_REGISTERED:     { icon: <Package className="h-3.5 w-3.5" />, color: "text-emerald-400 bg-emerald-500/10" },
  ASSET_UPDATED:        { icon: <Package className="h-3.5 w-3.5" />, color: "text-blue-400 bg-blue-500/10" },
  ALLOCATION_CREATED:   { icon: <ArrowLeftRight className="h-3.5 w-3.5" />, color: "text-blue-400 bg-blue-500/10" },
  ALLOCATION_RETURNED:  { icon: <ArrowLeftRight className="h-3.5 w-3.5" />, color: "text-violet-400 bg-violet-500/10" },
  TRANSFER_REQUESTED:   { icon: <ArrowLeftRight className="h-3.5 w-3.5" />, color: "text-amber-400 bg-amber-500/10" },
  TRANSFER_APPROVED:    { icon: <ArrowLeftRight className="h-3.5 w-3.5" />, color: "text-emerald-400 bg-emerald-500/10" },
  TRANSFER_REJECTED:    { icon: <ArrowLeftRight className="h-3.5 w-3.5" />, color: "text-red-400 bg-red-500/10" },
  MAINTENANCE_REQUESTED:{ icon: <Wrench className="h-3.5 w-3.5" />, color: "text-amber-400 bg-amber-500/10" },
  MAINTENANCE_APPROVED: { icon: <Wrench className="h-3.5 w-3.5" />, color: "text-emerald-400 bg-emerald-500/10" },
  MAINTENANCE_REJECTED: { icon: <Wrench className="h-3.5 w-3.5" />, color: "text-red-400 bg-red-500/10" },
  MAINTENANCE_RESOLVED: { icon: <Wrench className="h-3.5 w-3.5" />, color: "text-violet-400 bg-violet-500/10" },
  BOOKING_CREATED:      { icon: <CalendarCheck className="h-3.5 w-3.5" />, color: "text-sky-400 bg-sky-500/10" },
  BOOKING_CANCELLED:    { icon: <CalendarCheck className="h-3.5 w-3.5" />, color: "text-red-400 bg-red-500/10" },
  AUDIT_CYCLE_CREATED:  { icon: <ClipboardList className="h-3.5 w-3.5" />, color: "text-indigo-400 bg-indigo-500/10" },
  AUDIT_CYCLE_CLOSED:   { icon: <ClipboardList className="h-3.5 w-3.5" />, color: "text-neutral-400 bg-neutral-500/10" },
  AUDIT_ITEM_MARKED:    { icon: <ClipboardList className="h-3.5 w-3.5" />, color: "text-cyan-400 bg-cyan-500/10" },
  DEPARTMENT_CREATED:   { icon: <Building2 className="h-3.5 w-3.5" />, color: "text-emerald-400 bg-emerald-500/10" },
  EMPLOYEE_PROMOTED:    { icon: <UserCheck className="h-3.5 w-3.5" />, color: "text-amber-400 bg-amber-500/10" },
};

function getActionConfig(action: string) {
  return ACTION_CONFIG[action] || { icon: <Activity className="h-3.5 w-3.5" />, color: "text-neutral-400 bg-neutral-500/10" };
}

function formatActionLabel(action: string): string {
  return action
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Notification Bell Icon (unread badge) ──────────────────────────────────
function NotificationBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="absolute -top-1 -right-1 h-4 min-w-[14px] flex items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white px-1 shadow-md">
      {count > 9 ? "9+" : count}
    </span>
  );
}

// ─── Main Page Component ─────────────────────────────────────────────────────
function RouteComponent() {
  const [activeView, setActiveView] = useState<"notifications" | "activity">("notifications");
  const [filterAction, setFilterAction] = useState<string | null>(null);

  // Notifications
  const { data: notifData, refetch: refetchNotifs, isLoading: notifsLoading } = useQuery(
    orpc.notification.list.queryOptions(),
  );
  const notifications = notifData?.notifications || [];
  const unreadCount = notifData?.unreadCount || 0;

  // Activity log
  const { data: activityLog, refetch: refetchActivity, isLoading: activityLoading } = useQuery({
    ...orpc.notification.activityLog.queryOptions(),
    refetchInterval: 15000,
  });

  // Mutations
  const markReadMutation = useMutation(orpc.notification.markRead.mutationOptions());
  const markAllReadMutation = useMutation(orpc.notification.markAllRead.mutationOptions());

  const handleMarkRead = async (id: string) => {
    try {
      await markReadMutation.mutateAsync({ id });
      refetchNotifs();
    } catch {
      // silent
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllReadMutation.mutateAsync(undefined);
      toast.success("All notifications marked as read");
      refetchNotifs();
    } catch {
      toast.error("Failed to mark all as read");
    }
  };

  const filteredLogs = activityLog?.filter((log: any) => {
    if (filterAction && log.action !== filterAction) return false;
    return true;
  }) || [];

  // Available action types for filter
  const actionTypes = [...new Set(activityLog?.map((log: any) => log.action) || [])];

  return (
    <div className="p-6 space-y-6 min-h-screen pb-16 bg-neutral-950 text-neutral-100 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight text-neutral-100">Activity & Notifications</h1>
            {unreadCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-red-400">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-sm text-neutral-500">
            Real-time activity feed and notifications for your organization.
          </p>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 rounded-2xl bg-neutral-900/60 p-1 border border-neutral-800/60">
          {([
            { id: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
            { id: "activity", label: "Activity Log", icon: <Activity className="h-4 w-4" /> },
          ] as const).map((tab) => {
            const isActive = activeView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id)}
                className="relative flex items-center gap-2 h-9 px-4 rounded-xl text-xs font-medium outline-none transition-colors select-none cursor-pointer"
              >
                {isActive && (
                  <motion.span
                    layoutId="activity-tab-pill"
                    transition={{ type: "spring", stiffness: 200, damping: 22 }}
                    className="absolute inset-0 rounded-xl bg-neutral-800 border border-neutral-700/30 shadow-inner"
                  />
                )}
                <span className="relative z-10 flex items-center gap-2 transition-colors duration-150">
                  {tab.id === "notifications" ? (
                    <span className="relative">
                      {tab.icon}
                      <NotificationBadge count={unreadCount} />
                    </span>
                  ) : (
                    tab.icon
                  )}
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {activeView === "notifications" && unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-neutral-800 text-[11px] font-semibold text-neutral-400 hover:text-neutral-200 hover:border-neutral-700 transition-all cursor-pointer"
          >
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </button>
        )}

        {activeView === "activity" && (
          <div className="flex items-center gap-2">
            {filterAction && (
              <button
                onClick={() => setFilterAction(null)}
                className="text-[11px] text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                Clear filter
              </button>
            )}
            <button
              onClick={() => refetchActivity()}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-neutral-800 text-[11px] font-semibold text-neutral-400 hover:text-neutral-200 hover:border-neutral-700 transition-all cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeView === "notifications" && (
          <motion.div
            key="notifications"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-3"
          >
            <NotificationsList
              notifications={notifications}
              isLoading={notifsLoading}
              onMarkRead={handleMarkRead}
            />
          </motion.div>
        )}

        {activeView === "activity" && (
          <motion.div
            key="activity"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-3"
          >
            {/* Action Filter Pills */}
            <div className="flex flex-wrap gap-1.5">
              {actionTypes.slice(0, 10).map((action: string) => (
                <button
                  key={action}
                  onClick={() => setFilterAction(filterAction === action ? null : action)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-colors cursor-pointer ${
                    filterAction === action
                      ? "bg-neutral-800 border-neutral-700 text-neutral-200"
                      : "bg-neutral-900/60 border-neutral-800 text-neutral-500 hover:text-neutral-300 hover:border-neutral-700"
                  }`}
                >
                  <Filter className="h-3 w-3" />
                  {formatActionLabel(action)}
                </button>
              ))}
              {actionTypes.length > 10 && (
                <span className="text-[10px] text-neutral-600 self-center">+{actionTypes.length - 10} more</span>
              )}
            </div>

            <ActivityLogList logs={filteredLogs} isLoading={activityLoading} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Notifications List ──────────────────────────────────────────────────────
function NotificationsList({
  notifications,
  isLoading,
  onMarkRead,
}: {
  notifications: any[];
  isLoading: boolean;
  onMarkRead: (id: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-8 text-center">
        <p className="text-sm text-neutral-600">Loading notifications...</p>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-12 text-center space-y-2">
        <Bell className="h-8 w-8 text-neutral-700 mx-auto" />
        <p className="text-sm font-medium text-neutral-500">No notifications</p>
        <p className="text-xs text-neutral-600">You're all caught up! Notifications will appear here as actions happen.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/20 overflow-hidden">
      <div className="divide-y divide-neutral-800/50">
        {notifications.map((notif: any, idx: number) => {
          const config = getActionConfig(notif.type);
          return (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.02 }}
              onClick={() => !notif.isRead && onMarkRead(notif.id)}
              className={`flex items-start gap-3 p-4 transition-colors cursor-pointer ${
                notif.isRead
                  ? "opacity-60 hover:opacity-80"
                  : "bg-neutral-800/20 hover:bg-neutral-800/30"
              }`}
            >
              {/* Icon */}
              <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${config.color}`}>
                {config.icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-neutral-200">
                  {formatActionLabel(notif.type)}
                </p>
                <p className="text-[11px] text-neutral-500 mt-0.5 line-clamp-2">
                  {notif.message}
                </p>
                <p className="text-[10px] text-neutral-600 mt-1.5">
                  <Clock className="h-3 w-3 inline mr-1 align-text-bottom" />
                  {formatDate(new Date(notif.createdAt))}
                </p>
              </div>

              {/* Unread indicator */}
              {!notif.isRead && (
                <div className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-2" />
              )}

              {/* Mark read button */}
              {!notif.isRead && (
                <button
                  onClick={(e) => { e.stopPropagation(); onMarkRead(notif.id); }}
                  className="shrink-0 h-7 w-7 flex items-center justify-center rounded-lg border border-neutral-800 hover:border-neutral-700 text-neutral-500 hover:text-neutral-300 transition-all"
                  title="Mark as read"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </button>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Activity Log List ────────────────────────────────────────────────────────
function ActivityLogList({
  logs,
  isLoading,
}: {
  logs: any[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-8 text-center">
        <p className="text-sm text-neutral-600">Loading activity log...</p>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-12 text-center space-y-2">
        <Activity className="h-8 w-8 text-neutral-700 mx-auto" />
        <p className="text-sm font-medium text-neutral-500">No activity recorded yet</p>
        <p className="text-xs text-neutral-600">Actions like asset registration, transfers, and bookings will appear here.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/20 overflow-hidden">
      <div className="divide-y divide-neutral-800/50">
        {logs.map((log: any, idx: number) => {
          const config = getActionConfig(log.action);
          const employeeName = log.employee?.user?.name || "Unknown";
          const createdAt = new Date(log.createdAt);
          const today = new Date();

          return (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.005 }}
              className="flex items-start gap-3 p-4 hover:bg-neutral-800/10 transition-colors group"
            >
              {/* Icon */}
              <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${config.color} group-hover:scale-105 transition-transform`}>
                {config.icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-neutral-200">
                    {formatActionLabel(log.action)}
                  </span>
                  <span className="text-[10px] text-neutral-600">by</span>
                  <span className="text-xs font-medium text-neutral-400">{employeeName}</span>
                </div>
                {log.metadata && (
                  <p className="text-[11px] text-neutral-500 mt-0.5 line-clamp-1">
                    {Object.entries(log.metadata as Record<string, unknown>)
                      .filter(([k]) => k !== "name" || !log.metadata?.name)
                      .slice(0, 3)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(" • ")}
                  </p>
                )}
                <p className="text-[10px] text-neutral-600 mt-1.5">
                  <Clock className="h-3 w-3 inline mr-1 align-text-bottom" />
                  {createdAt.toDateString() === today.toDateString()
                    ? `Today at ${createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : formatDate(createdAt)}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { Wrench, Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Skeleton } from "@odoo-hackathon-2026/ui/components/skeleton";

import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_auth/my-maintenance")({
  component: MyMaintenancePage,
});

const STATUS_STYLES: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pending", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  APPROVED: { label: "Approved", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  TECHNICIAN_ASSIGNED: { label: "Technician Assigned", color: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  IN_PROGRESS: { label: "In Progress", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
  RESOLVED: { label: "Resolved", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  REJECTED: { label: "Rejected", color: "bg-red-500/10 text-red-400 border-red-500/20" },
};

function MyMaintenancePage() {
  const { data: employee } = useQuery(orpc.employee.current.queryOptions());
  const { data: requests, isLoading } = useQuery({
    ...orpc.maintenance.list.queryOptions(),
    enabled: !!employee,
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48 rounded-lg" />
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const myRequests = (requests || []).filter((r: any) => r.raisedById === employee?.id);
  const active = myRequests.filter((r: any) => !["RESOLVED", "REJECTED"].includes(r.status));
  const done = myRequests.filter((r: any) => ["RESOLVED", "REJECTED"].includes(r.status));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-100">My Maintenance Requests</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Track your maintenance requests and their status
        </p>
      </div>

      {myRequests.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-neutral-600">
          <Wrench className="h-12 w-12 mb-4 opacity-30" />
          <p className="text-sm font-medium">No maintenance requests</p>
          <p className="text-xs mt-1">Submit a request from any asset allocated to you.</p>
        </div>
      )}

      {active.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-neutral-300">
            Active ({active.length})
          </h2>
          {active.map((req: any, i: number) => {
            const style = STATUS_STYLES[req.status] || STATUS_STYLES.PENDING;
            return (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center justify-between p-4 rounded-xl border border-neutral-800 bg-neutral-900/40"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                    <Wrench className="h-5 w-5 text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-200 truncate">
                      {req.asset?.name}
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5 truncate max-w-md">
                      {req.issueDescription}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {req.priority === "CRITICAL" && (
                        <AlertTriangle className="h-3 w-3 text-red-400" />
                      )}
                      <span className="text-[10px] text-neutral-500">
                        Priority: {req.priority}
                      </span>
                    </div>
                  </div>
                </div>
                <span className={`text-[10px] px-2.5 py-1 rounded-full border ${style.color}`}>
                  {style.label}
                </span>
              </motion.div>
            );
          })}
        </div>
      )}

      {done.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-neutral-500">
            History ({done.length})
          </h2>
          {done.map((req: any, i: number) => {
            const isResolved = req.status === "RESOLVED";
            return (
              <motion.div
                key={req.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                className="flex items-center justify-between p-3 rounded-xl border border-neutral-800 bg-neutral-900/20"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center shrink-0">
                    {isResolved ? (
                      <CheckCircle className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-neutral-300 truncate">
                      {req.asset?.name}
                    </p>
                    <p className="text-[10px] text-neutral-500 mt-0.5 truncate max-w-xs">
                      {req.issueDescription}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] text-neutral-500">
                  {isResolved ? "Resolved" : "Rejected"}
                </span>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

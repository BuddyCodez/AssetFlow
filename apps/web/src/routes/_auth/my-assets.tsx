import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { Package, MapPin, Calendar, ArrowRight } from "lucide-react";
import { Loader } from "@odoo-hackathon-2026/ui/components/motion/loader";
import { Skeleton } from "@odoo-hackathon-2026/ui/components/skeleton";

import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_auth/my-assets")({
  component: MyAssetsPage,
});

function MyAssetsPage() {
  const { data: employee } = useQuery(orpc.employee.current.queryOptions());
  const { data: assets, isLoading } = useQuery({
    ...orpc.asset.list.queryOptions({ input: null }),
    enabled: !!employee,
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32 rounded-lg" />
          <Skeleton className="h-6 w-24 rounded-lg" />
        </div>
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const myAssets = (assets || []).filter(
    (a: any) => a.currentHolderId === employee?.id
  );
  const myAllocated = myAssets.filter((a: any) => a.status === "ALLOCATED");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-100">My Assets</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Assets currently allocated to you
        </p>
      </div>

      {myAllocated.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-neutral-600">
          <Package className="h-12 w-12 mb-4 opacity-30" />
          <p className="text-sm font-medium">No assets allocated to you</p>
          <p className="text-xs mt-1">Assets assigned to you will appear here.</p>
        </div>
      )}

      {myAllocated.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-neutral-300">
            Currently Allocated ({myAllocated.length})
          </h2>
          {myAllocated.map((asset: any, i: number) => (
            <motion.div
              key={asset.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center justify-between p-4 rounded-xl border border-emerald-500/15 bg-emerald-500/5"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <Package className="h-5 w-5 text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-200 truncate">
                    {asset.name}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-neutral-500 font-mono">
                      {asset.assetTag}
                    </span>
                    {asset.location && (
                      <>
                        <span className="text-[10px] text-neutral-600">•</span>
                        <span className="flex items-center gap-1 text-[10px] text-neutral-500">
                          <MapPin className="h-2.5 w-2.5" />
                          {asset.location}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Active
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

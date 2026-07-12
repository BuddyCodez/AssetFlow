import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  Wrench,
  Plus,
  X,
  Search,
  Layers,
  List,
  ThumbsUp,
  Ban,
  Hammer,
  Play,
  Flag,
  Package,
  Calendar,
  User,
  GripVertical,
  ArrowRight,
  CheckCircle2,
  Clock,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Loader } from "@odoo-hackathon-2026/ui/components/motion/loader";
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  useDroppable,
  useDraggable,
  type DragStartEvent,
  type DragEndEvent,
  closestCorners,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import { orpc } from "@/utils/orpc";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@odoo-hackathon-2026/ui/components/motion/select";

type ViewMode = "kanban" | "table";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  TECHNICIAN_ASSIGNED: "Tech Assigned",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  MEDIUM: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  HIGH: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  CRITICAL: "bg-red-500/10 text-red-400 border-red-500/20",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  APPROVED: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  REJECTED: "bg-red-500/10 text-red-400 border-red-500/20",
  TECHNICIAN_ASSIGNED: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  IN_PROGRESS: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  RESOLVED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const KANBAN_COLUMNS = [
  { status: "PENDING", label: "Pending", color: "border-t-amber-500/50", icon: <Clock className="h-3 w-3" />, gradient: "from-amber-500/5 to-transparent" },
  { status: "APPROVED", label: "Approved", color: "border-t-blue-500/50", icon: <ThumbsUp className="h-3 w-3" />, gradient: "from-blue-500/5 to-transparent" },
  { status: "TECHNICIAN_ASSIGNED", label: "Tech Assigned", color: "border-t-violet-500/50", icon: <Hammer className="h-3 w-3" />, gradient: "from-violet-500/5 to-transparent" },
  { status: "IN_PROGRESS", label: "In Progress", color: "border-t-sky-500/50", icon: <Zap className="h-3 w-3" />, gradient: "from-sky-500/5 to-transparent" },
  { status: "RESOLVED", label: "Resolved", color: "border-t-emerald-500/50", icon: <CheckCircle2 className="h-3 w-3" />, gradient: "from-emerald-500/5 to-transparent" },
];

const NEXT_VALID_TRANSITIONS: Record<string, string> = {
  PENDING: "APPROVED",
  APPROVED: "TECHNICIAN_ASSIGNED",
  TECHNICIAN_ASSIGNED: "IN_PROGRESS",
  IN_PROGRESS: "RESOLVED",
};

const getTransitionAction = (fromStatus: string, toStatus: string): string | null => {
  if (NEXT_VALID_TRANSITIONS[fromStatus] === toStatus) {
    if (toStatus === "APPROVED") return "approve";
    if (toStatus === "TECHNICIAN_ASSIGNED") return "assignTechnician";
    if (toStatus === "IN_PROGRESS") return "startWork";
    if (toStatus === "RESOLVED") return "resolve";
  }
  if (fromStatus === "PENDING" && toStatus === "REJECTED") return "reject";
  return null;
};

export default function MaintenancePage() {
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [showRaiseModal, setShowRaiseModal] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [historyAssetId, setHistoryAssetId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const reduce = useReducedMotion();

  const { data: employee } = useQuery(orpc.employee.current.queryOptions());
  const { data: assets } = useQuery(orpc.asset.list.queryOptions());
  const { data: maintenanceReqs, refetch: refetchReqs } = useQuery(orpc.maintenance.list.queryOptions());

  const { data: historyData } = useQuery({
    ...orpc.maintenance.getHistory.queryOptions({ input: { assetId: historyAssetId } }),
    enabled: !!historyAssetId,
  });

  const approveMutation = useMutation(orpc.maintenance.approve.mutationOptions());
  const rejectMutation = useMutation(orpc.maintenance.reject.mutationOptions());
  const assignTechMutation = useMutation(orpc.maintenance.assignTechnician.mutationOptions());
  const startWorkMutation = useMutation(orpc.maintenance.startWork.mutationOptions());
  const resolveMutation = useMutation(orpc.maintenance.resolve.mutationOptions());

  const isManager = employee?.role === "ADMIN" || employee?.role === "ASSET_MANAGER";

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const filteredRequests = useMemo(() => {
    if (!maintenanceReqs) return [];
    if (!searchQuery.trim()) return maintenanceReqs;
    const q = searchQuery.toLowerCase();
    return maintenanceReqs.filter(
      (r) =>
        r.asset?.name?.toLowerCase().includes(q) ||
        r.issueDescription?.toLowerCase().includes(q) ||
        STATUS_LABELS[r.status]?.toLowerCase().includes(q) ||
        r.technicianName?.toLowerCase().includes(q) ||
        r.priority?.toLowerCase().includes(q),
    );
  }, [maintenanceReqs, searchQuery]);

  const requestsByStatus = useMemo(() => {
    const map: Record<string, typeof filteredRequests> = {};
    KANBAN_COLUMNS.forEach((col) => { map[col.status] = []; });
    filteredRequests.forEach((r) => {
      if (map[r.status]) map[r.status].push(r);
    });
    return map;
  }, [filteredRequests]);

  const pendingCount = useMemo(() => maintenanceReqs?.filter((r) => r.status === "PENDING").length || 0, [maintenanceReqs]);
  const activeRequest = useMemo(() => {
    if (!activeDragId || !maintenanceReqs) return null;
    return maintenanceReqs.find((r) => r.id === activeDragId) || null;
  }, [activeDragId, maintenanceReqs]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveDragId(null);
      const { active, over } = event;
      if (!over || !active) return;
      const requestId = active.id as string;
      const overColumnId = over.id as string;
      const request = maintenanceReqs?.find((r) => r.id === requestId);
      if (!request) return;
      const currentStatus = request.status;
      if (currentStatus === overColumnId) return;

      let resolvedTargetStatus = overColumnId;
      if (!KANBAN_COLUMNS.find((c) => c.status === overColumnId)) {
        const targetReq = maintenanceReqs?.find((r) => r.id === overColumnId);
        if (targetReq) resolvedTargetStatus = targetReq.status;
        else return;
      }

      const action = getTransitionAction(currentStatus, resolvedTargetStatus);
      if (!action) {
        toast.error(`Cannot move from ${STATUS_LABELS[currentStatus]} to ${STATUS_LABELS[resolvedTargetStatus]}`);
        return;
      }

      try {
        if (action === "assignTechnician") {
          const name = prompt("Enter technician name:");
          if (!name || !name.trim()) return;
          await assignTechMutation.mutateAsync({ requestId, technicianName: name.trim() });
          toast.success("Technician assigned");
        } else if (action === "approve") {
          await approveMutation.mutateAsync({ requestId });
          toast.success("Request approved");
        } else if (action === "reject") {
          await rejectMutation.mutateAsync({ requestId });
          toast.success("Request rejected");
        } else if (action === "startWork") {
          await startWorkMutation.mutateAsync({ requestId });
          toast.success("Work started");
        } else if (action === "resolve") {
          await resolveMutation.mutateAsync({ requestId });
          toast.success("Request resolved");
        }
        refetchReqs();
        queryClient.invalidateQueries({ queryKey: ["asset"] });
      } catch (err: any) {
        toast.error(err.message || `Failed to ${action}`);
      }
    },
    [maintenanceReqs, approveMutation, rejectMutation, assignTechMutation, startWorkMutation, resolveMutation, refetchReqs, queryClient],
  );

  const handleAction = async (action: string, requestId: string, extra?: Record<string, string>) => {
    try {
      switch (action) {
        case "approve":
          await approveMutation.mutateAsync({ requestId });
          toast.success("Request approved"); break;
        case "reject":
          await rejectMutation.mutateAsync({ requestId });
          toast.success("Request rejected"); break;
        case "assignTechnician":
          await assignTechMutation.mutateAsync({ requestId, technicianName: extra?.technicianName || "Technician" });
          toast.success("Technician assigned"); break;
        case "startWork":
          await startWorkMutation.mutateAsync({ requestId });
          toast.success("Work started"); break;
        case "resolve":
          await resolveMutation.mutateAsync({ requestId });
          toast.success("Request resolved"); break;
      }
      refetchReqs();
      queryClient.invalidateQueries({ queryKey: ["asset"] });
    } catch (err: any) {
      toast.error(err.message || `Failed to ${action}`);
    }
  };

  const getNextActions = (status: string) => {
    if (!isManager) return [];
    switch (status) {
      case "PENDING": return [
        { action: "approve", label: "Approve", icon: <ThumbsUp className="h-3 w-3" />, color: "text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/20" },
        { action: "reject", label: "Reject", icon: <Ban className="h-3 w-3" />, color: "text-red-400 hover:bg-red-500/10 border-red-500/20" },
      ];
      case "APPROVED": return [
        { action: "assignTechnician", label: "Assign Tech", icon: <Hammer className="h-3 w-3" />, color: "text-violet-400 hover:bg-violet-500/10 border-violet-500/20" },
      ];
      case "TECHNICIAN_ASSIGNED": return [
        { action: "startWork", label: "Start Work", icon: <Play className="h-3 w-3" />, color: "text-sky-400 hover:bg-sky-500/10 border-sky-500/20" },
      ];
      case "IN_PROGRESS": return [
        { action: "resolve", label: "Resolve", icon: <Flag className="h-3 w-3" />, color: "text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/20" },
      ];
      default: return [];
    }
  };

  return (
    <div className="p-6 space-y-6 min-h-screen pb-16 bg-neutral-950 text-neutral-100 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="text-xl font-semibold tracking-tight text-neutral-100 flex items-center gap-2.5">
            <span className="h-7 w-7 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center">
              <Wrench className="h-4 w-4 text-neutral-300" />
            </span>
            Maintenance Management
          </h1>
          <p className="text-xs text-neutral-500 max-w-xl">
            Route repairs through approval workflows — drag cards between columns to advance the lifecycle.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-neutral-900 border border-neutral-800 p-0.5 rounded-xl">
            <button onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold select-none cursor-pointer transition-all ${viewMode === "kanban" ? "bg-neutral-800 text-neutral-100 shadow-sm" : "text-neutral-400 hover:text-neutral-200"}`}>
              <Layers className="h-3.5 w-3.5" /> Kanban
            </button>
            <button onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold select-none cursor-pointer transition-all ${viewMode === "table" ? "bg-neutral-800 text-neutral-100 shadow-sm" : "text-neutral-400 hover:text-neutral-200"}`}>
              <List className="h-3.5 w-3.5" /> Table
            </button>
          </div>
          <button onClick={() => setShowRaiseModal(true)}
            className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-neutral-100 text-neutral-900 text-xs font-bold hover:bg-neutral-200 transition-all select-none cursor-pointer active:scale-[0.96] shadow-sm">
            <Plus className="h-3.5 w-3.5" /> Raise Request
          </button>
        </div>
      </div>

      {/* Stats / Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-40" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">{pendingCount} Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">{maintenanceReqs?.filter((r) => r.status === "APPROVED").length || 0} Approved</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">{maintenanceReqs?.filter((r) => r.status === "RESOLVED").length || 0} Resolved</span>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500 pointer-events-none" />
          <input type="text" placeholder="Search requests..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-48 pl-8 pr-3 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 placeholder-neutral-600 outline-none hover:border-neutral-750 focus:border-neutral-600 transition-colors" />
        </div>
      </div>

      {/* Main Content */}
      {!maintenanceReqs || maintenanceReqs.length === 0 ? (
        <div className="border border-dashed border-neutral-800 rounded-3xl p-12 text-center text-sm text-neutral-500 flex flex-col items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center">
            <Wrench className="h-6 w-6 text-neutral-600" />
          </div>
          <div className="space-y-1">
            <p className="font-medium text-neutral-400">No maintenance requests yet</p>
            <p className="text-xs text-neutral-600 max-w-md">Raise a repair request to get started with the full lifecycle workflow.</p>
          </div>
          <button onClick={() => setShowRaiseModal(true)}
            className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-neutral-100 text-neutral-900 text-xs font-bold hover:bg-neutral-200 transition-all select-none cursor-pointer mt-1 active:scale-[0.96] shadow-sm">
            <Plus className="h-3.5 w-3.5" /> Raise First Request
          </button>
        </div>
      ) : viewMode === "kanban" ? (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 overflow-x-auto pb-4">
            {KANBAN_COLUMNS.map((col) => (
              <KanbanColumn key={col.status} status={col.status} label={col.label} color={col.color} icon={col.icon} gradient={col.gradient}
                requests={requestsByStatus[col.status] || []} isManager={isManager} onAction={handleAction} getNextActions={getNextActions}
                onShowHistory={(reqId, assetId) => { setSelectedRequestId(reqId); setShowHistoryPanel(true); setHistoryAssetId(assetId); }}
                reduce={reduce} />
            ))}
          </div>
          <DragOverlay dropAnimation={null}>
            {activeDragId && activeRequest ? <DragOverlayCard request={activeRequest} /> : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="bg-neutral-900/80 border border-neutral-800/70 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-neutral-800/70">
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Asset</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Issue</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Priority</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Reported By</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Technician</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Date</th>
                  <th className="text-right px-4 py-3 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="border-b border-neutral-850/60 hover:bg-neutral-800/30 transition-colors cursor-pointer"
                    onClick={() => { setSelectedRequestId(req.id); setShowHistoryPanel(true); setHistoryAssetId(req.assetId); }}>
                    <td className="px-4 py-3 font-medium text-neutral-200">{req.asset?.name || "—"}</td>
                    <td className="px-4 py-3 text-neutral-400 max-w-[200px] truncate">{req.issueDescription}</td>
                    <td className="px-4 py-3"><span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md border ${PRIORITY_COLORS[req.priority] || ""}`}>{PRIORITY_LABELS[req.priority] || req.priority}</span></td>
                    <td className="px-4 py-3"><span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md border ${STATUS_COLORS[req.status] || ""}`}>{STATUS_LABELS[req.status] || req.status}</span></td>
                    <td className="px-4 py-3 text-neutral-400">{req.raisedBy?.user?.name || "—"}</td>
                    <td className="px-4 py-3 text-neutral-400">{req.technicianName || "—"}</td>
                    <td className="px-4 py-3 text-neutral-500 font-mono tabular-nums">{new Date(req.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                    <td className="px-4 py-3 text-right">
                      {isManager && getNextActions(req.status).length > 0 && (
                        <div className="flex justify-end gap-1">
                          {getNextActions(req.status).map((act) => (
                            <button key={act.action} onClick={(e) => { e.stopPropagation(); if (act.action === "assignTechnician") { const name = prompt("Enter technician name:"); if (!name) return; handleAction(act.action, req.id, { technicianName: name }); } else { handleAction(act.action, req.id); } }}
                              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-semibold transition-all cursor-pointer border border-transparent hover:border-current ${act.color}`}>
                              {act.icon} {act.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showRaiseModal && (
          <RaiseRequestModal
            assets={assets?.filter((a) => a.status !== "DISPOSED" && a.status !== "RETIRED") || []}
            onClose={() => setShowRaiseModal(false)}
            onSuccess={() => { refetchReqs(); setShowRaiseModal(false); }} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showHistoryPanel && selectedRequestId && (
          <HistoryPanel historyData={historyData || []} onClose={() => { setShowHistoryPanel(false); setSelectedRequestId(null); setHistoryAssetId(""); }} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Kanban Column ──────────────────────────────────────────────────────────
function KanbanColumn({ status, label, color, icon, gradient, requests, isManager, onAction, getNextActions, onShowHistory, reduce }: any) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div ref={setNodeRef} className={`flex flex-col bg-neutral-900/80 border rounded-2xl min-w-[220px] max-h-[680px] shadow-sm transition-all duration-200 ${isOver ? "border-neutral-600 bg-neutral-900 shadow-lg ring-1 ring-neutral-700/30 scale-[1.01]" : "border-neutral-800/70 hover:border-neutral-700/70"}`}>
      <div className={`border-t-2 ${color} rounded-t-2xl px-3.5 py-3 border-b border-neutral-800/70 bg-gradient-to-b ${gradient}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><span className="text-neutral-400">{icon}</span><h3 className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider">{label}</h3></div>
          <span className="h-5 min-w-[20px] px-1.5 rounded-md bg-neutral-800/80 text-[10px] font-semibold text-neutral-400 flex items-center justify-center tabular-nums">{requests.length}</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2.5 p-2.5">
        {requests.length === 0 ? (
          <div className="h-24 border border-dashed border-neutral-800/60 rounded-xl flex flex-col items-center justify-center gap-1.5">
            <span className="text-[10px] text-neutral-600">Drop cards here</span>
            <ArrowRight className="h-3.5 w-3.5 text-neutral-700" />
          </div>
        ) : (
          requests.map((req: any, idx: number) => (
            <motion.div key={req.id} initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: idx * 0.03 }}>
              <DraggableCard request={req} isManager={isManager} onAction={onAction} getNextActions={getNextActions} onShowHistory={onShowHistory} />
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Draggable Card ─────────────────────────────────────────────────────────
function DraggableCard({ request, isManager, onAction, getNextActions, onShowHistory }: any) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: request.id, data: request });
  const style = transform ? { transform: CSS.Translate.toString(transform), zIndex: isDragging ? 999 : undefined } : undefined;
  return (
    <div ref={setNodeRef} style={style} onClick={() => onShowHistory(request.id, request.assetId)}
      className={`bg-neutral-900/95 border rounded-xl p-3 space-y-2.5 cursor-pointer transition-all group relative ${isDragging ? "border-neutral-600 shadow-xl opacity-50 scale-105" : "border-neutral-800/80 hover:border-neutral-700 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]"}`}>
      <div {...attributes} {...listeners}
        className="absolute top-2 right-2 h-6 w-6 rounded-md flex items-center justify-center text-neutral-600 hover:text-neutral-300 hover:bg-neutral-800 transition-colors opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}>
        <GripVertical className="h-3.5 w-3.5" />
      </div>
      <div className="flex items-start justify-between gap-2 pr-6">
        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md border ${PRIORITY_COLORS[request.priority] || "bg-neutral-800 text-neutral-400"}`}>{PRIORITY_LABELS[request.priority] || request.priority}</span>
        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md border ${STATUS_COLORS[request.status] || "bg-neutral-800 text-neutral-400"}`}>{STATUS_LABELS[request.status] || request.status}</span>
      </div>
      <p className="text-[11px] font-medium text-neutral-200 line-clamp-2 leading-snug">{request.issueDescription}</p>
      <div className="space-y-0.5 text-[9px] text-neutral-500">
        <div className="flex items-center gap-1.5"><Package className="h-3 w-3 shrink-0 text-neutral-600" /><span className="truncate">{request.asset?.name || "Unknown Asset"}</span></div>
        {request.raisedBy?.user?.name && <div className="flex items-center gap-1.5"><User className="h-3 w-3 shrink-0 text-neutral-600" /><span className="truncate">{request.raisedBy.user.name}</span></div>}
        {request.technicianName && <div className="flex items-center gap-1.5"><Hammer className="h-3 w-3 shrink-0 text-neutral-600" /><span className="truncate">{request.technicianName}</span></div>}
        <div className="flex items-center gap-1.5"><Calendar className="h-3 w-3 shrink-0 text-neutral-600" /><span className="font-mono">{new Date(request.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span></div>
      </div>
      {isManager && getNextActions(request.status).length > 0 && (
        <div className="border-t border-neutral-800/60 pt-2 flex flex-wrap gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150" onClick={(e) => e.stopPropagation()}>
          {getNextActions(request.status).map((act: any) => (
            <button key={act.action} onClick={() => { if (act.action === "assignTechnician") { const name = prompt("Enter technician name:"); if (!name) return; onAction(act.action, request.id, { technicianName: name }); } else { onAction(act.action, request.id); } }}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-semibold transition-all cursor-pointer border border-transparent hover:border-current ${act.color}`}>
              {act.icon} {act.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Drag Overlay ───────────────────────────────────────────────────────────
function DragOverlayCard({ request }: any) {
  return (
    <div className="bg-neutral-900 border-2 border-neutral-600 rounded-xl p-3 space-y-2.5 shadow-2xl w-[200px] rotate-2">
      <div className="flex items-start justify-between gap-2">
        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md border ${PRIORITY_COLORS[request.priority] || ""}`}>{PRIORITY_LABELS[request.priority] || request.priority}</span>
        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md border ${STATUS_COLORS[request.status] || ""}`}>{STATUS_LABELS[request.status] || request.status}</span>
      </div>
      <p className="text-[11px] font-medium text-neutral-200 line-clamp-2">{request.issueDescription}</p>
      <div className="text-[9px] text-neutral-500">{request.asset?.name}</div>
    </div>
  );
}

// ── Raise Request Modal ────────────────────────────────────────────────────
function RaiseRequestModal({ assets, onClose, onSuccess }: any) {
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [loading, setLoading] = useState(false);
  const createMutation = useMutation(orpc.maintenance.create.mutationOptions());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId || !issueDescription.trim()) return;
    setLoading(true);
    try {
      await createMutation.mutateAsync({ assetId: selectedAssetId, issueDescription: issueDescription.trim(), priority: priority as any });
      toast.success("Maintenance request created");
      onSuccess();
    } catch (err: any) { toast.error(err.message || "Failed to create request"); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-neutral-950/70 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative z-10 w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-800/70">
          <h2 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
            <span className="h-6 w-6 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center"><Wrench className="h-3.5 w-3.5 text-neutral-300" /></span>
            Raise Repair Request
          </h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider pl-1">Asset *</label>
            <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
              <SelectTrigger className="w-full h-10 px-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-neutral-300 outline-none cursor-pointer"><SelectValue placeholder="Select asset" /></SelectTrigger>
              <SelectContent className="max-h-52 overflow-y-auto">{assets.map((a: any) => (<SelectItem key={a.id} value={a.id}>{a.name} ({a.assetTag})</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider pl-1">Issue Description *</label>
            <textarea value={issueDescription} onChange={(e) => setIssueDescription(e.target.value)} placeholder="Describe the issue in detail..." rows={4}
              className="w-full resize-none rounded-xl bg-neutral-950 border border-neutral-800 px-3 py-2.5 text-sm text-neutral-300 placeholder-neutral-600 outline-none hover:border-neutral-750 focus:border-neutral-600 transition-colors" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider pl-1">Priority</label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="w-full h-10 px-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-neutral-300 outline-none cursor-pointer"><SelectValue placeholder="Select priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-3 pt-2.5 border-t border-neutral-800/70">
            <button type="button" onClick={onClose} className="h-10 px-4 rounded-xl border border-neutral-800 hover:border-neutral-700 text-sm text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer">Cancel</button>
            <button type="submit" disabled={loading || !selectedAssetId || !issueDescription.trim()}
              className="flex items-center gap-2 h-10 px-4 rounded-xl bg-neutral-100 text-neutral-900 text-sm font-semibold hover:bg-neutral-200 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]">
              {loading && <Loader variant="spinner" size={16} />} Submit Request
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── History Panel ──────────────────────────────────────────────────────────
function HistoryPanel({ historyData, onClose }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-neutral-950/30" />
      <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative z-10 w-full max-w-md h-full bg-neutral-900/95 backdrop-blur-xl border-l border-neutral-800 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-neutral-800/70">
          <h2 className="text-sm font-semibold text-neutral-100 flex items-center gap-2"><Calendar className="h-4 w-4 text-neutral-400" /> Maintenance History</h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {historyData.length === 0 ? (
            <div className="text-center py-16 text-sm text-neutral-600 flex flex-col items-center gap-2"><Calendar className="h-5 w-5 text-neutral-700" /><span>No maintenance history for this asset.</span></div>
          ) : (
            <div className="relative pl-6 border-l-2 border-neutral-800 space-y-4">
              {historyData.map((entry: any, i: number) => (
                <motion.div key={entry.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="relative">
                  <div className="absolute -left-[25px] top-1.5 h-3 w-3 rounded-full border-2 border-neutral-700 bg-neutral-900 flex items-center justify-center">
                    <div className={`h-1.5 w-1.5 rounded-full ${entry.status === "RESOLVED" ? "bg-emerald-500" : entry.status === "REJECTED" ? "bg-red-500" : "bg-neutral-500"}`} />
                  </div>
                  <div className="bg-neutral-900/80 border border-neutral-800/60 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md border ${STATUS_COLORS[entry.status] || ""}`}>{STATUS_LABELS[entry.status] || entry.status}</span>
                      <span className="text-[9px] text-neutral-500 font-mono tabular-nums">{new Date(entry.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                    </div>
                    <p className="text-[11px] text-neutral-300">{entry.issueDescription}</p>
                    <div className="flex items-center gap-2 text-[9px] text-neutral-500">
                      <span className={`px-1.5 py-0.5 rounded-md border ${PRIORITY_COLORS[entry.priority] || ""}`}>{PRIORITY_LABELS[entry.priority] || entry.priority}</span>
                      {entry.technicianName && <span className="flex items-center gap-1"><Hammer className="h-3 w-3" />{entry.technicianName}</span>}
                    </div>
                    {entry.resolvedAt && (
                      <div className="text-[9px] text-neutral-600 pt-1.5 border-t border-neutral-800/50 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500/60" /> Resolved: {new Date(entry.resolvedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import {
  ClipboardList,
  Plus,
  X,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Ban,
  FileText,
  Lock,
  Unlock,
  MapPin,
  Users,
  Download,
  RefreshCw,
  BarChart3,
  Clock,
  Search,
  Filter,
  ChevronRight,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Loader } from "@odoo-hackathon-2026/ui/components/motion/loader";

import { orpc } from "@/utils/orpc";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@odoo-hackathon-2026/ui/components/motion/select";
import {
  BouncyAccordion,
  type BouncyAccordionItem,
} from "@odoo-hackathon-2026/ui/components/motion/bouncy-accordion";

// ─── Types ───────────────────────────────────────────────────────────────────
type ViewMode = "overview" | "cycle" | "report";

interface AuditStats {
  total: number;
  verified: number;
  missing: number;
  damaged: number;
  pending: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const RESULT_CONFIG: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode; label: string }> = {
  PENDING: {
    bg: "bg-neutral-800/50",
    text: "text-neutral-400",
    border: "border-neutral-700",
    icon: null,
    label: "Pending",
  },
  VERIFIED: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    icon: <CheckCircle2 className="h-3 w-3" />,
    label: "Verified",
  },
  MISSING: {
    bg: "bg-red-500/15",
    text: "text-red-400",
    border: "border-red-500/30",
    icon: <Ban className="h-3 w-3" />,
    label: "Missing",
  },
  DAMAGED: {
    bg: "bg-orange-500/15",
    text: "text-orange-400",
    border: "border-orange-500/30",
    icon: <AlertTriangle className="h-3 w-3" />,
    label: "Damaged",
  },
};

// ─── SVG Chart Components ────────────────────────────────────────────────────
function DonutChart({ stats }: { stats: AuditStats }) {
  const total = stats.total || 1;
  const segments = [
    { value: stats.verified, color: "#10b981", label: "Verified" },
    { value: stats.missing, color: "#ef4444", label: "Missing" },
    { value: stats.damaged, color: "#f97316", label: "Damaged" },
    { value: stats.pending, color: "#6b7280", label: "Pending" },
  ];

  const radius = 60;
  const strokeWidth = 16;
  const circumference = 2 * Math.PI * radius;
  let accumulated = 0;

  return (
    <div className="flex items-center gap-6">
      <div className="relative">
        <svg width="160" height="160" viewBox="0 0 160 160">
          {segments.map((seg, idx) => {
            const dashArray = (seg.value / total) * circumference;
            const dashOffset = -accumulated * circumference;
            accumulated += seg.value / total;
            return (
              <circle
                key={idx}
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dashArray} ${circumference - dashArray}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                className="transition-all duration-500"
                style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-neutral-100">{stats.total}</span>
          <span className="text-[10px] text-neutral-500">Total Assets</span>
        </div>
      </div>
      <div className="space-y-2">
        {segments.map((seg, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="text-[11px] text-neutral-400 w-16">{seg.label}</span>
            <span className="text-[11px] font-bold text-neutral-200 tabular-nums">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProgressRing({ value, max, color }: { value: number; max: number; color: string }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const progress = (value / (max || 1)) * circumference;

  return (
    <div className="relative">
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={radius} fill="none" stroke="#262626" strokeWidth="6" />
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={`${progress} ${circumference - progress}`}
          strokeLinecap="round"
          className="transition-all duration-700"
          style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-neutral-100">{value}</span>
      </div>
    </div>
  );
}

// ─── Main Audit Page ─────────────────────────────────────────────────────────
export default function AuditPage() {

  const [viewMode, setViewMode] = useState<ViewMode>("overview");
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showAssignAuditorModal, setShowAssignAuditorModal] = useState(false);
  const [reportCycleId, setReportCycleId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Real-time polling for open cycles
  const { data: cycles, refetch: refetchCycles } = useQuery({
    ...orpc.audit.list.queryOptions(),
    refetchInterval: 60000, // Poll every 60 seconds for real-time updates
  });

  const { data: cycleDetail, refetch: refetchCycleDetail } = useQuery({
    ...orpc.audit.getById.queryOptions({ input: { id: selectedCycleId || "" } }),
    enabled: !!selectedCycleId,
    refetchInterval: selectedCycleId ? 30000 : false, // Poll selected cycle every 30s
  });

  const { data: report, refetch: refetchReport } = useQuery({
    ...orpc.audit.getReport.queryOptions({ input: { cycleId: reportCycleId } }),
    enabled: !!reportCycleId,
  });

  const { data: employees } = useQuery(orpc.employee.list.queryOptions());

  // Mutations
  const closeMutation = useMutation(orpc.audit.close.mutationOptions());
  const markItemMutation = useMutation(orpc.audit.markItem.mutationOptions());
  const assignAuditorMutation = useMutation(orpc.audit.assignAuditor.mutationOptions());

  // Calculate stats for expanded cycle
  const cycleStats: AuditStats | null = useMemo(() => {
    if (!cycleDetail?.items) return null;
    return {
      total: cycleDetail.items.length,
      verified: cycleDetail.items.filter((i: any) => i.result === "VERIFIED").length,
      missing: cycleDetail.items.filter((i: any) => i.result === "MISSING").length,
      damaged: cycleDetail.items.filter((i: any) => i.result === "DAMAGED").length,
      pending: cycleDetail.items.filter((i: any) => i.result === "PENDING").length,
    };
  }, [cycleDetail]);

  // Calculate overall stats across all cycles
  const overallStats = useMemo(() => {
    if (!cycles) return { totalCycles: 0, openCycles: 0, closedCycles: 0 };
    return {
      totalCycles: cycles.length,
      openCycles: cycles.filter((c: any) => c.status === "OPEN").length,
      closedCycles: cycles.filter((c: any) => c.status === "CLOSED").length,
    };
  }, [cycles]);

  // Filter cycles
  const filteredCycles = useMemo(() => {
    if (!cycles) return [];
    return cycles.filter((cycle: any) => {
      const matchesSearch =
        searchQuery === "" ||
        cycle.scopeLocation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cycle.scopeDepartmentId?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || cycle.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [cycles, searchQuery, statusFilter]);

  // Handlers
  const handleCloseCycle = async (cycleId: string) => {
    try {
      const result = await closeMutation.mutateAsync({ cycleId });
      toast.success(`Cycle closed. ${result.missingItemsCount} asset(s) marked as LOST.`);
      refetchCycles();
      if (selectedCycleId === cycleId) {
        setSelectedCycleId(null);
        setViewMode("overview");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to close cycle");
    }
  };

  const handleMarkItem = async (itemId: string, result: string) => {
    try {
      await markItemMutation.mutateAsync({ itemId, result: result as any });
      toast.success(`Item marked as ${result}`);
      refetchCycleDetail();
    } catch (err: any) {
      toast.error(err.message || "Failed to mark item");
    }
  };

  const handleAssignAuditor = async (cycleId: string, employeeId: string) => {
    try {
      await assignAuditorMutation.mutateAsync({ cycleId, employeeId });
      toast.success("Auditor assigned successfully");
      refetchCycleDetail();
      setShowAssignAuditorModal(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to assign auditor");
    }
  };

  const handleExportPDF = useCallback(() => {
    if (!report || !cycleDetail) return;

    // Create printable content
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to export PDF");
      return;
    }

    const stats = report.summary;
    const missingItems = report.items.filter((i: any) => i.result === "MISSING");
    const damagedItems = report.items.filter((i: any) => i.result === "DAMAGED");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Audit Report - ${new Date(report.cycle.startDate).toLocaleDateString()}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #1a1a1a; }
            .header { border-bottom: 2px solid #e5e5e5; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
            .header p { color: #666; font-size: 14px; }
            .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 30px; }
            .stat-card { border: 1px solid #e5e5e5; border-radius: 8px; padding: 16px; text-align: center; }
            .stat-value { font-size: 28px; font-weight: 700; }
            .stat-label { font-size: 12px; color: #666; margin-top: 4px; }
            .section { margin-bottom: 30px; }
            .section h2 { font-size: 18px; font-weight: 600; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #e5e5e5; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e5e5; }
            th { background: #f5f5f5; font-weight: 600; font-size: 12px; text-transform: uppercase; }
            td { font-size: 14px; }
            .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
            .status-verified { background: #d1fae5; color: #065f46; }
            .status-missing { background: #fee2e2; color: #991b1b; }
            .status-damaged { background: #ffedd5; color: #9a3412; }
            .status-pending { background: #f3f4f6; color: #374151; }
            .discrepancy { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
            .discrepancy h3 { color: #92400e; font-size: 14px; margin-bottom: 8px; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #666; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Asset Audit Report</h1>
            <p>Generated on ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
            <p>Audit Period: ${new Date(report.cycle.startDate).toLocaleDateString()} - ${new Date(report.cycle.endDate).toLocaleDateString()}</p>
          </div>

          <div class="stats">
            <div class="stat-card">
              <div class="stat-value">${stats.total}</div>
              <div class="stat-label">Total Assets</div>
            </div>
            <div class="stat-card">
              <div class="stat-value" style="color: #059669">${stats.verified}</div>
              <div class="stat-label">Verified</div>
            </div>
            <div class="stat-card">
              <div class="stat-value" style="color: #dc2626">${stats.missing}</div>
              <div class="stat-label">Missing</div>
            </div>
            <div class="stat-card">
              <div class="stat-value" style="color: #ea580c">${stats.damaged}</div>
              <div class="stat-label">Damaged</div>
            </div>
          </div>

          ${stats.missing > 0 ? `
          <div class="discrepancy">
            <h3>⚠️ Discrepancy Report</h3>
            <p>${stats.missing} asset(s) were flagged as missing during this audit cycle. These assets have been automatically marked as LOST in the system.</p>
          </div>
          ` : ""}

          <div class="section">
            <h2>Audit Summary</h2>
            <table>
              <thead>
                <tr>
                  <th>Asset Tag</th>
                  <th>Asset Name</th>
                  <th>Location</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${report.items
                  .map(
                    (item: any) => `
                  <tr>
                    <td><strong>${item.asset?.assetTag || "N/A"}</strong></td>
                    <td>${item.asset?.name || "Unknown"}</td>
                    <td>${item.asset?.location || "Unassigned"}</td>
                    <td><span class="status-badge status-${item.result?.toLowerCase() || "pending"}">${item.result || "PENDING"}</span></td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>

          ${missingItems.length > 0 ? `
          <div class="section">
            <h2>Missing Assets (${missingItems.length})</h2>
            <table>
              <thead>
                <tr>
                  <th>Asset Tag</th>
                  <th>Asset Name</th>
                  <th>Last Known Location</th>
                </tr>
              </thead>
              <tbody>
                ${missingItems
                  .map(
                    (item: any) => `
                  <tr>
                    <td><strong>${item.asset?.assetTag || "N/A"}</strong></td>
                    <td>${item.asset?.name || "Unknown"}</td>
                    <td>${item.asset?.location || "Unassigned"}</td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
          ` : ""}

          ${damagedItems.length > 0 ? `
          <div class="section">
            <h2>Damaged Assets (${damagedItems.length})</h2>
            <table>
              <thead>
                <tr>
                  <th>Asset Tag</th>
                  <th>Asset Name</th>
                  <th>Location</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                ${damagedItems
                  .map(
                    (item: any) => `
                  <tr>
                    <td><strong>${item.asset?.assetTag || "N/A"}</strong></td>
                    <td>${item.asset?.name || "Unknown"}</td>
                    <td>${item.asset?.location || "Unassigned"}</td>
                    <td>${item.notes || "No notes provided"}</td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
          ` : ""}

          <div class="footer">
            <p>Report generated by AssetFlow ERP System</p>
            <p>Audit conducted by ${report.auditorCount} auditor(s)</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
    toast.success("PDF export opened in new window");
  }, [report]);

  return (
    <div className="p-6 space-y-6 min-h-screen pb-16 bg-neutral-950 text-neutral-100 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-neutral-100 flex items-center gap-2.5">
            <span className="h-7 w-7 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center">
              <ClipboardList className="h-4 w-4 text-neutral-300" />
            </span>
            Asset Audits
          </h1>
          <p className="text-xs text-neutral-500 max-w-xl">
            Run structured verification cycles, track discrepancies, and auto-generate reports.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetchCycles()}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-neutral-800 text-xs font-semibold text-neutral-400 hover:text-neutral-200 hover:border-neutral-700 transition-all cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-neutral-100 text-neutral-900 text-xs font-bold hover:bg-white transition-all select-none cursor-pointer active:scale-[0.97] shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" /> New Audit Cycle
          </button>
        </div>
      </div>

      {/* Stats Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Total Cycles</span>
            <ClipboardList className="h-4 w-4 text-neutral-600" />
          </div>
          <p className="text-2xl font-bold text-neutral-100 tabular-nums">{overallStats.totalCycles}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider">Open</span>
            <Unlock className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 tabular-nums">{overallStats.openCycles}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Closed</span>
            <Lock className="h-4 w-4 text-neutral-600" />
          </div>
          <p className="text-2xl font-bold text-neutral-300 tabular-nums">{overallStats.closedCycles}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Last Activity</span>
            <Clock className="h-4 w-4 text-neutral-600" />
          </div>
          <p className="text-sm font-semibold text-neutral-300">
            {cycles && cycles.length > 0
              ? new Date(cycles[0].startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
              : "No data"}
          </p>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Search by location or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-10 pr-4 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 placeholder-neutral-600 outline-none focus:border-neutral-700 transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-neutral-500" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 h-9 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cycles List */}
      {!cycles || cycles.length === 0 ? (
        <EmptyState onCreateClick={() => setShowCreateModal(true)} />
      ) : (
        <AccordionCyclesList
          cycles={filteredCycles}
          selectedCycleId={selectedCycleId}
          onSelectCycle={(id) => {
            setSelectedCycleId(id);
            setViewMode(id ? "cycle" : "overview");
          }}
          onCloseCycle={handleCloseCycle}
          onViewReport={(id) => {
            setReportCycleId(id);
            setShowReportModal(true);
          }}
          onAssignAuditor={(id) => {
            setSelectedCycleId(id);
            setShowAssignAuditorModal(true);
          }}
        />
      )}

      {/* Expanded Cycle Detail */}
      <AnimatePresence>
        {selectedCycleId && cycleDetail && viewMode === "cycle" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="space-y-6"
          >
            {/* Cycle Header with Stats */}
            <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-100">Audit Cycle Details</h2>
                  <p className="text-xs text-neutral-500 mt-1">
                    {new Date(cycleDetail.startDate).toLocaleDateString()} - {new Date(cycleDetail.endDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAssignAuditorModal(true)}
                    className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-neutral-800 text-[11px] font-semibold text-neutral-300 hover:text-neutral-100 hover:border-neutral-700 transition-all cursor-pointer"
                  >
                    <UserCheck className="h-3.5 w-3.5" /> Assign Auditor
                  </button>
                  <button
                    onClick={() => {
                      setReportCycleId(selectedCycleId);
                      setShowReportModal(true);
                    }}
                    className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-neutral-800 text-[11px] font-semibold text-neutral-300 hover:text-neutral-100 hover:border-neutral-700 transition-all cursor-pointer"
                  >
                    <FileText className="h-3.5 w-3.5" /> View Report
                  </button>
                  {cycleDetail.status === "OPEN" && (
                    <button
                      onClick={() => handleCloseCycle(selectedCycleId)}
                      className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] font-semibold text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
                    >
                      <Lock className="h-3.5 w-3.5" /> Close Cycle
                    </button>
                  )}
                </div>
              </div>

              {/* Auditors List */}
              {cycleDetail.auditors && cycleDetail.auditors.length > 0 && (
                <div className="mb-5">
                  <h3 className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">Assigned Auditors</h3>
                  <div className="flex flex-wrap gap-2">
                    {cycleDetail.auditors.map((auditor: any) => (
                      <div
                        key={auditor.employeeId}
                        className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800/50 border border-neutral-700 rounded-lg"
                      >
                        <Users className="h-3.5 w-3.5 text-neutral-400" />
                        <span className="text-xs text-neutral-300">{auditor.employee?.user?.name || "Unknown"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Progress Chart */}
              {cycleStats && (
                <div className="flex flex-col md:flex-row md:items-center gap-6 p-4 bg-neutral-950/40 rounded-xl border border-neutral-800/40">
                  <DonutChart stats={cycleStats} />
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <ProgressRing value={cycleStats.verified} max={cycleStats.total} color="#10b981" />
                      <p className="text-[10px] text-neutral-500 mt-2">Verified</p>
                    </div>
                    <div className="text-center">
                      <ProgressRing value={cycleStats.missing} max={cycleStats.total} color="#ef4444" />
                      <p className="text-[10px] text-neutral-500 mt-2">Missing</p>
                    </div>
                    <div className="text-center">
                      <ProgressRing value={cycleStats.damaged} max={cycleStats.total} color="#f97316" />
                      <p className="text-[10px] text-neutral-500 mt-2">Damaged</p>
                    </div>
                    <div className="text-center">
                      <ProgressRing value={cycleStats.pending} max={cycleStats.total} color="#6b7280" />
                      <p className="text-[10px] text-neutral-500 mt-2">Pending</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Assets Table */}
            <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-neutral-800/70">
                <h3 className="text-sm font-semibold text-neutral-200">Assets to Verify</h3>
                <p className="text-[11px] text-neutral-500 mt-1">
                  Click on a status button to mark the asset verification result
                </p>
              </div>

              {cycleDetail.items.length === 0 ? (
                <div className="p-8 text-center text-neutral-500">
                  No assets assigned to this audit cycle.
                </div>
              ) : (
                <div className="divide-y divide-neutral-800/50">
                  {cycleDetail.items.map((item: any, idx: number) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className="flex items-center justify-between p-4 hover:bg-neutral-800/30 transition-colors"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-neutral-400">
                            {item.asset?.assetTag?.slice(-4) || "----"}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-neutral-200 truncate">
                            {item.asset?.name}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] text-neutral-500 font-mono">{item.asset?.assetTag}</span>
                            <span className="text-[10px] text-neutral-600">•</span>
                            <span className="flex items-center gap-1 text-[10px] text-neutral-500">
                              <MapPin className="h-3 w-3" />
                              {item.asset?.location || "Unassigned"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {["VERIFIED", "MISSING", "DAMAGED"].map((result) => {
                          const config = RESULT_CONFIG[result];
                          const isActive = item.result === result;
                          return (
                            <motion.button
                              key={result}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleMarkItem(item.id, result)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                                isActive
                                  ? `${config.bg} ${config.text} ${config.border}`
                                  : "bg-neutral-900 text-neutral-500 border-neutral-800 hover:border-neutral-700 hover:text-neutral-400"
                              }`}
                            >
                              {config.icon}
                              {config.label}
                            </motion.button>
                          );
                        })}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateAuditModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              refetchCycles();
              setShowCreateModal(false);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showReportModal && report && (
          <ReportModal
            report={report}
            onClose={() => setShowReportModal(false)}
            onExport={handleExportPDF}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAssignAuditorModal && selectedCycleId && (
          <AssignAuditorModal
            cycleId={selectedCycleId}
            employees={employees || []}
            currentAuditors={cycleDetail?.auditors?.map((a: any) => a.employeeId) || []}
            onClose={() => setShowAssignAuditorModal(false)}
            onAssign={(employeeId) => handleAssignAuditor(selectedCycleId, employeeId)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Empty State Component ───────────────────────────────────────────────────
function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="border border-dashed border-neutral-800 rounded-2xl p-12 text-center flex flex-col items-center gap-4"
    >
      <div className="h-16 w-16 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center">
        <ClipboardList className="h-7 w-7 text-neutral-600" />
      </div>
      <div className="space-y-1.5">
        <p className="font-medium text-neutral-300">No audit cycles yet</p>
        <p className="text-xs text-neutral-500 max-w-sm">
          Create your first audit cycle to start verifying assets across your organization.
        </p>
      </div>
      <button
        onClick={onCreateClick}
        className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-neutral-100 text-neutral-900 text-xs font-bold hover:bg-white transition-all select-none cursor-pointer mt-1 active:scale-[0.97] shadow-sm"
      >
        <Plus className="h-3.5 w-3.5" /> Create First Cycle
      </button>
    </motion.div>
  );
}

// ─── Accordion Cycles List Component ─────────────────────────────────────────
function AccordionCyclesList({
  cycles,
  selectedCycleId,
  onSelectCycle,
  onCloseCycle,
  onViewReport,
  onAssignAuditor,
}: {
  cycles: any[];
  selectedCycleId: string | null;
  onSelectCycle: (id: string | null) => void;
  onCloseCycle: (id: string) => void;
  onViewReport: (id: string) => void;
  onAssignAuditor: (id: string) => void;
}) {
  const accordionItems: BouncyAccordionItem[] = cycles.map((cycle) => ({
    id: cycle.id,
    title: (
      <div className="flex items-center gap-3 w-full">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
            cycle.status === "OPEN"
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
              : "bg-neutral-800 text-neutral-400 border border-neutral-700"
          }`}
        >
          {cycle.status === "OPEN" ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
          {cycle.status}
        </span>
        <span className="text-[10px] text-neutral-600">•</span>
        <span className="text-xs text-neutral-400">
          {cycle._count?.items || 0} assets
        </span>
        {cycle.auditors && cycle.auditors.length > 0 && (
          <>
            <span className="text-[10px] text-neutral-600">•</span>
            <span className="flex items-center gap-1 text-xs text-neutral-400">
              <Users className="h-3 w-3" />
              {cycle.auditors.length} auditor(s)
            </span>
          </>
        )}
        <span className="text-[10px] text-neutral-600 ml-auto">•</span>
        <span className="flex items-center gap-1.5 text-[11px] text-neutral-500">
          <Calendar className="h-3.5 w-3.5 text-neutral-600" />
          {new Date(cycle.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {new Date(cycle.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
        {cycle.scopeLocation && (
          <>
            <span className="text-[10px] text-neutral-600">•</span>
            <span className="flex items-center gap-1.5 text-[11px] text-neutral-500">
              <MapPin className="h-3.5 w-3.5 text-neutral-600" />
              {cycle.scopeLocation}
            </span>
          </>
        )}
      </div>
    ),
    description: (
      <AccordionCycleContent
        cycle={cycle}
        onClose={() => onCloseCycle(cycle.id)}
        onViewReport={() => onViewReport(cycle.id)}
        onAssignAuditor={() => onAssignAuditor(cycle.id)}
      />
    ),
    icon: (
      <div className="h-7 w-7 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center">
        <ClipboardList className="h-3.5 w-3.5 text-neutral-400" />
      </div>
    ),
  }));

  return (
    <BouncyAccordion
      items={accordionItems}
      value={selectedCycleId}
      onValueChange={onSelectCycle}
      collapsible
      classNames={{
        root: "space-y-2",
        item: "bg-neutral-900/60 border border-neutral-800/80",
        trigger: "hover:bg-neutral-800/30",
        content: "bg-neutral-950/40",
        description: "p-0",
      }}
    />
  );
}

// ─── Accordion Cycle Content ─────────────────────────────────────────────────
function AccordionCycleContent({
  cycle,
  onClose,
  onViewReport,
  onAssignAuditor,
}: {
  cycle: any;
  onClose: () => void;
  onViewReport: () => void;
  onAssignAuditor: () => void;
}) {
  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {cycle.status === "OPEN" && (
          <>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onAssignAuditor}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-neutral-800 text-[11px] font-semibold text-neutral-300 hover:text-neutral-100 hover:border-neutral-700 transition-all cursor-pointer"
            >
              <UserCheck className="h-3.5 w-3.5" /> Assign Auditor
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] font-semibold text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
            >
              <Lock className="h-3.5 w-3.5" /> Close Cycle
            </motion.button>
          </>
        )}
        {cycle.status === "CLOSED" && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onViewReport}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-neutral-800 text-[11px] font-semibold text-neutral-300 hover:text-neutral-100 hover:border-neutral-700 transition-all cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5" /> View Report
          </motion.button>
        )}
      </div>

      {cycle.status === "OPEN" && (
        <p className="text-[11px] text-neutral-500">
          Expand this cycle to view the full audit checklist and mark assets as verified, missing, or damaged.
        </p>
      )}
    </div>
  );
}

// ─── Report Modal Component ──────────────────────────────────────────────────
function ReportModal({
  report,
  onClose,
  onExport,
}: {
  report: any;
  onClose: () => void;
  onExport: () => void;
}) {
  const stats = report.summary;
  const missingItems = report.items.filter((i: any) => i.result === "MISSING");
  const damagedItems = report.items.filter((i: any) => i.result === "DAMAGED");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-neutral-950/80 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative z-10 w-full max-w-3xl max-h-[90vh] overflow-hidden bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl"
      >
        {/* Header */}
        <div className="p-5 border-b border-neutral-800/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-neutral-300" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-neutral-100">Audit Report</h2>
              <p className="text-[11px] text-neutral-500">
                {new Date(report.cycle.startDate).toLocaleDateString()} - {new Date(report.cycle.endDate).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onExport}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-neutral-100 text-neutral-900 text-[11px] font-semibold hover:bg-white transition-all cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" /> Export PDF
            </motion.button>
            <button
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center rounded-lg border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Summary Stats */}
          <div className="grid grid-cols-5 gap-3">
            {[
              { label: "Total", value: stats.total, color: "text-neutral-100", bg: "bg-neutral-800/50" },
              { label: "Verified", value: stats.verified, color: "text-emerald-400", bg: "bg-emerald-500/10" },
              { label: "Missing", value: stats.missing, color: "text-red-400", bg: "bg-red-500/10" },
              { label: "Damaged", value: stats.damaged, color: "text-orange-400", bg: "bg-orange-500/10" },
              { label: "Pending", value: stats.pending, color: "text-neutral-400", bg: "bg-neutral-800/30" },
            ].map((s) => (
              <div key={s.label} className={`${s.bg} border border-neutral-800/50 rounded-xl p-3 text-center`}>
                <p className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-neutral-500 mt-1 uppercase tracking-wider font-semibold">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Discrepancy Alert */}
          {stats.missing > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl"
            >
              <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-400">Discrepancy Report Auto-Generated</p>
                <p className="text-[11px] text-amber-400/70 mt-1">
                  {stats.missing} asset(s) were flagged as missing. These assets have been automatically marked as LOST.
                </p>
              </div>
            </motion.div>
          )}

          {/* Missing Assets */}
          {missingItems.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Missing Assets ({missingItems.length})</h3>
              <div className="space-y-1">
                {missingItems.map((item: any, idx: number) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center justify-between p-3 bg-red-500/5 border border-red-500/10 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                        <Ban className="h-4 w-4 text-red-400" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-neutral-200">{item.asset?.name}</p>
                        <p className="text-[10px] text-neutral-500 font-mono">{item.asset?.assetTag}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-red-400 font-semibold">MISSING</span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Damaged Assets */}
          {damagedItems.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Damaged Assets ({damagedItems.length})</h3>
              <div className="space-y-1">
                {damagedItems.map((item: any, idx: number) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center justify-between p-3 bg-orange-500/5 border border-orange-500/10 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                        <AlertTriangle className="h-4 w-4 text-orange-400" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-neutral-200">{item.asset?.name}</p>
                        <p className="text-[10px] text-neutral-500 font-mono">{item.asset?.assetTag}</p>
                        {item.notes && <p className="text-[10px] text-neutral-500 mt-1">{item.notes}</p>}
                      </div>
                    </div>
                    <span className="text-[10px] text-orange-400 font-semibold">DAMAGED</span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-neutral-800/70 flex justify-between items-center">
          <p className="text-[10px] text-neutral-600">
            Report generated by AssetFlow ERP • {report.auditorCount} auditor(s)
          </p>
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-xl bg-neutral-100 text-neutral-900 text-xs font-semibold hover:bg-white transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Assign Auditor Modal ────────────────────────────────────────────────────
function AssignAuditorModal({
  cycleId,
  employees,
  currentAuditors,
  onClose,
  onAssign,
}: {
  cycleId: string;
  employees: any[];
  currentAuditors: string[];
  onClose: () => void;
  onAssign: (employeeId: string) => void;
}) {
  const [search, setSearch] = useState("");

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const name = emp.user?.name?.toLowerCase() || "";
      const email = emp.user?.email?.toLowerCase() || "";
      const matchesSearch = name.includes(search.toLowerCase()) || email.includes(search.toLowerCase());
      return matchesSearch && !currentAuditors.includes(emp.id);
    });
  }, [employees, search, currentAuditors]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-neutral-950/80 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative z-10 w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 border-b border-neutral-800/70">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-neutral-300" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-neutral-100">Assign Auditor</h2>
                <p className="text-[11px] text-neutral-500">Select employees to assign as auditors</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center rounded-lg border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-neutral-800/70">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <input
              type="text"
              placeholder="Search employees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-10 pr-4 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 placeholder-neutral-600 outline-none focus:border-neutral-700 transition-colors"
            />
          </div>
        </div>

        {/* Employee List */}
        <div className="p-4 max-h-64 overflow-y-auto space-y-2">
          {filteredEmployees.length === 0 ? (
            <p className="text-xs text-neutral-500 text-center py-4">No employees found</p>
          ) : (
            filteredEmployees.map((emp) => (
              <motion.button
                key={emp.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => onAssign(emp.id)}
                className="w-full flex items-center gap-3 p-3 bg-neutral-950/50 border border-neutral-800/50 hover:border-neutral-700 rounded-xl transition-all cursor-pointer text-left"
              >
                <div className="h-8 w-8 rounded-full bg-neutral-800 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-neutral-400">
                    {emp.user?.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "??"}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-neutral-200 truncate">{emp.user?.name || "Unknown"}</p>
                  <p className="text-[10px] text-neutral-500 truncate">{emp.user?.email || "No email"}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-neutral-600 ml-auto shrink-0" />
              </motion.button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800/70 flex justify-end">
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-xl border border-neutral-800 text-xs font-semibold text-neutral-400 hover:text-neutral-200 hover:border-neutral-700 transition-all cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Create Audit Modal ──────────────────────────────────────────────────────
function CreateAuditModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [scopeDepartmentId, setScopeDepartmentId] = useState("");
  const [scopeLocation, setScopeLocation] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });
  const [selectedAuditorIds, setSelectedAuditorIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const createMutation = useMutation(orpc.audit.create.mutationOptions());
  const { data: departments } = useQuery(orpc.department.list.queryOptions());
  const { data: employees } = useQuery(orpc.employee.list.queryOptions());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createMutation.mutateAsync({
        scopeDepartmentId: scopeDepartmentId || null,
        scopeLocation: scopeLocation || null,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        auditorIds: selectedAuditorIds,
      });
      toast.success("Audit cycle created successfully");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to create cycle");
    } finally {
      setLoading(false);
    }
  };

  const toggleAuditor = (id: string) => {
    setSelectedAuditorIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-neutral-950/80 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative z-10 w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 border-b border-neutral-800/70">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center">
                <ClipboardList className="h-5 w-5 text-neutral-300" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-neutral-100">New Audit Cycle</h2>
                <p className="text-[11px] text-neutral-500">Create a verification cycle for your assets</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center rounded-lg border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider pl-1">
                Start Date *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-neutral-300 outline-none hover:border-neutral-700 focus:border-neutral-600 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider pl-1">
                End Date *
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-neutral-300 outline-none hover:border-neutral-700 focus:border-neutral-600 transition-colors"
              />
            </div>
          </div>

          {/* Department Scope */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider pl-1">
              Department Scope (optional)
            </label>
            <Select value={scopeDepartmentId} onValueChange={setScopeDepartmentId}>
              <SelectTrigger className="w-full h-10 px-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-neutral-300 outline-none cursor-pointer hover:border-neutral-700">
                <SelectValue placeholder="All departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All departments</SelectItem>
                {departments?.map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Location Scope */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider pl-1">
              Location Scope (optional)
            </label>
            <input
              type="text"
              value={scopeLocation}
              onChange={(e) => setScopeLocation(e.target.value)}
              placeholder="e.g. Building A, Floor 3"
              className="w-full h-10 px-3 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-neutral-300 placeholder-neutral-600 outline-none hover:border-neutral-700 focus:border-neutral-600 transition-colors"
            />
          </div>

          {/* Auditor Selection */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider pl-1">
              Assign Auditors (optional)
            </label>
            <div className="max-h-32 overflow-y-auto space-y-1 p-2 bg-neutral-950 border border-neutral-800 rounded-xl">
              {employees?.map((emp: any) => (
                <label
                  key={emp.id}
                  className="flex items-center gap-2 p-2 hover:bg-neutral-900 rounded-lg cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedAuditorIds.includes(emp.id)}
                    onChange={() => toggleAuditor(emp.id)}
                    className="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-neutral-100 focus:ring-neutral-600"
                  />
                  <span className="text-xs text-neutral-300">{emp.user?.name || "Unknown"}</span>
                </label>
              ))}
            </div>
            {selectedAuditorIds.length > 0 && (
              <p className="text-[10px] text-neutral-500 pl-1">{selectedAuditorIds.length} auditor(s) selected</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800/70">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-xl border border-neutral-800 hover:border-neutral-700 text-sm text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 h-10 px-5 rounded-xl bg-neutral-100 text-neutral-900 text-sm font-semibold hover:bg-white transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]"
            >
              {loading && <Loader variant="spinner" size={16} />} Create Cycle
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

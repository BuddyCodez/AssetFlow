import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import {
  Laptop,
  MapPin,
  Send,
  CheckCircle,
  AlertTriangle,
  History,
  CornerDownRight,
  ArrowRight,
  X,
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

interface AllocationsPageProps {
  isAdmin: boolean;
}

export function AllocationsPage({ isAdmin }: AllocationsPageProps) {
  const [selectedAssetId, setSelectedAssetId] = useState("");
  
  // New Allocation form states
  const [allocationType, setAllocationType] = useState<"EMPLOYEE" | "DEPARTMENT">("EMPLOYEE");
  const [targetEmployeeId, setTargetEmployeeId] = useState("");
  const [targetDepartmentId, setTargetDepartmentId] = useState("");
  const [allocNotes, setAllocNotes] = useState("");
  const [allocLoading, setAllocLoading] = useState(false);

  // Return Check-in states
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnNotes, setReturnNotes] = useState("");
  const [returnLoading, setReturnLoading] = useState(false);

  // Transfer Request states
  const [transferTargetId, setTransferTargetId] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);

  // Queries
  const { data: assets, refetch: refetchAssets } = useQuery(orpc.asset.list.queryOptions());
  const { data: employees } = useQuery(orpc.employee.list.queryOptions());
  const { data: departments } = useQuery(orpc.department.list.queryOptions());

  // Mutations
  const allocateMutation = useMutation(orpc.allocation.allocate.mutationOptions());
  const returnMutation = useMutation(orpc.allocation.markReturned.mutationOptions());
  const transferRequestMutation = useMutation(orpc.transfer.request.mutationOptions());

  // Find currently selected asset
  const selectedAsset = useMemo(() => {
    return assets?.find((a) => a.id === selectedAssetId) || null;
  }, [assets, selectedAssetId]);

  // Fetch allocation history for selected asset
  const { data: history, refetch: refetchHistory } = useQuery({
    ...orpc.asset.getHistory.queryOptions({ input: { assetId: selectedAssetId } }),
    enabled: !!selectedAssetId,
  });

  // Find holder name if allocated
  const currentHolder = useMemo(() => {
    if (!selectedAsset || selectedAsset.status !== "ALLOCATED" || !employees) return null;
    return employees.find((e) => e.id === selectedAsset.currentHolderId) || null;
  }, [selectedAsset, employees]);

  // Handle Allocate
  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId) return;
    
    const employeeId = allocationType === "EMPLOYEE" ? targetEmployeeId : null;
    const departmentId = allocationType === "DEPARTMENT" ? targetDepartmentId : null;

    if (allocationType === "EMPLOYEE" && !targetEmployeeId) {
      toast.error("Please select an employee");
      return;
    }
    if (allocationType === "DEPARTMENT" && !targetDepartmentId) {
      toast.error("Please select a department");
      return;
    }

    setAllocLoading(true);
    try {
      await allocateMutation.mutateAsync({
        assetId: selectedAssetId,
        employeeId,
        departmentId,
        condition: allocNotes.trim() || null,
      });
      toast.success("Asset allocated successfully");
      setAllocNotes("");
      setTargetEmployeeId("");
      setTargetDepartmentId("");
      refetchAssets();
      refetchHistory();
    } catch (err: any) {
      toast.error(err.message || "Failed to allocate asset");
    } finally {
      setAllocLoading(false);
    }
  };

  // Handle Return
  const handleReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId) return;

    setReturnLoading(true);
    try {
      await returnMutation.mutateAsync({
        assetId: selectedAssetId,
        checkinNotes: returnNotes.trim() || null,
      });
      toast.success("Asset return registered successfully");
      setReturnNotes("");
      setShowReturnModal(false);
      refetchAssets();
      refetchHistory();
    } catch (err: any) {
      toast.error(err.message || "Failed to return asset");
    } finally {
      setReturnLoading(false);
    }
  };

  // Handle Transfer Request
  const handleTransferRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId || !transferTargetId) {
      toast.error("Please select a recipient");
      return;
    }

    setTransferLoading(true);
    try {
      await transferRequestMutation.mutateAsync({
        assetId: selectedAssetId,
        toEmployeeId: transferTargetId,
        reason: transferReason.trim() || null,
      });
      toast.success("Transfer request submitted successfully");
      setTransferReason("");
      setTransferTargetId("");
      refetchAssets();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit transfer request");
    } finally {
      setTransferLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-0.5">
        <h1 className="text-xl font-semibold text-neutral-100">Asset Allocation & Transfer</h1>
        <p className="text-sm text-neutral-500">
          Assign assets to employees or departments, handle return check-ins, and request transfers.
        </p>
      </div>

      {/* Asset Selection */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="space-y-2">
          <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
            Select Asset to Manage *
          </label>
          <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
            <SelectTrigger className="w-full h-11 px-3 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-neutral-300 outline-none hover:border-neutral-700 transition-colors">
              <SelectValue placeholder="Select asset (e.g. AF-0114 - Dell laptop)" />
            </SelectTrigger>
            <SelectContent className="max-h-60 overflow-y-auto w-full">
              {assets?.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.assetTag} - {a.name} ({a.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedAsset && (
          <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-neutral-800/60 text-xs text-neutral-400">
            <div className="space-y-1">
              <p>Tag: <span className="font-semibold text-neutral-200 font-mono">{selectedAsset.assetTag}</span></p>
              <p>Name: <span className="font-semibold text-neutral-200">{selectedAsset.name}</span></p>
              <p>Category: <span className="font-semibold text-neutral-200">{selectedAsset.category?.name || "Uncategorized"}</span></p>
            </div>
            <div className="space-y-1">
              <p>Status: <span className="font-semibold text-neutral-200">{selectedAsset.status}</span></p>
              <p>Location: <span className="font-semibold text-neutral-200">{selectedAsset.location || "N/A"}</span></p>
              {selectedAsset.status === "ALLOCATED" && currentHolder && (
                <p>Current Holder: <span className="font-semibold text-neutral-200">{currentHolder.user?.name || currentHolder.user?.email}</span></p>
              )}
            </div>
          </div>
        )}
      </div>

      {selectedAssetId ? (
        <div className="grid md:grid-cols-2 gap-6 items-start">
          {/* Main Action Form Card */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-sm space-y-5">
            {selectedAsset?.status === "ALLOCATED" ? (
              <div className="space-y-4">
                {/* Red Banner Block */}
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 space-y-1.5 text-xs text-red-400">
                  <p className="font-semibold flex items-center gap-1.5 text-sm">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    Already Allocated
                  </p>
                  <p>
                    Allocated to{" "}
                    <span className="font-medium text-red-300">
                      {currentHolder?.user?.name || currentHolder?.user?.email || "Unknown"}
                    </span>
                    {selectedAsset.department && (
                      <span> ({selectedAsset.department.name})</span>
                    )}
                  </p>
                  <p className="text-[11px] text-red-400/80">
                    Direct re-allocation is blocked. Submit a transfer request below.
                  </p>
                </div>

                {/* Transfer Form */}
                <form onSubmit={handleTransferRequest} className="space-y-4">
                  <h3 className="text-sm font-semibold text-neutral-200">Transfer Request</h3>
                  
                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* From */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider">
                        From
                      </label>
                      <input
                        type="text"
                        disabled
                        value={currentHolder?.user?.name || currentHolder?.user?.email || "Unknown"}
                        className="w-full h-10 px-3 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-neutral-450 outline-none cursor-not-allowed opacity-70"
                      />
                    </div>

                    {/* To */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider">
                        To (Select Employee) *
                      </label>
                      <Select value={transferTargetId} onValueChange={setTransferTargetId}>
                        <SelectTrigger className="w-full h-10 px-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-neutral-300 outline-none hover:border-neutral-700 transition-colors">
                          <SelectValue placeholder="Select Recipient" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60 overflow-y-auto">
                          {employees
                            ?.filter((e) => e.id !== selectedAsset.currentHolderId && e.isActive)
                            .map((e) => (
                              <SelectItem key={e.id} value={e.id}>
                                {e.user?.name || e.user?.email}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider">
                      Reason for Transfer
                    </label>
                    <textarea
                      value={transferReason}
                      onChange={(e) => setTransferReason(e.target.value)}
                      placeholder="Specify the reason or project requirements..."
                      className="w-full h-24 px-3 py-2 rounded-xl bg-neutral-955 border border-neutral-800 text-sm text-neutral-200 outline-none focus:border-neutral-500 transition-colors resize-none"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={transferLoading}
                      className="flex-1 flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-neutral-100 text-neutral-900 text-sm font-semibold hover:bg-neutral-200 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {transferLoading ? (
                        <Loader variant="spinner" size={16} />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Submit Request
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setShowReturnModal(true)}
                      className="h-10 px-4 rounded-xl border border-neutral-800 hover:border-neutral-700 text-sm text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer select-none"
                    >
                      Return Check-in
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              // Allocate Form
              <form onSubmit={handleAllocate} className="space-y-4">
                <h3 className="text-sm font-semibold text-neutral-200">New Allocation</h3>
                
                {/* Allocation Type Switcher */}
                <div className="flex gap-2 p-1 bg-neutral-950 border border-neutral-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setAllocationType("EMPLOYEE")}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      allocationType === "EMPLOYEE"
                        ? "bg-white text-black"
                        : "text-neutral-400 hover:text-neutral-200"
                    }`}
                  >
                    Allocate to Employee
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllocationType("DEPARTMENT")}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      allocationType === "DEPARTMENT"
                        ? "bg-white text-black"
                        : "text-neutral-400 hover:text-neutral-200"
                    }`}
                  >
                    Allocate to Department
                  </button>
                </div>

                {allocationType === "EMPLOYEE" ? (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider">
                      Select Employee *
                    </label>
                    <Select value={targetEmployeeId} onValueChange={setTargetEmployeeId}>
                      <SelectTrigger className="w-full h-10 px-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-neutral-300 outline-none hover:border-neutral-700 transition-colors">
                        <SelectValue placeholder="Select Employee" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 overflow-y-auto">
                        {employees
                          ?.filter((e) => e.isActive)
                          .map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.user?.name || e.user?.email}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider">
                      Select Department *
                    </label>
                    <Select value={targetDepartmentId} onValueChange={setTargetDepartmentId}>
                      <SelectTrigger className="w-full h-10 px-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-neutral-300 outline-none hover:border-neutral-700 transition-colors">
                        <SelectValue placeholder="Select Department" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 overflow-y-auto">
                        {departments
                          ?.filter((d) => d.isActive)
                          .map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Condition Notes */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider">
                    Condition on Allocation
                  </label>
                  <textarea
                    value={allocNotes}
                    onChange={(e) => setAllocNotes(e.target.value)}
                    placeholder="e.g. Pristine condition, with charger and mouse..."
                    className="w-full h-24 px-3 py-2 rounded-xl bg-neutral-955 border border-neutral-800 text-sm text-neutral-200 outline-none focus:border-neutral-500 transition-colors resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={allocLoading}
                  className="w-full flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-neutral-100 text-neutral-900 text-sm font-semibold hover:bg-neutral-200 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {allocLoading && <Loader variant="spinner" size={16} />}
                  Allocate Asset
                </button>
              </form>
            )}
          </div>

          {/* Allocation History Card */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-neutral-200 flex items-center gap-2 border-b border-neutral-850 pb-2.5">
              <History className="h-4 w-4 text-neutral-400" />
              Allocation History
            </h3>

            {!history ? (
              <div className="flex items-center justify-center py-12">
                <Loader variant="dots" size={20} />
              </div>
            ) : !history.allocations || history.allocations.length === 0 ? (
              <div className="text-center py-12 text-neutral-500 text-xs">
                No allocation records found for this asset.
              </div>
            ) : (
              <div className="space-y-4.5 max-h-[380px] overflow-y-auto pr-1">
                {history.allocations.map((a: any) => (
                  <div key={a.id} className="relative pl-5 border-l border-neutral-800 space-y-1 text-xs">
                    {/* Circle marker */}
                    <div className={`absolute left-[-4.5px] top-1.5 h-2 w-2 rounded-full ${
                      a.status === "ACTIVE" ? "bg-emerald-500" : "bg-neutral-700"
                    }`} />
                    
                    <div className="flex items-center justify-between text-[10px] text-neutral-500">
                      <span>{new Date(a.allocatedAt).toLocaleDateString()}</span>
                      {a.status === "ACTIVE" ? (
                        <span className="text-emerald-500 font-semibold uppercase tracking-wider text-[9px]">
                          Active
                        </span>
                      ) : (
                        <span className="text-neutral-500">Returned</span>
                      )}
                    </div>

                    <p className="text-neutral-300">
                      Allocated to{" "}
                      <span className="font-semibold text-neutral-100">
                        {a.employee?.user?.name || a.department?.name || "Unknown"}
                      </span>
                    </p>

                    {a.conditionOnAlloc && (
                      <p className="text-[11px] text-neutral-450 italic mt-0.5">
                        &ldquo;{a.conditionOnAlloc}&rdquo;
                      </p>
                    )}

                    {a.returnedAt && (
                      <div className="pt-1 mt-1 border-t border-neutral-850/40 text-[10px] text-neutral-500 space-y-0.5">
                        <p className="flex items-center gap-1">
                          <CornerDownRight className="h-3 w-3 text-neutral-600" />
                          Returned on {new Date(a.returnedAt).toLocaleDateString()}
                        </p>
                        {a.checkinNotes && (
                          <p className="pl-4 italic text-neutral-600">
                            Check-in notes: &ldquo;{a.checkinNotes}&rdquo;
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="border border-dashed border-neutral-800 rounded-2xl p-12 text-center text-sm text-neutral-500 flex flex-col items-center gap-2">
          <Laptop className="h-6 w-6 text-neutral-700" />
          <p>Please select an asset above to manage allocations.</p>
        </div>
      )}

      {/* Return check-in modal */}
      <AnimatePresence>
        {showReturnModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReturnModal(false)}
              className="absolute inset-0 bg-neutral-950/70 backdrop-blur-sm"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative z-10 w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-neutral-850">
                <h2 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
                  <CheckCircle className="h-4.5 w-4.5 text-emerald-500" />
                  Asset Return Check-in
                </h2>
                <button
                  onClick={() => setShowReturnModal(false)}
                  className="h-8 w-8 flex items-center justify-center rounded-lg border border-neutral-850 hover:border-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleReturn} className="space-y-4">
                <p className="text-xs text-neutral-400">
                  Verify the asset condition and confirm the return check-in. The status of asset{" "}
                  <span className="font-mono text-neutral-200">{selectedAsset?.assetTag}</span> will
                  be updated to <span className="font-semibold text-emerald-400">Available</span>.
                </p>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider">
                    Check-in Condition Notes
                  </label>
                  <textarea
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                    required
                    placeholder="e.g. Good condition, normal wear on keyboard, charger returned..."
                    className="w-full h-24 px-3 py-2 rounded-xl bg-neutral-955 border border-neutral-800 text-sm text-neutral-200 outline-none focus:border-neutral-500 transition-colors resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowReturnModal(false)}
                    className="h-10 px-4 rounded-xl border border-neutral-800 hover:border-neutral-750 text-sm text-neutral-450 hover:text-neutral-200 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={returnLoading}
                    className="flex items-center gap-2 h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-neutral-950 text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {returnLoading && <Loader variant="spinner" size={16} />}
                    Approve Return
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

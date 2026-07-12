import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Plus,
  Laptop,
  X,
  MapPin,
  Trash2,
  Edit,
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
import { Checkbox } from "@odoo-hackathon-2026/ui/components/checkbox";
import { Table, type TableColumn } from "@odoo-hackathon-2026/ui/components/motion/table";

type AssetStatus =
  | "AVAILABLE"
  | "ALLOCATED"
  | "RESERVED"
  | "UNDER_MAINTENANCE"
  | "LOST"
  | "RETIRED"
  | "DISPOSED";

const STATUS_BADGES: Record<
  AssetStatus,
  { bg: string; border: string; text: string; label: string }
> = {
  AVAILABLE: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    text: "text-emerald-400",
    label: "Available",
  },
  ALLOCATED: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    text: "text-blue-400",
    label: "Allocated",
  },
  RESERVED: {
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    text: "text-purple-400",
    label: "Reserved",
  },
  UNDER_MAINTENANCE: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    text: "text-amber-400",
    label: "Maintenance",
  },
  LOST: {
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    text: "text-rose-400",
    label: "Lost",
  },
  RETIRED: {
    bg: "bg-neutral-800",
    border: "border-neutral-700",
    text: "text-neutral-400",
    label: "Retired",
  },
  DISPOSED: {
    bg: "bg-neutral-850",
    border: "border-neutral-800",
    text: "text-neutral-500",
    label: "Disposed",
  },
};

interface AssetsPageProps {
  isAdmin: boolean;
}

export function AssetsPage({ isAdmin }: AssetsPageProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<any | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);

  // Queries & Mutations
  const { data: assets, refetch: refetchAssets } = useQuery(
    orpc.asset.list.queryOptions({
      search: search || null,
      categoryId: selectedCategory || null,
      status: (selectedStatus as AssetStatus) || null,
      departmentId: selectedDept || null,
    })
  );

  const { data: categories } = useQuery(orpc.category.list.queryOptions());
  const { data: departments } = useQuery(orpc.department.list.queryOptions());

  const updateMutation = useMutation(orpc.asset.update.mutationOptions());
  const deleteBulkMutation = useMutation(orpc.asset.deleteBulk.mutationOptions());

  // Bulk Delete handler
  const handleBulkDelete = async () => {
    if (selectedRowIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedRowIds.length} assets?`)) return;
    try {
      await deleteBulkMutation.mutateAsync({ ids: selectedRowIds });
      toast.success("Assets deleted successfully");
      setSelectedRowIds([]);
      refetchAssets();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete assets");
    }
  };

  const columns: TableColumn<any>[] = useMemo(
    () => [
      {
        key: "assetTag",
        header: "Tag",
        width: "120px",
        align: "left",
        cell: (asset) => (
          <span className="font-mono text-xs text-neutral-400 font-medium pl-2">
            {asset.assetTag}
          </span>
        ),
      },
      {
        key: "name",
        header: "Name",
        width: "250px",
      },
      {
        key: "serialNumber",
        header: "Serial Number",
        width: "180px",
      },
      {
        key: "category",
        header: "Category",
        width: "180px",
        cell: (asset) => (
          <span className="text-neutral-350">{asset.category?.name || "Uncategorized"}</span>
        ),
      },
      {
        key: "status",
        header: "Status",
        width: "150px",
        cell: (asset) => {
          const badge = STATUS_BADGES[asset.status as AssetStatus] || STATUS_BADGES.AVAILABLE;
          return (
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${badge.bg} ${badge.border} ${badge.text}`}
            >
              {badge.label}
            </span>
          );
        },
      },
      {
        key: "location",
        header: "Location",
        width: "200px",
      },
      {
        key: "department",
        header: "Department",
        cell: (asset) => (
          <span className="text-[10px] bg-neutral-800 border border-neutral-700/30 px-1.5 py-0.5 rounded text-neutral-450 font-medium">
            {asset.department?.name || "Unassigned"}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-0.5">
          <h1 className="text-xl font-semibold text-neutral-100">Asset Registry</h1>
          <p className="text-sm text-neutral-500">
            Track and manage physical hardware, equipment, and resources.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingAsset(null);
            setShowRegisterModal(true);
          }}
          className="flex items-center gap-2 h-10 px-4 rounded-xl bg-neutral-100 text-neutral-900 text-sm font-semibold hover:bg-neutral-200 transition-colors select-none cursor-pointer active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          Register Asset
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by tag, serial, or name..."
            className="w-full h-10 pl-10 pr-3.5 rounded-xl bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 outline-none focus:border-neutral-600 placeholder:text-neutral-500 transition-colors"
          />
        </div>

        {/* Category Filter */}
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="h-10 w-44 rounded-xl bg-neutral-900 border border-neutral-800 text-sm text-neutral-350 outline-none hover:border-neutral-700 transition-colors">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent className="max-h-60 overflow-y-auto w-44">
            <SelectItem value="">All Categories</SelectItem>
            {categories?.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="h-10 w-44 rounded-xl bg-neutral-900 border border-neutral-800 text-sm text-neutral-350 outline-none hover:border-neutral-700 transition-colors">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent className="max-h-60 overflow-y-auto w-44">
            <SelectItem value="">All Statuses</SelectItem>
            <SelectItem value="AVAILABLE">Available</SelectItem>
            <SelectItem value="ALLOCATED">Allocated</SelectItem>
            <SelectItem value="RESERVED">Reserved</SelectItem>
            <SelectItem value="UNDER_MAINTENANCE">Maintenance</SelectItem>
            <SelectItem value="LOST">Lost</SelectItem>
            <SelectItem value="RETIRED">Retired</SelectItem>
            <SelectItem value="DISPOSED">Disposed</SelectItem>
          </SelectContent>
        </Select>

        {/* Department Filter */}
        <Select value={selectedDept} onValueChange={setSelectedDept}>
          <SelectTrigger className="h-10 w-44 rounded-xl bg-neutral-900 border border-neutral-800 text-sm text-neutral-350 outline-none hover:border-neutral-700 transition-colors">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent className="max-h-60 overflow-y-auto w-44">
            <SelectItem value="">All Departments</SelectItem>
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

      {/* Asset Table Container */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/20 overflow-hidden">
        <Table
          data={assets || []}
          columns={columns}
          getRowId={(asset) => asset.id}
          selectable
          resizable
          reorderable
          selectedRowIds={selectedRowIds}
          onSelectionChange={setSelectedRowIds}
          loading={!assets}
          height={500}
          emptyState={
            <div className="flex flex-col items-center justify-center min-h-[300px] text-center space-y-2 py-12">
              <Laptop className="h-8 w-8 text-neutral-600" />
              <p className="text-sm text-neutral-500 font-medium">No assets registered yet.</p>
              <p className="text-xs text-neutral-600">
                Get started by registering a hardware or physical resource.
              </p>
            </div>
          }
        />
      </div>

      {/* Floating Action Bar */}
      <AnimatePresence>
        {selectedRowIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-neutral-900 border border-neutral-800 rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-4 z-50 backdrop-blur-md"
          >
            <span className="text-xs text-neutral-400 font-medium">
              {selectedRowIds.length} selected
            </span>
            <div className="h-4 w-px bg-neutral-800" />
            {selectedRowIds.length === 1 && (
              <button
                onClick={() => {
                  const assetToEdit = assets?.find((a) => a.id === selectedRowIds[0]);
                  if (assetToEdit) {
                    setEditingAsset(assetToEdit);
                    setShowRegisterModal(true);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Edit className="h-3.5 w-3.5" />
                Edit Details
              </button>
            )}
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Selected
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Register/Edit Asset Modal */}
      <AnimatePresence>
        {showRegisterModal && (
          <RegisterModal
            categories={categories || []}
            departments={departments || []}
            asset={editingAsset}
            onClose={() => {
              setShowRegisterModal(false);
              setEditingAsset(null);
            }}
            onSuccess={() => {
              refetchAssets();
              setShowRegisterModal(false);
              setEditingAsset(null);
              setSelectedRowIds([]);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// REGISTER/EDIT ASSET MODAL
// ──────────────────────────────────────────────────────────────────────────────
function RegisterModal({
  categories,
  departments,
  asset,
  onClose,
  onSuccess,
}: {
  categories: any[];
  departments: any[];
  asset?: any | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const registerMutation = useMutation(orpc.asset.register.mutationOptions());
  const updateMutation = useMutation(orpc.asset.update.mutationOptions());
  const [loading, setLoading] = useState(false);

  // Form states
  const [name, setName] = useState(asset?.name || "");
  const [categoryId, setCategoryId] = useState(asset?.categoryId || "");
  const [serialNumber, setSerialNumber] = useState(asset?.serialNumber || "");
  const [location, setLocation] = useState(asset?.location || "");
  const [departmentId, setDepartmentId] = useState(asset?.departmentId || "");
  const [isBookable, setIsBookable] = useState(asset?.isBookable || false);
  const [status, setStatus] = useState<AssetStatus>(asset?.status || "AVAILABLE");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !categoryId) {
      toast.error("Please fill in required fields");
      return;
    }

    setLoading(true);
    try {
      if (asset) {
        // Edit flow
        await updateMutation.mutateAsync({
          id: asset.id,
          name: name.trim(),
          categoryId,
          serialNumber: serialNumber.trim() || null,
          location: location.trim() || null,
          isBookable,
          status,
          departmentId: departmentId || null,
        });
        toast.success("Asset updated successfully");
      } else {
        // Create flow
        await registerMutation.mutateAsync({
          name: name.trim(),
          categoryId,
          serialNumber: serialNumber.trim() || null,
          location: location.trim() || null,
          isBookable,
          status,
          departmentId: departmentId || null,
        });
        toast.success("Asset registered successfully");
      }
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save asset");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-neutral-950/70 backdrop-blur-sm"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
        className="relative z-10 w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
          <h2 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
            <Laptop className="h-4 w-4 text-neutral-400" />
            {asset ? "Edit Asset Details" : "Register Asset"}
          </h2>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer outline-none"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Asset Name */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
                Asset Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Dell Latitude 7420"
                required
                className="w-full h-10 px-3 rounded-xl bg-neutral-955 border border-neutral-800 text-sm text-neutral-200 outline-none focus:border-neutral-500 transition-colors"
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
                Category *
              </label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="w-full h-10 px-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-neutral-300 outline-none focus:border-neutral-500 cursor-pointer">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  <SelectItem value="">Select Category</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Serial Number */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
                Serial Number
              </label>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="e.g. MXL2919FX9"
                className="w-full h-10 px-3 rounded-xl bg-neutral-955 border border-neutral-800 text-sm text-neutral-200 outline-none focus:border-neutral-500 transition-colors"
              />
            </div>

            {/* Location */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Floor 3, HQ"
                className="w-full h-10 px-3 rounded-xl bg-neutral-955 border border-neutral-800 text-sm text-neutral-200 outline-none focus:border-neutral-500 transition-colors"
              />
            </div>

            {/* Initial Status */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
                Status
              </label>
              <Select value={status} onValueChange={(val) => setStatus(val as AssetStatus)}>
                <SelectTrigger className="w-full h-10 px-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-neutral-350 outline-none hover:border-neutral-700 transition-colors">
                  <SelectValue placeholder="Available" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AVAILABLE">Available</SelectItem>
                  <SelectItem value="ALLOCATED">Allocated</SelectItem>
                  <SelectItem value="RESERVED">Reserved</SelectItem>
                  <SelectItem value="UNDER_MAINTENANCE">Maintenance</SelectItem>
                  <SelectItem value="LOST">Lost</SelectItem>
                  <SelectItem value="RETIRED">Retired</SelectItem>
                  <SelectItem value="DISPOSED">Disposed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Assign Department */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
                Assign Department
              </label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger className="w-full h-10 px-2.5 rounded-xl bg-neutral-955 border border-neutral-800 text-sm text-neutral-350 outline-none hover:border-neutral-700 transition-colors">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  <SelectItem value="">Unassigned</SelectItem>
                  {departments
                    .filter((d) => d.isActive)
                    .map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Is Bookable (checkbox) */}
            <div className="flex items-center gap-3.5 h-10 px-1 select-none">
              <Checkbox
                id="isBookable"
                checked={isBookable}
                onCheckedChange={(checked) => setIsBookable(!!checked)}
                className="size-4.5 rounded border-neutral-800 cursor-pointer"
              />
              <label
                htmlFor="isBookable"
                className="text-xs text-neutral-400 font-medium cursor-pointer animate-none"
              >
                Allow booking as shared resource
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="h-10 px-4 rounded-xl border border-neutral-800 hover:border-neutral-700 text-sm text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer select-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 h-10 px-4 rounded-xl bg-neutral-100 text-neutral-900 text-sm font-semibold hover:bg-neutral-200 transition-colors select-none cursor-pointer disabled:opacity-50"
            >
              {loading && <Loader variant="spinner" size={16} />}
              {asset ? "Save Changes" : "Register"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

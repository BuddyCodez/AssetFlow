import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Building2,
  FolderOpen,
  Users2,
  Plus,
  Mail,
  UserCheck,
  Shield,
  Trash2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Loader } from "@odoo-hackathon-2026/ui/components/motion/loader";
import { toast } from "sonner";

import { orpc } from "@/utils/orpc";
import { authClient } from "@/lib/auth-client";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@odoo-hackathon-2026/ui/components/motion/select";

export const Route = createFileRoute("/_auth/(admin)/org-setup")({
  component: RouteComponent,
});

type Tab = "departments" | "categories" | "directory";

function RouteComponent() {
  const [activeTab, setActiveTab] = useState<Tab>("departments");

  // Fetch queries using oRPC and standard TanStack useQuery
  const { data: departments, refetch: refetchDepts } = useQuery(orpc.department.list.queryOptions());
  const { data: categories, refetch: refetchCats } = useQuery(orpc.category.list.queryOptions());
  const { data: employees, refetch: refetchEmployees } = useQuery(orpc.employee.list.queryOptions());

  // Fetch active organization (contains invite list) from Better Auth
  const { data: activeOrg, refetch: refetchOrg } = authClient.useActiveOrganization();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-0.5">
          <h1 className="text-xl font-semibold text-neutral-100">Organization Setup</h1>
          <p className="text-sm text-neutral-500">
            Configure your enterprise hierarchy, asset categories, and team roles.
          </p>
        </div>
      </div>

      {/* Premium Sliding Tabs */}
      <div className="flex items-center gap-1.5 rounded-2xl bg-neutral-900/60 p-1 border border-neutral-800/60 max-w-md">
        {(
          [
            { id: "departments", label: "Departments", icon: <Building2 className="h-4 w-4" /> },
            { id: "categories", label: "Asset Categories", icon: <FolderOpen className="h-4 w-4" /> },
            { id: "directory", label: "Employee Directory", icon: <Users2 className="h-4 w-4" /> },
          ] as const
        ).map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative flex-1 flex items-center justify-center gap-2 h-9 rounded-xl text-xs font-medium outline-none transition-colors select-none cursor-pointer"
            >
              {isActive && (
                <motion.span
                  layoutId="org-tab-pill"
                  transition={{ type: "spring", stiffness: 200, damping: 22 }}
                  className="absolute inset-0 rounded-xl bg-neutral-800 border border-neutral-700/30 shadow-inner"
                />
              )}
              <span
                className={`relative z-10 flex items-center gap-2 transition-colors duration-150 ${
                  isActive ? "text-neutral-100" : "text-neutral-500 hover:text-neutral-350"
                }`}
              >
                {tab.icon}
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="min-h-[400px]">
        <AnimatePresence mode="wait">
          {activeTab === "departments" && (
            <motion.div
              key="depts"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <DepartmentsTab
                departments={departments || []}
                employees={employees || []}
                onSuccess={refetchDepts}
              />
            </motion.div>
          )}

          {activeTab === "categories" && (
            <motion.div
              key="cats"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <CategoriesTab categories={categories || []} onSuccess={refetchCats} />
            </motion.div>
          )}

          {activeTab === "directory" && (
            <motion.div
              key="dir"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <DirectoryTab
                employees={employees || []}
                departments={departments || []}
                invitations={activeOrg?.invitations || []}
                onSuccess={() => {
                  refetchEmployees();
                  refetchOrg();
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// DEPARTMENTS TAB
// ──────────────────────────────────────────────────────────────────────────────
function DepartmentsTab({
  departments,
  employees,
  onSuccess,
}: {
  departments: any[];
  employees: any[];
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [parentDeptId, setParentDeptId] = useState("");
  const [headEmpId, setHeadEmpId] = useState("");
  const [loading, setLoading] = useState(false);

  const createMutation = useMutation(orpc.department.create.mutationOptions());
  const updateMutation = useMutation(orpc.department.update.mutationOptions());

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        parentDepartmentId: parentDeptId || null,
        headEmployeeId: headEmpId || null,
      });
      toast.success("Department created");
      setName("");
      setParentDeptId("");
      setHeadEmpId("");
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create department");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (dept: any) => {
    try {
      await updateMutation.mutateAsync({
        id: dept.id,
        name: dept.name,
        parentDepartmentId: dept.parentDepartmentId,
        headEmployeeId: dept.headEmployeeId,
        isActive: !dept.isActive,
      });
      toast.success(`Department ${dept.isActive ? "deactivated" : "activated"}`);
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update department status");
    }
  };

  return (
    <div className="grid md:grid-cols-3 gap-6 items-start">
      {/* Creation form */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
          <Plus className="h-4 w-4 text-neutral-500" /> Create Department
        </h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
              Department Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Engineering"
              required
              className="w-full h-10 px-3.5 rounded-xl bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 outline-none focus:border-neutral-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
              Parent Department
            </label>
            <Select
              value={parentDeptId}
              onValueChange={setParentDeptId}
            >
              <SelectTrigger className="w-full h-10 px-3 rounded-xl bg-neutral-900 border border-neutral-800 text-sm text-neutral-350 outline-none hover:border-neutral-700 transition-colors">
                <SelectValue placeholder="None (Top Level)" />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                <SelectItem value="">None (Top Level)</SelectItem>
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

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
              Department Head
            </label>
            <Select
              value={headEmpId}
              onValueChange={setHeadEmpId}
            >
              <SelectTrigger className="w-full h-10 px-3 rounded-xl bg-neutral-900 border border-neutral-800 text-sm text-neutral-350 outline-none hover:border-neutral-700 transition-colors">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                <SelectItem value="">Unassigned</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.user.name} ({emp.user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full h-10 rounded-xl bg-neutral-100 text-neutral-900 text-sm font-semibold hover:bg-neutral-200 transition-colors select-none cursor-pointer flex items-center justify-center"
          >
            {loading ? <Loader variant="ascii" size={16} /> : "Add Department"}
          </button>
        </form>
      </div>

      {/* Directory list */}
      <div className="md:col-span-2 rounded-2xl border border-neutral-800 bg-neutral-900/20 p-5">
        <h2 className="text-sm font-semibold text-neutral-200 mb-4 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-neutral-500" /> Departments
        </h2>
        {departments.length === 0 ? (
          <div className="text-center py-12 text-sm text-neutral-600">
            No departments defined yet.
          </div>
        ) : (
          <div className="space-y-2">
            {departments.map((dept) => {
              const head = employees.find((e) => e.id === dept.headEmployeeId);
              return (
                <div
                  key={dept.id}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-neutral-800 bg-neutral-900/40 hover:bg-neutral-900/70 transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-neutral-200">{dept.name}</span>
                      {dept.parentDepartment && (
                        <span className="text-[10px] bg-neutral-800 border border-neutral-700/30 text-neutral-500 px-2 py-0.5 rounded-full">
                          under {dept.parentDepartment.name}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-500">
                      Head: {head ? head.user.name : "Unassigned"}
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleStatus(dept)}
                    className={`text-xs px-2.5 py-1 rounded-full font-medium border cursor-pointer transition-colors duration-150 ${
                      dept.isActive
                        ? "bg-emerald-500/15 border-emerald-500/25 text-emerald-450 hover:bg-emerald-500/25"
                        : "bg-neutral-800 border-neutral-700 text-neutral-550 hover:bg-neutral-750"
                    }`}
                  >
                    {dept.isActive ? "Active" : "Inactive"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// CATEGORIES TAB
// ──────────────────────────────────────────────────────────────────────────────
function CategoriesTab({
  categories,
  onSuccess,
}: {
  categories: any[];
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const createMutation = useMutation(orpc.category.create.mutationOptions());
  const deleteMutation = useMutation(orpc.category.delete.mutationOptions());

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await createMutation.mutateAsync({
        name: name.trim(),
      });
      toast.success("Category created");
      setName("");
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create category");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Category deleted");
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete category");
    }
  };

  return (
    <div className="grid md:grid-cols-3 gap-6 items-start">
      {/* Creation form */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
          <Plus className="h-4 w-4 text-neutral-500" /> Add Category
        </h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
              Category Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Laptops, Vehicles"
              required
              className="w-full h-10 px-3.5 rounded-xl bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 outline-none focus:border-neutral-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full h-10 rounded-xl bg-neutral-100 text-neutral-900 text-sm font-semibold hover:bg-neutral-200 transition-colors select-none cursor-pointer flex items-center justify-center"
          >
            {loading ? <Loader variant="ascii" size={16} /> : "Add Category"}
          </button>
        </form>
      </div>

      {/* Grid of categories */}
      <div className="md:col-span-2 rounded-2xl border border-neutral-800 bg-neutral-900/20 p-5">
        <h2 className="text-sm font-semibold text-neutral-200 mb-4 flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-neutral-500" /> Categories
        </h2>
        {categories.length === 0 ? (
          <div className="text-center py-12 text-sm text-neutral-600">
            No asset categories defined yet.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between p-3.5 rounded-xl border border-neutral-800 bg-neutral-900/40 hover:bg-neutral-900/70 transition-colors"
              >
                <span className="text-sm font-medium text-neutral-250">{cat.name}</span>
                <button
                  onClick={() => handleDelete(cat.id)}
                  className="h-7 w-7 flex items-center justify-center rounded-lg border border-neutral-800 hover:border-red-500/30 hover:bg-red-550/10 hover:text-red-400 text-neutral-500 transition-all duration-100 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// DIRECTORY & INVITATIONS TAB
// ──────────────────────────────────────────────────────────────────────────────
function DirectoryTab({
  employees,
  departments,
  invitations,
  onSuccess,
}: {
  employees: any[];
  departments: any[];
  invitations: any[];
  onSuccess: () => void;
}) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);

  const promoteMutation = useMutation(orpc.employee.promote.mutationOptions());
  const updateStatusMutation = useMutation(orpc.employee.updateStatus.mutationOptions());

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviteLoading(true);
    try {
      const { error } = await authClient.organization.inviteMember({
        email: inviteEmail.trim(),
        role: "member", // maps to EMPLOYEE role in ERP
      });
      if (error) {
        toast.error(error.message || "Failed to send invitation");
        return;
      }
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCancelInvite = async (id: string) => {
    try {
      const { error } = await authClient.organization.cancelInvitation({
        invitationId: id,
      });
      if (error) {
        toast.error(error.message || "Failed to cancel invitation");
        return;
      }
      toast.success("Invitation cancelled");
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong");
    }
  };

  const handlePromoteRole = async (employeeId: string, role: string) => {
    try {
      await promoteMutation.mutateAsync({
        employeeId,
        role: role as any,
      });
      toast.success(`Role updated successfully`);
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update role");
    }
  };

  const handleSetDepartment = async (emp: any, departmentId: string) => {
    try {
      await promoteMutation.mutateAsync({
        employeeId: emp.id,
        role: emp.role,
        departmentId: departmentId || null,
      });
      toast.success(`Department updated`);
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update department");
    }
  };

  const handleToggleStatus = async (employeeId: string, currentStatus: boolean) => {
    try {
      await updateStatusMutation.mutateAsync({
        employeeId,
        isActive: !currentStatus,
      });
      toast.success(`Status updated successfully`);
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update status");
    }
  };

  const copyInviteLink = (id: string) => {
    const link = `${window.location.origin}/accept-invite?id=${id}`;
    navigator.clipboard.writeText(link);
    toast.success("Invitation link copied to clipboard!");
  };

  return (
    <div className="space-y-6">
      {/* Invitation Section */}
      <div className="grid md:grid-cols-3 gap-6 items-start">
        {/* Send invite */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
            <Mail className="h-4 w-4 text-neutral-500" /> Invite Employee
          </h2>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
                Email Address
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="e.g. employee@company.com"
                required
                className="w-full h-10 px-3.5 rounded-xl bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 outline-none focus:border-neutral-500"
              />
            </div>

            <button
              type="submit"
              disabled={inviteLoading || !inviteEmail.trim()}
              className="w-full h-10 rounded-xl bg-neutral-100 text-neutral-900 text-sm font-semibold hover:bg-neutral-200 transition-colors select-none cursor-pointer flex items-center justify-center"
            >
              {inviteLoading ? <Loader variant="ascii" size={16} /> : "Send Invitation"}
            </button>
          </form>
        </div>

        {/* Pending list */}
        <div className="md:col-span-2 rounded-2xl border border-neutral-800 bg-neutral-900/20 p-5">
          <h2 className="text-sm font-semibold text-neutral-200 mb-4 flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-neutral-500" /> Pending Invitations
          </h2>
          {invitations.length === 0 ? (
            <div className="text-center py-8 text-sm text-neutral-600">
              No pending invitations.
            </div>
          ) : (
            <div className="space-y-2">
              {invitations
                .filter((inv) => inv.status === "pending")
                .map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-neutral-800 bg-neutral-900/40"
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-neutral-200">{inv.email}</p>
                      <p className="text-[10px] text-neutral-500">
                        Expires: {new Date(inv.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => copyInviteLink(inv.id)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-neutral-800 hover:border-neutral-700 bg-neutral-900 hover:text-neutral-200 text-neutral-450 transition-all duration-100 cursor-pointer"
                      >
                        Copy Link
                      </button>
                      <button
                        onClick={() => handleCancelInvite(inv.id)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-neutral-800 hover:border-red-500/30 hover:bg-red-550/10 hover:text-red-400 text-neutral-500 transition-all duration-100 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Directory Table */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/20 p-5">
        <h2 className="text-sm font-semibold text-neutral-200 mb-4 flex items-center gap-2">
          <Shield className="h-4 w-4 text-neutral-500" /> Directory
        </h2>
        {employees.length === 0 ? (
          <div className="text-center py-12 text-sm text-neutral-600">
            Loading directory...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-neutral-800 text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
                  <th className="pb-3 pl-2">Employee</th>
                  <th className="pb-3">Department</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3 pr-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-850">
                {employees.map((emp) => {
                  const initials = emp.user.name
                    ? emp.user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
                    : "?";
                  return (
                    <tr key={emp.id} className="hover:bg-neutral-900/30 transition-colors">
                      {/* User Info */}
                      <td className="py-3.5 pl-2 flex items-center gap-3">
                        <div className="h-8 w-8 shrink-0 flex items-center justify-center rounded-full bg-neutral-850 text-xs font-medium text-neutral-300">
                          {initials}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium text-neutral-200 truncate">{emp.user.name}</span>
                          <span className="text-xs text-neutral-500 truncate mt-0.5">{emp.user.email}</span>
                        </div>
                      </td>

                      {/* Department dropdown */}
                      <td className="py-3.5">
                        <Select
                          value={emp.departmentId || ""}
                          onValueChange={(val) => handleSetDepartment(emp, val)}
                        >
                          <SelectTrigger className="h-8 px-2 rounded bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 outline-none hover:border-neutral-700 transition-colors">
                            <SelectValue placeholder="None" />
                          </SelectTrigger>
                          <SelectContent className="w-48 max-h-60 overflow-y-auto">
                            <SelectItem value="">None</SelectItem>
                            {departments
                              .filter((d) => d.isActive)
                              .map((d) => (
                                <SelectItem key={d.id} value={d.id}>
                                  {d.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </td>

                      {/* Role selector */}
                      <td className="py-3.5">
                        <Select
                          value={emp.role}
                          onValueChange={(val) => handlePromoteRole(emp.id, val)}
                        >
                          <SelectTrigger className="h-8 px-2 rounded bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 outline-none hover:border-neutral-700 transition-colors font-medium">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="w-48">
                            <SelectItem value="EMPLOYEE">Employee</SelectItem>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                            <SelectItem value="DEPARTMENT_HEAD">Department Head</SelectItem>
                            <SelectItem value="ASSET_MANAGER">Asset Manager</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>

                      {/* Status toggle */}
                      <td className="py-3.5 pr-2 text-right">
                        <button
                          onClick={() => handleToggleStatus(emp.id, emp.isActive)}
                          className="cursor-pointer outline-none transition-colors"
                        >
                          {emp.isActive ? (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-450 border border-emerald-500/25 px-2 py-0.5 rounded-full">
                              <CheckCircle className="h-2.5 w-2.5" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/25 px-2 py-0.5 rounded-full">
                              <XCircle className="h-2.5 w-2.5" /> Suspended
                            </span>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

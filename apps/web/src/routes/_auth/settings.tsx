import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  User,
  Building2,
  Shield,
  Key,
  Save,
  Mail,
  Globe,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Loader } from "@odoo-hackathon-2026/ui/components/motion/loader";

import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/_auth/settings")({
  component: RouteComponent,
});

type SettingsTab = "profile" | "org" | "security";

function RouteComponent() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const { data: session } = authClient.useSession();
  const { data: activeOrg } = authClient.useActiveOrganization();

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-neutral-100">Settings</h1>
        <p className="text-sm text-neutral-500">Manage your account and organization preferences.</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 rounded-2xl bg-neutral-900/60 p-1 border border-neutral-800/60 max-w-md">
        {([
          { id: "profile", label: "Profile", icon: <User className="h-4 w-4" /> },
          { id: "org", label: "Organization", icon: <Building2 className="h-4 w-4" /> },
          { id: "security", label: "Security", icon: <Shield className="h-4 w-4" /> },
        ] as const).map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative flex-1 flex items-center justify-center gap-2 h-9 rounded-xl text-xs font-medium outline-none transition-colors select-none cursor-pointer"
            >
              {isActive && (
                <motion.span
                  layoutId="settings-tab-pill"
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
      <AnimatePresence mode="wait">
        {activeTab === "profile" && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <ProfilePanel session={session} />
          </motion.div>
        )}
        {activeTab === "org" && (
          <motion.div
            key="org"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <OrgPanel activeOrg={activeOrg} />
          </motion.div>
        )}
        {activeTab === "security" && (
          <motion.div
            key="security"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <SecurityPanel />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Profile Panel ──────────────────────────────────────────────────────────
function ProfilePanel({ session }: { session: any }) {
  const user = session?.user;
  const [name, setName] = useState(user?.name || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await authClient.updateUser({ name: name.trim() });
      toast.success("Profile updated");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid md:grid-cols-3 gap-6 items-start">
      {/* Avatar + Info */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 flex flex-col items-center text-center space-y-3">
        <div className="h-20 w-20 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-2xl font-bold text-neutral-300">
          {user?.name
            ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
            : "?"}
        </div>
        <div>
          <p className="text-sm font-semibold text-neutral-200">{user?.name}</p>
          <p className="text-xs text-neutral-500">{user?.email}</p>
        </div>
        <span
          className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full ${
            user?.emailVerified
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"
              : "bg-amber-500/10 text-amber-400 border border-amber-500/25"
          }`}
        >
          {user?.emailVerified ? (
            <><CheckCircle className="h-3 w-3" /> Email Verified</>
          ) : (
            <><XCircle className="h-3 w-3" /> Email Not Verified</>
          )}
        </span>
      </div>

      {/* Edit Form */}
      <div className="md:col-span-2 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
          <User className="h-4 w-4 text-neutral-500" /> Profile Information
        </h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 px-3.5 rounded-xl bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 outline-none focus:border-neutral-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Email</label>
            <div className="flex items-center gap-2">
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="w-full h-10 px-3.5 rounded-xl bg-neutral-900 border border-neutral-800 text-sm text-neutral-500 outline-none opacity-60 cursor-not-allowed"
              />
              <Mail className="h-4 w-4 text-neutral-600 shrink-0" />
            </div>
            <p className="text-[10px] text-neutral-600">Email cannot be changed.</p>
          </div>
          <button
            type="submit"
            disabled={saving || !name.trim() || name === user?.name}
            className="h-10 px-5 rounded-xl bg-neutral-100 text-neutral-900 text-sm font-semibold hover:bg-neutral-200 transition-colors select-none cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader variant="ascii" size={16} /> : <><Save className="h-4 w-4" /> Save Changes</>}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Organization Panel ──────────────────────────────────────────────────────
function OrgPanel({ activeOrg }: { activeOrg: any }) {
  const [orgName, setOrgName] = useState(activeOrg?.name || "");
  const [logoUrl, setLogoUrl] = useState(activeOrg?.logo || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) return;
    setSaving(true);
    try {
      await authClient.organization.update({
        data: {
          name: orgName.trim(),
          logo: logoUrl.trim() || undefined,
        },
      });
      toast.success("Organization updated");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update organization");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid md:grid-cols-3 gap-6 items-start">
      {/* Org Logo */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 flex flex-col items-center text-center space-y-3">
        <div className="h-24 w-24 rounded-2xl bg-neutral-800 border border-neutral-700 flex items-center justify-center overflow-hidden">
          {logoUrl ? (
            <img src={logoUrl} alt="Org logo" className="h-full w-full object-cover" />
          ) : (
            <Building2 className="h-10 w-10 text-neutral-500" />
          )}
        </div>
        <p className="text-xs text-neutral-500">
          {activeOrg?.slug ? `/${activeOrg.slug}` : ""}
        </p>
      </div>

      {/* Edit Form */}
      <div className="md:col-span-2 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-neutral-500" /> Organization Details
        </h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Organization Name</label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full h-10 px-3.5 rounded-xl bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 outline-none focus:border-neutral-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Slug</label>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-neutral-500" />
              <input
                type="text"
                value={activeOrg?.slug || ""}
                disabled
                className="w-full h-10 px-3.5 rounded-xl bg-neutral-900 border border-neutral-800 text-sm text-neutral-500 outline-none opacity-60 cursor-not-allowed font-mono"
              />
            </div>
            <p className="text-[10px] text-neutral-600">Slug cannot be changed after creation.</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
              Logo URL <span className="text-neutral-700 normal-case tracking-normal">(optional)</span>
            </label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              className="w-full h-10 px-3.5 rounded-xl bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 outline-none focus:border-neutral-500"
            />
          </div>
          <button
            type="submit"
            disabled={saving || !orgName.trim()}
            className="h-10 px-5 rounded-xl bg-neutral-100 text-neutral-900 text-sm font-semibold hover:bg-neutral-200 transition-colors select-none cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader variant="ascii" size={16} /> : <><Save className="h-4 w-4" /> Save Changes</>}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Security Panel ──────────────────────────────────────────────────────────
function SecurityPanel() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setSaving(true);
    try {
      await authClient.changePassword({
        currentPassword,
        newPassword,
      });
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg space-y-6">
      {/* Password */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
          <Key className="h-4 w-4 text-neutral-500" /> Change Password
        </h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full h-10 px-3.5 rounded-xl bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 outline-none focus:border-neutral-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="w-full h-10 px-3.5 rounded-xl bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 outline-none focus:border-neutral-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full h-10 px-3.5 rounded-xl bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 outline-none focus:border-neutral-500"
            />
          </div>
          <button
            type="submit"
            disabled={saving || !currentPassword || !newPassword || !confirmPassword}
            className="h-10 px-5 rounded-xl bg-neutral-100 text-neutral-900 text-sm font-semibold hover:bg-neutral-200 transition-colors select-none cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader variant="ascii" size={16} /> : <><Key className="h-4 w-4" /> Update Password</>}
          </button>
        </form>
      </div>

      {/* Session Info */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
          <Shield className="h-4 w-4 text-neutral-500" /> Security Tips
        </h2>
        <ul className="space-y-2 text-xs text-neutral-500">
          <li className="flex items-start gap-2">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
            Use a strong, unique password with at least 8 characters
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
            Enable two-factor authentication for additional security
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
            Never share your password with anyone
          </li>
        </ul>
      </div>
    </div>
  );
}

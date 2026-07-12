import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence, MotionConfig } from "motion/react";
import { Eye, EyeOff, ArrowRight, Mail, Lock, User, Building2 } from "lucide-react";
import { Loader } from "@odoo-hackathon-2026/ui/components/motion/loader";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/accept-invite")({
  component: RouteComponent,
});

const EASE_OUT = [0.0, 0.0, 0.2, 1] as const;

function RouteComponent() {
  const navigate = Route.useNavigate();
  const searchParams = Route.useSearch();
  const inviteId = (searchParams as any).id as string;

  const [invitation, setInvitation] = useState<any>(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  // Form states
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // 1. Check session
    authClient.getSession().then(({ data }) => {
      setSession(data);
      setCheckingSession(false);
      if (data && inviteId) {
        // If already logged in, automatically accept and redirect
        handleAcceptInvitation(inviteId);
      }
    });

    // 2. Fetch invitation details
    if (inviteId) {
      fetchInviteDetails(inviteId);
    } else {
      setLoadingInvite(false);
    }
  }, [inviteId]);

  const fetchInviteDetails = async (id: string) => {
    try {
      const { data } = await authClient.organization.getInvitation({
        query: { id },
      });
      if (data) {
        setInvitation(data);
        setEmail(data.email || "");
      }
    } catch (err) {
      console.warn("Failed to fetch invitation details:", err);
    } finally {
      setLoadingInvite(false);
    }
  };

  const handleAcceptInvitation = async (id: string) => {
    setAuthLoading(true);
    try {
      const { error } = await authClient.organization.acceptInvitation({
        invitationId: id,
      });
      if (error) {
        toast.error(error.message || "Failed to accept invitation");
        return;
      }
      toast.success("Joined organization successfully!");
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteId) {
      toast.error("Invalid or missing invitation link");
      return;
    }

    setAuthLoading(true);
    try {
      // Create user account with pre-filled email from invitation
      const { error } = await authClient.signUp.email({
        email,
        password,
        name,
      });
      if (error) {
        toast.error(error.message || "Failed to create account");
        setAuthLoading(false);
        return;
      }

      // After successful sign up, accept the invite and join organization
      await handleAcceptInvitation(inviteId);
    } catch (err: any) {
      toast.error(err?.message || "Authentication failed");
      setAuthLoading(false);
    }
  };

  if (checkingSession || (loadingInvite && inviteId)) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-neutral-950">
        <Loader variant="ascii-braille" size={24} />
      </div>
    );
  }

  // Already logged in - accepting state
  if (session && inviteId) {
    return (
      <div
        className="antialiased h-screen flex items-center justify-center px-4"
        style={{
          background:
            "radial-gradient(ellipse 90% 70% at 50% -10%, oklch(0.22 0 0) 0%, oklch(0.09 0 0) 100%)",
        }}
      >
        <div className="rounded-3xl bg-neutral-200 dark:bg-neutral-900 p-2.5 shadow-2xl max-w-sm w-full border border-neutral-800/40">
          <div className="rounded-2xl bg-neutral-50 dark:bg-neutral-800 p-6 space-y-4 text-center">
            <Loader variant="dots" size={32} className="mx-auto" />
            <h1 className="text-sm font-semibold text-neutral-200">Accepting Invitation...</h1>
            <p className="text-xs text-neutral-500">
              Joining organization and setting up your employee profile.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="antialiased h-screen flex items-center justify-center px-4 overflow-y-auto"
      style={{
        background:
          "radial-gradient(ellipse 90% 70% at 50% -10%, oklch(0.22 0 0) 0%, oklch(0.09 0 0) 100%)",
      }}
    >
      <MotionConfig reducedMotion="user">
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: EASE_OUT }}
          className="w-full max-w-[400px]"
        >
          {/* Card Wrapper */}
          <div className="rounded-3xl bg-neutral-200 dark:bg-neutral-900 p-2.5 shadow-[0_32px_80px_oklch(0_0_0/0.5),0_8px_24px_oklch(0_0_0/0.3)]">
            <div className="rounded-2xl bg-neutral-50 dark:bg-neutral-800 px-6 pb-6 pt-5 space-y-5">
              {/* Header Info */}
              <div className="flex flex-col items-center gap-1.5 pb-1 text-center">
                <div className="h-10 w-10 rounded-xl bg-neutral-900 dark:bg-neutral-100 flex items-center justify-center shadow-lg">
                  <Building2 className="h-5 w-5 text-neutral-100 dark:text-neutral-900" />
                </div>
                <h1 className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 mt-2">
                  Create Employee Account
                </h1>
                <p className="text-xs text-neutral-500 dark:text-neutral-450 leading-relaxed px-4 balance">
                  {invitation ? (
                    <>
                      Join{" "}
                      <span className="font-semibold text-neutral-200">
                        {invitation.organizationName || "the organization"}
                      </span>{" "}
                      as an Employee.
                    </>
                  ) : (
                    "Create your account to accept the invitation."
                  )}
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-medium text-neutral-500 uppercase tracking-widest">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500 pointer-events-none" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      required
                      className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 outline-none focus:border-neutral-500 transition-all duration-150"
                    />
                  </div>
                </div>

                {/* Email (Read-only / Prefilled) */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-medium text-neutral-500 uppercase tracking-widest">
                    Email Address (Invited)
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-550 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      readOnly
                      disabled
                      required
                      className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800 text-sm text-neutral-400 outline-none cursor-not-allowed opacity-60"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-medium text-neutral-500 uppercase tracking-widest">
                    Create Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500 pointer-events-none" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full h-11 pl-10 pr-10 rounded-xl bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 outline-none focus:border-neutral-500 transition-all duration-150"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 outline-none cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authLoading || !email}
                  className="w-full h-11 rounded-xl bg-neutral-100 text-neutral-900 text-sm font-semibold hover:bg-neutral-200 transition-colors select-none cursor-pointer flex items-center justify-center gap-2 active:scale-[0.97]"
                >
                  {authLoading ? (
                    <Loader variant="ascii" size={16} />
                  ) : (
                    <>
                      Create Account & Join
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </motion.div>
      </MotionConfig>
    </div>
  );
}

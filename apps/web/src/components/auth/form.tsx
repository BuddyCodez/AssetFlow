/**
 * AuthPanel — sign-in / sign-up form
 *
 * Design: Mac-native dark editorial.
 * Matches the MacOSSidebar's neutral-900 / rounded-3xl language.
 *
 * Polish applied per make-interfaces-feel-better:
 *  - Concentric border radius (outer 3xl → inner 2xl → input xl)
 *  - Layered box-shadow depth instead of flat borders
 *  - Staggered field entrance (AnimatePresence + motion.div, 80 ms stagger)
 *  - Exit animations shorter than enter
 *  - Scale-on-press button (active:scale-[0.96])
 *  - Interruptible CSS transitions on inputs (not keyframes)
 *  - Font smoothing via antialiased class on root
 *  - text-wrap: balance on headings
 *  - Password icon cross-fade (scale 0.25→1, blur 4px→0, opacity 0→1)
 *  - tabular-nums on all number/code inputs
 */

import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { motion, AnimatePresence, MotionConfig } from "motion/react";
import { Eye, EyeOff, ArrowRight, Loader2, Mail, Lock, User } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { CreateOrgModal } from "./create-org-modal";

// ─── Animation constants ──────────────────────────────────────────────────────
const SPRING = { type: "spring", stiffness: 170, damping: 24, mass: 1.2 } as const;
const EASE_OUT = [0.0, 0.0, 0.2, 1] as const;

// Staggered field entrance
function fieldVariant(i: number) {
  return {
    initial: { opacity: 0, y: 10 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.07, duration: 0.22, ease: EASE_OUT },
    },
    exit: {
      opacity: 0,
      y: -6,
      transition: { duration: 0.14, ease: EASE_OUT },
    },
  };
}

// Tab slide direction
const tabVariant = (direction: number) => ({
  initial: { opacity: 0, x: direction * 12 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.2, ease: EASE_OUT } },
  exit: {
    opacity: 0,
    x: direction * -8,
    transition: { duration: 0.14, ease: EASE_OUT },
  },
});

// ─── Password input with animated icon swap ───────────────────────────────────
function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  disabled,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-widest"
      >
        {label}
      </label>
      <div className="relative">
        {/* Left icon */}
        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400 dark:text-neutral-500 pointer-events-none" />

        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          disabled={disabled}
          placeholder={placeholder ?? "••••••••••"}
          required
          className="
            w-full h-11 pl-10 pr-10 rounded-xl
            bg-neutral-100 dark:bg-neutral-900
            border border-neutral-200 dark:border-neutral-700/60
            text-sm text-neutral-900 dark:text-neutral-100
            placeholder:text-neutral-400 dark:placeholder:text-neutral-600
            outline-none
            transition-[border-color,box-shadow] duration-150
            focus:border-neutral-400 dark:focus:border-neutral-500
            focus:shadow-[0_0_0_3px_oklch(0.5_0_0/0.12)]
            disabled:opacity-50 disabled:cursor-not-allowed
            font-mono tabular-nums
          "
        />

        {/* Animated eye icon swap */}
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          disabled={disabled}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 rounded-md"
        >
          <div className="relative h-4 w-4">
            <AnimatePresence mode="wait" initial={false}>
              {visible ? (
                <motion.span
                  key="off"
                  initial={{ scale: 0.25, opacity: 0, filter: "blur(4px)" }}
                  animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
                  exit={{ scale: 0.25, opacity: 0, filter: "blur(4px)" }}
                  transition={{ duration: 0.18, ease: EASE_OUT }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <EyeOff className="h-4 w-4" />
                </motion.span>
              ) : (
                <motion.span
                  key="on"
                  initial={{ scale: 0.25, opacity: 0, filter: "blur(4px)" }}
                  animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
                  exit={{ scale: 0.25, opacity: 0, filter: "blur(4px)" }}
                  transition={{ duration: 0.18, ease: EASE_OUT }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <Eye className="h-4 w-4" />
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </button>
      </div>
    </div>
  );
}

// ─── Shared text input ────────────────────────────────────────────────────────
function TextField({
  id,
  label,
  type = "text",
  value,
  onChange,
  autoComplete,
  disabled,
  placeholder,
  icon: Icon,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  disabled?: boolean;
  placeholder?: string;
  icon?: React.ElementType;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-widest"
      >
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400 dark:text-neutral-500 pointer-events-none" />
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          disabled={disabled}
          placeholder={placeholder}
          required
          className={`
            w-full h-11 ${Icon ? "pl-10" : "pl-3.5"} pr-3.5 rounded-xl
            bg-neutral-100 dark:bg-neutral-900
            border border-neutral-200 dark:border-neutral-700/60
            text-sm text-neutral-900 dark:text-neutral-100
            placeholder:text-neutral-400 dark:placeholder:text-neutral-600
            outline-none
            transition-[border-color,box-shadow] duration-150
            focus:border-neutral-400 dark:focus:border-neutral-500
            focus:shadow-[0_0_0_3px_oklch(0.5_0_0/0.12)]
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        />
      </div>
    </div>
  );
}

// ─── Submit button ────────────────────────────────────────────────────────────
function SubmitButton({
  loading,
  label,
  loadingLabel,
}: {
  loading: boolean;
  label: string;
  loadingLabel: string;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="
        relative w-full h-11 rounded-xl
        bg-neutral-900 dark:bg-neutral-100
        text-neutral-100 dark:text-neutral-900
        text-sm font-semibold
        flex items-center justify-center gap-2
        outline-none
        transition-[transform,opacity,box-shadow] duration-150
        active:scale-[0.96]
        hover:shadow-[0_4px_16px_oklch(0_0_0/0.25)]
        focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2
        disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100
        select-none
      "
    >
      <AnimatePresence mode="wait" initial={false}>
        {loading ? (
          <motion.span
            key="loading"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            {loadingLabel}
          </motion.span>
        ) : (
          <motion.span
            key="idle"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2"
          >
            {label}
            <ArrowRight className="h-4 w-4" />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

// ─── Tab pill indicator ───────────────────────────────────────────────────────
type Tab = "signin" | "signup";

function TabBar({
  active,
  onChange,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-2xl bg-neutral-200 dark:bg-neutral-900 p-1">
      {(["signin", "signup"] as Tab[]).map((tab) => {
        const label = tab === "signin" ? "Sign in" : "Create account";
        const isActive = active === tab;
        return (
          <button
            key={tab}
            type="button"
            onClick={() => onChange(tab)}
            className="relative flex-1 h-8 rounded-xl text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 transition-colors select-none"
          >
            {isActive && (
              <motion.span
                layoutId="auth-tab-pill"
                transition={SPRING}
                className="absolute inset-0 rounded-xl bg-neutral-100 dark:bg-neutral-800 shadow-[0_1px_3px_oklch(0_0_0/0.15),0_1px_0_oklch(1_0_0/0.06)_inset]"
              />
            )}
            <span
              className={`relative z-10 transition-colors duration-150 ${
                isActive
                  ? "text-neutral-900 dark:text-neutral-100"
                  : "text-neutral-500 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              }`}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700/60" />
      <span className="text-xs text-neutral-400 dark:text-neutral-600 shrink-0">{label}</span>
      <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700/60" />
    </div>
  );
}

// ─── Sign-in form ─────────────────────────────────────────────────────────────
function SignInForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await authClient.signIn.email({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message ?? "Failed to sign in");
      return;
    }
    toast.success("Welcome back!");
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <motion.div {...fieldVariant(0)}>
        <TextField
          id="si-email"
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          placeholder="you@company.com"
          disabled={loading}
          icon={Mail}
        />
      </motion.div>

      <motion.div {...fieldVariant(1)}>
        <PasswordField
          id="si-password"
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          disabled={loading}
        />
      </motion.div>

      <motion.div {...fieldVariant(2)}>
        <SubmitButton loading={loading} label="Sign in" loadingLabel="Signing in…" />
      </motion.div>
    </form>
  );
}

// ─── Sign-up form ─────────────────────────────────────────────────────────────
function SignUpForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await authClient.signUp.email({ name, email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message ?? "Failed to create account");
      return;
    }
    toast.success("Account created — welcome aboard!");
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <motion.div {...fieldVariant(0)}>
        <TextField
          id="su-name"
          label="Full name"
          value={name}
          onChange={setName}
          autoComplete="name"
          placeholder="Jane Smith"
          disabled={loading}
          icon={User}
        />
      </motion.div>

      <motion.div {...fieldVariant(1)}>
        <TextField
          id="su-email"
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          placeholder="jane@company.com"
          disabled={loading}
          icon={Mail}
        />
      </motion.div>

      <motion.div {...fieldVariant(2)}>
        <PasswordField
          id="su-password"
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          placeholder="At least 8 characters"
          disabled={loading}
        />
      </motion.div>

      <motion.div {...fieldVariant(3)}>
        <SubmitButton loading={loading} label="Create account" loadingLabel="Creating account…" />
      </motion.div>

      <motion.p
        {...fieldVariant(4)}
        className="text-center text-xs text-neutral-400 dark:text-neutral-600 leading-relaxed"
      >
        By signing up you agree to our{" "}
        <a href="#" className="underline underline-offset-2 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors">
          Terms
        </a>{" "}
        and{" "}
        <a href="#" className="underline underline-offset-2 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors">
          Privacy Policy
        </a>.
      </motion.p>
    </form>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────
export interface AuthPanelProps {
  brandName?: string;
  brandDescriptor?: string;
}

export function AuthPanel({
  brandName = "ERP",
  brandDescriptor,
}: AuthPanelProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("signin");
  const [showOrgModal, setShowOrgModal] = useState(false);
  const direction = activeTab === "signin" ? -1 : 1;

  // Sign-in: go straight to dashboard (user already has an org)
  const handleSignInSuccess = () => navigate({ to: "/dashboard" });

  // Sign-up: show org creation modal first
  const handleSignUpSuccess = () => setShowOrgModal(true);

  // Org created: now navigate to dashboard
  const handleOrgCreated = (_orgId: string) => navigate({ to: "/dashboard" });

  return (
    <>
      {/* Org creation overlay — shown after signup */}
      <AnimatePresence>
        {showOrgModal && (
          <CreateOrgModal onSuccess={handleOrgCreated} />
        )}
      </AnimatePresence>

      {/* Full-page atmospheric background */}
      <div
        className="antialiased h-full flex items-center justify-center px-4 py-8"
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
            {/* ── Outer card ── */}
            <div className="rounded-3xl bg-neutral-200 dark:bg-neutral-900 p-2.5 shadow-[0_32px_80px_oklch(0_0_0/0.5),0_8px_24px_oklch(0_0_0/0.3)]">
              {/* ── Inner card ── */}
              <div className="rounded-2xl bg-neutral-50 dark:bg-neutral-800 px-6 pb-6 pt-5 space-y-5">

                {/* Brand */}
                <div className="flex flex-col items-center gap-1.5 pb-1">
                  <div className="h-10 w-10 rounded-xl bg-neutral-900 dark:bg-neutral-100 flex items-center justify-center shadow-[0_2px_8px_oklch(0_0_0/0.3)]">
                    <span className="text-lg font-bold text-neutral-100 dark:text-neutral-900 leading-none select-none">
                      {brandName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <h1
                    className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-100"
                    style={{ textWrap: "balance" } as React.CSSProperties}
                  >
                    {brandName}
                  </h1>
                  {brandDescriptor && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {brandDescriptor}
                    </p>
                  )}
                </div>

                {/* Tab switcher */}
                <TabBar active={activeTab} onChange={setActiveTab} />

                <Divider label="continue with email" />

                {/* Animated form content */}
                <AnimatePresence mode="wait" initial={false} custom={direction}>
                  {activeTab === "signin" ? (
                    <motion.div
                      key="signin"
                      custom={-1}
                      variants={{
                        initial: (d: number) => ({ opacity: 0, x: d * 12 }),
                        animate: { opacity: 1, x: 0, transition: { duration: 0.2, ease: EASE_OUT } },
                        exit: (d: number) => ({ opacity: 0, x: d * -8, transition: { duration: 0.14, ease: EASE_OUT } }),
                      }}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                    >
                      <SignInForm onSuccess={handleSignInSuccess} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="signup"
                      custom={1}
                      variants={{
                        initial: (d: number) => ({ opacity: 0, x: d * 12 }),
                        animate: { opacity: 1, x: 0, transition: { duration: 0.2, ease: EASE_OUT } },
                        exit: (d: number) => ({ opacity: 0, x: d * -8, transition: { duration: 0.14, ease: EASE_OUT } }),
                      }}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                    >
                      <SignUpForm onSuccess={handleSignUpSuccess} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Bottom switch link */}
            <p className="mt-4 text-center text-xs text-neutral-500 dark:text-neutral-600">
              {activeTab === "signin" ? (
                <>
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setActiveTab("signup")}
                    className="font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors underline underline-offset-2"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setActiveTab("signin")}
                    className="font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors underline underline-offset-2"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </motion.div>
        </MotionConfig>
      </div>
    </>
  );
}


/**
 * CreateOrgModal
 *
 * Shown immediately after signup (and on /onboarding as a fallback).
 * User enters org name → slug auto-derives → optional logo URL.
 * On submit: calls authClient.organization.create → server creates org + member(owner).
 * Then the caller (onSuccess) creates the Employee(ADMIN) record via oRPC and navigates to /dashboard.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence, MotionConfig } from "motion/react";
import {
  Building2,
  Hash,
  ImageIcon,
  ArrowRight,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

const EASE_OUT = [0.0, 0.0, 0.2, 1] as const;

function slugify(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface CreateOrgModalProps {
  /** Called with the new org id + slug after successful creation */
  onSuccess: (orgId: string) => void;
  /** If true renders inline (no overlay), used on /onboarding page */
  inline?: boolean;
}

export function CreateOrgModal({ onSuccess, inline = false }: CreateOrgModalProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [logo, setLogo] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(false);

  // Auto-derive slug from name unless user has manually edited it
  useEffect(() => {
    if (!slugTouched) {
      setSlug(slugify(name));
    }
  }, [name, slugTouched]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await authClient.organization.create({
        name: name.trim(),
        slug: slug || slugify(name),
        logo: logo.trim() || undefined,
      });

      if (error) {
        toast.error(error.message ?? "Failed to create organization");
        return;
      }

      if (!data?.id) {
        toast.error("Unexpected error — no organization returned");
        return;
      }

      toast.success(`Welcome to ${name}!`);
      onSuccess(data.id);
    } catch (err: any) {
      toast.error(err?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Org Name */}
      <div className="space-y-1.5">
        <label
          htmlFor="org-name"
          className="block text-xs font-medium text-neutral-500 uppercase tracking-widest"
        >
          Organization name
        </label>
        <div className="relative">
          <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500 pointer-events-none" />
          <input
            id="org-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            placeholder="Acme Corp"
            required
            autoFocus
            className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-neutral-900 border border-neutral-700/60
              text-sm text-neutral-100 placeholder:text-neutral-600
              outline-none transition-[border-color,box-shadow] duration-150
              focus:border-neutral-500 focus:shadow-[0_0_0_3px_oklch(0.5_0_0/0.12)]
              disabled:opacity-50"
          />
        </div>
      </div>

      {/* Slug */}
      <div className="space-y-1.5">
        <label
          htmlFor="org-slug"
          className="block text-xs font-medium text-neutral-500 uppercase tracking-widest"
        >
          Slug
        </label>
        <div className="relative">
          <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500 pointer-events-none" />
          <input
            id="org-slug"
            type="text"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
            }}
            disabled={loading}
            placeholder="acme-corp"
            required
            className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-neutral-900 border border-neutral-700/60
              text-sm text-neutral-100 placeholder:text-neutral-600 font-mono tabular-nums
              outline-none transition-[border-color,box-shadow] duration-150
              focus:border-neutral-500 focus:shadow-[0_0_0_3px_oklch(0.5_0_0/0.12)]
              disabled:opacity-50"
          />
        </div>
        <p className="text-xs text-neutral-600">
          Used in URLs. Only lowercase letters, numbers, and hyphens.
        </p>
      </div>

      {/* Logo URL (optional) */}
      <div className="space-y-1.5">
        <label
          htmlFor="org-logo"
          className="block text-xs font-medium text-neutral-500 uppercase tracking-widest"
        >
          Logo URL <span className="text-neutral-700 normal-case tracking-normal">(optional)</span>
        </label>
        <div className="relative">
          <ImageIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500 pointer-events-none" />
          <input
            id="org-logo"
            type="url"
            value={logo}
            onChange={(e) => setLogo(e.target.value)}
            disabled={loading}
            placeholder="https://example.com/logo.png"
            className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-neutral-900 border border-neutral-700/60
              text-sm text-neutral-100 placeholder:text-neutral-600
              outline-none transition-[border-color,box-shadow] duration-150
              focus:border-neutral-500 focus:shadow-[0_0_0_3px_oklch(0.5_0_0/0.12)]
              disabled:opacity-50"
          />
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || !name.trim()}
        className="relative w-full h-11 rounded-xl
          bg-neutral-100 text-neutral-900
          text-sm font-semibold
          flex items-center justify-center gap-2
          outline-none transition-[transform,opacity,box-shadow] duration-150
          active:scale-[0.96]
          hover:shadow-[0_4px_16px_oklch(0_0_0/0.35)]
          focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
          select-none"
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
              Creating…
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
              Create organization
              <ArrowRight className="h-4 w-4" />
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </form>
  );

  // Inline mode: just the card (for /onboarding page)
  if (inline) {
    return (
      <MotionConfig reducedMotion="user">
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.3, ease: EASE_OUT }}
          className="w-full max-w-[420px]"
        >
          <div className="rounded-3xl bg-neutral-800 p-2.5 shadow-[0_32px_80px_oklch(0_0_0/0.5)]">
            <div className="rounded-2xl bg-neutral-900 px-6 pb-6 pt-5 space-y-5">
              <div className="flex flex-col gap-1">
                <h1 className="text-lg font-semibold text-neutral-100">
                  Set up your organization
                </h1>
                <p className="text-sm text-neutral-500">
                  You'll be added as the Admin automatically.
                </p>
              </div>
              {formContent}
            </div>
          </div>
        </motion.div>
      </MotionConfig>
    );
  }

  // Overlay modal mode (shown after signup)
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4
          bg-black/60 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.97 }}
          transition={{ duration: 0.25, ease: EASE_OUT }}
          className="w-full max-w-[420px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="org-modal-title"
        >
          <div className="rounded-3xl bg-neutral-800 p-2.5 shadow-[0_32px_80px_oklch(0_0_0/0.6)]">
            <div className="rounded-2xl bg-neutral-900 px-6 pb-6 pt-5 space-y-5">
              <div className="flex items-start justify-between">
                <div className="space-y-0.5">
                  <h2
                    id="org-modal-title"
                    className="text-lg font-semibold text-neutral-100"
                  >
                    Create your organization
                  </h2>
                  <p className="text-sm text-neutral-500">
                    You'll be the Admin. Invite your team next.
                  </p>
                </div>
                {/* No close button — org creation is mandatory */}
              </div>
              {formContent}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </MotionConfig>
  );
}

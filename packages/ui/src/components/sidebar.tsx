"use client";

import { SidebarLeftIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { motion, AnimatePresence } from "motion/react";
import { useState, type ReactNode } from "react";

export interface MacOSSidebarItem {
  /** Display label */
  label: string;
  /** Route URL — used by the caller to navigate */
  url: string;
  /** Optional icon rendered before the label */
  icon?: ReactNode;
}

export interface MacOSSidebarProps {
  /** Nav items — either plain strings (legacy) or rich objects with url + icon */
  items: string[] | MacOSSidebarItem[];
  defaultOpen?: boolean;
  /** Uncontrolled default selection */
  initialSelectedIndex?: number;
  /** Controlled selected index — overrides internal state when provided */
  selectedIndex?: number;
  /** Called whenever the user clicks a nav item */
  onSelect?: (
    index: number,
    item: MacOSSidebarItem | string,
  ) => void;
  children?: ReactNode;
  className?: string;
}

export function MacOSSidebar({
  items,
  defaultOpen = true,
  initialSelectedIndex = 0,
  selectedIndex: controlledIndex,
  onSelect,
  children,
  className = "",
}: MacOSSidebarProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [internalIndex, setInternalIndex] =
    useState<number>(initialSelectedIndex);
  const selectedIndex = controlledIndex ?? internalIndex;
  const [isOpen, setIsOpen] = useState<boolean>(defaultOpen);

  const handleSelect = (index: number) => {
    if (controlledIndex === undefined) setInternalIndex(index);
    onSelect?.(index, items[index] as MacOSSidebarItem | string);
  };

  return (
    <div
      className={`flex bg-neutral-200 dark:bg-neutral-900 rounded-3xl p-3 w-full overflow-hidden ${className}`}
    >
      <motion.div
        animate={{
          width: isOpen ? 240 : 64,
        }}
        transition={{ type: "spring", bounce: 0.4, duration: 0.8 }}
        className={`p-2 rounded-2xl shrink-0 flex flex-col items-start transition-colors duration-900 ease-out ${
          isOpen ? "bg-neutral-100 dark:bg-neutral-800" : "bg-transparent"
        }`}
      >
        <div
          className={`flex items-center w-full ${
            isOpen ? "justify-end gap-4" : "justify-center"
          } text-neutral-700 dark:text-neutral-300 p-2 shrink-0`}
        >
          <motion.div
            layout
            className="shrink-0 flex items-center justify-center"
          >
            <HugeiconsIcon
              icon={SidebarLeftIcon}
              className="size-5 cursor-pointer"
              onClick={() => setIsOpen(!isOpen)}
            />
          </motion.div>
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, filter: "blur(4px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, filter: "blur(4px)" }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex flex-col gap-2 mt-4 w-full relative z-10 whitespace-nowrap"
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {items.map((item, index) => {
                const isRich = typeof item === "object" && item !== null;
                const label = isRich
                  ? (item as MacOSSidebarItem).label
                  : (item as string);
                const icon = isRich
                  ? (item as MacOSSidebarItem).icon
                  : undefined;
                return (
                  <div
                    key={label}
                    className="relative cursor-pointer"
                    onMouseEnter={() => setHoveredIndex(index)}
                    onClick={() => handleSelect(index)}
                  >
                    <AnimatePresence>
                      {selectedIndex === index && (
                        <motion.div
                          className="absolute inset-0 z-0 bg-neutral-200 dark:bg-neutral-700 rounded-md"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                        />
                      )}
                    </AnimatePresence>
                    <p
                      className={`relative z-10 flex items-center gap-2.5 px-5 py-3 tracking-tight ${
                        selectedIndex === index
                          ? "text-neutral-900 dark:text-neutral-100 font-medium"
                          : "text-neutral-700 dark:text-neutral-200/50"
                      }`}
                    >
                      {icon && (
                        <span className="shrink-0 opacity-80">{icon}</span>
                      )}
                      {label}
                    </p>
                    <AnimatePresence>
                      {hoveredIndex === index && selectedIndex !== index && (
                        <motion.span
                          layoutId="sidebar-hover-bg"
                          className="absolute inset-0 z-0 bg-neutral-200/50 dark:bg-neutral-900/50 rounded-md"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{
                            type: "spring",
                            stiffness: 350,
                            damping: 30,
                          }}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Content pane: flex-1 min-w-0 so it fills leftover space correctly */}
      <div className="flex-1 min-w-0 min-h-0 overflow-y-auto z-0 p-4">
        {children}
      </div>
    </div>
  );
}

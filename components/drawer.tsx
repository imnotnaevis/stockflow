"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: string;
}

export function RightDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  width = "max-w-md lg:max-w-lg",
}: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scrolling when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Soft translucent backdrop */}
      <div
        className="fixed inset-0 bg-charcoal-900/20 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-6 md:pl-10">
        <div
          ref={drawerRef}
          className={`w-screen ${width} transform bg-[#EBEBE8] border-l border-white/60 shadow-[-10px_0_40px_rgba(0,0,0,0.08)] rounded-l-[28px] my-2 mr-2 transition-all duration-300 ease-out flex flex-col overflow-hidden`}
        >
          {/* Drawer Header */}
          <div className="flex items-center justify-between border-b border-[#DCDCD8] px-6 py-4 bg-[#EBEBE8]/80 backdrop-blur-sm">
            <div>
              <h2 className="text-base font-bold text-charcoal-900 tracking-tight">{title}</h2>
              {subtitle && (
                <p className="text-xs text-charcoal-muted mt-0.5">{subtitle}</p>
              )}
            </div>
            <button
              onClick={onClose}
              aria-label="Close Drawer"
              className="w-8 h-8 rounded-full bg-white text-charcoal-700 hover:text-charcoal-900 flex items-center justify-center shadow-sm hover:scale-105 transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Drawer Body with soft scrolling */}
          <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

import React from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function Logo({ className, variant = "dark", stacked = false }) {
  const isLight = variant === "light";
  return (
    <Link
      to="/"
      className={cn("inline-flex flex-col leading-none no-underline group", stacked ? "items-center" : "items-start", className)}
      aria-label="Plugged by Ayeley — Home"
    >
      <span
        className={cn(
          "font-heading font-black tracking-tight text-xl sm:text-2xl",
          isLight ? "text-white" : "text-carbon"
        )}
      >
        PLUGGED
      </span>
      <span className={cn("flex items-center gap-1.5 mt-0.5", stacked && "justify-center")}>
        <span className={cn("text-[10px] sm:text-xs font-body font-medium uppercase tracking-[0.25em]", isLight ? "text-white/60" : "text-muted-foreground")}>
          by
        </span>
        <span className="font-heading font-bold text-sm sm:text-base tracking-wide text-pink">
          AYELEY
        </span>
      </span>
    </Link>
  );
}
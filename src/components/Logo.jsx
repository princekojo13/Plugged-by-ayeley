import React from "react";
import { Link } from "react-router-dom";
import brandWordmark from "@/assets/plugged-by-ayeley-logo.png";
import { cn } from "@/lib/utils";

export default function Logo({ className }) {
  return (
    <Link
      to="/"
      className={cn("inline-flex shrink-0 items-center no-underline", className)}
      aria-label="Plugged by Ayeley — Home"
    >
      <img
        src={brandWordmark}
        alt="Plugged by Ayeley"
        className="h-auto max-h-14 w-[108px] object-contain sm:w-[138px]"
        decoding="async"
      />
    </Link>
  );
}

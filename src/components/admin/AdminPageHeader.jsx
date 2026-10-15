import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import Logo from "@/components/Logo";

export default function AdminPageHeader({
  backTo = "/admin",
  backLabel = "Back to admin dashboard",
  title,
  description,
  actions,
  width = "max-w-7xl",
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#eee5e9] bg-white/95 shadow-sm shadow-black/[0.02] backdrop-blur-xl">
      <div className={`mx-auto flex ${width} flex-wrap items-center justify-between gap-4 px-5 py-3.5 sm:px-8`}>
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <Link
            to={backTo}
            aria-label={backLabel}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-black/10 bg-white text-black/60 transition hover:border-[#c20f4d]/40 hover:bg-[#fff7fa] hover:text-[#b10b46]"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#b10b46]">Admin workspace</p>
            <h1 className="mt-0.5 truncate font-heading text-xl font-bold leading-tight text-[#171216] sm:text-2xl">{title}</h1>
            <p className="mt-1 hidden max-w-2xl truncate text-sm text-black/45 sm:block">{description}</p>
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-3 sm:gap-4">
          {actions}
          <span className="hidden items-center border-l border-black/[0.08] pl-3 sm:flex sm:pl-4">
            <Logo />
          </span>
        </div>
      </div>
    </header>
  );
}

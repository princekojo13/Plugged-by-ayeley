import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Bell,
  Cookie,
  Menu,
  Package,
  Pill,
  Search,
  Scissors,
  ShoppingBag,
  ShowerHead,
  SprayCan,
  Sparkles,
  X,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import Logo from "./Logo";
import { useCart } from "@/lib/cartContext";
import { CATEGORIES } from "@/lib/siteConfig";
import { useStoreSettings, whatsappLink } from "@/lib/useStoreSettings";
import WhatsAppIcon from "./WhatsAppIcon";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { whatsapp } = useStoreSettings();

  const { totalItems } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const searchRef = useRef(null);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    setOpen(false);
    setSearchOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = open
      ? "hidden"
      : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!searchOpen) return;

    const onClick = (event) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target)
      ) {
        setSearchOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      onClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        onClick
      );
    };
  }, [searchOpen]);

  const navLinks = [
    { label: "Home", path: "/" },
    { label: "Shop", path: "/shop" },
    { label: "Special Offers", path: "/special-offers" },
    { label: "Delivery", path: "/delivery" },
    { label: "About", path: "/about" },
    { label: "Contact", path: "/contact" },
  ];

  // Shown in the mobile menu only; on desktop these live in the footer.
  const secondaryLinks = [
    { label: "Wholesale", path: "/wholesale" },
    { label: "Track Order", path: "/track-order" },
    { label: "My Orders", path: "/my-orders" },
  ];

  const CATEGORY_ICONS = {
    Toiletries: ShowerHead,
    Supplements: Pill,
    Snacks: Cookie,
    Perfumes: SprayCan,
    "Beauty & Skincare": Sparkles,
    "Hair Care": Scissors,
    "Other Products": Package,
  };

  const handleSearch = (event) => {
    event.preventDefault();

    const value = searchQuery.trim();

    if (!value) return;

    navigate(
      `/shop?search=${encodeURIComponent(value)}`
    );

    setSearchOpen(false);
    setSearchQuery("");
  };

  return (
    <>
      {/* Announcement bar */}
      <div className="bg-carbon text-white">
        <p className="mx-auto max-w-7xl px-4 py-2 text-center text-[11px] font-medium uppercase tracking-wider">
          Original UK-Sourced Products
          <span className="mx-2 text-pink">◆</span>
          Delivered Across Ghana
        </p>
      </div>

      <header
        className={cn(
          "sticky top-0 z-50 bg-white transition-shadow",
          scrolled
            ? "shadow-md"
            : "border-b border-border"
        )}
      >
        <div
          ref={searchRef}
          className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
        >
          <div className="flex h-16 items-center justify-between sm:h-20">
            {/* Logo / Mobile menu */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="rounded-md p-2 transition-colors hover:bg-london lg:hidden"
                aria-label="Menu"
              >
                <Menu className="h-5 w-5" />
              </button>

              <Logo />
            </div>

            {/* Desktop navigation */}
            <nav className="hidden items-center gap-7 lg:flex">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-pink",
                    location.pathname === link.path
                      ? "text-pink"
                      : "text-foreground"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() =>
                  setSearchOpen((current) => !current)
                }
                className="rounded-md p-2 transition-colors hover:bg-london"
                aria-label="Search"
              >
                <Search className="h-5 w-5" />
              </button>

              <Link
                to="/my-orders"
                className="relative rounded-md p-2 transition-colors hover:bg-london"
                aria-label="My Orders & Notifications"
              >
                <Bell className="h-5 w-5" />
              </Link>

              <Link
                to="/cart"
                className="relative rounded-md p-2 transition-colors hover:bg-london"
                aria-label="Cart"
              >
                <ShoppingBag className="h-5 w-5" />

                {totalItems > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-pink text-[10px] font-bold text-white">
                    {totalItems}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {/* Search */}
          {searchOpen && (
            <form
              onSubmit={handleSearch}
              className="pb-4"
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <input
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={(event) =>
                    setSearchQuery(event.target.value)
                  }
                  placeholder="Search products..."
                  className="w-full rounded-md border border-border bg-london py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-pink"
                />
              </div>
            </form>
          )}
        </div>

        {/* Desktop categories */}
        <div className="hidden border-t border-border bg-white lg:block">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="scrollbar-hide flex items-center gap-6 overflow-x-auto py-2.5">
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Shop Categories
              </span>

              {CATEGORIES.map((category) => {
                const Icon =
                  CATEGORY_ICONS[category.slug] ||
                  Package;

                return (
                  <Link
                    key={category.slug}
                    to={`/shop?category=${encodeURIComponent(
                      category.slug
                    )}`}
                    className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-medium text-foreground transition-colors hover:text-pink"
                  >
                    <Icon className="h-3.5 w-3.5 text-pink" />
                    {category.name}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div
            className="absolute inset-0 bg-carbon/40"
            onClick={() => setOpen(false)}
          />

          <div className="absolute bottom-0 right-0 top-0 flex w-[80%] max-w-sm animate-fade-up flex-col bg-white">
            <div className="flex items-center justify-between border-b border-border p-5">
              <Logo />

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-2 hover:bg-london"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-5">
              <Link
                to="/shop"
                className="mb-5 flex w-full items-center justify-center gap-2 rounded-md bg-carbon py-3.5 text-sm font-bold uppercase tracking-wider text-white"
              >
                Shop All Products
                <ArrowRight className="h-4 w-4" />
              </Link>

              <p className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">
                Categories
              </p>

              <div className="mb-6 grid grid-cols-2 gap-2">
                {CATEGORIES.map((category) => {
                  const Icon =
                    CATEGORY_ICONS[category.slug] ||
                    Package;

                  return (
                    <Link
                      key={category.slug}
                      to={`/shop?category=${encodeURIComponent(
                        category.slug
                      )}`}
                      className="flex items-center gap-2 rounded-md bg-london p-3 text-sm font-medium transition-colors hover:bg-carbon hover:text-white"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-pink" />

                      <span className="truncate">
                        {category.name}
                      </span>
                    </Link>
                  );
                })}
              </div>

              <p className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">
                Pages
              </p>

              <div className="space-y-0.5">
                {[...navLinks, ...secondaryLinks]
                  .filter(
                    (link) => link.path !== "/shop"
                  )
                  .map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      className="flex items-center justify-between py-2.5 text-sm font-medium transition-colors hover:text-pink"
                    >
                      {link.label}

                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </Link>
                  ))}
              </div>
            </nav>

            {/* Mobile WhatsApp button */}
            <div className="border-t border-border p-5">
              <a
                href={whatsappLink(whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-md bg-[#25D366] py-3 text-sm font-semibold text-white"
              >
                <WhatsAppIcon className="h-4 w-4" />
                WhatsApp Us
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
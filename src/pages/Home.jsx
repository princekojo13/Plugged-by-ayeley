import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Cookie,
  Droplets,
  Hand,
  House,
  Package,
  PackageOpen,
  Pill,
  Scissors,
  ShoppingBag,
  ShieldCheck,
  ShowerHead,
  Sparkles,
  SprayCan,
  Truck,
} from "lucide-react";

import heroImage from "@/assets/hero.png";
import storyImage from "@/assets/story.png";

import ProductCard from "@/components/ProductCard";
import { useProducts } from "@/lib/useProducts";
import { CATEGORIES } from "@/lib/siteConfig";
import { useStoreSettings } from "@/lib/useStoreSettings";

const HERO_IMG = heroImage;
const STORY_IMG = storyImage;

const CATEGORY_ICONS = {
  "Beauty & Skincare": Sparkles,
  Drinks: Droplets,
  "Hair Care": Scissors,
  Food: ShoppingBag,
  "Home & Laundry": House,
  "Other Products": Package,
  Perfumes: SprayCan,
  "Personal Care": Hand,
  Snacks: Cookie,
  Supplements: Pill,
  Toiletries: ShowerHead,
};

function SectionHeader({ title, subtitle, link }) {
  return (
    <div className="mb-8 flex items-end justify-between">
      <div>
        {subtitle && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-pink">
            {subtitle}
          </p>
        )}

        <h2 className="font-heading text-2xl font-bold text-carbon sm:text-3xl lg:text-4xl">
          {title}
        </h2>
      </div>

      {link && (
        <Link
          to={link}
          className="group hidden items-center gap-1.5 text-sm font-semibold text-carbon transition-colors hover:text-pink sm:flex"
        >
          View All
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  );
}

function ProductRow({ products, loading, emptyMessage }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
        {[...Array(4)].map((_, index) => (
          <div
            key={index}
            className="aspect-[3/4] animate-pulse bg-london"
          />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="border border-dashed border-border py-12 text-center">
        <p className="text-sm text-muted-foreground">
          {emptyMessage || "Products will appear here soon."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
      {products.slice(0, 4).map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

export default function Home() {

  const featured = useProducts({
    featured: true,
    limit: 8,
  });

  const bestSellers = useProducts({
    bestSeller: true,
    limit: 8,
  });

  const newArrivals = useProducts({
    newArrival: true,
    limit: 8,
  });

  const offerCandidates = useProducts({ limit: 200 });
  const specialOffers = {
    loading: offerCandidates.loading,
    products: offerCandidates.products
      .filter((product) =>
        product.special_offer ||
        Number(product.compare_at_price) > Number(product.price)
      )
      .slice(0, 8),
  };
  const catalogEmpty =
    !offerCandidates.loading &&
    offerCandidates.products.length === 0;

  const { brand_name: brandName } = useStoreSettings();

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden bg-carbon text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-stretch lg:min-h-[80vh] lg:grid-cols-2">
            <div className="flex flex-col justify-center py-12 sm:py-16 lg:py-0 lg:pr-12">
              <div className="mb-6 inline-flex items-center gap-2">
                <span className="h-px w-10 bg-pink" />

                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-pink">
                  {brandName}
                </span>
              </div>

              <h1 className="mb-5 font-heading text-5xl font-black leading-[0.95] text-balance sm:text-6xl lg:text-7xl">
                Stay Plugged <span className="text-pink">In.</span>
              </h1>

              <p className="mb-3 text-lg font-semibold text-white sm:text-xl">
                Original UK-sourced products, delivered across Ghana.
              </p>

              <p className="mb-8 max-w-md text-sm leading-relaxed text-white/60">
                Toiletries, supplements, snacks, perfumes, beauty, skincare and
                hair care — 100% authentic, bought directly from trusted UK
                retailers.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  to={catalogEmpty ? "/contact" : "/shop"}
                  className="inline-flex items-center justify-center gap-2 bg-pink px-8 py-4 text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-white hover:text-carbon"
                >
                  {catalogEmpty ? "Contact Us" : "Shop Now"}
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  to={catalogEmpty ? "/delivery" : "/special-offers"}
                  className="inline-flex items-center justify-center gap-2 border border-white/30 px-8 py-4 text-sm font-bold uppercase tracking-wider text-white transition-colors hover:border-pink hover:text-pink"
                >
                  {catalogEmpty ? "Delivery Information" : "Special Offers"}
                </Link>
              </div>

              <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-white/50">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-pink" />
                  100% Original
                </span>

                <span className="flex items-center gap-1.5">
                  <Truck className="h-4 w-4 text-pink" />
                  Ghana-Wide Delivery
                </span>

                <span className="flex items-center gap-1.5">
                  <BadgeCheck className="h-4 w-4 text-pink" />
                  Trusted Source
                </span>
              </div>
            </div>

            <div className="relative -mx-4 h-56 sm:-mx-6 sm:h-80 lg:mx-0 lg:h-auto">
              <img
                src={HERO_IMG}
                alt="Premium UK-sourced products"
                className="h-full w-full object-cover"
              />

              <div className="absolute inset-0 bg-gradient-to-b from-carbon via-carbon/20 to-transparent lg:bg-gradient-to-r" />
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      {(offerCandidates.loading || offerCandidates.products.length > 0) && <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader
            title="Shop by Category"
            subtitle="Browse"
          />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {CATEGORIES.map((category) => {
              const Icon =
                CATEGORY_ICONS[category.slug] || Package;

              return (
                <Link
                  key={category.slug}
                  to={`/shop?category=${encodeURIComponent(
                    category.slug
                  )}`}
                  className="group relative flex min-h-[140px] flex-col items-start justify-between overflow-hidden bg-london p-6 transition-colors duration-300 hover:bg-carbon sm:p-8"
                >
                  <Icon className="h-7 w-7 text-carbon transition-colors group-hover:text-pink" />

                  <h3 className="mt-4 font-heading text-sm font-semibold text-carbon transition-colors group-hover:text-white sm:text-base">
                    {category.name}
                  </h3>

                  <ArrowRight className="absolute right-6 top-6 h-4 w-4 text-pink opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              );
            })}
          </div>
        </div>
      </section>}

      {catalogEmpty && (
        <section className="border-y border-border bg-london/40 py-12 sm:py-16">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-pink">
              {offerCandidates.error ? "Collection unavailable" : "Collection update"}
            </p>
            <h2 className="font-heading text-2xl font-bold text-carbon sm:text-3xl">
              {offerCandidates.error
                ? "We’re having trouble loading the collection"
                : "We’re updating our collection"}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
              {offerCandidates.error
                ? "Please refresh the page, or contact us if you need help."
                : "Please check back soon, or contact us if you’re looking for a particular product."}
            </p>
            <Link
              to="/contact"
              className="mt-6 inline-flex items-center gap-2 bg-carbon px-6 py-3 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-pink"
            >
              Contact Us
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}

      {/* FEATURED */}
      {(featured.loading || featured.products.length > 0) && <section className="bg-london/50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader
            title="Featured Products"
            subtitle="Handpicked"
            link="/shop"
          />

          <ProductRow
            products={featured.products || []}
            loading={featured.loading}
            emptyMessage="Featured products will appear here soon."
          />
        </div>
      </section>}

      {/* UK SOURCED STORY */}
      <section className="bg-carbon py-16 text-white sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="relative aspect-[4/3] overflow-hidden">
              <img
                src={STORY_IMG}
                alt="UK-sourced products"
                className="h-full w-full object-cover"
              />
            </div>

            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-pink">
                Our Promise
              </p>

              <h2 className="mb-6 font-heading text-3xl font-bold leading-tight sm:text-4xl">
                Original Products,
                <br />
                Sourced Directly from the UK
              </h2>

              <p className="mb-6 leading-relaxed text-white/70">
                Every product at {brandName} is carefully sourced from trusted
                UK retailers. We bring you the same authentic quality you'd
                find on the high streets of London — delivered straight to
                you anywhere in Ghana.
              </p>

              <div className="space-y-4">
                {[
                  {
                    icon: ShieldCheck,
                    title: "100% Original",
                    desc: "Genuine products from verified UK sources",
                  },
                  {
                    icon: Truck,
                    title: "Reliable Delivery",
                    desc: "Shipped to Ghana and delivered nationwide",
                  },
                  {
                    icon: BadgeCheck,
                    title: "Quality You Can Trust",
                    desc: "Every item checked before it reaches you",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="flex items-start gap-4"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-pink/20">
                      <item.icon className="h-5 w-5 text-pink" />
                    </div>

                    <div>
                      <h4 className="mb-0.5 text-sm font-semibold">
                        {item.title}
                      </h4>

                      <p className="text-sm text-white/50">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <Link
                to="/about"
                className="mt-8 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-pink transition-colors hover:text-white"
              >
                Learn More About Us
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* BEST SELLERS */}
      {(bestSellers.loading || bestSellers.products.length > 0) && <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader
            title="Best Sellers"
            subtitle="Customer Favourites"
            link="/shop?filter=best_seller"
          />

          <ProductRow
            products={bestSellers.products || []}
            loading={bestSellers.loading}
            emptyMessage="Best sellers will appear here soon."
          />
        </div>
      </section>}

      {/* SPECIAL OFFERS */}
      {(specialOffers.loading || specialOffers.products.length > 0) && <section className="bg-london/50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader
            title="Special Offers"
            subtitle="Limited Time"
            link="/special-offers"
          />

          <ProductRow
            products={specialOffers.products || []}
            loading={specialOffers.loading}
            emptyMessage="There are no special offers right now."
          />
        </div>
      </section>}

      {/* NEW ARRIVALS */}
      {(newArrivals.loading || newArrivals.products.length > 0) && <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader
            title="New Arrivals"
            subtitle="Just Landed"
            link="/shop?filter=new_arrival"
          />

          <ProductRow
            products={newArrivals.products || []}
            loading={newArrivals.loading}
            emptyMessage="New arrivals will appear here soon."
          />
        </div>
      </section>}

      {/* WHOLESALE */}
      <section className="border-y border-border bg-white py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-5 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-pink/10">
              <PackageOpen className="h-6 w-6 text-pink" />
            </div>

            <div>
              <h2 className="font-heading text-xl font-bold text-carbon">
                Buying in bulk?
              </h2>

              <p className="text-sm text-muted-foreground">
                Wholesale is available for larger quantities. Contact us
                directly for wholesale prices.
              </p>
            </div>
          </div>

          <Link
            to="/wholesale"
            className="inline-flex shrink-0 items-center gap-2 border border-carbon px-6 py-3 text-xs font-bold uppercase tracking-wider text-carbon transition-colors hover:bg-carbon hover:text-white"
          >
            Wholesale Enquiries
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-carbon py-20 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-pink">
            Stay Plugged In
          </p>

          <h2 className="mb-6 font-heading text-3xl font-bold text-balance sm:text-5xl">
            {catalogEmpty
              ? "Looking for a particular product?"
              : <>Ready to shop authentic<br />UK-sourced products?</>}
          </h2>

          <p className="mx-auto mb-8 max-w-xl text-white/60">
            {catalogEmpty
              ? "Get in touch and we’ll help you find what you need."
              : "Browse our full catalogue and have your favourites delivered anywhere in Ghana."}
          </p>

          <Link
            to={catalogEmpty ? "/contact" : "/shop"}
            className="inline-flex items-center gap-2 bg-pink px-10 py-4 text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-white hover:text-carbon"
          >
            {catalogEmpty ? "Contact Us" : "View Products"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

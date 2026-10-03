import React from "react";
import { Link } from "react-router-dom";
import { Tag, ArrowRight, Flame } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { useProducts } from "@/lib/useProducts";

export default function SpecialOffers() {
  const { data: products, isLoading } = useProducts({ limit: 200 });
  const onSale = (products || []).filter((p) => (p.special_offer || (p.sale_price && p.sale_price < p.price)));

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="bg-carbon text-white py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <Flame className="w-5 h-5 text-pink" />
            <p className="text-xs uppercase tracking-[0.3em] text-pink font-semibold">Limited Time</p>
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl font-bold mb-4">Special Offers</h1>
          <p className="text-white/70 max-w-xl mx-auto">
            Save on selected UK-sourced products. Grab these deals while they last — discounts, promotions and limited-time offers.
          </p>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="aspect-[3/4] bg-london animate-pulse" />
              ))}
            </div>
          ) : onSale.length === 0 ? (
            <div className="text-center py-20">
              <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="font-heading text-2xl font-bold text-carbon mb-2">No special offers right now</h2>
              <p className="text-muted-foreground mb-6">Check back soon for new deals and promotions.</p>
              <Link to="/shop" className="inline-flex items-center gap-2 px-8 py-3 bg-carbon text-white font-bold uppercase tracking-wider text-sm hover:bg-pink transition-colors">
                Browse All Products <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-6">{onSale.length} product{onSale.length !== 1 ? "s" : ""} on offer</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {onSale.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
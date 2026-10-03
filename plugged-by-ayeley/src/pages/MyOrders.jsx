import React from "react";
import { Link } from "react-router-dom";
import { Package, ShoppingBag, ArrowRight } from "lucide-react";

export default function MyOrders() {
  return (
    <div className="bg-white">
      <div className="bg-carbon text-white py-16">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <Package className="w-12 h-12 text-pink mx-auto mb-5" />

          <p className="text-xs uppercase tracking-[0.3em] text-pink font-semibold mb-3">
            Order Tracking
          </p>

          <h1 className="font-heading text-3xl sm:text-4xl font-bold mb-3">
            Track Your Order
          </h1>

          <p className="text-white/60 text-sm max-w-lg mx-auto">
            Plugged by Ayeley uses guest checkout. You do not need a customer
            account to view your order.
          </p>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="border border-border p-8 sm:p-10">
          <Package className="w-12 h-12 text-muted-foreground/40 mx-auto mb-5" />

          <h2 className="font-heading text-2xl font-bold text-carbon mb-3">
            No customer account needed
          </h2>

          <p className="text-sm text-muted-foreground leading-relaxed mb-8">
            Use your Order Number from your order confirmation to check your
            delivery status.
          </p>

          <Link
            to="/track-order"
            className="inline-flex items-center justify-center gap-2 px-7 py-3 bg-carbon text-white font-bold uppercase tracking-wider text-sm hover:bg-pink transition-colors"
          >
            Track My Order
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="mt-8">
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-pink hover:text-carbon transition-colors"
          >
            <ShoppingBag className="w-4 h-4" />
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
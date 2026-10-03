import React from "react";
import { Link } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, ArrowLeft } from "lucide-react";
import { Image } from "@/components/ui/image";
import { useCart } from "@/lib/cartContext";

export default function Cart() {
  const { items, updateQuantity, removeFromCart, subtotal } = useCart();

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 bg-london rounded-full flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="w-8 h-8 text-muted-foreground" />
        </div>
        <h1 className="font-heading text-3xl font-bold text-carbon mb-3">Your cart is empty</h1>
        <p className="text-muted-foreground mb-8">Browse our UK-sourced products and find something you love.</p>
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-carbon text-white font-bold uppercase tracking-wider text-sm hover:bg-pink transition-colors"
        >
          Shop Now <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="font-heading text-3xl sm:text-4xl font-bold text-carbon mb-8">Shopping Cart</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div key={item.product_id} className="flex gap-4 border border-border p-4">
              <Link to={`/product/${item.product_id}`} className="w-24 h-24 sm:w-28 sm:h-28 bg-london overflow-hidden shrink-0">
                {item.image ? (
                  <Image src={item.image} alt={item.name} className="w-full h-full object-cover" fittingType="fill" />
                ) : (
                  <div className="w-full h-full" />
                )}
              </Link>
              <div className="flex-1 flex flex-col">
                <div className="flex justify-between gap-2">
                  <Link to={`/product/${item.product_id}`} className="font-heading font-semibold text-sm sm:text-base text-carbon hover:text-pink transition-colors line-clamp-2">
                    {item.name}
                  </Link>
                  <button
                    onClick={() => removeFromCart(item.product_id)}
                    className="text-muted-foreground hover:text-red-600 transition-colors shrink-0"
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground mt-1">₵{item.price.toFixed(2)} each</p>
                {item.preorder && (
                  <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider bg-carbon text-white px-2 py-0.5">
                    Ships from UK · 10–21 days
                  </span>
                )}
                <div className="flex items-center justify-between mt-auto pt-3">
                  <div className="flex items-center border border-border">
                    <button
                      onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                      className="w-9 h-9 flex items-center justify-center hover:bg-london transition-colors"
                      aria-label="Decrease"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-10 text-center text-sm font-semibold">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                      className="w-9 h-9 flex items-center justify-center hover:bg-london transition-colors"
                      aria-label="Increase"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="font-heading font-bold text-lg text-carbon">₵{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
          <Link to="/shop" className="inline-flex items-center gap-2 text-sm font-semibold text-carbon hover:text-pink transition-colors">
            <ArrowLeft className="w-4 h-4" /> Continue Shopping
          </Link>
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="bg-london/50 border border-border p-6 sticky top-28">
            <h2 className="font-heading text-xl font-bold text-carbon mb-4">Order Summary</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold text-carbon">₵{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery</span>
                <span className="text-muted-foreground">Calculated at checkout</span>
              </div>
            </div>
            <div className="border-t border-border mt-4 pt-4 flex justify-between items-baseline">
              <span className="font-heading font-bold text-lg text-carbon">Total</span>
              <span className="font-heading font-bold text-2xl text-carbon">₵{subtotal.toFixed(2)}</span>
            </div>
            <Link
              to="/checkout"
              className="w-full mt-6 py-3.5 bg-pink text-white font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-2 hover:bg-carbon transition-colors"
            >
              Proceed to Checkout <ArrowRight className="w-4 h-4" />
            </Link>
            <p className="text-xs text-muted-foreground text-center mt-3">
              Pay with Mobile Money or Pay on Delivery
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
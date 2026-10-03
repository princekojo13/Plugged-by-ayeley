import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ShoppingBag, Minus, Plus } from "lucide-react";
import { Image } from "@/components/ui/image";
import { cn } from "@/lib/utils";
import { useCart, PREORDER_MAX } from "@/lib/cartContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function ProductCard({ product }) {
  const { addToCart } = useCart();
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const onSale = product.sale_price && product.sale_price < product.price;
  const inStock = product.stock > 0;
  const isPreorder = !inStock;
  const effectivePrice = product.sale_price || product.price;
  const maxQty = inStock ? product.stock || 99 : PREORDER_MAX;

  const openModal = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setQty(1);
    setOpen(true);
  };

  const confirmAdd = () => {
    addToCart(product, qty);
    setOpen(false);
    setQty(1);
  };

  return (
    <>
      <Link
        to={`/product/${product.id}`}
        className="group flex flex-col bg-white border border-border hover:border-carbon transition-all duration-300 hover:shadow-lg"
      >
        <div className="relative aspect-square overflow-hidden bg-london">
          <Image
            src={product.images?.[0]}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            fittingType="fill"
          />
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {onSale && (
              <span className="bg-pink text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1">
                Sale
              </span>
            )}
            {product.new_arrival && (
              <span className="bg-carbon text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1">
                New
              </span>
            )}
            {product.best_seller && !onSale && (
              <span className="bg-white text-carbon border border-carbon text-[10px] font-bold uppercase tracking-wider px-2.5 py-1">
                Best Seller
              </span>
            )}
            {inStock && product.stock <= 5 && (
              <span className="bg-orange-500 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1">
                Low Stock
              </span>
            )}
            {isPreorder && (
              <span className="bg-carbon text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1">
                Ships from UK
              </span>
            )}
          </div>
        </div>

        <div className="p-4 flex flex-col flex-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{product.category}</p>
          <h3 className="font-heading font-semibold text-sm text-carbon leading-snug line-clamp-2 mb-2 group-hover:text-pink transition-colors">
            {product.name}
          </h3>
          <div className="flex items-baseline gap-2 mt-auto mb-3">
            <span className="font-heading font-bold text-lg text-carbon">₵{effectivePrice.toFixed(2)}</span>
            {onSale && (
              <span className="text-sm text-muted-foreground line-through">₵{product.price.toFixed(2)}</span>
            )}
          </div>
          <button
            onClick={openModal}
            className={cn(
              "w-full py-2.5 text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2",
              inStock ? "bg-carbon text-white hover:bg-pink" : "bg-pink text-white hover:bg-carbon"
            )}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            {inStock ? "Add to Cart" : "Pre-order"}
          </button>
        </div>
      </Link>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading text-carbon">
              {inStock ? "Add to Cart" : "Pre-order"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-london overflow-hidden shrink-0">
                <Image src={product.images?.[0]} alt={product.name} className="w-full h-full object-cover" fittingType="fill" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-carbon line-clamp-2">{product.name}</p>
                <p className="text-sm font-bold text-pink">₵{effectivePrice.toFixed(2)}</p>
              </div>
            </div>
            {isPreorder && (
              <div className="bg-pink/5 border-l-4 border-pink p-3 text-xs text-muted-foreground">
                This item is out of stock in Ghana and ships from the UK. Delivery takes 10–21 days.
              </div>
            )}
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-carbon mb-2">Quantity</p>
              <div className="flex items-center border border-border w-fit">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="w-10 h-10 flex items-center justify-center text-carbon hover:bg-london"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-12 text-center text-sm font-semibold text-carbon">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                  className="w-10 h-10 flex items-center justify-center text-carbon hover:bg-london"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {inStock && product.stock <= 5 && (
                <p className="text-xs text-orange-600 mt-2">Only {product.stock} left in stock</p>
              )}
              {isPreorder && (
                <p className="text-xs text-muted-foreground mt-2">Max {PREORDER_MAX} per pre-order</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={confirmAdd} className="bg-pink text-white hover:bg-carbon">
              {inStock ? "Add to Cart" : "Confirm Pre-order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
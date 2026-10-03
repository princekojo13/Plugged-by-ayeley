import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search,
  Package,
  Truck,
  Check,
  Clock,
  X,
  ShoppingBag,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import OrderTrackMap from "@/components/OrderTrackMap";
import { cn } from "@/lib/utils";

const STATUS_STEPS = [
  { key: "pending", label: "Order Placed", icon: Clock },
  { key: "confirmed", label: "Confirmed", icon: Check },
  { key: "shipped", label: "Shipped", icon: Package },
  { key: "delivered", label: "Delivered", icon: Truck },
];

function money(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
}

export default function TrackOrder() {
  const [params] = useSearchParams();

  const [trackingValue, setTrackingValue] = useState(
    () => params.get("order") || ""
  );
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const runTrack = async (value) => {
    const query = value.trim();

    if (!query) {
      setError("Please enter your Order Number or tracking token.");
      return;
    }

    setLoading(true);
    setError("");
    setOrder(null);

    try {
      const { data, error: functionError } =
        await supabase.functions.invoke("track-order", {
          body: {
            order_number: query,
          },
        });

      if (functionError) {
        throw functionError;
      }

      if (!data?.order) {
        throw new Error("Order not found");
      }

      setOrder(data.order);
    } catch (err) {
      console.error("Order tracking error:", err);
      setError(
        "Order not found. Please check your Order Number and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTrack = async (event) => {
    event.preventDefault();
    await runTrack(trackingValue);
  };

  useEffect(() => {
    const initialOrder = params.get("order");

    if (initialOrder) {
      runTrack(initialOrder);
    }
    // Run once for URL-based tracking.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentStepIndex = order
    ? STATUS_STEPS.findIndex((step) => step.key === order.status)
    : -1;

  const isCancelled = order?.status === "cancelled";

  return (
    <div className="bg-white">
      <div className="bg-carbon text-white py-12">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-pink font-semibold mb-3">
            Order Tracking
          </p>

          <h1 className="font-heading text-3xl sm:text-4xl font-bold mb-3">
            Track Your Order
          </h1>

          <p className="text-white/60 text-sm">
            Enter your Order Number to check your delivery status.
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10">
        <form onSubmit={handleTrack} className="flex gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

            <input
              type="text"
              value={trackingValue}
              onChange={(event) => setTrackingValue(event.target.value)}
              placeholder="Enter your Order Number"
              autoComplete="off"
              className="w-full pl-10 pr-4 py-3 bg-white border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-pink"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-carbon text-white font-bold uppercase tracking-wider text-sm hover:bg-pink transition-colors disabled:opacity-50"
          >
            {loading ? "..." : "Track"}
          </button>
        </form>

        {error && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-md text-center mb-6">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {order && (
          <div className="space-y-6">
            <div className="bg-london/50 border border-border p-6">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Order Number
                  </p>

                  <p className="font-mono text-sm font-semibold text-carbon">
                    {order.order_number || order.id}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Total
                  </p>

                  <p className="font-heading font-bold text-lg text-carbon">
                    ₵{money(order.total)}
                  </p>
                </div>
              </div>

              {isCancelled ? (
                <div className="flex items-center gap-3 text-red-600 py-4">
                  <X className="w-5 h-5" />

                  <span className="font-semibold">
                    This order has been cancelled.
                  </span>
                </div>
              ) : (
                <div className="relative">
                  {STATUS_STEPS.map((step, index) => {
                    const isComplete =
                      currentStepIndex >= 0 && index <= currentStepIndex;

                    const isCurrent = index === currentStepIndex;

                    const StepIcon = step.icon;

                    return (
                      <div
                        key={step.key}
                        className="flex items-start gap-4 pb-8 last:pb-0"
                      >
                        <div className="flex flex-col items-center">
                          <div
                            className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center border-2",
                              isComplete
                                ? "bg-pink border-pink text-white"
                                : "bg-white border-border text-muted-foreground"
                            )}
                          >
                            <StepIcon className="w-4 h-4" />
                          </div>

                          {index < STATUS_STEPS.length - 1 && (
                            <div
                              className={cn(
                                "w-0.5 h-8 mt-1",
                                isComplete ? "bg-pink" : "bg-border"
                              )}
                            />
                          )}
                        </div>

                        <div className="pt-2">
                          <p
                            className={cn(
                              "font-semibold text-sm",
                              isComplete
                                ? "text-carbon"
                                : "text-muted-foreground"
                            )}
                          >
                            {step.label}
                          </p>

                          {isCurrent && (
                            <p className="text-xs text-pink mt-0.5">
                              Current status
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <OrderTrackMap order={order} />

            {Array.isArray(order.items) && order.items.length > 0 && (
              <div className="border border-border p-6">
                <h3 className="font-heading font-bold text-carbon mb-4">
                  Order Details
                </h3>

                <div className="space-y-3 mb-4">
                  {order.items.map((item, index) => (
                    <div
                      key={item.id || index}
                      className="flex items-center gap-3"
                    >
                      <div className="w-12 h-12 bg-london rounded overflow-hidden shrink-0 flex items-center justify-center">
                        <Package className="w-5 h-5 text-muted-foreground" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-carbon truncate">
                          {item.product_name || item.name || "Product"}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          Qty: {item.quantity || 0}
                        </p>
                      </div>

                      <p className="text-sm font-semibold text-carbon">
                        ₵
                        {money(
                          Number(item.unit_price || item.price || 0) *
                            Number(item.quantity || 0)
                        )}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border pt-4 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Subtotal
                    </span>

                    <span className="font-medium">
                      ₵{money(order.subtotal)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Delivery Fee
                    </span>

                    <span className="font-medium">
                      ₵{money(order.delivery_fee)}
                    </span>
                  </div>

                  <div className="flex justify-between font-bold text-carbon pt-1.5">
                    <span>Total</span>
                    <span>₵{money(order.total)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="border border-border p-6">
              <h3 className="font-heading font-bold text-carbon mb-4">
                Delivery Information
              </h3>

              <div className="space-y-2 text-sm">
                {order.delivery_region && (
                  <p>
                    <span className="text-muted-foreground">
                      Region:
                    </span>{" "}
                    <span className="font-medium text-carbon">
                      {order.delivery_region}
                    </span>
                  </p>
                )}

                {order.delivery_address && (
                  <p>
                    <span className="text-muted-foreground">
                      Address:
                    </span>{" "}
                    <span className="font-medium text-carbon">
                      {order.delivery_address}
                    </span>
                  </p>
                )}

                {order.payment_method && (
                  <p>
                    <span className="text-muted-foreground">
                      Payment:
                    </span>{" "}
                    <span className="font-medium text-carbon">
                      {order.payment_method === "paystack"
                        ? "Paid Online"
                        : "Pay on Delivery"}
                    </span>
                  </p>
                )}
              </div>
            </div>

            <div className="text-center">
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-pink hover:text-carbon transition-colors"
              >
                <ShoppingBag className="w-4 h-4" />
                Continue Shopping
              </Link>
            </div>
          </div>
        )}

        {!order && !error && !loading && (
          <div className="text-center py-16">
            <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />

            <p className="text-muted-foreground">
              Enter your Order Number above to track your shipment.
            </p>

            <p className="text-xs text-muted-foreground/60 mt-2">
              Your Order Number is shown in your order confirmation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
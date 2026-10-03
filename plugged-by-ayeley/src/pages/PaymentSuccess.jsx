import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Check, ArrowRight, Phone } from "lucide-react";
import { useStoreSettings } from "@/lib/useStoreSettings";

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const { phone } = useStoreSettings();

  const orderId = params.get("order_id");
  const ref =
    params.get("ref") ||
    params.get("reference") ||
    params.get("trxref");

  const displayRef = orderId || ref || null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <Check className="w-10 h-10 text-green-600" />
      </div>

      <h1 className="font-heading text-3xl sm:text-4xl font-bold text-carbon mb-3">
        Payment Received
      </h1>

      <p className="text-muted-foreground mb-2">
        Thank you for your order. We have received your payment response.
      </p>

      {displayRef && (
        <p className="text-sm text-muted-foreground mb-8">
          Order reference:{" "}
          <span className="font-mono font-semibold text-carbon">
            {displayRef}
          </span>
        </p>
      )}

      <div className="bg-london/50 border border-border p-6 mb-8 text-left">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your payment is being verified securely on the server. Once payment
          confirmation is complete, your order will move into processing.
          Please keep your order reference for tracking.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          to="/shop"
          className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-carbon text-white font-bold uppercase tracking-wider text-sm hover:bg-pink transition-colors"
        >
          Continue Shopping
          <ArrowRight className="w-4 h-4" />
        </Link>

        <Link
          to={`/track-order?order=${encodeURIComponent(displayRef || "")}`}
          className="inline-flex items-center justify-center gap-2 px-8 py-3 border border-carbon font-bold uppercase tracking-wider text-sm hover:bg-carbon hover:text-white transition-colors"
        >
          Track My Order
        </Link>

        <a
          href={`tel:${phone}`}
          className="inline-flex items-center justify-center gap-2 px-8 py-3 border border-carbon font-bold uppercase tracking-wider text-sm hover:bg-carbon hover:text-white transition-colors"
        >
          <Phone className="w-4 h-4" />
          Call Us
        </a>
      </div>
    </div>
  );
}
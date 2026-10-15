import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Check, ArrowRight, Loader2, CircleAlert, XCircle } from "lucide-react";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import { useStoreSettings, whatsappLink } from "@/lib/useStoreSettings";
import { useCart } from "@/lib/cartContext";
import { supabase } from "@/lib/supabaseClient";

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const { whatsapp } = useStoreSettings();
  const { clearCart } = useCart();
  const orderId = params.get("order_id");
  const reference =
    params.get("ref") ||
    params.get("reference") ||
    params.get("trxref");
  const [retry, setRetry] = useState(0);
  const [verification, setVerification] = useState({
    status: reference ? "checking" : "missing",
    orderNumber: "",
    message: "",
  });

  useEffect(() => {
    let active = true;
    if (!reference) {
      setVerification({ status: "missing", orderNumber: "", message: "" });
      return () => { active = false; };
    }

    setVerification({ status: "checking", orderNumber: "", message: "" });
    supabase.functions.invoke("verify-paystack", { body: { reference } })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setVerification({ status: "error", orderNumber: "", message: error.message });
        } else if (data?.ok === true) {
          clearCart();
          localStorage.setItem("pba_last_order_number", data.order_number || "");
          localStorage.setItem("pba_has_purchased", "true");
          setVerification({ status: "paid", orderNumber: data.order_number || "", message: "" });
        } else if (data?.reason === "payment_not_successful") {
          const failed = String(data.gateway_status || "").toLowerCase() === "failed";
          setVerification({
            status: failed ? "failed" : "pending",
            orderNumber: data.order_number || "",
            message: "",
          });
        } else {
          setVerification({ status: "pending", orderNumber: data?.order_number || "", message: data?.error || "" });
        }
      })
      .catch((error) => {
        if (active) setVerification({ status: "error", orderNumber: "", message: error?.message || "" });
      });

    return () => { active = false; };
  }, [reference, retry, clearCart]);

  const displayRef = verification.orderNumber || orderId || reference || null;
  const paid = verification.status === "paid";
  const heading = {
    checking: "Checking your payment",
    paid: "Payment received",
    pending: "Payment not confirmed yet",
    failed: "Payment was not confirmed",
    error: "We could not verify the payment",
    missing: "Payment reference missing",
  }[verification.status];
  const message = {
    checking: "We’re checking the transaction directly with paystack. This page will only show payment as received after that check succeeds.",
    paid: "paystack has confirmed your payment. Your order is now marked as paid.",
    pending: "paystack has not confirmed this payment yet. If you completed it, check again in a moment or contact the store with your reference.",
    failed: "paystack did not confirm this payment. If money was deducted, contact the store with your reference.",
    error: verification.message || "The verification service is temporarily unavailable. You can check again or contact the store with your reference.",
    missing: "No paystack reference was returned, so this page cannot confirm payment.",
  }[verification.status];

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${paid ? "bg-green-100" : verification.status === "failed" ? "bg-red-100" : "bg-amber-100"}`}>
        {paid ? <Check className="w-10 h-10 text-green-600" /> : verification.status === "checking" ? <Loader2 className="w-10 h-10 animate-spin text-amber-700" /> : verification.status === "failed" ? <XCircle className="w-10 h-10 text-red-600" /> : <CircleAlert className="w-10 h-10 text-amber-700" />}
      </div>

      <h1 className="font-heading text-3xl sm:text-4xl font-bold text-carbon mb-3">
        {heading}
      </h1>

      <p className="text-muted-foreground mb-2">
        {message}
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
          Keep this reference when contacting the store. To track delivery, enter the PBA order number from your confirmation. A paystack redirect alone does not count as payment confirmation.
        </p>
      </div>

      {reference && !paid && verification.status !== "checking" && (
        <button type="button" onClick={() => setRetry((value) => value + 1)} className="mb-8 rounded-xl bg-carbon px-5 py-3 text-sm font-bold text-white hover:bg-pink">
          Check payment again
        </button>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          to="/shop"
          className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-carbon text-white font-bold uppercase tracking-wider text-sm hover:bg-pink transition-colors"
        >
          Continue Shopping
          <ArrowRight className="w-4 h-4" />
        </Link>

        <Link
          to={verification.orderNumber
            ? `/track-order?order=${encodeURIComponent(verification.orderNumber)}`
            : "/track-order"}
          className="inline-flex items-center justify-center gap-2 px-8 py-3 border border-carbon font-bold uppercase tracking-wider text-sm hover:bg-carbon hover:text-white transition-colors"
        >
          Track My Order
        </Link>

        <a
          href={whatsappLink(whatsapp, "Hi Plugged by Ayeley, I need help with my order payment.")}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-8 py-3 border border-carbon font-bold uppercase tracking-wider text-sm hover:bg-carbon hover:text-white transition-colors"
        >
          <WhatsAppIcon className="h-4 w-4" />
          WhatsApp Support
        </a>
      </div>
    </div>
  );
}

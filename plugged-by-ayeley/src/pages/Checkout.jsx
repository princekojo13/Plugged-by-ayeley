import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  CreditCard,
  Loader2,
  ShieldCheck,
  Smartphone,
  AlertCircle,
} from "lucide-react";

import { useCart } from "@/lib/cartContext";
import { supabase } from "@/lib/supabaseClient";
import { SITE_CONFIG } from "@/lib/siteConfig";

const PAYMENT_METHODS = {
  PAYSTACK: "paystack",
  POD: "pay_on_delivery",
};

export default function Checkout() {
  const navigate = useNavigate();
  const { items, subtotal, clearCart } = useCart();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [placedOrder, setPlacedOrder] = useState(null);

  const [paymentMethod, setPaymentMethod] = useState(
    PAYMENT_METHODS.PAYSTACK
  );

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    delivery_region: "Greater Accra",
    delivery_address: "",
    digital_address: "",
    order_note: "",
    momo_number: "",
    momo_network: "MTN",
  });

  const isAccra =
    form.delivery_region === "Greater Accra";

  const setField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setError("");
  };

  const handlePaymentChange = (method) => {
    if (
      method === PAYMENT_METHODS.POD &&
      !isAccra
    ) {
      return;
    }

    setPaymentMethod(method);
    setError("");
  };

  const handleRegionChange = (value) => {
    setForm((current) => ({
      ...current,
      delivery_region: value,
    }));

    if (value !== "Greater Accra") {
      setPaymentMethod(PAYMENT_METHODS.PAYSTACK);
    }

    setError("");
  };

  const localSubtotal = useMemo(() => {
    return items.reduce(
      (sum, item) =>
        sum +
        Number(item.price || 0) *
          Number(item.quantity || 0),
      0
    );
  }, [items]);

  const validateForm = () => {
    if (items.length === 0) {
      return "Your cart is empty.";
    }

    if (form.full_name.trim().length < 2) {
      return "Please enter your full name.";
    }

    if (form.full_name.trim().length > 100) {
      return "Your name is too long.";
    }

    if (form.phone.trim().length < 7) {
      return "Please enter a valid phone number.";
    }

    if (form.phone.trim().length > 30) {
      return "Please enter a valid phone number.";
    }

    if (
      paymentMethod ===
        PAYMENT_METHODS.PAYSTACK &&
      !form.email.trim()
    ) {
      return "Email is required when paying online.";
    }

    if (
      paymentMethod ===
        PAYMENT_METHODS.PAYSTACK &&
      form.email.trim().length > 254
    ) {
      return "Please enter a valid email address.";
    }

    if (
      form.delivery_address.trim().length < 5
    ) {
      return "Please enter your delivery address.";
    }

    if (
      form.delivery_address.trim().length > 1000
    ) {
      return "Your delivery address is too long.";
    }

    if (
      form.digital_address.trim().length > 100
    ) {
      return "Your GhanaPost GPS address is too long.";
    }

    if (
      form.order_note.trim().length > 2000
    ) {
      return "Your order note is too long.";
    }

    if (
      paymentMethod ===
        PAYMENT_METHODS.POD &&
      !isAccra
    ) {
      return (
        "Pay on Delivery is only available within Greater Accra."
      );
    }

    if (
      paymentMethod ===
        PAYMENT_METHODS.POD &&
      form.momo_number.trim().length < 7
    ) {
      return "Please enter your Mobile Money number.";
    }

    if (
      paymentMethod ===
        PAYMENT_METHODS.POD &&
      form.momo_network.trim().length < 2
    ) {
      return "Please select your Mobile Money network.";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting) {
      return;
    }

    setError("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);

    try {
      /*
       * IMPORTANT SECURITY RULE:
       *
       * We intentionally send ONLY:
       * - customer information
       * - delivery information
       * - payment method
       * - product IDs + quantities
       *
       * We do NOT send:
       * - trusted subtotal
       * - product prices
       * - trusted total
       * - trusted delivery fee
       *
       * The server must calculate those values.
       */
      const orderItems = items.map((item) => ({
        product_id: item.product_id,
        quantity: Number(item.quantity),
      }));

      const completeAddress = [
        form.delivery_address.trim(),
        form.digital_address.trim()
          ? `GhanaPost GPS: ${form.digital_address.trim()}`
          : "",
      ]
        .filter(Boolean)
        .join("\n");

      const { data, error: functionError } =
        await supabase.functions.invoke(
          "create-order",
          {
            body: {
              full_name:
                form.full_name.trim(),

              email:
                form.email.trim() || null,

              phone:
                form.phone.trim(),

              delivery_address:
                completeAddress,

              city:
                form.delivery_region,

              delivery_region:
                form.delivery_region,

              order_note:
                form.order_note.trim() || null,

              payment_method:
                paymentMethod,

              momo_number:
                paymentMethod ===
                PAYMENT_METHODS.POD
                  ? form.momo_number.trim()
                  : null,

              momo_network:
                paymentMethod ===
                PAYMENT_METHODS.POD
                  ? form.momo_network
                  : null,

              items: orderItems,
            },
          }
        );

      if (functionError) {
        throw new Error(
          functionError.message ||
            "We could not place your order."
        );
      }

      if (!data?.success) {
        throw new Error(
          data?.error ||
            "We could not place your order."
        );
      }

      /*
       * PAYSTACK
       *
       * The Edge Function should return the
       * Paystack authorization URL only after
       * securely creating the pending order.
       */
      if (
        paymentMethod ===
          PAYMENT_METHODS.PAYSTACK &&
        data.payment_url
      ) {
        window.location.href =
          data.payment_url;

        return;
      }

      /*
       * PAY ON DELIVERY
       */
      if (!data.order) {
        throw new Error(
          "The order was created but no order details were returned."
        );
      }

      localStorage.setItem(
        "pba_last_order_number",
        data.order.order_number
      );

      if (data.order.tracking_token) {
        localStorage.setItem(
          "pba_last_tracking_token",
          data.order.tracking_token
        );
      }

      if (form.email.trim()) {
        localStorage.setItem(
          "pba_myemail",
          form.email.trim()
        );
      }

      localStorage.setItem(
        "pba_has_purchased",
        "true"
      );

      clearCart();

      setPlacedOrder({
        ...data.order,
        full_name:
          form.full_name.trim(),
        phone:
          form.phone.trim(),
      });

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (err) {
      console.error(
        "Checkout failed:",
        err
      );

      setError(
        err?.message ||
          "Something went wrong while placing your order."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (placedOrder) {
    const paymentLabel =
      placedOrder.payment_method ===
      PAYMENT_METHODS.POD
        ? "Pay on Delivery"
        : "Pay Online";

    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-600" />
          </div>

          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-carbon">
            Order Placed Successfully
          </h1>

          <p className="mt-3 text-muted-foreground">
            Thank you, {placedOrder.full_name}.
          </p>

          <div className="mt-8 border border-border bg-london/40 p-6 text-left space-y-4">
            <div className="flex justify-between gap-4">
              <span className="text-sm text-muted-foreground">
                Order number
              </span>

              <span className="font-mono font-bold text-carbon">
                {placedOrder.order_number}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-sm text-muted-foreground">
                Payment
              </span>

              <span className="font-semibold text-carbon">
                {paymentLabel}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-sm text-muted-foreground">
                Total
              </span>

              <span className="font-heading text-2xl font-bold text-pink">
                ₵
                {Number(
                  placedOrder.total || 0
                ).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            {placedOrder.tracking_token ? (
              <Link
                to={`/track-order?token=${encodeURIComponent(
                  placedOrder.tracking_token
                )}`}
                className="px-7 py-3 bg-pink text-white font-bold uppercase tracking-wider text-sm hover:bg-carbon transition-colors"
              >
                Track My Order
              </Link>
            ) : (
              <Link
                to={`/track-order?order=${encodeURIComponent(
                  placedOrder.order_number
                )}`}
                className="px-7 py-3 bg-pink text-white font-bold uppercase tracking-wider text-sm hover:bg-carbon transition-colors"
              >
                Track My Order
              </Link>
            )}

            <Link
              to="/shop"
              className="px-7 py-3 border border-carbon text-carbon font-bold uppercase tracking-wider text-sm hover:bg-carbon hover:text-white transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h1 className="font-heading text-3xl font-bold text-carbon">
          Your cart is empty
        </h1>

        <p className="mt-3 text-muted-foreground">
          Add some products before checking out.
        </p>

        <Link
          to="/shop"
          className="inline-block mt-8 px-8 py-3.5 bg-carbon text-white font-bold uppercase tracking-wider text-sm hover:bg-pink transition-colors"
        >
          Shop Now
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link
        to="/cart"
        className="inline-flex items-center gap-2 text-sm font-semibold text-carbon hover:text-pink transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Cart
      </Link>

      <h1 className="font-heading text-3xl sm:text-4xl font-bold text-carbon mb-8">
        Checkout
      </h1>

      <form
        onSubmit={handleSubmit}
        className="grid lg:grid-cols-3 gap-8"
      >
        <div className="lg:col-span-2 space-y-8">
          {/* CONTACT */}
          <section className="border border-border bg-white p-6">
            <SectionTitle
              number="1"
              title="Contact Information"
            />

            <div className="grid sm:grid-cols-2 gap-4">
              <Field
                label="Full Name"
                required
              >
                <input
                  required
                  maxLength={100}
                  value={form.full_name}
                  onChange={(e) =>
                    setField(
                      "full_name",
                      e.target.value
                    )
                  }
                  className="ck-input"
                  placeholder="Your full name"
                  autoComplete="name"
                />
              </Field>

              <Field
                label="Phone Number"
                required
              >
                <input
                  required
                  type="tel"
                  maxLength={30}
                  value={form.phone}
                  onChange={(e) =>
                    setField(
                      "phone",
                      e.target.value
                    )
                  }
                  className="ck-input"
                  placeholder="024 000 0000"
                  autoComplete="tel"
                />
              </Field>

              <Field
                label="Email"
                className="sm:col-span-2"
                required={
                  paymentMethod ===
                  PAYMENT_METHODS.PAYSTACK
                }
              >
                <input
                  type="email"
                  maxLength={254}
                  value={form.email}
                  onChange={(e) =>
                    setField(
                      "email",
                      e.target.value
                    )
                  }
                  className="ck-input"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </Field>
            </div>
          </section>

          {/* DELIVERY */}
          <section className="border border-border bg-white p-6">
            <SectionTitle
              number="2"
              title="Delivery Information"
            />

            <div className="space-y-4">
              <Field
                label="Delivery Region"
                required
              >
                <select
                  required
                  value={
                    form.delivery_region
                  }
                  onChange={(e) =>
                    handleRegionChange(
                      e.target.value
                    )
                  }
                  className="ck-input"
                >
                  {SITE_CONFIG.ghanaRegions.map(
                    (region) => (
                      <option
                        key={region}
                        value={region}
                      >
                        {region}
                      </option>
                    )
                  )}
                </select>
              </Field>

              <Field
                label="Delivery Address"
                required
              >
                <textarea
                  required
                  rows={4}
                  maxLength={1000}
                  value={
                    form.delivery_address
                  }
                  onChange={(e) =>
                    setField(
                      "delivery_address",
                      e.target.value
                    )
                  }
                  className="ck-input"
                  placeholder="House number, street, area, landmark..."
                  autoComplete="street-address"
                />
              </Field>

              <Field label="GhanaPost GPS Address">
                <input
                  maxLength={100}
                  value={
                    form.digital_address
                  }
                  onChange={(e) =>
                    setField(
                      "digital_address",
                      e.target.value
                    )
                  }
                  className="ck-input"
                  placeholder="Example: GA-144-7392"
                />
              </Field>

              <Field label="Order Note">
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={form.order_note}
                  onChange={(e) =>
                    setField(
                      "order_note",
                      e.target.value
                    )
                  }
                  className="ck-input"
                  placeholder="Any delivery instructions?"
                />
              </Field>

              <div className="p-4 bg-pink/5 border border-pink/20">
                <p className="text-sm font-semibold text-carbon">
                  Delivery fee
                </p>

                <p className="text-sm text-muted-foreground mt-1">
                  Your delivery fee is calculated securely
                  from the delivery distance. The amount
                  cannot be changed by the customer.
                </p>
              </div>
            </div>
          </section>

          {/* PAYMENT */}
          <section className="border border-border bg-white p-6">
            <SectionTitle
              number="3"
              title="Payment Method"
            />

            <div className="space-y-4">
              <button
                type="button"
                onClick={() =>
                  handlePaymentChange(
                    PAYMENT_METHODS.PAYSTACK
                  )
                }
                disabled={submitting}
                className={`w-full text-left border-2 p-5 transition-colors ${
                  paymentMethod ===
                  PAYMENT_METHODS.PAYSTACK
                    ? "border-pink bg-pink/5"
                    : "border-border hover:border-pink/50"
                } disabled:opacity-60`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center ${
                      paymentMethod ===
                      PAYMENT_METHODS.PAYSTACK
                        ? "border-pink"
                        : "border-gray-300"
                    }`}
                  >
                    {paymentMethod ===
                      PAYMENT_METHODS.PAYSTACK && (
                      <div className="w-2.5 h-2.5 rounded-full bg-pink" />
                    )}
                  </div>

                  <CreditCard className="w-5 h-5 text-pink" />

                  <div>
                    <p className="font-bold text-carbon">
                      Pay Online
                    </p>

                    <p className="text-sm text-muted-foreground mt-1">
                      Pay securely online through Paystack.
                    </p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                disabled={
                  submitting || !isAccra
                }
                onClick={() =>
                  handlePaymentChange(
                    PAYMENT_METHODS.POD
                  )
                }
                className={`w-full text-left border-2 p-5 transition-colors ${
                  !isAccra
                    ? "border-border bg-gray-50 opacity-60 cursor-not-allowed"
                    : paymentMethod ===
                        PAYMENT_METHODS.POD
                      ? "border-pink bg-pink/5"
                      : "border-border hover:border-pink/50"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center ${
                      paymentMethod ===
                      PAYMENT_METHODS.POD
                        ? "border-pink"
                        : "border-gray-300"
                    }`}
                  >
                    {paymentMethod ===
                      PAYMENT_METHODS.POD && (
                      <div className="w-2.5 h-2.5 rounded-full bg-pink" />
                    )}
                  </div>

                  <Smartphone className="w-5 h-5 text-pink" />

                  <div>
                    <p className="font-bold text-carbon">
                      Pay on Delivery
                    </p>

                    <p className="text-sm text-muted-foreground mt-1">
                      Available only within Greater Accra.
                    </p>

                    {!isAccra && (
                      <p className="text-xs text-red-600 mt-2">
                        Select Greater Accra to use Pay on
                        Delivery.
                      </p>
                    )}
                  </div>
                </div>
              </button>
            </div>

            {paymentMethod ===
              PAYMENT_METHODS.POD &&
              isAccra && (
                <div className="mt-5 grid sm:grid-cols-2 gap-4">
                  <Field
                    label="MoMo Number"
                    required
                  >
                    <input
                      required
                      type="tel"
                      maxLength={30}
                      value={
                        form.momo_number
                      }
                      onChange={(e) =>
                        setField(
                          "momo_number",
                          e.target.value
                        )
                      }
                      className="ck-input"
                      placeholder="024 000 0000"
                      autoComplete="tel"
                    />
                  </Field>

                  <Field
                    label="MoMo Network"
                    required
                  >
                    <select
                      required
                      value={
                        form.momo_network
                      }
                      onChange={(e) =>
                        setField(
                          "momo_network",
                          e.target.value
                        )
                      }
                      className="ck-input"
                    >
                      <option value="MTN">
                        MTN MoMo
                      </option>

                      <option value="Telecel">
                        Telecel Cash
                      </option>

                      <option value="AirtelTigo">
                        AirtelTigo Money
                      </option>
                    </select>
                  </Field>
                </div>
              )}
          </section>
        </div>

        {/* ORDER SUMMARY */}
        <aside>
          <div className="sticky top-28 border border-border bg-london/30 p-6">
            <h2 className="font-heading text-xl font-bold text-carbon">
              Your Order
            </h2>

            <div className="mt-5 space-y-4 max-h-64 overflow-y-auto">
              {items.map((item) => (
                <div
                  key={item.product_id}
                  className="flex gap-3"
                >
                  <div className="w-14 h-14 bg-white border border-border shrink-0 overflow-hidden">
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-carbon truncate">
                      {item.name}
                    </p>

                    <p className="text-xs text-muted-foreground mt-1">
                      Qty: {item.quantity}
                    </p>
                  </div>

                  <p className="font-semibold text-sm text-carbon">
                    ₵
                    {(
                      Number(item.price || 0) *
                      Number(item.quantity || 0)
                    ).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t border-border mt-5 pt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Subtotal
                </span>

                <span className="font-semibold">
                  ₵
                  {Number(
                    localSubtotal ||
                    subtotal ||
                    0
                  ).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Delivery
                </span>

                <span className="font-semibold text-pink">
                  Calculated securely
                </span>
              </div>
            </div>

            <div className="border-t border-carbon mt-5 pt-5">
              <div className="flex justify-between items-end">
                <span className="font-heading font-bold text-lg">
                  Total
                </span>

                <span className="font-heading font-bold text-xl text-pink">
                  Calculated at checkout
                </span>
              </div>

              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Final total is calculated and validated
                on the server using current product prices
                and the delivery calculation.
              </p>
            </div>

            {error && (
              <div className="mt-5 flex items-start gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-6 py-4 bg-pink text-white font-bold uppercase tracking-wider text-sm hover:bg-carbon transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : paymentMethod ===
                PAYMENT_METHODS.PAYSTACK ? (
                <>
                  <CreditCard className="w-4 h-4" />
                  Continue to Paystack
                </>
              ) : (
                <>
                  <Smartphone className="w-4 h-4" />
                  Place Order
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
              <ShieldCheck className="w-4 h-4 text-pink" />
              Secure checkout
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}

function SectionTitle({ number, title }) {
  return (
    <h2 className="font-heading text-xl font-bold text-carbon mb-5 flex items-center gap-3">
      <span className="w-8 h-8 bg-carbon text-white rounded-full flex items-center justify-center text-sm">
        {number}
      </span>

      {title}
    </h2>
  );
}

function Field({
  label,
  children,
  className = "",
  required = false,
}) {
  return (
    <div className={className}>
      <label className="block text-xs uppercase tracking-wider font-semibold text-carbon mb-1.5">
        {label}
        {required && " *"}
      </label>

      {children}
    </div>
  );
}
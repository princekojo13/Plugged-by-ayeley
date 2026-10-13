import { useEffect } from "react";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";

export default function useAdminOrderNotifications() {
  useEffect(() => {
    const channel = supabase
      .channel("admin-new-orders")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        ({ new: order }) => {
          if (!order?.id) return;

          const orderNumber = order.order_number ? `#${order.order_number}` : "";
          toast({
            title: "New order received",
            description: orderNumber
              ? `Order ${orderNumber} is ready for review.`
              : "A customer has placed an order.",
          });

          if (typeof window !== "undefined" && "Notification" in window && window.Notification.permission === "granted") {
            try {
              new window.Notification("New order received", {
                body: orderNumber ? `Order ${orderNumber} is ready for review.` : "A customer has placed an order.",
              });
            } catch {
              // The in-app toast remains available if desktop notifications are blocked.
            }
          }

          window.dispatchEvent(new CustomEvent("admin:order-inserted", { detail: order }));
        },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("Live order notifications are temporarily unavailable.");
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);
}

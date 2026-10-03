import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Clock,
  Loader2,
  Navigation,
  Route as RouteIcon,
  MapPin,
} from "lucide-react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Tooltip,
  useMap,
} from "react-leaflet";
import { supabase } from "@/lib/supabaseClient";
import { ACCRA_HUB } from "@/lib/siteConfig";
import "leaflet/dist/leaflet.css";

function formatDuration(seconds) {
  const totalMinutes = Math.max(
    0,
    Math.round(Number(seconds || 0) / 60)
  );

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }

  return `${minutes} min`;
}

function InvalidateSize() {
  const map = useMap();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [map]);

  return null;
}

function FitBounds({ points }) {
  const map = useMap();

  useEffect(() => {
    if (points.length >= 2) {
      map.fitBounds(points, {
        padding: [40, 40],
      });
    }
  }, [map, points]);

  return null;
}

export default function OrderTrackMap({
  order,
  trackingToken,
}) {
  const [state, setState] = useState({
    loading: true,
    error: "",
    fallback: false,
    dest: null,
    coords: null,
    distanceKm: null,
    eta: null,
    status: null,
  });

  const token =
    trackingToken ||
    order?.tracking_token ||
    "";

  useEffect(() => {
    let active = true;

    async function loadTracking() {
      if (!token) {
        if (active) {
          setState({
            loading: false,
            error: "No tracking token is available.",
            fallback: true,
          });
        }

        return;
      }

      setState((current) => ({
        ...current,
        loading: true,
        error: "",
      }));

      try {
        const { data, error } =
          await supabase.functions.invoke(
            "track-order",
            {
              body: {
                tracking_token: token,
              },
            }
          );

        if (error) {
          throw error;
        }

        if (
          !data?.success ||
          !data?.order
        ) {
          throw new Error(
            data?.error ||
              "Could not load tracking information."
          );
        }

        const trackedOrder = data.order;

        /*
         * The server decides which tracking fields may
         * be returned to the customer.
         *
         * The browser does NOT query the orders table
         * directly.
         */
        const destination =
          Number.isFinite(
            Number(trackedOrder.delivery_lat)
          ) &&
          Number.isFinite(
            Number(trackedOrder.delivery_lng)
          )
            ? [
                Number(trackedOrder.delivery_lat),
                Number(trackedOrder.delivery_lng),
              ]
            : null;

        if (!active) return;

        setState({
          loading: false,
          error: "",
          fallback: !destination,
          dest: destination,
          coords:
            trackedOrder.route_coords || null,
          distanceKm:
            trackedOrder.distance_km ?? null,
          eta: trackedOrder.eta_seconds
            ? formatDuration(
                trackedOrder.eta_seconds
              )
            : null,
          status:
            trackedOrder.status || null,
        });
      } catch (error) {
        console.error(
          "Order tracking failed:",
          error
        );

        if (!active) return;

        setState({
          loading: false,
          error:
            error?.message ||
            "Tracking information is temporarily unavailable.",
          fallback: true,
          dest: null,
          coords: null,
          distanceKm: null,
          eta: null,
          status: null,
        });
      }
    }

    void loadTracking();

    return () => {
      active = false;
    };
  }, [token]);

  /*
   * Refresh tracking periodically.
   *
   * This calls the secure Edge Function again rather
   * than querying the orders table from the browser.
   */
  useEffect(() => {
    if (!token) {
      return undefined;
    }

    const interval = window.setInterval(async () => {
      try {
        const { data, error } =
          await supabase.functions.invoke(
            "track-order",
            {
              body: {
                tracking_token: token,
              },
            }
          );

        if (error || !data?.success) {
          return;
        }

        const trackedOrder = data.order;

        const destination =
          Number.isFinite(
            Number(trackedOrder?.delivery_lat)
          ) &&
          Number.isFinite(
            Number(trackedOrder?.delivery_lng)
          )
            ? [
                Number(trackedOrder.delivery_lat),
                Number(trackedOrder.delivery_lng),
              ]
            : null;

        setState((current) => ({
          ...current,
          status:
            trackedOrder?.status ||
            current.status,
          dest:
            destination ||
            current.dest,
          coords:
            trackedOrder?.route_coords ||
            current.coords,
          distanceKm:
            trackedOrder?.distance_km ??
            current.distanceKm,
          eta:
            trackedOrder?.eta_seconds
              ? formatDuration(
                  trackedOrder.eta_seconds
                )
              : current.eta,
          fallback:
            !destination &&
            !current.dest,
        }));
      } catch {
        // Keep the last known tracking state.
      }
    }, 15000);

    return () => {
      window.clearInterval(interval);
    };
  }, [token]);

  const hasDestination =
    Array.isArray(state.dest) &&
    state.dest.length === 2;

  const points = useMemo(() => {
    if (!hasDestination) {
      return [ACCRA_HUB];
    }

    return [
      ACCRA_HUB,
      state.dest,
    ];
  }, [hasDestination, state.dest]);

  const center = useMemo(() => {
    if (!hasDestination) {
      return ACCRA_HUB;
    }

    return [
      (ACCRA_HUB[0] + state.dest[0]) / 2,
      (ACCRA_HUB[1] + state.dest[1]) / 2,
    ];
  }, [hasDestination, state.dest]);

  if (state.loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-pink" />
      </div>
    );
  }

  return (
    <div className="border border-border bg-white">
      <div className="border-b border-border p-5">
        <div className="mb-1 flex items-center gap-2">
          <Navigation className="h-4 w-4 text-pink" />

          <h3 className="font-heading text-sm font-bold text-carbon">
            Delivery Tracking
          </h3>

          {state.status && (
            <span className="ml-auto rounded bg-pink/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-pink">
              {state.status}
            </span>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Secure order tracking for your Plugged by Ayeley
          delivery.
        </p>
      </div>

      {state.error && (
        <div className="flex items-start gap-2 border-b border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      {hasDestination && (
        <div className="h-[360px] w-full">
          <MapContainer
            center={center}
            zoom={8}
            className="h-full w-full"
            style={{ zIndex: 0 }}
          >
            <TileLayer
              attribution="&copy; OpenStreetMap"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <InvalidateSize />

            <FitBounds points={points} />

            {Array.isArray(state.coords) &&
              state.coords.length >= 2 && (
                <Polyline
                  positions={state.coords}
                  pathOptions={{
                    color: "#e5006f",
                    weight: 4,
                    opacity: 0.8,
                  }}
                />
              )}

            <CircleMarker
              center={ACCRA_HUB}
              radius={8}
              pathOptions={{
                color: "#0A0A0A",
                fillColor: "#0A0A0A",
                fillOpacity: 1,
              }}
            >
              <Tooltip sticky>
                Accra Dispatch Hub
              </Tooltip>
            </CircleMarker>

            <CircleMarker
              center={state.dest}
              radius={8}
              pathOptions={{
                color: "#e5006f",
                fillColor: "#e5006f",
                fillOpacity: 1,
              }}
            >
              <Tooltip sticky>
                Delivery Destination
              </Tooltip>
            </CircleMarker>
          </MapContainer>
        </div>
      )}

      {!hasDestination && (
        <div className="flex min-h-[220px] flex-col items-center justify-center px-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pink/10 text-pink">
            <MapPin className="h-5 w-5" />
          </div>

          <p className="mt-4 text-sm font-semibold text-carbon">
            Map unavailable
          </p>

          <p className="mt-2 max-w-sm text-xs leading-5 text-muted-foreground">
            Your order status is still available, but a
            map route is not currently available for this
            delivery.
          </p>
        </div>
      )}

      {(state.distanceKm || state.eta) && (
        <div className="grid grid-cols-2 divide-x divide-border border-t border-border">
          {state.distanceKm && (
            <div className="flex items-center gap-3 p-4">
              <RouteIcon className="h-5 w-5 text-pink" />

              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Distance
                </p>

                <p className="font-heading font-bold text-carbon">
                  {Number(
                    state.distanceKm
                  ).toFixed(1)}{" "}
                  km
                </p>
              </div>
            </div>
          )}

          {state.eta && (
            <div className="flex items-center gap-3 p-4">
              <Clock className="h-5 w-5 text-pink" />

              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Estimated drive time
                </p>

                <p className="font-heading font-bold text-carbon">
                  {state.eta}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
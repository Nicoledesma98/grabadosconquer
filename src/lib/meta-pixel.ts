export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "";

type MetaStandardEvent =
  | "PageView"
  | "ViewContent"
  | "AddToCart"
  | "InitiateCheckout"
  | "Purchase";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export function trackMetaPixel(
  event: MetaStandardEvent,
  params?: Record<string, unknown>,
  eventId?: string,
) {
  if (typeof window === "undefined" || !window.fbq) return;
  if (eventId) {
    window.fbq("track", event, params, { eventID: eventId });
  } else {
    window.fbq("track", event, params);
  }
}

"use client";

import { useEffect } from "react";
import { trackMetaPixel } from "@/lib/meta-pixel";

export default function MetaPixelPurchase({
  orderId,
  value,
  currency,
}: {
  orderId: string;
  value: number;
  currency: string;
}) {
  useEffect(() => {
    const dedupeKey = `meta_pixel_purchase_${orderId}`;
    if (sessionStorage.getItem(dedupeKey)) return;
    sessionStorage.setItem(dedupeKey, "1");

    trackMetaPixel(
      "Purchase",
      {
        content_ids: [orderId],
        content_type: "product",
        value,
        currency,
      },
      orderId,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  return null;
}

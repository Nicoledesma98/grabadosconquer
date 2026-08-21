import crypto from "crypto";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "";
const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN || "";
const GRAPH_API_VERSION = "v21.0";

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

function normalizePhone(phone: string): string {
  // Meta espera solo dígitos (código de país incluido), sin +/espacios/guiones
  return phone.replace(/[^\d]/g, "");
}

function splitName(fullName: string): { firstName?: string; lastName?: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return {};
  return {
    firstName: parts[0],
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : undefined,
  };
}

type MetaCapiUser = {
  email?: string | null;
  phone?: string | null;
  fullName?: string | null;
  city?: string | null;
  zip?: string | null;
  country?: string | null; // código ISO de 2 letras, ej "ar"
};

export async function sendMetaCapiEvent(params: {
  eventName: "Purchase" | "ViewContent" | "AddToCart" | "InitiateCheckout";
  eventId: string;
  eventSourceUrl?: string;
  user: MetaCapiUser;
  customData?: Record<string, unknown>;
}) {
  if (!PIXEL_ID || !ACCESS_TOKEN) return;

  const { firstName, lastName } = splitName(params.user.fullName ?? "");

  const userData: Record<string, unknown> = {};
  if (params.user.email) userData.em = [sha256(params.user.email)];
  if (params.user.phone) userData.ph = [sha256(normalizePhone(params.user.phone))];
  if (firstName) userData.fn = [sha256(firstName)];
  if (lastName) userData.ln = [sha256(lastName)];
  if (params.user.city) userData.ct = [sha256(params.user.city)];
  if (params.user.zip) userData.zp = [sha256(params.user.zip)];
  if (params.user.country) userData.country = [sha256(params.user.country)];

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: [
            {
              event_name: params.eventName,
              event_time: Math.floor(Date.now() / 1000),
              event_id: params.eventId,
              event_source_url: params.eventSourceUrl,
              action_source: "website",
              user_data: userData,
              custom_data: params.customData,
            },
          ],
        }),
      },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("META_CAPI_ERROR", res.status, text);
    }
  } catch (err) {
    console.error("META_CAPI_REQUEST_FAILED", err);
  }
}

// src/lib/email/templates.ts

type OrderItemEmail = {
  qty: number;
  unitPrice: number;
  lineTotal: number;
  productName: string;
  productSlug: string;
};

type OrderEmailData = {
  id: string;
  status?: string;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  items: OrderItemEmail[];
  subtotal: number;
  shipping: number;
  total: number;
  createdAt?: Date | string;
};

function formatARS(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Colores Conquer
const COLORS = {
  turq: "#1ABCCA",
  yellow: "#F8C746",
  orange: "#F26E47",
  pink: "#FCE1E1",
  navy: "#3D3758",
  white: "#FFFFFF",
  gray: "#6B7280",
  border: "#F0D1D1",
};

function wrapEmail(opts: {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeBg?: string;
  badgeColor?: string;
  bodyHtml: string;
  cta?: { label: string; href: string; bg?: string };
  footerNote?: string;
}) {
  const logo = process.env.MAIL_LOGO_URL || ""; // subilo a Cloudinary y poné la URL acá
  const appUrl = process.env.APP_URL || "http://localhost:3000";

  const header = `
  <div style="padding:22px 22px 0 22px;">
    ${
      logo
        ? `
      <img
        src="${logo}"
        alt="Grabados Conquer"
        width="220"
        style="display:block;max-width:220px;height:auto;margin:0 0 14px 0;"
      />
    `
        : `<div style="font-size:18px;font-weight:800;color:${COLORS.navy};">Grabados Conquer</div>`
    }

    <div style="background:${COLORS.pink};border:1px solid ${COLORS.border};border-radius:18px;padding:14px 16px;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
        <div>
          <div style="font-size:18px;font-weight:900;color:${COLORS.navy};line-height:1.2;">
            ${escapeHtml(opts.title)}
          </div>
          ${
            opts.subtitle
              ? `<div style="margin-top:6px;font-size:13px;color:${COLORS.navy};opacity:.9;">
                   ${escapeHtml(opts.subtitle)}
                 </div>`
              : ""
          }
        </div>

        ${
          opts.badge
            ? `
          <div style="display:inline-block;padding:8px 12px;border-radius:999px;
                      background:${opts.badgeBg ?? COLORS.orange};
                      color:${opts.badgeColor ?? COLORS.white};
                      font-size:12px;font-weight:800;">
            ${escapeHtml(opts.badge)}
          </div>`
            : ""
        }
      </div>
    </div>
  </div>`;

  const cta = opts.cta
    ? `
    <div style="padding:0 22px 18px 22px;">
      <a href="${opts.cta.href}" target="_blank" rel="noreferrer"
         style="display:inline-block;background:${opts.cta.bg ?? COLORS.turq};
                color:${COLORS.white};text-decoration:none;padding:12px 16px;border-radius:14px;
                font-weight:900;font-size:14px;">
        ${escapeHtml(opts.cta.label)}
      </a>
    </div>`
    : "";

  const footer = `
  <div style="padding:18px 22px 22px 22px;border-top:1px solid ${COLORS.border};">
    <div style="font-size:12px;color:${COLORS.gray};line-height:1.4;">
      ${escapeHtml(opts.footerNote ?? "Grabados Conquer • WhatsApp: 11 3100 2011")}
    </div>
    <div style="margin-top:8px;font-size:11px;color:${COLORS.gray};">
      Si no reconocés este email, ignoralo. <span style="color:${COLORS.gray};">(${appUrl})</span>
    </div>
  </div>`;

  return `
  <div style="background:#f7f7f7;padding:18px;">
    <div style="max-width:680px;margin:0 auto;background:${COLORS.white};border:1px solid ${COLORS.border};
                border-radius:22px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
      ${header}
      <div style="padding:18px 22px;">
        ${opts.bodyHtml}
      </div>
      ${cta}
      ${footer}
    </div>
  </div>`;
}

function itemsTable(items: OrderItemEmail[]) {
  const rows = items
    .map((it) => {
      const name = escapeHtml(it.productName);
      const slug = escapeHtml(it.productSlug);
      return `
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid ${COLORS.border};font-size:13px;color:${COLORS.navy};">
          <div style="font-weight:800;">${name}</div>
          <div style="font-size:12px;color:${COLORS.gray};">${slug}</div>
        </td>
        <td style="padding:10px 8px;border-bottom:1px solid ${COLORS.border};font-size:13px;color:${COLORS.navy};text-align:center;white-space:nowrap;">
          ${it.qty}×
        </td>
        <td style="padding:10px 8px;border-bottom:1px solid ${COLORS.border};font-size:13px;color:${COLORS.navy};text-align:right;white-space:nowrap;">
          ${formatARS(it.unitPrice)}
        </td>
        <td style="padding:10px 8px;border-bottom:1px solid ${COLORS.border};font-size:13px;color:${COLORS.navy};text-align:right;white-space:nowrap;font-weight:800;">
          ${formatARS(it.lineTotal)}
        </td>
      </tr>`;
    })
    .join("");

  return `
  <div style="border:1px solid ${COLORS.border};border-radius:18px;overflow:hidden;">
    <div style="background:${COLORS.pink};padding:10px 12px;font-weight:900;color:${COLORS.navy};">
      Detalle del pedido
    </div>

    <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
      <thead>
        <tr style="background:#fff;">
          <th align="left" style="padding:10px 8px;border-bottom:1px solid ${COLORS.border};font-size:12px;color:${COLORS.gray};">
            Producto
          </th>
          <th align="center" style="padding:10px 8px;border-bottom:1px solid ${COLORS.border};font-size:12px;color:${COLORS.gray};">
            Cant.
          </th>
          <th align="right" style="padding:10px 8px;border-bottom:1px solid ${COLORS.border};font-size:12px;color:${COLORS.gray};">
            Unit.
          </th>
          <th align="right" style="padding:10px 8px;border-bottom:1px solid ${COLORS.border};font-size:12px;color:${COLORS.gray};">
            Subtotal
          </th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </div>`;
}

function totalsBox(subtotal: number, shipping: number, total: number) {
  return `
  <div style="margin-top:14px;border:1px solid ${COLORS.border};border-radius:18px;padding:12px 14px;">
    <div style="display:flex;justify-content:space-between;color:${COLORS.navy};font-size:13px;">
      <span>Subtotal</span><span>${formatARS(subtotal)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;color:${COLORS.navy};font-size:13px;margin-top:6px;">
      <span>Envío</span><span>${formatARS(shipping)}</span>
    </div>
    <div style="height:1px;background:${COLORS.border};margin:10px 0;"></div>
    <div style="display:flex;justify-content:space-between;color:${COLORS.navy};font-size:16px;font-weight:900;">
      <span>Total</span><span>${formatARS(total)}</span>
    </div>
  </div>`;
}

export function renderOrderCreatedEmail(o: OrderEmailData) {
  const subtitle = `Pedido ${o.id}${o.createdAt ? " • " + new Date(o.createdAt).toLocaleString("es-AR") : ""}`;
  const body = `
    <div style="color:${COLORS.navy};font-size:14px;line-height:1.5;">
      <div style="font-weight:900;font-size:15px;margin-bottom:6px;">
        ¡Gracias${o.customerName ? ", " + escapeHtml(o.customerName) : ""}! Recibimos tu pedido ✅
      </div>
      <div style="color:${COLORS.gray};">
        Te avisamos por email cuando el pedido cambie de estado.
      </div>
    </div>

    <div style="margin-top:14px;">
      ${itemsTable(o.items)}
      ${totalsBox(o.subtotal, o.shipping, o.total)}
    </div>
  `;

  const appUrl = process.env.APP_URL || "http://localhost:3000";
  return wrapEmail({
    title: "Pedido recibido",
    subtitle,
    badge: "CONFIRMADO",
    badgeBg: COLORS.turq,
    bodyHtml: body,
    cta: { label: "Ver mis pedidos", href: `${appUrl}/mi-cuenta/pedidos`, bg: COLORS.orange },
    footerNote: "Grabados Conquer • WhatsApp: 11 3100 2011 • Responderemos tu consulta lo antes posible.",
  });
}

// Map para mostrar estado bonito
export function prettyStatus(status: string) {
  const s = String(status || "").toUpperCase();
  if (s === "PENDING") return "Pendiente";
  if (s === "PAID") return "Pagado";
  if (s === "CANCELLED") return "Cancelado";
  if (s === "FULFILLED") return "Completado";
  return status;
}

export function renderOrderStatusEmail(o: OrderEmailData & { nextStatus: string }) {
  const subtitle = `Pedido ${o.id}`;
  const nice = prettyStatus(o.nextStatus);

  const badgeBg =
    String(o.nextStatus).toUpperCase() === "PAID"
      ? COLORS.turq
      : String(o.nextStatus).toUpperCase() === "CANCELLED"
      ? COLORS.orange
      : COLORS.yellow;

  const body = `
    <div style="color:${COLORS.navy};font-size:14px;line-height:1.5;">
      <div style="margin-bottom:8px;">
        Estado actualizado a: <b>${escapeHtml(nice)}</b>
      </div>
      <div style="color:${COLORS.gray};font-size:13px;">
        Si tenés dudas, respondé este email o escribinos por WhatsApp.
      </div>
    </div>

    <div style="margin-top:14px;">
      ${itemsTable(o.items)}
      ${totalsBox(o.subtotal, o.shipping, o.total)}
    </div>
  `;

  const appUrl = process.env.APP_URL || "http://localhost:3000";
  return wrapEmail({
    title: "Actualización de tu pedido",
    subtitle,
    badge: nice.toUpperCase(),
    badgeBg,
    bodyHtml: body,
    cta: { label: "Ver mis pedidos", href: `${appUrl}/mi-cuenta/pedidos`, bg: COLORS.turq },
  });
}

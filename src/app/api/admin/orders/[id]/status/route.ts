import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";
import { sendMail } from "@/lib/mailer";
import { finalizePaidOrder } from "@/lib/orders/finalize-paid-order";

export const runtime = "nodejs";

// lo que aceptás desde el front (ES)
const allowed = ["PENDIENTE", "PAGADO", "CANCELADO", "COMPLETADO"] as const;
type StatusES = (typeof allowed)[number];

// mapeo ES -> Prisma enum (EN)
const toPrismaStatus: Record<StatusES, "PENDING" | "PAID" | "CANCELLED" | "FULFILLED"> = {
  PENDIENTE: "PENDING",
  PAGADO: "PAID",
  CANCELADO: "CANCELLED",
  COMPLETADO: "FULFILLED",
};

function statusLabel(es: StatusES) {
  switch (es) {
    case "PENDIENTE": return "Pendiente";
    case "PAGADO": return "Pagado";
    case "CANCELADO": return "Cancelado";
    case "COMPLETADO": return "Completado";
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token || (token as any).role !== "ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const nextStatusES = String(body.status || "").toUpperCase() as StatusES;
  if (!allowed.includes(nextStatusES)) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }

  let updated;

  if (nextStatusES === "PAGADO") {
    updated = await finalizePaidOrder(id);

    // finalizePaidOrder ya manda mails y descuenta stock
    return Response.json({ ok: true, status: updated.status });
  }

  updated = await prisma.order.update({
    where: { id },
    data: { status: toPrismaStatus[nextStatusES] },
    include: { items: true, uploads: true },
  });

  // Email al cliente para estados que NO sean PAGADO
  if (updated.customerEmail) {
    const logo = process.env.MAIL_LOGO_URL || "";
    const appUrl = process.env.APP_URL || "http://localhost:3000";

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;padding:24px;">
        ${logo ? `<img src="${logo}" alt="Grabados Conquer" width="220" height="60" style="display:block;width:220px;height:auto;margin-bottom:16px;" />` : ""}
        <div style="background:#FCE1E1;padding:14px 16px;border-radius:16px;color:#3D3758;">
          <div style="font-size:18px;font-weight:800;">Actualización de tu pedido</div>
          <div style="margin-top:6px;font-size:14px;">Pedido <b>${updated.id}</b></div>
        </div>

        <p style="color:#3D3758;margin-top:14px;">
          Estado actualizado a: <b>${statusLabel(nextStatusES)}</b>
        </p>

        <a href="${appUrl}/mi-cuenta/pedidos"
           style="display:inline-block;background:#1ABCCA;color:#fff;text-decoration:none;padding:12px 16px;border-radius:14px;font-weight:700;">
          Ver mis pedidos
        </a>

        <div style="margin-top:18px;color:#777;font-size:12px;">
          Grabados Conquer • WhatsApp: 11 3100 2011
        </div>
      </div>
    `;

    await sendMail({
      to: updated.customerEmail,
      subject: `Tu pedido ${updated.id} ahora está ${statusLabel(nextStatusES)}`,
      html,
    });
  }

  // aviso interno para estados que NO sean PAGADO
  const internal = process.env.MAIL_INTERNAL_TO;
  if (internal) {
    await sendMail({
      to: internal,
      subject: `Estado pedido ${updated.id}: ${statusLabel(nextStatusES)}`,
      html: `<p>Pedido <b>${updated.id}</b> → <b>${statusLabel(nextStatusES)}</b></p>`,
    });
  }

  return Response.json({ ok: true, status: updated.status });
}
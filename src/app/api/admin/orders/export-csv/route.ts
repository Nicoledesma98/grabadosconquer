import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { formatOrderCode } from "@/lib/utils";

export const runtime = "nodejs";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  PAID: "Pagado",
  CANCELLED: "Cancelado",
  FULFILLED: "Completado",
};

const PAYMENT_LABEL: Record<string, string> = {
  CASH: "Efectivo",
  TRANSFER: "Transferencia",
  COORDINATE: "Coordinar con vendedor",
  MERCADO_PAGO: "Mercado Pago",
};

const SHIPPING_LABEL: Record<string, string> = {
  PICKUP: "Retiro",
  MOTO: "Moto",
  COORDINATE_INTERIOR: "Coordinar envío al interior",
};

function csvEscape(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n;]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const role = (token as any)?.role;

  if (!token || !["ADMIN", "VENTAS"].includes(role)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const cnqMatch = q.match(/^CNQ-?0*(\d+)$/i) ?? q.match(/^(\d+)$/);
  const orderNumberSearch = cnqMatch ? parseInt(cnqMatch[1], 10) : null;

  const where: any = {
    ...(q
      ? {
          OR: [
            { id: { contains: q, mode: "insensitive" as const } },
            { customerEmail: { contains: q, mode: "insensitive" as const } },
            { customerPhone: { contains: q } },
            ...(orderNumberSearch ? [{ orderNumber: orderNumberSearch }] : []),
          ],
        }
      : {}),
    ...((from || to)
      ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}),
          },
        }
      : {}),
  };

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { items: { orderBy: { id: "asc" } } },
  });

  const header = [
    "pedido",
    "fecha",
    "estado",
    "cliente",
    "email",
    "telefono",
    "metodoPago",
    "metodoEnvio",
    "producto",
    "sku",
    "color",
    "cantidad",
    "precioUnitario",
    "totalLinea",
    "totalPedido",
  ];

  const lines = [header.join(",")];

  for (const o of orders) {
    const base = [
      formatOrderCode(o.orderNumber),
      o.createdAt.toISOString(),
      STATUS_LABEL[o.status] ?? o.status,
      o.customerName ?? "",
      o.customerEmail ?? "",
      o.customerPhone ?? "",
      PAYMENT_LABEL[String(o.paymentMethod)] ?? String(o.paymentMethod),
      SHIPPING_LABEL[String(o.shippingMethod)] ?? String(o.shippingMethod),
    ];

    if (o.items.length === 0) {
      lines.push([...base, "", "", "", "", "", "", o.total].map(csvEscape).join(","));
      continue;
    }

    for (const it of o.items) {
      lines.push(
        [
          ...base,
          it.productName,
          it.variantSku ?? "",
          it.colorName ?? "",
          it.qty,
          it.unitPrice,
          it.lineTotal,
          o.total,
        ]
          .map(csvEscape)
          .join(","),
      );
    }
  }

  const csv = "﻿" + lines.join("\n");
  const fileName = `ventas-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}

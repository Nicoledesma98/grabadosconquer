import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProductsAccess } from "@/lib/require-admin-sell";
import { calculatePrice } from "@/lib/pricing";

export const runtime = "nodejs";

async function getExchangeRate(): Promise<number> {
  const setting = await prisma.setting.findUnique({
    where: { key: "exchange_rate" },
  });

  const exchangeRate = setting
    ? Number(setting.value)
    : 1200;

  if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
    throw new Error("La cotización configurada es inválida");
  }

  return exchangeRate;
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireProductsAccess(req);

  if (!guard.ok) {
    return Response.json(
      { error: guard.error },
      { status: guard.status },
    );
  }

  const { id: productId } = await ctx.params;
  const body = await req.json();

  const minQty = Number(body.minQty);
  const multiplier = Number(body.multiplier);

  if (
    !Number.isInteger(minQty) ||
    minQty < 1
  ) {
    return Response.json(
      { error: "La cantidad mínima debe ser un entero mayor a 0" },
      { status: 400 },
    );
  }

  if (
    !Number.isFinite(multiplier) ||
    multiplier <= 0
  ) {
    return Response.json(
      { error: "El multiplicador debe ser mayor a 0" },
      { status: 400 },
    );
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      baseUsdPrice: true,
      supplierMap: {
        select: { id: true },
      },
    },
  });

  if (!product) {
    return Response.json(
      { error: "Producto no encontrado" },
      { status: 404 },
    );
  }

  if (product.supplierMap.length > 0) {
    return Response.json(
      {
        error:
          "Los productos de proveedor no utilizan este sistema de tiers",
      },
      { status: 400 },
    );
  }

  const baseUsdPrice = Number(product.baseUsdPrice);

  if (
    !Number.isFinite(baseUsdPrice) ||
    baseUsdPrice < 0
  ) {
    return Response.json(
      { error: "El producto no tiene un costo USD válido" },
      { status: 400 },
    );
  }

  try {
    const exchangeRate = await getExchangeRate();

    const price = calculatePrice(
      baseUsdPrice,
      exchangeRate,
      multiplier,
    );

    const tier = await prisma.priceTier.create({
      data: {
        productId,
        minQty,
        multiplier,
        price,
      },
      select: {
        id: true,
        minQty: true,
        multiplier: true,
        price: true,
      },
    });

    return Response.json(tier);
  } catch (error: unknown) {
    console.error("Error creando tier:", error);

    if (
      error instanceof Error &&
      error.message.includes("Unique constraint")
    ) {
      return Response.json(
        {
          error:
            "Ya existe un tier con esa cantidad mínima",
        },
        { status: 409 },
      );
    }

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo crear el tier",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireProductsAccess(req);

  if (!guard.ok) {
    return Response.json(
      { error: guard.error },
      { status: guard.status },
    );
  }

  const { id: productId } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const tierId = searchParams.get("tierId");

  if (!tierId) {
    return Response.json(
      { error: "tierId requerido" },
      { status: 400 },
    );
  }

  const tier = await prisma.priceTier.findUnique({
    where: { id: tierId },
    select: { productId: true },
  });

  if (!tier || tier.productId !== productId) {
    return Response.json(
      { error: "Tier no encontrado" },
      { status: 404 },
    );
  }

  await prisma.priceTier.delete({
    where: { id: tierId },
  });

  return Response.json({ ok: true });
}
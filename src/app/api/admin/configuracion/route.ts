import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const exchangeRateSetting = await prisma.setting.findUnique({
    where: { key: "exchange_rate" },
  });
  const exchangeRate = exchangeRateSetting ? parseFloat(exchangeRateSetting.value) : 1200;

  const rules = await prisma.priceRule.findMany({
    orderBy: { minUsd: "asc" },
  });

  return NextResponse.json({ exchangeRate, rules });
}

export async function POST(req: Request) {
  try {
    const { exchangeRate, rules } = await req.json();

    // Validar tipo de cambio
    if (typeof exchangeRate !== 'number' || exchangeRate <= 0) {
      return NextResponse.json({ error: "Tipo de cambio inválido" }, { status: 400 });
    }

    // Guardar cotización
    await prisma.setting.upsert({
      where: { key: "exchange_rate" },
      update: { value: String(exchangeRate) },
      create: { key: "exchange_rate", value: String(exchangeRate) },
    });

    // Eliminar reglas anteriores
    await prisma.priceRule.deleteMany({});

    // Crear nuevas reglas (si hay)
    if (Array.isArray(rules) && rules.length > 0) {
      for (const rule of rules) {
        // Validar cada regla
        if (
          typeof rule.minUsd !== 'number' ||
          typeof rule.maxUsd !== 'number' ||
          typeof rule.multiplier !== 'number'
        ) {
          return NextResponse.json({ error: "Regla inválida" }, { status: 400 });
        }
        await prisma.priceRule.create({
          data: {
            minUsd: rule.minUsd,
            maxUsd: rule.maxUsd,
            multiplier: rule.multiplier,
          },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error al guardar configuración:", error);
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(
      { error: "Error interno al guardar", details: errorMessage },
      { status: 500 }
    );
  }
}
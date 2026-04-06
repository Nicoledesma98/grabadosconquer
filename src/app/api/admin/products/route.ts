import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function toSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeMinQtyStep(v: any) {
  const n = Number(v);
  return [1, 5, 10].includes(n) ? n : 1;
}

// Métodos válidos
const ALLOWED_METHODS = ["DTF", "DTG", "FULL_COLOR", "LASER"] as const;
type PersonalizationMethod = (typeof ALLOWED_METHODS)[number];

function normalizeAllowedMethods(input: any): PersonalizationMethod[] {
  if (!Array.isArray(input)) return [];
  const set = new Set<PersonalizationMethod>();
  for (const v of input) {
    if (ALLOWED_METHODS.includes(v)) set.add(v);
  }
  return Array.from(set);
}

type PriceRule = {
  min: number;
  max: number;
  multiplier: number;
};

async function getExchangeRate() {
  const setting = await prisma.setting.findUnique({
    where: { key: "exchange_rate" },
  });

  return setting ? parseFloat(setting.value) : 1200;
}

async function getPriceRules(): Promise<PriceRule[]> {
  const rules = await prisma.priceRule.findMany({
    orderBy: { minUsd: "asc" },
  });

  return rules.map((r) => ({
    min: r.minUsd,
    max: r.maxUsd,
    multiplier: r.multiplier,
  }));
}

function calculateFinalPriceInPesos(
  usdPrice: number,
  exchangeRate: number,
  rules: PriceRule[]
): number {
  const rule = rules.find(
    (r) => usdPrice >= r.min && usdPrice <= r.max
  );

  const multiplier = rule ? rule.multiplier : 1.5;
  const priceInARS = usdPrice * exchangeRate;
  const finalPrice = priceInARS * multiplier;

  return Math.round(finalPrice);
}
export async function POST(req: Request) {
  const body = await req.json();

  const name = String(body.name ?? "").trim();
  const slugRaw = String(body.slug ?? "").trim();
  const description = body.description ? String(body.description).trim() : null;

  const baseUsdPrice =
    body.baseUsdPrice === "" || body.baseUsdPrice == null
      ? null
      : Number(body.baseUsdPrice);

  let stock: number | null = null;
  if (body.stock !== undefined && body.stock !== "") {
    const parsed = Number(body.stock);
    if (!Number.isInteger(parsed) || parsed < 0) {
      return Response.json(
        { error: "El stock debe ser un número entero ≥ 0" },
        { status: 400 }
      );
    }
    stock = parsed;
  }

  const active = body.active !== false;
  const minQtyStep = normalizeMinQtyStep(body.minQtyStep ?? 1);
  const allowedMethods = normalizeAllowedMethods(body.allowedMethods ?? []);
  const imageUrl = body.imageUrl ? String(body.imageUrl).trim() : "";
  const categoryIds: string[] = Array.isArray(body.categoryIds) ? body.categoryIds : [];

  if (!name) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }

  const slug = slugRaw ? toSlug(slugRaw) : toSlug(name);
  if (!slug) {
    return Response.json({ error: "Invalid slug" }, { status: 400 });
  }

  if (baseUsdPrice == null || !Number.isFinite(baseUsdPrice) || baseUsdPrice < 0) {
    return Response.json({ error: "Invalid baseUsdPrice" }, { status: 400 });
  }

  const exists = await prisma.product.findUnique({ where: { slug } });
  if (exists) {
    return Response.json({ error: "Slug already exists" }, { status: 409 });
  }

  const exchangeRate = await getExchangeRate();
  const priceRules = await getPriceRules();

  const finalBasePrice = calculateFinalPriceInPesos(
    baseUsdPrice,
    exchangeRate,
    priceRules
  );

  const product = await prisma.product.create({
    data: {
      name,
      slug,
      description,
      baseUsdPrice,
      basePrice: finalBasePrice,
      stock,
      active,
      minQtyStep,
      allowedMethods,
      images: imageUrl
        ? { create: [{ url: imageUrl, alt: name, sort: 0 }] }
        : undefined,
      categories: categoryIds.length
        ? { connect: categoryIds.map((id) => ({ id })) }
        : undefined,
    },
    select: { id: true, baseUsdPrice: true, basePrice: true },
  });

  return Response.json(product);
}
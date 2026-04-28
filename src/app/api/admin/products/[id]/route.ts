import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export const runtime = "nodejs";

function normalizeMinQtyStep(v: any) {
  const n = Number(v);
  return [1, 5, 10].includes(n) ? n : 1;
}
function normalizeDiscountPercent(v: any) {
  const n = Number(v);
  if (!Number.isInteger(n)) return 0;
  if (n < 0) return 0;
  if (n > 90) return 90;
  return n;
}

function toSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}
function normalizeMinPurchaseQty(v: any) {
  const n = Number(v);
  return [1, 5, 10, 25, 50, 75, 100].includes(n) ? n : 1;
}

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

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return Response.json({ error: guard.error }, { status: guard.status });
  const { id } = await ctx.params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: { sort: "asc" } },
      priceTiers: { orderBy: { minQty: "asc" } },
      categories: { orderBy: { name: "asc" } },
      variants: { orderBy: { createdAt: "asc" } },
      supplierMap: {select: { id: true } },
    },
  });

  if (!product) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({
    ...product,
  isSupplierProduct: product.supplierMap.length > 0});
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return Response.json({ error: guard.error }, { status: guard.status });
  const { id } = await ctx.params;
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
  } else if (body.stock === "") {
    stock = null;
  }

  const product = await prisma.product.findUnique({
    where: { id },
    include: { 
      variants: { select: { id: true } }, 
      supplierMap: { select: {id: true}},
    },
  });

  if (!product) return Response.json({ error: "Not found" }, { status: 404 });
  const hasVariants = product.variants.length > 0;
  if (hasVariants) stock = null;
  const isSupplierProduct = product.supplierMap.length > 0;
  const active = body.active !== false;
  const minQtyStep = normalizeMinQtyStep(body.minQtyStep);
  const imageUrl = body.imageUrl ? String(body.imageUrl).trim() : "";
  const categoryIds: string[] = Array.isArray(body.categoryIds) ? body.categoryIds : [];
  const allowedMethods = normalizeAllowedMethods(body.allowedMethods);
  const minPurchaseQty = normalizeMinPurchaseQty(body.minPurchaseQty ?? 1);
  if (!name) return Response.json({ error: "Name is required" }, { status: 400 });
  const discountActive = body.discountActive === true;
const discountPercent = discountActive
  ? normalizeDiscountPercent(body.discountPercent ?? 0)
  : 0;
  const slug = slugRaw ? toSlug(slugRaw) : toSlug(name);
  if (!slug) return Response.json({ error: "Invalid slug" }, { status: 400 });

  if (!isSupplierProduct) {
    if (baseUsdPrice == null || !Number.isFinite(baseUsdPrice) || baseUsdPrice < 0) {
    return Response.json({ error: "Invalid baseUsdPrice" }, { status: 400 });
  }
  }
  if (discountActive && (discountPercent < 1 || discountPercent > 90)) {
  return Response.json(
    { error: "El descuento debe estar entre 1 y 90" },
    { status: 400 }
  );
}

  const current = await prisma.product.findUnique({
    where: { id },
    select: { slug: true },
  });

  if (!current) return Response.json({ error: "Not found" }, { status: 404 });

  if (current.slug !== slug) {
    const exists = await prisma.product.findUnique({ where: { slug } });
    if (exists) return Response.json({ error: "Slug already exists" }, { status: 409 });
  }

  let finalBasePrice = product.basePrice;

if (!isSupplierProduct) {
  const exchangeRate = await getExchangeRate();
  const priceRules = await getPriceRules();

  finalBasePrice = calculateFinalPriceInPesos(
    baseUsdPrice as number,
    exchangeRate,
    priceRules
  );
}

  const firstImg = await prisma.productImage.findFirst({
    where: { productId: id },
    select: { id: true },
    orderBy: { sort: "asc" },
  });

  const updated = await prisma.product.update({
    where: { id },
    data: {
      name,
      slug,
      minQtyStep,
      minPurchaseQty,
      discountActive,
      discountPercent,
      description,
      ...(isSupplierProduct
    ? {}
    : {
        baseUsdPrice,
        basePrice: finalBasePrice,
      }),
      active,
      stock: hasVariants ? null : stock,
      allowedMethods,
      categories: { set: categoryIds.map((cid) => ({ id: cid })) },
      ...(imageUrl
        ? {
            images: {
              upsert: [
                {
                  where: { id: firstImg?.id ?? "__nope__" },
                  update: { url: imageUrl, alt: name },
                  create: { url: imageUrl, alt: name, sort: 0 },
                },
              ],
            },
          }
        : {}),
    },
    select: {
      id: true,
      allowedMethods: true,
      stock: true,
      baseUsdPrice: true,
      basePrice: true,
    },
  });

  return Response.json(updated);
}
import { prisma } from "@/lib/prisma";

export type ProductCsvRow = {
  slug?: string;
  name?: string;
  description?: string;
  active?: string;
  baseUsdPrice?: string;
  stock?: string;
  categorias?: string;
  sku?: string;
  variantColorName?: string;
  variantColorHex?: string;
  variantStock?: string;
  variantPriceOverride?: string;
};

type PriceRule = { min: number; max: number; multiplier: number };

function normalize(value: unknown) {
  return String(value ?? "").trim();
}

function toSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

function parseBoolLike(raw: string): { value: boolean | undefined; error?: string } {
  const v = raw.trim().toLowerCase();
  if (!v) return { value: undefined };
  if (["true", "1", "si", "sí", "activo", "yes"].includes(v)) return { value: true };
  if (["false", "0", "no", "inactivo"].includes(v)) return { value: false };
  return { value: undefined, error: "Valor inválido (usar true/false)" };
}

function parseIntLike(raw: string): { value: number | undefined; error?: string } {
  const v = raw.trim();
  if (!v) return { value: undefined };
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
    return { value: undefined, error: "Debe ser un número entero ≥ 0" };
  }
  return { value: n };
}

function parseFloatLike(raw: string): { value: number | undefined; error?: string } {
  const v = raw.trim();
  if (!v) return { value: undefined };
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) {
    return { value: undefined, error: "Debe ser un número ≥ 0" };
  }
  return { value: n };
}

async function getExchangeRate() {
  const setting = await prisma.setting.findUnique({ where: { key: "exchange_rate" } });
  return setting ? parseFloat(setting.value) : 1200;
}

async function getPriceRules(): Promise<PriceRule[]> {
  const rules = await prisma.priceRule.findMany({ orderBy: { minUsd: "asc" } });
  return rules.map((r) => ({ min: r.minUsd, max: r.maxUsd, multiplier: r.multiplier }));
}

function calculateFinalPriceInPesos(usdPrice: number, exchangeRate: number, rules: PriceRule[]): number {
  const rule = rules.find((r) => usdPrice >= r.min && usdPrice <= r.max);
  const multiplier = rule ? rule.multiplier : 1.5;
  return Math.round(usdPrice * exchangeRate * multiplier);
}

type ProductCtxEntry = {
  id: string;
  slug: string;
  name: string;
  active: boolean;
  baseUsdPrice: number | null;
  stock: number | null;
  isSupplierProduct: boolean;
  hasVariants: boolean;
  existed: boolean; // ya existía en la base antes de este import
};

export type ImportContext = {
  products: Map<string, ProductCtxEntry>;
  skusSeen: Map<string, number>; // sku -> rowNumber donde se usó
  categoryCache: Map<string, string | null>; // slug -> id | null (no encontrada)
  exchangeRate: number;
  priceRules: PriceRule[];
};

export async function createImportContext(): Promise<ImportContext> {
  return {
    products: new Map(),
    skusSeen: new Map(),
    categoryCache: new Map(),
    exchangeRate: await getExchangeRate(),
    priceRules: await getPriceRules(),
  };
}

async function resolveCategoryIds(
  ctx: ImportContext,
  raw: string,
  errors: string[],
): Promise<string[] | null> {
  const v = normalize(raw);
  if (!v) return null;

  const slugs = Array.from(
    new Set(
      v
        .split(";")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    ),
  );

  const ids: string[] = [];
  for (const slug of slugs) {
    if (!ctx.categoryCache.has(slug)) {
      const cat = await prisma.category.findUnique({ where: { slug }, select: { id: true } });
      ctx.categoryCache.set(slug, cat?.id ?? null);
    }
    const id = ctx.categoryCache.get(slug);
    if (!id) {
      errors.push(`Categoría no encontrada: "${slug}"`);
    } else {
      ids.push(id);
    }
  }

  return ids;
}

async function getProductEntry(ctx: ImportContext, slug: string): Promise<ProductCtxEntry | null> {
  if (ctx.products.has(slug)) return ctx.products.get(slug) ?? null;

  const p = await prisma.product.findUnique({
    where: { slug },
    include: {
      variants: { select: { id: true } },
      supplierMap: { select: { id: true } },
    },
  });

  if (!p) {
    ctx.products.set(slug, null as unknown as ProductCtxEntry);
    return null;
  }

  const entry: ProductCtxEntry = {
    id: p.id,
    slug: p.slug,
    name: p.name,
    active: p.active,
    baseUsdPrice: p.baseUsdPrice == null ? null : Number(p.baseUsdPrice),
    stock: p.stock,
    isSupplierProduct: p.supplierMap.length > 0,
    hasVariants: p.variants.length > 0,
    existed: true,
  };
  ctx.products.set(slug, entry);
  return entry;
}

export type RowFields = {
  slug: string;
  name: string | undefined;
  description: string | undefined;
  active: boolean | undefined;
  baseUsdPrice: number | undefined;
  stock: number | undefined;
  categoryIds: string[] | null;
  sku: string;
  variantColorName: string | undefined;
  variantColorHex: string | undefined;
  variantStock: number | undefined;
  variantPriceOverride: number | undefined; // pesos
};

export type RowPlan = {
  rowNumber: number;
  errors: string[];
  warnings: string[];
  fields: RowFields;
  productAction: "create" | "update" | "none";
  productBefore: { name: string; active: boolean; baseUsdPrice: number | null; stock: number | null } | null;
  productAfterPreview: { name: string; active: boolean; baseUsdPrice: number | null; basePriceArs: number | null; stock: number | null };
  variantAction: "create" | "update" | "none";
  variantBefore: { colorName: string; stock: number; priceOverride: number | null } | null;
  variantAfterPreview: { colorName: string | null; stock: number | null; priceOverride: number | null } | null;
};

export async function planRow(
  ctx: ImportContext,
  raw: ProductCsvRow,
  rowNumber: number,
): Promise<RowPlan> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const slug = toSlug(normalize(raw.slug));
  if (!slug) errors.push("Falta slug");

  const name = normalize(raw.name) || undefined;
  const description = raw.description != null && normalize(raw.description) !== "" ? normalize(raw.description) : undefined;

  const activeParsed = parseBoolLike(normalize(raw.active));
  if (activeParsed.error) errors.push(`active: ${activeParsed.error}`);

  const baseUsdParsed = parseFloatLike(normalize(raw.baseUsdPrice));
  if (baseUsdParsed.error) errors.push(`baseUsdPrice: ${baseUsdParsed.error}`);

  const stockParsed = parseIntLike(normalize(raw.stock));
  if (stockParsed.error) errors.push(`stock: ${stockParsed.error}`);

  const categoryIds = slug ? await resolveCategoryIds(ctx, raw.categorias ?? "", errors) : null;

  const sku = normalize(raw.sku).toUpperCase();
  const variantColorName = normalize(raw.variantColorName) || undefined;
  const variantColorHex = normalize(raw.variantColorHex) || undefined;
  const variantStockParsed = parseIntLike(normalize(raw.variantStock));
  if (variantStockParsed.error) errors.push(`variantStock: ${variantStockParsed.error}`);
  const variantPriceParsed = parseFloatLike(normalize(raw.variantPriceOverride));
  if (variantPriceParsed.error) errors.push(`variantPriceOverride: ${variantPriceParsed.error}`);

  const fields: RowFields = {
    slug,
    name,
    description,
    active: activeParsed.value,
    baseUsdPrice: baseUsdParsed.value,
    stock: stockParsed.value,
    categoryIds,
    sku,
    variantColorName,
    variantColorHex,
    variantStock: variantStockParsed.value,
    variantPriceOverride: variantPriceParsed.value,
  };

  if (!slug) {
    return {
      rowNumber,
      errors,
      warnings,
      fields,
      productAction: "none",
      productBefore: null,
      productAfterPreview: { name: name ?? "", active: true, baseUsdPrice: null, basePriceArs: null, stock: null },
      variantAction: "none",
      variantBefore: null,
      variantAfterPreview: null,
    };
  }

  const productEntry = await getProductEntry(ctx, slug);
  const productAction: "create" | "update" = productEntry ? "update" : "create";

  if (productAction === "create") {
    if (!name) errors.push("Falta name (producto nuevo)");
    if (baseUsdParsed.value == null) errors.push("Falta baseUsdPrice (producto nuevo)");
  } else if (productEntry!.isSupplierProduct && baseUsdParsed.value != null) {
    errors.push("Producto vinculado a proveedor: el precio no se puede editar por CSV");
  }

  // Determina si el producto va a tener variantes (existentes, ya vistas en este archivo, o esta misma fila)
  const willHaveVariants =
    (productEntry?.hasVariants ?? false) || Boolean(sku) || false;

  if (stockParsed.value != null && willHaveVariants) {
    warnings.push("El producto tiene (o tendrá) variantes: se ignora la columna stock, usá variantStock");
  }

  const basePriceArsPreview =
    baseUsdParsed.value != null
      ? calculateFinalPriceInPesos(baseUsdParsed.value, ctx.exchangeRate, ctx.priceRules)
      : productEntry?.baseUsdPrice != null
      ? calculateFinalPriceInPesos(productEntry.baseUsdPrice, ctx.exchangeRate, ctx.priceRules)
      : null;

  const productAfterPreview = {
    name: name ?? productEntry?.name ?? "",
    active: activeParsed.value ?? productEntry?.active ?? true,
    baseUsdPrice: baseUsdParsed.value ?? productEntry?.baseUsdPrice ?? null,
    basePriceArs: basePriceArsPreview,
    stock: willHaveVariants ? null : stockParsed.value ?? productEntry?.stock ?? null,
  };

  // ---- Variante ----
  let variantAction: "create" | "update" | "none" = "none";
  let variantBefore: RowPlan["variantBefore"] = null;
  let variantAfterPreview: RowPlan["variantAfterPreview"] = null;

  if (sku) {
    if (ctx.skusSeen.has(sku)) {
      errors.push(`SKU duplicado dentro del archivo (fila ${ctx.skusSeen.get(sku)})`);
    } else {
      ctx.skusSeen.set(sku, rowNumber);
    }

    const existingVariant = await prisma.productVariant.findUnique({
      where: { sku },
      include: { product: { select: { id: true, slug: true } } },
    });

    if (existingVariant) {
      if (productAction === "update" && existingVariant.product.id !== productEntry!.id) {
        errors.push(`El SKU pertenece a otro producto (${existingVariant.product.slug})`);
      } else if (productAction === "create") {
        errors.push(`El SKU ya existe pero el producto "${slug}" no (revisá el slug)`);
      }

      variantAction = "update";
      variantBefore = {
        colorName: existingVariant.colorName,
        stock: existingVariant.stock,
        priceOverride: existingVariant.priceOverride,
      };
      variantAfterPreview = {
        colorName: variantColorName ?? existingVariant.colorName,
        stock: variantStockParsed.value ?? existingVariant.stock,
        priceOverride:
          variantPriceParsed.value != null
            ? Math.round(variantPriceParsed.value * 100)
            : existingVariant.priceOverride,
      };
    } else {
      variantAction = "create";
      if (!variantColorName) errors.push("Falta variantColorName (variante nueva)");
      variantAfterPreview = {
        colorName: variantColorName ?? null,
        stock: variantStockParsed.value ?? 0,
        priceOverride: variantPriceParsed.value != null ? Math.round(variantPriceParsed.value * 100) : null,
      };
    }
  }

  // Simula el estado resultante en el contexto para que filas siguientes del mismo archivo lo vean
  if (errors.length === 0) {
    ctx.products.set(slug, {
      id: productEntry?.id ?? "(nuevo)",
      slug,
      name: productAfterPreview.name,
      active: productAfterPreview.active,
      baseUsdPrice: productAfterPreview.baseUsdPrice,
      stock: productAfterPreview.stock,
      isSupplierProduct: productEntry?.isSupplierProduct ?? false,
      hasVariants: (productEntry?.hasVariants ?? false) || Boolean(sku),
      existed: productEntry?.existed ?? false,
    });
  }

  return {
    rowNumber,
    errors,
    warnings,
    fields,
    productAction,
    productBefore: productEntry
      ? { name: productEntry.name, active: productEntry.active, baseUsdPrice: productEntry.baseUsdPrice, stock: productEntry.stock }
      : null,
    productAfterPreview,
    variantAction,
    variantBefore,
    variantAfterPreview,
  };
}

export async function commitRow(
  ctx: ImportContext,
  plan: RowPlan,
): Promise<{ productId: string; variantId: string | null }> {
  const { fields } = plan;

  return prisma.$transaction(async (tx) => {
    let productId: string;

    if (plan.productAction === "create") {
      const basePrice = calculateFinalPriceInPesos(
        fields.baseUsdPrice as number,
        ctx.exchangeRate,
        ctx.priceRules,
      );

      const created = await tx.product.create({
        data: {
          slug: fields.slug,
          name: fields.name as string,
          description: fields.description ?? null,
          active: fields.active ?? true,
          baseUsdPrice: fields.baseUsdPrice as number,
          basePrice,
          stock: plan.productAfterPreview.stock,
          categories: fields.categoryIds ? { connect: fields.categoryIds.map((id) => ({ id })) } : undefined,
        },
        select: { id: true },
      });
      productId = created.id;
    } else {
      const existing = await tx.product.findUnique({ where: { slug: fields.slug }, select: { id: true } });
      if (!existing) throw new Error("El producto desapareció durante la importación");
      productId = existing.id;

      const data: any = {};
      if (fields.name != null) data.name = fields.name;
      if (fields.description != null) data.description = fields.description;
      if (fields.active != null) data.active = fields.active;
      // fields.sku implica que esta fila crea/actualiza una variante: el producto pasa
      // a tener variantes (o ya las tenía) y su stock propio debe quedar en null.
      if (fields.stock != null || fields.sku) data.stock = plan.productAfterPreview.stock;
      if (fields.baseUsdPrice != null) {
        data.baseUsdPrice = fields.baseUsdPrice;
        data.basePrice = calculateFinalPriceInPesos(fields.baseUsdPrice, ctx.exchangeRate, ctx.priceRules);
      }
      if (fields.categoryIds) data.categories = { set: fields.categoryIds.map((id) => ({ id })) };

      if (Object.keys(data).length > 0) {
        await tx.product.update({ where: { id: productId }, data });
      }
    }

    let variantId: string | null = null;

    if (fields.sku) {
      if (plan.variantAction === "create") {
        const createdVariant = await tx.productVariant.create({
          data: {
            productId,
            sku: fields.sku,
            colorName: fields.variantColorName as string,
            colorHex: fields.variantColorHex ?? null,
            stock: fields.variantStock ?? 0,
            priceOverride: fields.variantPriceOverride != null ? Math.round(fields.variantPriceOverride * 100) : null,
          },
          select: { id: true },
        });
        variantId = createdVariant.id;
      } else if (plan.variantAction === "update") {
        const existingVariant = await tx.productVariant.findUnique({ where: { sku: fields.sku }, select: { id: true } });
        if (!existingVariant) throw new Error("La variante desapareció durante la importación");

        const vdata: any = {};
        if (fields.variantColorName != null) vdata.colorName = fields.variantColorName;
        if (fields.variantColorHex != null) vdata.colorHex = fields.variantColorHex;
        if (fields.variantStock != null) vdata.stock = fields.variantStock;
        if (fields.variantPriceOverride != null) vdata.priceOverride = Math.round(fields.variantPriceOverride * 100);

        if (Object.keys(vdata).length > 0) {
          await tx.productVariant.update({ where: { id: existingVariant.id }, data: vdata });
        }
        variantId = existingVariant.id;
      }
    }

    return { productId, variantId };
  });
}

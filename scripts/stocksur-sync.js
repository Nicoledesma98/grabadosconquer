// scripts/stocksur-sync.js
import { setTimeout as sleep } from "node:timers/promises";
import { PrismaClient } from '@prisma/client';

// Instancia de Prisma
const prisma = new PrismaClient();

// --------------------------------------------------------------
// Funciones auxiliares (copia exacta de tu route.ts)
// --------------------------------------------------------------
function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function getUniqueSlug(baseName, existingId) {
  let slug = slugify(baseName);
  let exists = await prisma.product.findFirst({
    where: { slug, NOT: existingId ? { id: existingId } : undefined }
  });
  if (!exists) return slug;
  let counter = 1;
  while (exists) {
    const candidate = `${slug}-${counter}`;
    exists = await prisma.product.findFirst({
      where: { slug: candidate, NOT: existingId ? { id: existingId } : undefined }
    });
    if (!exists) return candidate;
    counter++;
  }
  return slug;
}

async function ensureSupplier() {
  return await prisma.supplier.upsert({
    where: { code: "SUR" },
    update: {},
    create: { name: "Stock Sur (CDO)", code: "SUR", active: true },
  });
}

async function getPriceRules() {
  const rules = await prisma.priceRule.findMany({
    orderBy: { minUsd: "asc" },
  });
  return rules.map(r => ({
    min: r.minUsd,
    max: r.maxUsd,
    multiplier: r.multiplier,
  }));
}

async function getExchangeRate() {
  const setting = await prisma.setting.findUnique({
    where: { key: "exchange_rate" },
  });
  return setting ? parseFloat(setting.value) : 1200;
}

async function ensureNovedadesCategory() {
  let category = await prisma.category.findUnique({ where: { slug: "novedades" } });
  if (!category) {
    category = await prisma.category.create({
      data: { name: "Novedades", slug: "novedades", active: true, order: 0 },
    });
    console.log("✅ Categoría 'Novedades' creada automáticamente");
  }
  return category;
}

function calculateFinalPriceInCents(priceUSD, exchangeRate, rules) {
  const rule = rules.find(r => priceUSD >= r.min && priceUSD <= r.max);
  const multiplier = rule ? rule.multiplier : 1.5;
  const priceARS = priceUSD * exchangeRate;
  const finalPrice = priceARS * multiplier;
  return Math.round(finalPrice * 100);
}

// --------------------------------------------------------------
// Funciones de fetch con reintentos (robustas)
// --------------------------------------------------------------
function buildUrl(country = "argentina", params) {
  const base = `http://api.${country}.cdopromocionales.com/v2/products`;
  const url = new URL(base);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  return url.toString();
}

function normalizeStockSur(rawProducts) {
  return rawProducts.map((p) => ({
    externalId: String(p.id),
    externalSku: String(p.code || "").trim(),
    name: String(p.name || "").trim(),
    description: p.description ? String(p.description).trim() : null,
    categories: Array.isArray(p.categories)
      ? p.categories.map((c) => ({ id: c.Id, name: c.name }))
      : [],
    packing: p.packing || null,
    icons: p.icons || [],
    variants: Array.isArray(p.variants)
      ? p.variants.map((v) => ({
          externalId: String(v.id),
          sku: String(v.sku || "").trim(),
          novedad: v.novedad === true,
          stock: Number(v.stock_available ?? 0) || 0,
          listPrice: Number(v.list_price ?? 0) || 0,
          netPrice: Number(v.net_price ?? 0) || 0,
          color: v.color
            ? { name: v.color.name || null, hexCode: v.color.hex_code || null }
            : null,
          images: v.images || {},
        }))
      : [],
  }));
}

async function fetchWithRetry(url, { timeoutMs = 60000, retries = 5 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { cache: "no-store", signal: controller.signal });
      if (res.ok) return res;
      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        await sleep(1000 * Math.pow(2, attempt));
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt >= retries) break;
      await sleep(1000 * Math.pow(2, attempt));
    } finally {
      clearTimeout(t);
    }
  }
  throw lastErr;
}

async function fetchStockSurAll(authToken, country = "argentina") {
  const url = buildUrl(country, { auth_token: authToken, page_size: 100, page_number: 1 });
  const res = await fetchWithRetry(url, { timeoutMs: 60000, retries: 5 });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error ${res.status} al obtener productos: ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  const raw = Array.isArray(json) ? json : (json.products || []);
  return normalizeStockSur(raw);
}

// --------------------------------------------------------------
// Lógica de guardado (exactamente como en tu route.ts, pero con las variables correctas)
// --------------------------------------------------------------
async function upsertOneRow({ row, supplier, exchangeRate, priceRules, novedadesCategory }) {
  // SupplierProduct
  const supplierProduct = await prisma.supplierProduct.upsert({
    where: { supplierId_externalSku: { supplierId: supplier.id, externalSku: row.externalSku } },
    update: { name: row.name, lastSyncAt: new Date() },
    create: {
      supplierId: supplier.id,
      externalId: row.externalId,
      externalSku: row.externalSku,
      name: row.name,
      lastSyncAt: new Date(),
    },
  });

  // Producto interno
  let product = await prisma.product.findUnique({ where: { slug: `sur-${row.externalSku}` } });
  if (!product && supplierProduct.productId) {
    product = await prisma.product.findUnique({ where: { id: supplierProduct.productId } });
  }

  if (!product) {
    const friendlySlug = await getUniqueSlug(row.name);
    product = await prisma.product.create({
      data: {
        name: row.name,
        slug: friendlySlug,
        description: row.description || null,
        active: true,
        categories: { connect: [{ id: novedadesCategory.id }] },
      },
    });
  }

  // Vincular producto con supplierProduct
  if (supplierProduct.productId !== product.id) {
    await prisma.supplierProduct.update({
      where: { id: supplierProduct.id },
      data: { productId: product.id },
    });
  }

  // Procesar variantes
  for (const varRow of row.variants) {
    let variant = await prisma.productVariant.findFirst({
      where: { sku: varRow.sku, productId: product.id },
    });

    const finalPriceCents = calculateFinalPriceInCents(varRow.netPrice, exchangeRate, priceRules);
    const colorName = varRow.color?.name || "Sin color";
    const colorHex = varRow.color?.hexCode || null;

    if (!variant) {
      // Crear variante
      let mainImageUrl = null;
      if (varRow.images?.original) {
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        if (cloudName) {
          const encodedUrl = encodeURIComponent(varRow.images.original);
          mainImageUrl = `https://res.cloudinary.com/${cloudName}/image/fetch/${encodedUrl}`;
        } else {
          mainImageUrl = varRow.images.original;
        }
      }

      variant = await prisma.productVariant.create({
        data: {
          productId: product.id,
          sku: varRow.sku,
          colorName,
          colorHex,
          stock: varRow.stock,
          priceOverride: finalPriceCents,
        },
      });

      if (mainImageUrl) {
        await prisma.productImage.create({
          data: {
            productId: product.id,
            variantId: variant.id,
            url: mainImageUrl,
            alt: row.name,
            sort: 0,
          },
        });
      }
    } else {
      // Actualizar variante existente
      await prisma.productVariant.update({
        where: { id: variant.id },
        data: { stock: varRow.stock, colorName, colorHex, priceOverride: finalPriceCents },
      });
    }

    // Vincular supplierProduct con variant (si es necesario)
    await prisma.supplierProduct.update({
      where: { id: supplierProduct.id },
      data: { variantId: variant.id },
    });
  }
}

// --------------------------------------------------------------
// Función principal (cron)
// --------------------------------------------------------------
async function main() {
  const token = process.env.STOCKSUR_TOKEN;
  if (!token) throw new Error("❌ Falta STOCKSUR_TOKEN en variables de entorno");

  console.log("🚀 Iniciando sincronización con StockSur (script cron)...");

  const supplier = await ensureSupplier();
  const priceRules = await getPriceRules();
  const exchangeRate = await getExchangeRate();
  const novedadesCategory = await ensureNovedadesCategory();

  console.log(`💵 Tipo de cambio: ${exchangeRate}`);
  console.log(`📊 Reglas de precio: ${priceRules.length} rangos`);

  const rows = await fetchStockSurAll(token, "argentina");
  console.log(`📦 StockSur: recibidos ${rows.length} productos`);

  // Procesar en lotes de 25 con concurrencia 5 (para no saturar DB)
  const chunk = (arr, size) => {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  };
  const pLimit = (concurrency) => {
    const queue = [];
    let active = 0;
    const next = () => {
      active--;
      if (queue.length) queue.shift()();
    };
    return (fn) =>
      new Promise((resolve, reject) => {
        const run = async () => {
          active++;
          try {
            resolve(await fn());
          } catch (e) {
            reject(e);
          } finally {
            next();
          }
        };
        if (active < concurrency) run();
        else queue.push(run);
      });
  };

  const limit = pLimit(5);
  let done = 0;

  for (const pack of chunk(rows, 25)) {
    const results = await Promise.allSettled(
      pack.map((row) =>
        limit(() => upsertOneRow({ row, supplier, exchangeRate, priceRules, novedadesCategory }))
      )
    );
    for (const r of results) if (r.status === "fulfilled") done++;
    const failed = results.filter((r) => r.status === "rejected").length;
    console.log(`Progreso: ${done}/${rows.length} (fallos en este lote: ${failed})`);
    const firstErr = results.find((r) => r.status === "rejected");
    if (firstErr) throw firstErr.reason;
  }

  console.log("✅ Sincronización completada.");
}

// Ejecutar
main()
  .catch((e) => {
    console.error("❌ Error en sincronización:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
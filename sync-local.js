const { PrismaClient } = require('@prisma/client');
const { fetchStockSurPage } = require('./src/lib/suppliers/stocksur/client');
const prisma = new PrismaClient();

const LOTE = 20;
const PAUSA = 2000; // 2 segundos

// Obtener tipo de cambio y reglas de precio desde la base de datos
async function getExchangeRate() {
  const setting = await prisma.setting.findUnique({
    where: { key: "exchange_rate" },
  });
  return setting ? parseFloat(setting.value) : 1200;
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

function calculateFinalPriceInCents(priceUSD, exchangeRate, rules) {
  const rule = rules.find(r => priceUSD >= r.min && priceUSD <= r.max);
  const multiplier = rule ? rule.multiplier : 1.5;
  const priceARS = priceUSD * exchangeRate;
  const finalPrice = priceARS * multiplier;
  return Math.round(finalPrice * 100);
}

async function procesarLote(offset, limit, exchangeRate, rules) {
  console.log(`\n📦 Procesando lote offset=${offset}...`);
  const token = process.env.SS_AUTH_TOKEN;
  if (!token) throw new Error('❌ Falta SS_AUTH_TOKEN');
  const data = await fetchStockSurPage(token, 100, 1);
  const todos = data.products;
  const lote = todos.slice(offset, offset + limit);
  if (lote.length === 0) return 0;

  for (const row of lote) {
    // Buscar o crear producto
    let product = await prisma.product.findUnique({
      where: { slug: `sur-${row.externalSku}` }
    });
    if (!product) {
      product = await prisma.product.create({
        data: {
          name: row.name,
          slug: `sur-${row.externalSku}`,
          description: row.description || null,
          active: true,
        }
      });
      console.log(`✅ Creado: ${product.name} (${product.slug})`);
    }

    for (const v of row.variants) {
      // Calcular precio final
      const finalPriceCents = calculateFinalPriceInCents(v.netPrice, exchangeRate, rules);

      // Buscar o crear variante
      let variant = await prisma.productVariant.findFirst({
        where: { sku: v.sku, productId: product.id }
      });

      if (!variant) {
        variant = await prisma.productVariant.create({
          data: {
            productId: product.id,
            sku: v.sku,
            colorName: v.color?.name || 'Sin color',
            colorHex: v.color?.hexCode,
            stock: v.stock,
            priceOverride: finalPriceCents,
          }
        });
        console.log(`   🎨 Variante: ${v.sku} - ${v.color?.name || 'Sin color'} (${v.stock} uds.)`);

        // Guardar imagen principal (URL original, sin subir a Cloudinary)
        if (v.images.original) {
          await prisma.productImage.create({
            data: {
              productId: product.id,
              variantId: variant.id,
              url: v.images.original,
              alt: row.name,
              sort: 0,
            }
          });
        }
      } else {
        // Actualizar variante existente
        await prisma.productVariant.update({
          where: { id: variant.id },
          data: {
            stock: v.stock,
            priceOverride: finalPriceCents,
          }
        });
      }
    }
  }
  return lote.length;
}

async function main() {
  console.log('🚀 Iniciando sincronización con StockSur desde LOCAL...');

  // Obtener configuración de precios desde la base de datos
  const exchangeRate = await getExchangeRate();
  const priceRules = await getPriceRules();

  console.log(`💵 Tipo de cambio: ${exchangeRate}`);
  console.log(`📊 Reglas de precio: ${priceRules.length} rangos`);

  let offset = 0;
  let total = 0;
  while (offset < 5000) {
    const procesados = await procesarLote(offset, LOTE, exchangeRate, priceRules);
    if (procesados === 0) break;
    total += procesados;
    offset += LOTE;
    console.log(`⏳ Esperando ${PAUSA/1000}s...`);
    await new Promise(r => setTimeout(r, PAUSA));
  }
  console.log(`\n✅ Sincronización completada. Productos procesados: ${total}`);
  await prisma.$disconnect();
}

main().catch(e => {
  console.error('❌ Error:', e);
  process.exit(1);
});
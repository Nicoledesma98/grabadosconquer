import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Limpieza opcional (solo dev)
  await prisma.productImage.deleteMany();
  await prisma.priceTier.deleteMany();
  await prisma.supplierProduct.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.orderUpload.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.supplier.deleteMany();

  const supplier = await prisma.supplier.create({
    data: { name: "Proveedor Demo", code: "DEMO" },
  });
const categories = await prisma.category.createMany({
  data: [
    { slug: "mates-y-termos", name: "Mates y Termos" },
    { slug: "escritura", name: "Escritura" },
    { slug: "vasos-y-botellas", name: "Vasos y Botellas" },
    { slug: "accesorios", name: "Accesorios" },
  ],
  skipDuplicates: true,
});

const cats = await prisma.category.findMany();
const catBySlug = new Map(cats.map((c) => [c.slug, c]));

  const products = [
    {
      slug: "mate-acero-500",
      name: "Mate de Acero 500ml",
      description: "Mate de acero inoxidable, ideal para grabado.",
      basePrice: 12000,
      images: [{ url: "https://via.placeholder.com/600", alt: "Mate acero" }],
      tiers: [
        { minQty: 1, price: 12000 },
        { minQty: 10, price: 11000 },
        { minQty: 25, price: 10000 },
      ],
      externalSku: "MATE500",
      stock: 120,
      supplierPrice: 9500,
      categorySlugs: ["mates-y-termos", "accesorios"],
    },
    {
      slug: "termo-1l",
      name: "Termo 1L",
      description: "Termo 1 litro, apto grabado.",
      basePrice: 25000,
      images: [{ url: "https://via.placeholder.com/600", alt: "Termo" }],
      tiers: [
        { minQty: 1, price: 25000 },
        { minQty: 6, price: 23500 },
      ],
      externalSku: "TERMO1L",
      stock: 60,
      supplierPrice: 21000,
      categorySlugs: ["mates-y-termos"],
    },
    {
      slug: "lapicera-metal",
      name: "Lapicera Metálica",
      description: "Lapicera metálica con grabado láser.",
      basePrice: 3200,
      images: [{ url: "https://via.placeholder.com/600", alt: "Lapicera" }],
      tiers: [
        { minQty: 1, price: 3200 },
        { minQty: 50, price: 2800 },
        { minQty: 100, price: 2500 },
      ],
      externalSku: "LAPI-MET",
      stock: 500,
      supplierPrice: 2200,
      categorySlugs: ["escritura", "accesorios"],
    },
  ];

  for (const p of products) {
    const created = await prisma.product.create({
  data: {
    slug: p.slug,
    name: p.name,
    description: p.description,
    basePrice: p.basePrice,
    images: { create: p.images },
    priceTiers: { create: p.tiers },
    supplierMap: {
      create: {
        supplierId: supplier.id,
        externalSku: p.externalSku,
        supplierStock: p.stock,
        supplierPrice: p.supplierPrice,
        lastSyncAt: new Date(),
      },
    },
    categories: {
  connect: p.categorySlugs.map((slug: string) => ({ slug })),
},
  },
});

    console.log("Created product:", created.slug);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

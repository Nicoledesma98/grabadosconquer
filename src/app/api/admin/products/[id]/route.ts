import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function normalizeMinQtyStep(v: any) {
  const n = Number(v);
  return [1,5,10].includes(n) ? n:1;
}

function toSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

// ✅ métodos válidos (coinciden con tu enum de Prisma)
const ALLOWED_METHODS = ["DTF", "DTG", "FULL_COLOR", "LASER"] as const;
type PersonalizationMethod = (typeof ALLOWED_METHODS)[number];

function normalizeAllowedMethods(input: any): PersonalizationMethod[] {
  if (!Array.isArray(input)) return [];
  // filtramos solo valores válidos y evitamos duplicados
  const set = new Set<PersonalizationMethod>();
  for (const v of input) {
    if (ALLOWED_METHODS.includes(v)) set.add(v);
  }
  return Array.from(set);
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: { sort: "asc" } },
      priceTiers: { orderBy: { minQty: "asc" } },
      categories: { orderBy: { name: "asc" } },
      variants: { orderBy: { createdAt: "asc" } }, // (opcional) si lo necesitás en admin
    },
  });

  if (!product) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // ✅ ya viene allowedMethods porque está en Product
  return Response.json(product);
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  
  const { id } = await ctx.params;
  const body = await req.json();
  console.log("PATCH body recibido:", body);

  const name = String(body.name ?? "").trim();
  const slugRaw = String(body.slug ?? "").trim();
  const description = body.description ? String(body.description).trim() : null;

  const basePrice =
    body.basePrice === "" || body.basePrice == null ? null : Number(body.basePrice);
   let stock: number | null = null;
  if (body.stock !== undefined && body.stock !== "") {
    const parsed = Number(body.stock);
    if (!Number.isInteger(parsed) || parsed < 0) {
      return Response.json({ error: "El stock debe ser un número entero ≥ 0" }, { status: 400 });
    }
    stock = parsed;
  } else if (body.stock === "") {
    stock = null; // vacío = sin stock / no gestionado
  }

  // Validación: si el producto tiene variantes, el stock debe ser null
  const product = await prisma.product.findUnique({
    where: { id },
    include: { variants: { select: { id: true } } },
  });
  if (!product) return Response.json({ error: "Not found" }, { status: 404 });

  const hasVariants = product.variants.length > 0;
  if (hasVariants) {
    stock = null
  }
  const active = body.active !== false;
  const minQtyStep = normalizeMinQtyStep(body.minQtyStep);
  const imageUrl = body.imageUrl ? String(body.imageUrl).trim() : "";
  const categoryIds: string[] = Array.isArray(body.categoryIds) ? body.categoryIds : [];

  // ✅ NUEVO
  const allowedMethods = normalizeAllowedMethods(body.allowedMethods);

  if (!name) return Response.json({ error: "Name is required" }, { status: 400 });

  const slug = slugRaw ? toSlug(slugRaw) : toSlug(name);
  if (!slug) return Response.json({ error: "Invalid slug" }, { status: 400 });

  if (basePrice != null && (!Number.isFinite(basePrice) || basePrice < 0)) {
    return Response.json({ error: "Invalid basePrice" }, { status: 400 });
  }

  // slug único (si cambia)
  const current = await prisma.product.findUnique({ where: { id }, select: { slug: true } });
  if (!current) return Response.json({ error: "Not found" }, { status: 404 });

  if (current.slug !== slug) {
    const exists = await prisma.product.findUnique({ where: { slug } });
    if (exists) return Response.json({ error: "Slug already exists" }, { status: 409 });
  }

  // id de la primera imagen (si existe) para el upsert
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
      description,
      basePrice: basePrice == null ? null : Math.round(basePrice),
      active,
      stock: hasVariants ? null : stock,
      // ✅ NUEVO: guardamos métodos permitidos
      allowedMethods,

      // Reemplazamos categorías por las seleccionadas
      categories: { set: categoryIds.map((cid) => ({ id: cid })) },

      // Imagen: si mandás URL y no hay imagenes, crea 1. Si ya hay, actualiza la primera.
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
    select: { id: true, allowedMethods: true, stock: true }, // ✅ devolvemos para confirmar
  });
    console.log("Producto actualizado:", updated);
  return Response.json(updated);
}
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Verificar si el producto tiene pedidos
  const used = await prisma.orderItem.findFirst({
    where: { productId: id },
    select: { id: true },
  });

  if (used) {
    return Response.json(
      { error: "Este producto ya tiene pedidos. En vez de borrarlo, desactivalo." },
      { status: 409 }
    );
  }

  // Borrar en cascada
  await prisma.productImage.deleteMany({ where: { productId: id } });
  await prisma.priceTier.deleteMany({ where: { productId: id } });
  await prisma.supplierProduct.deleteMany({ where: { productId: id } });
  await prisma.product.update({
    where: { id },
    data: { categories: { set: [] } },
  });
  await prisma.product.delete({ where: { id } });

  return Response.json({ ok: true });
}
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function toSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: { sort: "asc" } },
      priceTiers: { orderBy: { minQty: "asc" } },
      categories: { orderBy: { name: "asc" } },
    },
  });

  if (!product) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json(product);
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json();

  const name = String(body.name ?? "").trim();
  const slugRaw = String(body.slug ?? "").trim();
  const description = body.description ? String(body.description).trim() : null;

  const basePrice =
    body.basePrice === "" || body.basePrice == null ? null : Number(body.basePrice);

  const active = body.active !== false;

  const imageUrl = body.imageUrl ? String(body.imageUrl).trim() : "";
  const categoryIds: string[] = Array.isArray(body.categoryIds) ? body.categoryIds : [];

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

  const updated = await prisma.product.update({
    where: { id },
    data: {
      name,
      slug,
      description,
      basePrice: basePrice == null ? null : Math.round(basePrice),
      active,

      // Reemplazamos categorías por las seleccionadas
      categories: { set: categoryIds.map((cid) => ({ id: cid })) },

      // Imagen: si mandás URL y no hay imagenes, crea 1. Si ya hay, actualiza la primera.
      ...(imageUrl
        ? {
            images: {
              upsert: [
                {
                  where: { id: (await prisma.productImage.findFirst({ where: { productId: id }, select: { id: true } }))?.id ?? "__nope__" },
                  update: { url: imageUrl, alt: name },
                  create: { url: imageUrl, alt: name, sort: 0 },
                },
              ],
            },
          }
        : {}),
    },
    select: { id: true },
  });

  return Response.json(updated);
}

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function toSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(req: Request) {
  const body = await req.json();

  const name = String(body.name ?? "").trim();
  const slugRaw = String(body.slug ?? "").trim();
  const description = body.description ? String(body.description).trim() : null;

  const basePrice =
    body.basePrice === "" || body.basePrice == null
      ? null
      : Number(body.basePrice);

  const active = body.active !== false;

  const imageUrl = body.imageUrl ? String(body.imageUrl).trim() : "";
  const categoryIds: string[] = Array.isArray(body.categoryIds) ? body.categoryIds : [];

  if (!name) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }

  const slug = slugRaw ? toSlug(slugRaw) : toSlug(name);

  if (!slug) {
    return Response.json({ error: "Invalid slug" }, { status: 400 });
  }

  if (basePrice != null && (!Number.isFinite(basePrice) || basePrice < 0)) {
    return Response.json({ error: "Invalid basePrice" }, { status: 400 });
  }

  // slug único
  const exists = await prisma.product.findUnique({ where: { slug } });
  if (exists) {
    return Response.json({ error: "Slug already exists" }, { status: 409 });
  }

  const product = await prisma.product.create({
    data: {
      name,
      slug,
      description,
      basePrice: basePrice == null ? null : Math.round(basePrice),
      active,
      images: imageUrl
        ? { create: [{ url: imageUrl, alt: name, sort: 0 }] }
        : undefined,
      categories: categoryIds.length
        ? { connect: categoryIds.map((id) => ({ id })) }
        : undefined,
    },
    select: { id: true },
  });

  return Response.json({ id: product.id });
}
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  // Si el producto está referenciado por items de pedidos, no lo vamos a borrar para no romper historial.
  // Mejor: desactivarlo.
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

  // Borrado en orden: images/tiers/supplierMap/etc (por cascada o manual)
  await prisma.productImage.deleteMany({ where: { productId: id } });
  await prisma.priceTier.deleteMany({ where: { productId: id } });
  await prisma.supplierProduct.deleteMany({ where: { productId: id } });

  // desconectar categorías (si hay many-to-many)
  await prisma.product.update({
    where: { id },
    data: { categories: { set: [] } },
  });

  await prisma.product.delete({ where: { id } });

  return Response.json({ ok: true });
}

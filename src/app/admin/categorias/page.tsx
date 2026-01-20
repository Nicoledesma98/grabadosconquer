import { prisma } from "@/lib/prisma";
import CategoriesAdminClient from "./categories-admin-client";

export const runtime = "nodejs";

export default async function AdminCategoriasPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    // Si esto te rompe por nombres de relación, borrá el include:
    include: { _count: { select: { products: true } } },
  });

  return <CategoriesAdminClient initialCategories={categories as any} />;
}

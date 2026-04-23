import { prisma } from "@/lib/prisma";
import CategoriesAdminClient from "./categories-admin-client";

export const runtime = "nodejs";

export default async function AdminCategoriasPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: {
      parent: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      children: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
        orderBy: { name: "asc" },
      },
      _count: {
        select: {
          products: true,
        },
      },
    },
  });

  return <CategoriesAdminClient initialCategories={categories as any} />;
}
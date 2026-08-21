import { prisma } from "@/lib/prisma";
import HomeSlider from "@/components/HomeSlider";
import HomeBenefits from "@/components/HomeBenefits";
import HomeFeatured from "@/components/HomeFeatured";
import HomeCategories from "@/components/HomeCategories";

export const revalidate = 60;
export const runtime = "nodejs";

export default async function HomePage() {
  // 🔥 Categorías dinámicas desde la base de datos
const categories = await prisma.category.findMany({
  where: { active: true },
  orderBy: { name: "asc" },
  select: {
    slug: true,
    name: true,
    image: true,
    parentId: true,
  },
});

  const slides = await prisma.homeSlide.findMany({
    where: { active: true },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      imageUrl: true,
      title: true,
      subtitle: true,
      primaryLabel: true,
      primaryUrl: true,
      secondaryLabel: true,
      secondaryUrl: true,
    },
  });

  return (
    <main className="py-8">
      <div className="w-full">
        <HomeSlider slides={slides} />
      </div>
      <HomeBenefits />
      <div className="mx-auto max-w-6xl px-4">
        {/* 👇 Usamos el componente con las categorías reales */}
        <HomeCategories categories={categories} />
        <HomeFeatured />
      </div>
    </main>
  );
}
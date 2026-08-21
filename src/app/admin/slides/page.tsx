import { prisma } from "@/lib/prisma";
import SlidesAdminClient from "./slides-admin-client";

export const runtime = "nodejs";

export default async function AdminSlidesPage() {
  const slides = await prisma.homeSlide.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  return <SlidesAdminClient initialSlides={slides} />;
}

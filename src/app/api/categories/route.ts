import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
    const categories = await prisma.category.findMany({
        orderBy: { name: "asc" },
        select: { id: true, slug: true, name: true },        
    });

    return Response.json(categories, {
        headers: {
            "Cache-Control":"no-store",
        },
    });
    
}
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

function sanitizeFilename(name: string) {
  return name.replace(/[\/\\:*?"<>|]/g, "_").trim();
}

function buildAbsoluteUrl(req: NextRequest, rawUrl: string) {
  if (/^https?:\/\//i.test(rawUrl)) return rawUrl;

  const origin =
    process.env.APP_URL ||
    `${req.nextUrl.protocol}//${req.headers.get("host")}`;

  return new URL(rawUrl, origin).toString();
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const role = (token as any)?.role;

  if (!token || !["ADMIN", "VENTAS"].includes(role)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;

  const upload = await prisma.orderUpload.findUnique({
    where: { id },
  });

  if (!upload || !upload.url) {
    return Response.json({ error: "Archivo no encontrado" }, { status: 404 });
  }

  const fileUrl = buildAbsoluteUrl(req, upload.url);

  const upstream = await fetch(fileUrl);

  if (!upstream.ok) {
    return Response.json(
      { error: "No se pudo obtener el archivo remoto" },
      { status: 502 }
    );
  }

  const contentType =
    upstream.headers.get("content-type") || "application/octet-stream";

  const originalName = sanitizeFilename(
    upload.originalName || `archivo-${upload.id}`
  );

  const arrayBuffer = await upstream.arrayBuffer();

  return new Response(arrayBuffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${originalName}"`,
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}
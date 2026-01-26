import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

export const runtime = "nodejs";

export async function POST(req: Request) {
    const body = await req.json();
    const name = String(body.name ?? "").trim() || null;
    const email = String(body.email ?? "").toLowerCase().trim();
    const password = String(body.password ?? "");

    if(!email || !password || password.length < 6) {
        return Response.json(
            { error: "Email y contraseña (minimo 6 caracteres) requeridos." },
            { status:400 }
        );
    }

    const exists = await prisma.user.findUnique({ where: { email }});
    if (exists) {
        return Response.json({ error: "Ese email ya esta registrado. "}, { status: 409});
    }

    const hash = await bcrypt.hash(password, 10);
    await prisma.user.create({
        data: {
            email,
            password: hash,
            name,
            role: "CUSTOMER",
        },
    });
    return Response.json({ ok: true});
}
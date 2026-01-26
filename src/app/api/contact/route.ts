import { NextRequest } from "next/server";
import { sendMail } from "@/lib/mailer";

export const runtime = "nodejs";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  const subject = String(body.subject ?? "Consulta").trim();
  const message = String(body.message ?? "").trim();

  if (!name || !email || !message) {
    return Response.json({ error: "Completá nombre, email y mensaje." }, { status: 400 });
  }

  const toInternal =
    process.env.MAIL_CONTACT_TO ||
    process.env.MAIL_INTERNAL_TO ||
    process.env.MAIL_FROM;

  if (!toInternal) {
    return Response.json(
      { error: "Falta configurar MAIL_CONTACT_TO / MAIL_INTERNAL_TO / MAIL_FROM." },
      { status: 500 }
    );
  }

  const logo = process.env.MAIL_LOGO_URL || "";
  const brand = {
    navy: "#3D3758",
    pink: "#FCE1E1",
    turq: "#1ABCCA",
    orange: "#F26E47",
  };

  // 1) Mail interno (a vos)
  const internalHtml = `
    <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;padding:24px;">
      ${logo ? `<img src="${logo}" alt="Grabados Conquer" style="height:56px;display:block;margin-bottom:16px;" />` : ""}

      <div style="background:${brand.pink};padding:14px 16px;border-radius:16px;color:${brand.navy};">
        <div style="font-size:18px;font-weight:800;">Nuevo mensaje de Contacto</div>
        <div style="margin-top:6px;font-size:14px;">Motivo: <b>${esc(subject)}</b></div>
      </div>

      <div style="margin-top:16px;color:${brand.navy};">
        <p style="margin:8px 0;"><b>Nombre:</b> ${esc(name)}</p>
        <p style="margin:8px 0;"><b>Email:</b> ${esc(email)}</p>
        <p style="margin:8px 0;"><b>Teléfono:</b> ${phone ? esc(phone) : "-"}</p>

        <div style="margin-top:14px;padding:14px 16px;border:1px solid ${brand.pink};border-radius:16px;">
          <div style="font-weight:800;margin-bottom:8px;">Mensaje</div>
          <div style="white-space:pre-wrap;line-height:1.5;">${esc(message)}</div>
        </div>

        <div style="margin-top:14px;">
          <a href="mailto:${encodeURIComponent(email)}"
             style="display:inline-block;background:${brand.turq};color:#fff;text-decoration:none;padding:10px 14px;border-radius:14px;font-weight:700;">
            Responder al cliente
          </a>
        </div>
      </div>

      <div style="margin-top:18px;color:#777;font-size:12px;">
        Grabados Conquer • Formulario de contacto
      </div>
    </div>
  `;

  // 2) Auto-reply al cliente
  const customerHtml = `
    <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;padding:24px;">
      ${logo ? `<img src="${logo}" alt="Grabados Conquer" style="height:56px;display:block;margin-bottom:16px;" />` : ""}

      <div style="background:${brand.pink};padding:14px 16px;border-radius:16px;color:${brand.navy};">
        <div style="font-size:18px;font-weight:800;">¡Recibimos tu mensaje! ✅</div>
        <div style="margin-top:6px;font-size:14px;">
          Gracias ${esc(name)}. Te respondemos a la brevedad.
        </div>
      </div>

      <div style="margin-top:16px;color:${brand.navy};">
        <p style="margin:10px 0;">
          <b>Resumen:</b> ${esc(subject)}
        </p>

        <div style="margin-top:10px;padding:14px 16px;border:1px solid ${brand.pink};border-radius:16px;">
          <div style="font-weight:800;margin-bottom:8px;">Tu mensaje</div>
          <div style="white-space:pre-wrap;line-height:1.5;color:${brand.navy};">${esc(message)}</div>
        </div>

        <div style="margin-top:14px;padding:14px 16px;border-radius:16px;background:#fff;border:1px solid ${brand.pink};">
          <div style="font-weight:800;margin-bottom:6px;">Contacto rápido</div>
          <div style="font-size:14px;color:${brand.navy};">
            WhatsApp: <b>11 3100 2011</b>
          </div>
        </div>

        <div style="margin-top:14px;color:#777;font-size:12px;">
          Este es un mensaje automático. Si necesitás agregar algo, respondé a este correo.
        </div>
      </div>
    </div>
  `;

  try {
    // interno + replyTo al cliente
    await sendMail({
      to: String(toInternal),
      subject: `📩 Contacto (${subject}) — ${name}`,
      html: internalHtml,
      replyTo: email,
    });

    // auto-reply al cliente (replyTo al mail del negocio)
    await sendMail({
      to: email,
      subject: `Recibimos tu mensaje — Grabados Conquer`,
      html: customerHtml,
      replyTo: process.env.MAIL_FROM!,
    });

    return Response.json({ ok: true });
  } catch (e) {
    console.error("MAIL_CONTACT_ERROR", e);
    return Response.json({ error: "No se pudo enviar el mensaje." }, { status: 500 });
  }
}

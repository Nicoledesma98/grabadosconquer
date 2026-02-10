import { NextRequest, NextResponse } from "next/server";
import { sendMail } from "@/lib/mailer";

export const runtime = "nodejs";

// Expresiones regulares para validación
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[\d\s\-\+\(\)]{6,30}$/;

// Configuración de límites
const LIMITS = {
  name: { min: 2, max: 100 },
  email: { max: 150 },
  phone: { min: 8, max: 30 },
  subject: { min: 3, max: 100 },
  message: { min: 10, max: 2000 },
} as const;

// Honeypot field (protección contra bots)
const HONEYPOT_FIELD = "honeypot";

// Rate limiting simple en memoria
const rateLimit = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutos
const RATE_LIMIT_MAX = 5; // 5 solicitudes por ventana

// Función para sanitizar texto
function sanitizeText(text: string): string {
  return text
    .trim()
    .replace(/[<>]/g, "") // Prevenir XSS
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Función para escapar HTML (para emails)
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(req: NextRequest) {
  try {
    // 1. Rate limiting por IP - CORRECCIÓN AQUÍ
    const forwardedFor = req.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown';
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW;
    
    // Limpiar entradas antiguas
    for (const [key, value] of rateLimit.entries()) {
      if (value.timestamp < windowStart) {
        rateLimit.delete(key);
      }
    }
    
    const clientData = rateLimit.get(ip);
    if (clientData && clientData.count >= RATE_LIMIT_MAX) {
      return NextResponse.json(
        { 
          error: "Demasiadas solicitudes. Por favor, espera unos minutos antes de intentar nuevamente.",
          code: "RATE_LIMIT"
        },
        { status: 429 }
      );
    }
    
    // Incrementar contador
    const newCount = clientData ? clientData.count + 1 : 1;
    rateLimit.set(ip, { count: newCount, timestamp: now });

    // 2. Parsear JSON
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Formato de datos inválido" },
        { status: 400 }
      );
    }

    // 3. Validar honeypot
    if (body[HONEYPOT_FIELD] && body[HONEYPOT_FIELD].trim() !== "") {
      // Si el honeypot está lleno, es probablemente un bot
      console.log("Posible bot detectado por honeypot");
      return NextResponse.json(
        { success: true }, // Engañamos al bot
        { status: 200 }
      );
    }

    // 4. Extraer y validar datos
    const name = sanitizeText(String(body.name ?? ""));
    const email = String(body.email ?? "").toLowerCase().trim();
    const phone = sanitizeText(String(body.phone ?? ""));
    const subject = sanitizeText(String(body.subject ?? "Consulta"));
    const message = sanitizeText(String(body.message ?? ""));

    // Validaciones
    const errors: Record<string, string> = {};

    if (!name || name.length < LIMITS.name.min) {
      errors.name = `El nombre debe tener al menos ${LIMITS.name.min} caracteres`;
    } else if (name.length > LIMITS.name.max) {
      errors.name = `El nombre no puede exceder ${LIMITS.name.max} caracteres`;
    }

    if (!email) {
      errors.email = "El email es requerido";
    } else if (!EMAIL_REGEX.test(email)) {
      errors.email = "Por favor ingresa un email válido";
    } else if (email.length > LIMITS.email.max) {
      errors.email = `El email no puede exceder ${LIMITS.email.max} caracteres`;
    }

    if (phone && !PHONE_REGEX.test(phone)) {
      errors.phone = "Formato de teléfono inválido";
    }

    if (!subject || subject.length < LIMITS.subject.min) {
      errors.subject = `El asunto debe tener al menos ${LIMITS.subject.min} caracteres`;
    }

    if (!message || message.length < LIMITS.message.min) {
      errors.message = `El mensaje debe tener al menos ${LIMITS.message.min} caracteres`;
    } else if (message.length > LIMITS.message.max) {
      errors.message = `El mensaje no puede exceder ${LIMITS.message.max} caracteres`;
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { 
          error: "Errores de validación",
          errors,
          message: "Por favor, corrige los errores en el formulario"
        },
        { status: 400 }
      );
    }

    // 5. Verificar configuración de email
    const toInternal =
      process.env.MAIL_CONTACT_TO ||
      process.env.MAIL_INTERNAL_TO ||
      process.env.MAIL_FROM;

    if (!toInternal || !process.env.MAIL_FROM) {
      console.error("Configuración de email faltante");
      return NextResponse.json(
        { error: "Error de configuración del servidor" },
        { status: 500 }
      );
    }

    // 6. Preparar emails
    const logo = process.env.MAIL_LOGO_URL || "";
    const brand = {
      navy: "#3D3758",
      pink: "#FCE1E1",
      turq: "#1ABCCA",
      orange: "#F26E47",
    };

    const internalHtml = `
      <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;padding:24px;">
        ${logo ? `<img src="${logo}" alt="Grabados Conquer" style="height:56px;display:block;margin-bottom:16px;" />` : ""}
  
        <div style="background:${brand.pink};padding:14px 16px;border-radius:16px;color:${brand.navy};">
          <div style="font-size:18px;font-weight:800;">📩 Nuevo mensaje de Contacto</div>
          <div style="margin-top:6px;font-size:14px;">
            <strong>Motivo:</strong> ${escapeHtml(subject)}<br>
            <strong>IP:</strong> ${ip} | <strong>Hora:</strong> ${new Date().toLocaleString('es-AR')}
          </div>
        </div>
  
        <div style="margin-top:16px;color:${brand.navy};">
          <p style="margin:8px 0;"><strong>Nombre:</strong> ${escapeHtml(name)}</p>
          <p style="margin:8px 0;"><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p style="margin:8px 0;"><strong>Teléfono:</strong> ${phone ? escapeHtml(phone) : "-"}</p>
  
          <div style="margin-top:14px;padding:14px 16px;border:1px solid ${brand.pink};border-radius:16px;">
            <div style="font-weight:800;margin-bottom:8px;">Mensaje</div>
            <div style="white-space:pre-wrap;line-height:1.5;">${escapeHtml(message)}</div>
          </div>
  
          <div style="margin-top:14px;display:flex;gap:10px;">
            <a href="mailto:${encodeURIComponent(email)}"
               style="display:inline-block;background:${brand.turq};color:#fff;text-decoration:none;padding:10px 14px;border-radius:14px;font-weight:700;">
              ✉️ Responder al cliente
            </a>
            ${phone ? `
            <a href="tel:${encodeURIComponent(phone.replace(/\s/g, ''))}"
               style="display:inline-block;background:${brand.orange};color:#fff;text-decoration:none;padding:10px 14px;border-radius:14px;font-weight:700;">
              📞 Llamar al cliente
            </a>` : ''}
          </div>
        </div>
  
        <div style="margin-top:18px;color:#777;font-size:12px;">
          Grabados Conquer • Formulario de contacto • ${new Date().toLocaleDateString('es-AR')}
        </div>
      </div>
    `;

    const customerHtml = `
      <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;padding:24px;">
        ${logo ? `<img src="${logo}" alt="Grabados Conquer" style="height:56px;display:block;margin-bottom:16px;" />` : ""}
  
        <div style="background:${brand.pink};padding:14px 16px;border-radius:16px;color:${brand.navy};">
          <div style="font-size:18px;font-weight:800;">✅ ¡Recibimos tu mensaje!</div>
          <div style="margin-top:6px;font-size:14px;">
            Gracias ${escapeHtml(name)}. Te responderemos a la brevedad.
          </div>
        </div>
  
        <div style="margin-top:16px;color:${brand.navy};">
          <p style="margin:10px 0;">
            <strong>Resumen de tu consulta:</strong> ${escapeHtml(subject)}
          </p>
  
          <div style="margin-top:10px;padding:14px 16px;border:1px solid ${brand.pink};border-radius:16px;">
            <div style="font-weight:800;margin-bottom:8px;">Tu mensaje</div>
            <div style="white-space:pre-wrap;line-height:1.5;color:${brand.navy};">${escapeHtml(message)}</div>
          </div>
  
          <div style="margin-top:14px;padding:14px 16px;border-radius:16px;background:#fff;border:1px solid ${brand.pink};">
            <div style="font-weight:800;margin-bottom:8px;">📞 Contacto directo</div>
            <div style="font-size:14px;color:${brand.navy};">
              <p style="margin:6px 0;"><strong>Email:</strong> ${process.env.MAIL_FROM}</p>
              <p style="margin:6px 0;"><strong>WhatsApp:</strong> 11 3100 2011</p>
              <p style="margin:6px 0;color:#666;">Horario: Lunes a Viernes de 9:00 a 18:00</p>
            </div>
          </div>
  
          <div style="margin-top:14px;padding:12px;background:#f0f9ff;border-radius:12px;border-left:4px solid ${brand.turq};">
            <p style="margin:0;font-size:13px;color:${brand.navy};">
              <strong>¿Tienes un pedido existente?</strong><br>
              Por favor, incluye tu número de pedido en la respuesta para una atención más rápida.
            </p>
          </div>
        </div>
  
        <div style="margin-top:18px;color:#777;font-size:12px;">
          Este es un mensaje automático. Si necesitás agregar algo, respondé a este correo.
        </div>
      </div>
    `;

    // 7. Enviar emails
    try {
      await Promise.all([
        sendMail({
          to: String(toInternal),
          subject: `📩 Contacto: ${subject} — ${name}`,
          html: internalHtml,
          replyTo: email,
        }),
        sendMail({
          to: email,
          subject: `✅ Recibimos tu mensaje — Grabados Conquer`,
          html: customerHtml,
          replyTo: process.env.MAIL_FROM,
        })
      ]);

      return NextResponse.json(
        { 
          success: true, 
          message: "Mensaje enviado correctamente",
          timestamp: new Date().toISOString()
        },
        { status: 200 }
      );

    } catch (mailError) {
      console.error("Error enviando email:", mailError);
      return NextResponse.json(
        { 
          error: "No se pudo enviar el mensaje. Por favor, intenta nuevamente más tarde.",
          code: "MAIL_ERROR"
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Error en contacto:", error);
    return NextResponse.json(
      { 
        error: "Error interno del servidor. Por favor, intenta nuevamente.",
        code: "INTERNAL_ERROR"
      },
      { status: 500 }
    );
  }
}

// Método OPTIONS para CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
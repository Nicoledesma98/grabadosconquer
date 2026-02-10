// app/api/auth/register/route.ts
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { NextResponse } from "next/server";

// Expresiones regulares para validación (coinciden con frontend)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{6,}$/;

// Tipos para errores
type ValidationError = {
  field: string;
  message: string;
};

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    // 1. Parsear y validar JSON
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Cuerpo de la solicitud inválido (JSON requerido)" },
        { status: 400 }
      );
    }

    // 2. Extraer y sanitizar datos
    const name = String(body.name ?? "").trim() || null;
    const email = String(body.email ?? "").toLowerCase().trim();
    const password = String(body.password ?? "");

    // 3. Validaciones detalladas
    const errors: ValidationError[] = [];

    // Validar email
    if (!email) {
      errors.push({ field: "email", message: "El email es requerido" });
    } else if (!EMAIL_REGEX.test(email)) {
      errors.push({ field: "email", message: "Por favor ingresa un email válido" });
    } else if (email.length > 100) {
      errors.push({ field: "email", message: "El email no puede exceder 100 caracteres" });
    }

    // Validar contraseña
    if (!password) {
      errors.push({ field: "password", message: "La contraseña es requerida" });
    } else if (password.length < 6) {
      errors.push({ field: "password", message: "La contraseña debe tener al menos 6 caracteres" });
    } else if (password.length > 50) {
      errors.push({ field: "password", message: "La contraseña no puede exceder 50 caracteres" });
    } else if (!PASSWORD_REGEX.test(password)) {
      // Validación detallada de contraseña
      if (!/[A-Z]/.test(password)) {
        errors.push({ field: "password", message: "La contraseña debe contener al menos una letra mayúscula" });
      } else if (!/[a-z]/.test(password)) {
        errors.push({ field: "password", message: "La contraseña debe contener al menos una letra minúscula" });
      } else if (!/\d/.test(password)) {
        errors.push({ field: "password", message: "La contraseña debe contener al menos un número" });
      } else {
        errors.push({ field: "password", message: "La contraseña no cumple con los requisitos de seguridad" });
      }
    }

    // Validar nombre (si se proporciona)
    if (name !== null) {
      if (name.length < 2) {
        errors.push({ field: "name", message: "El nombre debe tener al menos 2 caracteres" });
      } else if (name.length > 50) {
        errors.push({ field: "name", message: "El nombre no puede exceder 50 caracteres" });
      }
      // Validar que solo contenga letras y espacios básicos
      if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(name)) {
        errors.push({ field: "name", message: "El nombre solo puede contener letras y espacios" });
      }
    }

    // 4. Si hay errores, retornarlos
    if (errors.length > 0) {
      return NextResponse.json(
        { 
          error: "Errores de validación", 
          errors,
          message: errors.map(e => e.message).join(". ") 
        },
        { status: 400 }
      );
    }

    // 5. Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({ 
      where: { email },
      select: { id: true } // Solo necesitamos el ID para verificar
    });
    
    if (existingUser) {
      return NextResponse.json(
        { 
          error: "Este email ya está registrado",
          field: "email",
          message: "Ya existe una cuenta con este email. ¿Olvidaste tu contraseña?" 
        },
        { status: 409 }
      );
    }

    // 6. Hashear contraseña (con manejo de errores)
    let hash;
    try {
      hash = await bcrypt.hash(password, 12); // Aumentamos el saltRounds para mayor seguridad
    } catch (hashError) {
      console.error("Error al hashear contraseña:", hashError);
      return NextResponse.json(
        { error: "Error interno al procesar la contraseña" },
        { status: 500 }
      );
    }

    // 7. Crear usuario en la base de datos
    try {
      await prisma.user.create({
        data: {
          email,
          password: hash,
          name,
          role: "CUSTOMER",
          // Campos adicionales útiles
          emailVerified: new Date(), // Si tienes verificación de email, ajusta esto
          createdAt: new Date(),
        },
      });
    } catch (dbError) {
      console.error("Error al crear usuario:", dbError);
      
      // Manejar errores específicos de la base de datos
      if (dbError instanceof Error && dbError.message.includes("Unique constraint")) {
        return NextResponse.json(
          { error: "Este email ya está registrado" },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: "Error al crear la cuenta. Por favor, intenta nuevamente." },
        { status: 500 }
      );
    }

    // 8. Retornar éxito (sin datos sensibles)
    return NextResponse.json(
      { 
        success: true, 
        message: "Cuenta creada exitosamente",
        user: { email, name } // No retornar hash ni datos sensibles
      },
      { status: 201 }
    );

  } catch (error) {
    // 9. Manejo de errores inesperados
    console.error("Error inesperado en registro:", error);
    
    return NextResponse.json(
      { 
        error: "Error interno del servidor",
        message: "Ocurrió un error inesperado. Por favor, intenta más tarde." 
      },
      { status: 500 }
    );
  }
}

// Opcional: Método OPTIONS para CORS (si necesitas)
export async function OPTIONS() {
  return NextResponse.json({}, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
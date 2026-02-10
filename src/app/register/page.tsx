// src/app/register/page.tsx
"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import { Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";

// Expresiones regulares para validación
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{6,}$/;

type FormErrors = {
  name?: string;
  email?: string;
  password?: string;
  general?: string;
};

type PasswordValidation = {
  length: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
};

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
  });
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidation>({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
  });

  // Validar contraseña en tiempo real
  useEffect(() => {
    const validation: PasswordValidation = {
      length: formData.password.length >= 6,
      uppercase: /[A-Z]/.test(formData.password),
      lowercase: /[a-z]/.test(formData.password),
      number: /\d/.test(formData.password),
    };
    setPasswordValidation(validation);
  }, [formData.password]);

  // Validar campos individuales
  const validateField = useCallback((name: keyof typeof formData, value: string) => {
    const newErrors = { ...errors };
    
    switch (name) {
      case "name":
        if (value.trim().length > 0 && value.trim().length < 2) {
          newErrors.name = "El nombre debe tener al menos 2 caracteres";
        } else if (value.length > 50) {
          newErrors.name = "El nombre no puede exceder 50 caracteres";
        } else {
          delete newErrors.name;
        }
        break;
        
      case "email":
        if (!value.trim()) {
          newErrors.email = "El email es requerido";
        } else if (!EMAIL_REGEX.test(value)) {
          newErrors.email = "Por favor ingresa un email válido";
        } else {
          delete newErrors.email;
        }
        break;
        
      case "password":
        if (!value.trim()) {
          newErrors.password = "La contraseña es requerida";
        } else if (!PASSWORD_REGEX.test(value)) {
          if (value.length < 6) {
            newErrors.password = "La contraseña debe tener al menos 6 caracteres";
          } else if (!/(?=.*[A-Z])/.test(value)) {
            newErrors.password = "Debe contener al menos una mayúscula";
          } else if (!/(?=.*\d)/.test(value)) {
            newErrors.password = "Debe contener al menos un número";
          }
        } else {
          delete newErrors.password;
        }
        break;
    }
    
    setErrors(newErrors);
  }, [errors]);

  // Manejar cambios en los inputs
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (touched[name as keyof typeof touched]) {
      validateField(name as keyof typeof formData, value);
    }
  };

  // Marcar campo como "tocado"
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
    
    validateField(name as keyof typeof formData, formData[name as keyof typeof formData]);
  };

  // Validar todo el formulario antes de enviar
  const validateForm = () => {
    const newErrors: FormErrors = {};
    
    // Validar email
    if (!formData.email.trim()) {
      newErrors.email = "El email es requerido";
    } else if (!EMAIL_REGEX.test(formData.email)) {
      newErrors.email = "Por favor ingresa un email válido";
    }
    
    // Validar contraseña
    if (!formData.password.trim()) {
      newErrors.password = "La contraseña es requerida";
    } else if (!PASSWORD_REGEX.test(formData.password)) {
      newErrors.password = "La contraseña no cumple con los requisitos";
    }
    
    // Validar nombre (opcional pero con reglas si se completa)
    if (formData.name.trim() && formData.name.trim().length < 2) {
      newErrors.name = "El nombre debe tener al menos 2 caracteres";
    } else if (formData.name.length > 50) {
      newErrors.name = "El nombre no puede exceder 50 caracteres";
    }
    
    return newErrors;
  };

  // Manejar envío del formulario
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Marcar todos los campos como tocados
    setTouched({
      name: true,
      email: true,
      password: true,
    });
    
    // Validar todo el formulario
    const formErrors = validateForm();
    
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      // Scroll al primer error
      const firstErrorField = Object.keys(formErrors)[0];
      const element = document.querySelector(`[name="${firstErrorField}"]`);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    
    setLoading(true);
    setErrors({});

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        // Manejar errores específicos del servidor
        if (res.status === 409) {
          setErrors({ email: "Este email ya está registrado" });
        } else if (payload?.error?.includes("email")) {
          setErrors({ email: payload.error });
        } else {
          setErrors({ general: payload?.error || "No se pudo crear la cuenta" });
        }
        return;
      }

      // Auto-login con credenciales
      const login = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
        callbackUrl: "/",
      });

      if (!login || login.error) {
        setErrors({ 
          general: "Cuenta creada, pero no se pudo iniciar sesión. Probá ingresar manualmente." 
        });
        return;
      }

      window.location.href = login.url || "/";
    } catch (error) {
      setErrors({ 
        general: "Error de conexión. Verificá tu internet e intentá nuevamente." 
      });
    } finally {
      setLoading(false);
    }
  }

  // Verificar si el formulario es válido para habilitar/deshabilitar botón
  const isFormValid = () => {
    return (
      formData.email.trim() !== "" &&
      formData.password.trim() !== "" &&
      EMAIL_REGEX.test(formData.email) &&
      PASSWORD_REGEX.test(formData.password) &&
      Object.keys(errors).length === 0
    );
  };

  return (
    <main className="min-h-[calc(100vh-120px)] bg-conquer-pink/10">
      <div className="mx-auto max-w-md px-4 py-10">
        <div className="rounded-3xl border border-conquer-pink bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-conquer-navy">Crear cuenta</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Te pedimos estos datos para tu perfil y tus pedidos.
          </p>

          <form onSubmit={onSubmit} className="mt-5 grid gap-4">
            {/* Campo Nombre */}
            <div>
              <input
                name="name"
                className={`h-11 w-full rounded-2xl border px-4 transition-colors ${
                  errors.name ? "border-red-500" : "border-gray-300"
                } ${touched.name && !errors.name ? "border-green-500" : ""}`}
                placeholder="Nombre (opcional)"
                value={formData.name}
                onChange={handleChange}
                onBlur={handleBlur}
                maxLength={50}
              />
              {errors.name && (
                <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                  <XCircle size={12} />
                  {errors.name}
                </p>
              )}
              {touched.name && !errors.name && formData.name.trim() && (
                <p className="mt-1 flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle size={12} />
                  Nombre válido
                </p>
              )}
            </div>

            {/* Campo Email */}
            <div>
              <input
                name="email"
                className={`h-11 w-full rounded-2xl border px-4 transition-colors ${
                  errors.email ? "border-red-500" : "border-gray-300"
                } ${touched.email && !errors.email && formData.email.trim() ? "border-green-500" : ""}`}
                placeholder="Email*"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                type="email"
                autoComplete="email"
                required
              />
              {errors.email && (
                <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                  <XCircle size={12} />
                  {errors.email}
                </p>
              )}
              {touched.email && !errors.email && formData.email.trim() && (
                <p className="mt-1 flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle size={12} />
                  Email válido
                </p>
              )}
            </div>

            {/* Campo Contraseña */}
            <div>
              <div className="relative">
                <input
                  name="password"
                  className={`h-11 w-full rounded-2xl border px-4 pr-10 transition-colors ${
                    errors.password ? "border-red-500" : "border-gray-300"
                  } ${touched.password && !errors.password && formData.password.trim() ? "border-green-500" : ""}`}
                  placeholder="Contraseña*"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              
              {errors.password && (
                <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                  <XCircle size={12} />
                  {errors.password}
                </p>
              )}
              
              {/* Requisitos de contraseña */}
              <div className="mt-2 space-y-1">
                <p className="text-xs font-medium text-gray-700">La contraseña debe tener:</p>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div className="flex items-center gap-1">
                    {passwordValidation.length ? (
                      <CheckCircle size={12} className="text-green-600" />
                    ) : (
                      <XCircle size={12} className="text-gray-400" />
                    )}
                    <span className={passwordValidation.length ? "text-green-600" : "text-gray-500"}>
                      Mínimo 6 caracteres
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {passwordValidation.uppercase ? (
                      <CheckCircle size={12} className="text-green-600" />
                    ) : (
                      <XCircle size={12} className="text-gray-400" />
                    )}
                    <span className={passwordValidation.uppercase ? "text-green-600" : "text-gray-500"}>
                      Una mayúscula
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {passwordValidation.lowercase ? (
                      <CheckCircle size={12} className="text-green-600" />
                    ) : (
                      <XCircle size={12} className="text-gray-400" />
                    )}
                    <span className={passwordValidation.lowercase ? "text-green-600" : "text-gray-500"}>
                      Una minúscula
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {passwordValidation.number ? (
                      <CheckCircle size={12} className="text-green-600" />
                    ) : (
                      <XCircle size={12} className="text-gray-400" />
                    )}
                    <span className={passwordValidation.number ? "text-green-600" : "text-gray-500"}>
                      Un número
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Error general */}
            {errors.general && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errors.general}
              </div>
            )}

            {/* Botón de envío */}
            <button
              type="submit"
              disabled={loading || !isFormValid()}
              className="h-11 w-full rounded-2xl bg-conquer-orange text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Creando cuenta...
                </span>
              ) : (
                "Crear cuenta"
              )}
            </button>
          </form>

          <div className="mt-5 text-sm text-neutral-700">
            ¿Ya tenés cuenta?{" "}
            <Link 
              className="font-medium text-conquer-turq hover:underline" 
              href="/login"
            >
              Ingresar
            </Link>
          </div>
          
          <div className="mt-4 text-xs text-gray-500">
            <p>Al crear una cuenta aceptás nuestros términos y condiciones.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
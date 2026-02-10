"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

// Tipos para errores
type FormErrors = {
  name?: string;
  email?: string;
  phone?: string;
  subject?: string;
  message?: string;
  general?: string;
};

// Expresiones regulares
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[\d\s\-\+\(\)]{8,30}$/;

export default function ContactoPage() {
  // Estados del formulario
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "Consulta",
    message: "",
    honeypot: "", // Campo oculto para bots
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    phone: false,
    subject: false,
    message: false,
  });
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitAttempts, setSubmitAttempts] = useState(0);

  // Validar campo individual
  const validateField = useCallback((name: keyof typeof formData, value: string) => {
    switch (name) {
      case "name":
        if (!value.trim()) return "El nombre es requerido";
        if (value.length < 2) return "El nombre debe tener al menos 2 caracteres";
        if (value.length > 100) return "El nombre no puede exceder 100 caracteres";
        return "";
        
      case "email":
        if (!value.trim()) return "El email es requerido";
        if (!EMAIL_REGEX.test(value)) return "Por favor ingresa un email válido";
        if (value.length > 150) return "El email no puede exceder 150 caracteres";
        return "";
        
      case "phone":
        if (value && !PHONE_REGEX.test(value)) {
          return "Formato de teléfono inválido (mínimo 8 dígitos)";
        }
        return "";
        
      case "subject":
        if (!value.trim()) return "El asunto es requerido";
        if (value.length < 3) return "El asunto debe tener al menos 3 caracteres";
        return "";
        
      case "message":
        if (!value.trim()) return "El mensaje es requerido";
        if (value.length < 10) return "El mensaje debe tener al menos 10 caracteres";
        if (value.length > 2000) return "El mensaje no puede exceder 2000 caracteres";
        return "";
        
      default:
        return "";
    }
  }, []);

  // Validar todo el formulario
  const validateForm = () => {
    const newErrors: FormErrors = {};
    
    Object.keys(formData).forEach((key) => {
      if (key === "honeypot") return; // No validar honeypot
      
      const error = validateField(key as keyof typeof formData, formData[key as keyof typeof formData]);
      if (error) {
        newErrors[key as keyof FormErrors] = error;
      }
    });
    
    return newErrors;
  };

  // Manejar cambios en los inputs
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Validar en tiempo real si el campo ya fue tocado
    if (touched[name as keyof typeof touched]) {
      const error = validateField(name as keyof typeof formData, value);
      setErrors(prev => ({
        ...prev,
        [name]: error || undefined
      }));
    }
  };

  // Marcar campo como "tocado"
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name } = e.target;
    
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
    
    const error = validateField(name as keyof typeof formData, formData[name as keyof typeof formData]);
    setErrors(prev => ({
      ...prev,
      [name]: error || undefined
    }));
  };

  // Resetear formulario
  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      subject: "Consulta",
      message: "",
      honeypot: "",
    });
    setErrors({});
    setTouched({
      name: false,
      email: false,
      phone: false,
      subject: false,
      message: false,
    });
  };

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Marcar todos los campos como tocados
    setTouched({
      name: true,
      email: true,
      phone: true,
      subject: true,
      message: true,
    });
    
    // Validar todo el formulario
    const formErrors = validateForm();
    
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      
      // Scroll al primer error
      const firstErrorField = Object.keys(formErrors)[0];
      const element = document.querySelector(`[name="${firstErrorField}"]`);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
      
      setSubmitAttempts(prev => prev + 1);
      return;
    }
    
    setLoading(true);
    setErrors({});
    
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          subject: formData.subject,
          message: formData.message.trim(),
          honeypot: formData.honeypot,
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 429) {
          setErrors({
            general: "Demasiados intentos. Por favor, espera unos minutos antes de enviar otro mensaje."
          });
        } else if (data.errors) {
          // Errores por campo del servidor
          setErrors(data.errors);
        } else {
          setErrors({
            general: data.error || "No se pudo enviar el mensaje. Por favor, intenta nuevamente."
          });
        }
        return;
      }
      
      // Éxito
      setSuccess(true);
      resetForm();
      
      // Ocultar mensaje de éxito después de 5 segundos
      setTimeout(() => {
        setSuccess(false);
      }, 5000);
      
    } catch (error) {
      setErrors({
        general: "Error de conexión. Verifica tu internet e intenta nuevamente."
      });
    } finally {
      setLoading(false);
    }
  };

  // Verificar si el formulario es válido
  // Reemplaza tu función isFormValid() con esto:
const isFormValid = () => {
  // Validaciones individuales
  const nameValid = formData.name.length >= 2 && formData.name.length <= 100;
  const emailValid = EMAIL_REGEX.test(formData.email);
  const phoneValid = !formData.phone || PHONE_REGEX.test(formData.phone);
  const subjectValid = formData.subject.length >= 3;
  const messageValid = formData.message.length >= 10 && formData.message.length <= 2000;
  
  return nameValid && emailValid && phoneValid && subjectValid && messageValid;
};

  // Si hay muchos intentos fallidos, mostrar sugerencias
  const showHelpTips = submitAttempts >= 2;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-conquer-navy">Contacto</h1>
        <p className="mt-2 text-neutral-600">
          Dejanos tu consulta y te respondemos por email o WhatsApp.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Información de contacto */}
        <div className="space-y-6">
          <div className="rounded-2xl bg-conquer-pink/20 p-6">
            <h2 className="text-xl font-semibold text-conquer-navy mb-4">📞 Contacto directo</h2>
            <div className="space-y-3">
              <div>
                <h3 className="font-medium text-conquer-navy">WhatsApp</h3>
                <a 
                  href="https://wa.me/5491131002011" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-conquer-turq hover:underline"
                >
                  11 3100 2011
                </a>
              </div>
              <div>
                <h3 className="font-medium text-conquer-navy">Email</h3>
                <a 
                  href="mailto:info@grabadosconquer.com" 
                  className="text-conquer-turq hover:underline"
                >
                  info@grabadosconquer.com
                </a>
              </div>
              <div>
                <h3 className="font-medium text-conquer-navy">Horario de atención</h3>
                <p className="text-neutral-600">Lunes a Viernes de 9:00 a 17:00</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-conquer-pink p-6">
            <h2 className="text-xl font-semibold text-conquer-navy mb-4">📍 Información útil</h2>
            <ul className="space-y-2 text-neutral-600">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-conquer-turq flex-shrink-0" />
                <span>Respondemos en menos de 24hs hábiles</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-conquer-turq flex-shrink-0" />
                <span>Envíos a todo el país</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-conquer-turq flex-shrink-0" />
                <span>Presupuestos sin cargo</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Formulario */}
        <div className="rounded-3xl border border-conquer-pink bg-white p-6">
          <h2 className="text-xl font-semibold text-conquer-navy mb-6">Enviar mensaje</h2>

          {success && (
            <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-800">¡Mensaje enviado con éxito!</span>
              </div>
              <p className="mt-2 text-sm text-green-700">
                Te hemos enviado un email de confirmación. Te responderemos a la brevedad.
              </p>
            </div>
          )}

          {errors.general && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span className="font-medium text-red-800">Error</span>
              </div>
              <p className="mt-2 text-sm text-red-700">{errors.general}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Campo honeypot (oculto para usuarios, visible para bots) */}
            <div className="sr-only" aria-hidden="true">
              <label htmlFor="honeypot">Dejar este campo vacío</label>
              <input
                type="text"
                id="honeypot"
                name="honeypot"
                value={formData.honeypot}
                onChange={handleChange}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            {/* Nombre */}
            <div>
              <label className="mb-1 block text-sm font-medium text-conquer-navy">
                Nombre y apellido *
              </label>
              <input
                name="name"
                className={`h-11 w-full rounded-2xl border px-4 transition-colors ${
                  errors.name ? "border-red-500" : "border-gray-300"
                } ${touched.name && !errors.name && formData.name ? "border-green-500" : ""}`}
                value={formData.name}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Tu nombre"
                disabled={loading}
              />
              {errors.name && (
                <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                  <XCircle className="h-3 w-3" />
                  {errors.name}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="mb-1 block text-sm font-medium text-conquer-navy">
                Email *
              </label>
              <input
                name="email"
                type="email"
                className={`h-11 w-full rounded-2xl border px-4 transition-colors ${
                  errors.email ? "border-red-500" : "border-gray-300"
                } ${touched.email && !errors.email && formData.email ? "border-green-500" : ""}`}
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="tuemail@ejemplo.com"
                disabled={loading}
              />
              {errors.email && (
                <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                  <XCircle className="h-3 w-3" />
                  {errors.email}
                </p>
              )}
            </div>

            {/* Teléfono */}
            <div>
              <label className="mb-1 block text-sm font-medium text-conquer-navy">
                Teléfono (opcional)
              </label>
              <input
                name="phone"
                type="tel"
                className={`h-11 w-full rounded-2xl border px-4 transition-colors ${
                  errors.phone ? "border-red-500" : "border-gray-300"
                }`}
                value={formData.phone}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="11 3100 2011"
                disabled={loading}
              />
              {errors.phone && (
                <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                  <XCircle className="h-3 w-3" />
                  {errors.phone}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Solo números, espacios, +, -, ( y )
              </p>
            </div>

            {/* Asunto */}
            <div>
              <label className="mb-1 block text-sm font-medium text-conquer-navy">
                Motivo *
              </label>
              <select
                name="subject"
                className="h-11 w-full rounded-2xl border border-gray-300 bg-white px-4"
                value={formData.subject}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={loading}
              >
                <option>Consulta</option>
                <option>Pedido</option>
                <option>Personalización</option>
                <option>Factura</option>
                <option>Empresas</option>
                <option>Otro</option>
              </select>
            </div>

            {/* Mensaje */}
            <div>
              <label className="mb-1 block text-sm font-medium text-conquer-navy">
                Mensaje *
              </label>
              <textarea
                name="message"
                className={`min-h-36 w-full rounded-2xl border px-4 py-3 transition-colors ${
                  errors.message ? "border-red-500" : "border-gray-300"
                } ${touched.message && !errors.message && formData.message ? "border-green-500" : ""}`}
                value={formData.message}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Contanos qué necesitás..."
                disabled={loading}
              />
              <div className="mt-1 flex justify-between">
                {errors.message ? (
                  <p className="flex items-center gap-1 text-xs text-red-600">
                    <XCircle className="h-3 w-3" />
                    {errors.message}
                  </p>
                ) : (
                  <p className="text-xs text-gray-500">
                    Mínimo 10 caracteres, máximo 2000
                  </p>
                )}
                <span className={`text-xs ${
                  formData.message.length > 2000 ? "text-red-600" : "text-gray-500"
                }`}>
                  {formData.message.length}/2000
                </span>
              </div>
            </div>

            {/* Tips de ayuda (si hay múltiples intentos fallidos) */}
            {showHelpTips && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm font-medium text-amber-800">¿Problemas para enviar?</p>
                <ul className="mt-1 space-y-1 text-xs text-amber-700">
                  <li>• Verifica que todos los campos obligatorios estén completos</li>
                  <li>• Asegúrate de que el email tenga formato válido</li>
                  <li>• El mensaje debe tener al menos 10 caracteres</li>
                  <li>• Si persiste, contáctanos por WhatsApp al 11 3100 2011</li>
                </ul>
              </div>
            )}

            {/* Botón de envío */}
            <button
              type="submit"
              disabled={loading || !isFormValid()}
              className="h-11 w-full rounded-2xl bg-conquer-orange font-medium text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Enviando...
                </span>
              ) : (
                "Enviar mensaje"
              )}
            </button>

            {/* Información de seguridad */}
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-xs text-gray-600">
                <span className="font-medium">Tu privacidad es importante:</span> 
                {" "}No compartimos tus datos con terceros. Los mensajes se encriptan en tránsito.
              </p>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
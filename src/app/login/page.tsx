// src/app/login/page.tsx
"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Eye, EyeOff, CheckCircle, XCircle, AlertCircle } from "lucide-react";

// Expresión regular para email (misma que en registro)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FormErrors = {
  email?: string;
  password?: string;
  general?: string;
};

type LoginStatus = 'idle' | 'loading' | 'success' | 'error';

export default function LoginPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const callbackUrl = sp.get("callbackUrl") || "/";

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState({
    email: false,
    password: false,
  });
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginStatus, setLoginStatus] = useState<LoginStatus>('idle');
  const [isFormValid, setIsFormValid] = useState(false);

  // Validar formulario en tiempo real
  useEffect(() => {
    const isValid = 
      EMAIL_REGEX.test(formData.email) &&
      formData.password.length >= 6 &&
      Object.keys(errors).length === 0;
    
    setIsFormValid(isValid);
  }, [formData, errors]);

  // Validar campos individuales
  const validateField = useCallback((name: keyof typeof formData, value: string) => {
    const newErrors = { ...errors };
    
    switch (name) {
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
        } else if (value.length < 6) {
          newErrors.password = "La contraseña debe tener al menos 6 caracteres";
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
    
    // Si el campo ya fue tocado, validar en tiempo real
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
    } else if (formData.password.length < 6) {
      newErrors.password = "La contraseña debe tener al menos 6 caracteres";
    }
    
    return newErrors;
  };

  // Manejar login con Google
  async function handleGoogleSignIn() {
    setLoginStatus('loading');
    try {
      await signIn("google", { 
        callbackUrl,
        redirect: false 
      });
      // Google signIn suele redirigir automáticamente
    } catch (error) {
      setLoginStatus('error');
      setErrors({ 
        general: "Error al iniciar sesión con Google. Intenta nuevamente." 
      });
    }
  }

  // Manejar login con credenciales
  async function onCredentials(e: React.FormEvent) {
    e.preventDefault();
    
    // Marcar todos los campos como tocados
    setTouched({
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
    setLoginStatus('loading');
    setErrors({});

    try {
      const res = await signIn("credentials", {
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
        redirect: false,
        callbackUrl,
      });

      if (!res || res.error) {
        // Errores específicos basados en el código de error
        let errorMessage = "Email o contraseña inválidos";
        
        if (res?.error === "CredentialsSignin") {
          errorMessage = "Email o contraseña incorrectos";
        } else if (res?.error?.includes("Callback")) {
          errorMessage = "Error de configuración. Contacta al administrador.";
        } else if (res?.error) {
          errorMessage = res.error;
        }
        
        setLoginStatus('error');
        setErrors({ 
          general: errorMessage,
          password: "Verifica tu contraseña"
        });
        
        // Limpiar contraseña por seguridad
        setFormData(prev => ({ ...prev, password: "" }));
        setShowPassword(false);
        
        return;
      }

      // Login exitoso
      setLoginStatus('success');
      
      // Pequeño delay para mostrar el estado de éxito
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Redirigir
      if (res.url) {
        router.push(res.url);
      } else {
        router.push(callbackUrl);
      }
      
    } catch (error) {
      console.error("Error en login:", error);
      setLoginStatus('error');
      setErrors({ 
        general: "Error de conexión. Verifica tu internet e intenta nuevamente." 
      });
    } finally {
      setLoading(false);
    }
  }

  // Manejar recuperación de contraseña
  const handleForgotPassword = () => {
    // Aquí podrías redirigir a una página de recuperación
    // o mostrar un modal
    alert("Funcionalidad de recuperación de contraseña en desarrollo");
  };

  return (
    <main className="min-h-[calc(100vh-120px)] bg-conquer-pink/10">
      <div className="mx-auto max-w-md px-4 py-10">
        <div className="rounded-3xl border border-conquer-pink bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-conquer-navy">Ingresar</h1>
            <p className="mt-1 text-sm text-neutral-600">
              Accedé para ver tus pedidos y gestionar tu cuenta.
            </p>
          </div>

          {/* Botón de Google */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="flex h-11 w-full items-center justify-center gap-3 rounded-2xl border border-gray-300 bg-white text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500"></div>
            ) : (
              <>
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continuar con Google
              </>
            )}
          </button>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-neutral-200" />
            <span className="text-xs text-neutral-500">o con email</span>
            <div className="h-px flex-1 bg-neutral-200" />
          </div>

          <form onSubmit={onCredentials} className="grid gap-4">
            {/* Campo Email */}
            <div>
              <input
                name="email"
                className={`h-11 w-full rounded-2xl border px-4 transition-colors ${
                  errors.email ? "border-red-500 focus:border-red-500" : "border-gray-300"
                } ${touched.email && !errors.email && formData.email.trim() ? "border-green-500" : ""}`}
                placeholder="Email*"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                type="email"
                autoComplete="email"
                required
                disabled={loading}
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
                    errors.password ? "border-red-500 focus:border-red-500" : "border-gray-300"
                  } ${touched.password && !errors.password && formData.password.trim() ? "border-green-500" : ""}`}
                  placeholder="Contraseña*"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
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
              
              {/* Link para olvidé contraseña */}
              <button
                type="button"
                onClick={handleForgotPassword}
                className="mt-2 text-xs text-conquer-turq hover:underline disabled:opacity-50"
                disabled={loading}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {/* Mensajes de estado */}
            {loginStatus === 'success' && (
              <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} />
                  <span>¡Inicio de sesión exitoso! Redirigiendo...</span>
                </div>
              </div>
            )}

            {errors.general && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <div className="flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{errors.general}</span>
                </div>
                
                {/* Sugerencias para errores comunes */}
                {errors.general.includes("incorrectos") && (
                  <div className="mt-2 text-xs">
                    <p className="font-medium">¿Problemas para ingresar?</p>
                    <ul className="mt-1 list-inside list-disc space-y-1">
                      <li>Verifica que tu email esté correcto</li>
                      <li>Revisa que las mayúsculas/minúsculas de tu contraseña</li>
                      <li>
                        <button
                          type="button"
                          onClick={() => router.push('/register')}
                          className="text-conquer-turq hover:underline"
                        >
                          ¿No tienes cuenta? Regístrate aquí
                        </button>
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Botón de envío */}
            <button
              type="submit"
              disabled={loading || !isFormValid}
              className="mt-1 h-11 w-full rounded-2xl bg-conquer-orange text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Ingresando...
                </span>
              ) : (
                "Ingresar"
              )}
            </button>
          </form>

          <div className="mt-6 border-t border-gray-100 pt-5">
            <div className="text-center text-sm text-neutral-700">
              ¿No tenés cuenta?{" "}
              <Link 
                className="font-medium text-conquer-turq hover:underline" 
                href="/register"
              >
                Crear cuenta
              </Link>
            </div>
            
            {/* Información de seguridad */}
            <div className="mt-4 rounded-lg bg-blue-50 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle size={14} className="mt-0.5 text-blue-600" />
                <div className="text-xs text-blue-800">
                  <p className="font-medium">Seguridad de tu cuenta</p>
                  <p className="mt-1">Tus datos están protegidos con encriptación. Nunca compartimos tu información personal.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
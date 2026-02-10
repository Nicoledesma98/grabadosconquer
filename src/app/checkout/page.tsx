"use client";

import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/store/cart";
import { useRouter } from "next/navigation";
import { MOTO_PRICES, MotoZone, getMotoLocalitiesByZone, getMotoFromLocality } from "@/lib/shipping/moto";
import { 
  AlertCircle, 
  CheckCircle, 
  Upload, 
  FileText, 
  Truck, 
  CreditCard, 
  Wallet,
  MessageCircle,
  User,
  Mail,
  Phone,
  Home,
  MapPin,
  Building,
  Loader2,
  Package,
  Receipt,
  ArrowRight,
  ArrowLeft,
  ShoppingCart,
  Edit3,
  Send,
  ChevronRight,
  MapPin as MapPinIcon
} from "lucide-react";

function formatARS(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

const VAT_RATE = 0.21;

type ShippingMethod = "PICKUP" | "MOTO" | "OCA" | "VIACARGO";
type PaymentMethod = "MERCADO_PAGO" | "CASH" | "TRANSFER" | "COORDINATE";
type InvoiceType = "A" | "B";

interface ValidationErrors {
  name?: string;
  email?: string;
  phone?: string;
  shippingMethod?: string;
  motoLocality?: string;
  shipPostalCode?: string;
  shipStreet?: string;
  shipNumber?: string;
  invoiceCuit?: string;
  invoiceBusinessName?: string;
  file?: string;
  general?: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCart((s) => s.items);
  const subtotalNet = useCart((s) => s.subtotal());
  const clear = useCart((s) => s.clear);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Personalización
  const [customText, setCustomText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  // Datos
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Envío
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>("PICKUP");
  const [motoZone, setMotoZone] = useState<MotoZone>("CABA");
  const [motoLocality, setMotoLocality] = useState<string>("");
  const motoData = useMemo(() => getMotoLocalitiesByZone(), []);
  const [shipPostalCode, setShipPostalCode] = useState("");
  const [shipStreet, setShipStreet] = useState("");
  const [shipNumber, setShipNumber] = useState("");
  const [shipApartment, setShipApartment] = useState("");

  // Factura
  const [invoiceType, setInvoiceType] = useState<InvoiceType>("B");
  const [invoiceCuit, setInvoiceCuit] = useState("");
  const [invoiceBusinessName, setInvoiceBusinessName] = useState("");

  // Pago
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  
  useEffect(() => {
    if (shippingMethod !== "PICKUP" && paymentMethod === "CASH") {
      setPaymentMethod("TRANSFER");
    }
  }, [shippingMethod, paymentMethod]);

  const [loading, setLoading] = useState(false);

  // Validaciones
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValidCUIT = (cuit: string): boolean => {
    // Permite formatos: 30-12345678-9 o 30123456789
    const cuitRegex = /^(\d{2}-\d{8}-\d{1}|\d{11})$/;
    if (!cuitRegex.test(cuit)) return false;
    
    // Limpiamos guiones para validación básica
    const cleanedCuit = cuit.replace(/\D/g, '');
    return cleanedCuit.length === 11;
  };

  const isValidPhone = (phone: string): boolean => {
    if (!phone.trim()) return true;
    const phoneRegex = /^[0-9\s\+\-\(\)]{7,20}$/;
    return phoneRegex.test(phone);
  };

  const isValidPostalCode = (postalCode: string): boolean => {
    const postalCodeRegex = /^\d{4,8}$/;
    return postalCodeRegex.test(postalCode.replace(/\D/g, ''));
  };

  const validateFile = (file: File | null): string | null => {
    if (!file) return null;
    
    const validTypes = [
      'image/jpeg', 
      'image/png', 
      'image/gif', 
      'image/webp',
      'application/pdf', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (!validTypes.includes(file.type)) {
      return "Tipo de archivo no válido. Solo se permiten imágenes, PDF y Word.";
    }
    
    if (file.size > maxSize) {
      return `El archivo es demasiado grande (${(file.size / 1024 / 1024).toFixed(2)}MB). Máximo 10MB.`;
    }
    
    return null;
  };

  const handleFieldChange = (field: string, value: string, setter: (value: string) => void) => {
    setter(value);
    setTouchedFields(prev => new Set(prev).add(field));
    
    if (validationErrors[field as keyof ValidationErrors]) {
      setValidationErrors(prev => ({ ...prev, [field]: undefined }));
    }
    if (submitError) setSubmitError(null);
  };

  const validateStep1 = (): boolean => {
    return items.length > 0;
  };

  const validateStep2 = (): boolean => {
    const errors: ValidationErrors = {};
    
    if (file) {
      const fileError = validateFile(file);
      if (fileError) {
        errors.file = fileError;
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep3 = (): boolean => {
    const errors: ValidationErrors = {};
    
    if (!name.trim()) {
      errors.name = "El nombre es requerido";
    } else if (name.trim().length < 2) {
      errors.name = "El nombre debe tener al menos 2 caracteres";
    } else if (name.trim().length > 100) {
      errors.name = "El nombre es demasiado largo";
    }
    
    if (!email.trim()) {
      errors.email = "El email es requerido";
    } else if (!isValidEmail(email.trim())) {
      errors.email = "Ingrese un email válido (ej: nombre@dominio.com)";
    }
    
    if (phone.trim() && !isValidPhone(phone.trim())) {
      errors.phone = "Ingrese un teléfono válido (ej: 11 1234-5678)";
    }
    
    if (shippingMethod !== "PICKUP") {
      if (!shipStreet.trim()) {
        errors.shipStreet = "La calle es requerida";
      } else if (shipStreet.trim().length > 200) {
        errors.shipStreet = "La calle es demasiado larga";
      }
      
      if (!shipNumber.trim()) {
        errors.shipNumber = "El número es requerido";
      } else if (shipNumber.trim().length > 20) {
        errors.shipNumber = "El número es demasiado largo";
      }
      
      if (!shipPostalCode.trim()) {
        errors.shipPostalCode = "El código postal es requerido";
      } else if (!isValidPostalCode(shipPostalCode)) {
        errors.shipPostalCode = "Ingrese un código postal válido (4-8 dígitos)";
      }
      
      if (shippingMethod === "MOTO") {
        if (!motoLocality.trim()) {
          errors.motoLocality = "Debe seleccionar una localidad";
        } else {
          const motoValid = getMotoFromLocality(motoZone, motoLocality);
          if (!motoValid) {
            errors.motoLocality = "Localidad no disponible para envío";
          }
        }
      }
    }
    
    if (invoiceType === "A") {
      if (!invoiceCuit.trim()) {
        errors.invoiceCuit = "El CUIT es requerido";
      } else if (!isValidCUIT(invoiceCuit.trim())) {
        errors.invoiceCuit = "Formato de CUIT inválido (ej: 30-12345678-9 o 30123456789)";
      }
      
      if (!invoiceBusinessName.trim()) {
        errors.invoiceBusinessName = "La razón social es requerida";
      } else if (invoiceBusinessName.trim().length < 3) {
        errors.invoiceBusinessName = "Ingrese una razón social válida (mínimo 3 caracteres)";
      } else if (invoiceBusinessName.trim().length > 200) {
        errors.invoiceBusinessName = "La razón social es demasiado larga";
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handlePrevStep = () => {
    setStep(prev => Math.max(1, prev - 1) as 1 | 2 | 3);
    setValidationErrors({});
    setSubmitError(null);
  };

  // Calcular totales
  const vatAmount = useMemo(() => Math.round(subtotalNet * VAT_RATE), [subtotalNet]);

  const shipping = useMemo(() => {
    if (shippingMethod === "PICKUP") return 0;
    if (shippingMethod === "MOTO") return motoLocality ? MOTO_PRICES[motoZone] : 0;
    return 0;
  }, [shippingMethod, motoZone, motoLocality]);

  const baseTotal = subtotalNet + vatAmount + shipping;

  const surcharge = useMemo(() => {
    return paymentMethod === "MERCADO_PAGO" ? Math.round(baseTotal * 0.10) : 0;
  }, [paymentMethod, baseTotal]);

  const total = baseTotal + surcharge;

  const needsAddress = shippingMethod !== "PICKUP";

  const getFieldError = (field: keyof ValidationErrors): string | null => {
    if (validationErrors[field] && touchedFields.has(field)) {
      return validationErrors[field];
    }
    return null;
  };

  const getFieldClassName = (field: keyof ValidationErrors): string => {
    const baseClass = "h-11 rounded-2xl border px-4 w-full transition-all focus:outline-none focus:ring-2";
    const errorClass = getFieldError(field) 
      ? "border-red-500 focus:border-red-500 focus:ring-red-200" 
      : "border-conquer-pink focus:border-conquer-orange focus:ring-conquer-orange/30";
    return `${baseClass} ${errorClass}`;
  };

  async function createOrder() {
    if (!validateStep3()) {
      const allFields = ['name', 'email', 'phone', 'shipStreet', 'shipNumber', 'shipPostalCode', 'motoLocality', 'invoiceCuit', 'invoiceBusinessName'];
      setTouchedFields(prev => new Set([...prev, ...allFields]));
      return;
    }

    setLoading(true);
    setSubmitError(null);
    
    try {
      let uploaded: { url: string; originalName: string; mimeType: string } | null = null;

      if (file) {
        const fileError = validateFile(file);
        if (fileError) {
          setValidationErrors(prev => ({ ...prev, file: fileError }));
          setLoading(false);
          return;
        }

        try {
          const fd = new FormData();
          fd.append("file", file);

          const up = await fetch("/api/upload", { 
            method: "POST", 
            body: fd,
            headers: {
              'Accept': 'application/json',
            }
          });
          
          if (!up.ok) {
            const errorData = await up.json().catch(() => ({ error: "Error desconocido en la subida" }));
            throw new Error(errorData.error || `Error ${up.status} en la subida`);
          }

          const data = await up.json() as { 
            url: string; 
            originalName: string; 
            mimeType: string;
            error?: string;
          };
          
          if (data.error) {
            throw new Error(data.error);
          }

          if (!data.url || typeof data.url !== 'string') {
            throw new Error("La respuesta del servidor no contiene una URL válida");
          }

          // Validar que la URL sea válida
          try {
            new URL(data.url);
          } catch {
            // Si es una URL relativa, la convertimos a absoluta
            if (!data.url.startsWith('/')) {
              throw new Error("URL de archivo inválida");
            }
          }

          uploaded = data;
          setFileUrl(data.url);
          setFileName(data.originalName);
        } catch (uploadError: any) {
          console.error("Error en upload:", uploadError);
          setSubmitError(`Error al subir el archivo: ${uploadError.message}`);
          setLoading(false);
          return;
        }
      }

      // Preparar datos para el checkout
      const checkoutData = {
        customerName: name.trim(),
        customerEmail: email.trim(),
        customerPhone: phone.trim() || null,
        shipPostalCode: needsAddress ? shipPostalCode.trim() : null,
        shipLocality: shippingMethod === "MOTO" ? motoLocality : null,
        motoZone: shippingMethod === "MOTO" ? motoZone : null,
        customText: customText.trim() || null,
        upload: uploaded
          ? { 
              url: uploaded.url, 
              originalName: uploaded.originalName, 
              mimeType: uploaded.mimeType 
            }
          : null,

        shippingMethod,
        motoLocality: shippingMethod === "MOTO" ? motoLocality : null,

        shipStreet: needsAddress ? shipStreet.trim() : null,
        shipNumber: needsAddress ? shipNumber.trim() : null,
        shipApartment: needsAddress ? shipApartment.trim() : null,

        invoiceType,
        invoiceCuit: invoiceType === "A" ? invoiceCuit.replace(/\D/g, '') : null, // Solo números para CUIT
        invoiceBusinessName: invoiceType === "A" ? invoiceBusinessName.trim() : null,

        paymentMethod,

        items: items.map((i) => ({
          productId: i.productId,
          qty: i.qty,
          unitPrice: i.unitPrice,
          productName: i.name,
          productSlug: i.slug,

          variantId: i.variantId ?? null,
          variantSku: i.variantSku ?? null,
          colorName: (i as any).variantName ?? (i as any).colorName ?? null,
          colorHex: (i as any).colorHex ?? null,

          method: (i as any).method ?? null,
          notes: (i as any).notes ?? null,
        })),
      };

      console.log("Enviando datos al checkout:", checkoutData);

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(checkoutData),
      });

      const responseText = await res.text();
      let responseData;
      
      try {
        responseData = JSON.parse(responseText);
      } catch {
        throw new Error(`Respuesta inválida del servidor: ${responseText.substring(0, 100)}`);
      }

      if (!res.ok) {
        console.error("Error response from server:", responseData);
        throw new Error(responseData?.error || responseData?.message || `Error ${res.status}: ${res.statusText}`);
      }
      
      const data = responseData as { 
        orderId: string; 
        paymentMethod: PaymentMethod; 
        total: number;
        success: boolean;
        error?: string;
      };

      if (data.error) {
        throw new Error(data.error);
      }

      if (!data.orderId) {
        throw new Error("No se recibió un ID de pedido válido del servidor");
      }
      
      clear();

      if (paymentMethod === "COORDINATE") {
        const msg = encodeURIComponent(
          `¡Hola! Realicé una compra.\n` +
          `• Pedido: ${data.orderId}\n` +
          `• Nombre: ${name}\n` +
          `• Tel: ${phone || "No especificado"}\n` +
          `• Email: ${email}\n` +
          `• Envío: ${shippingMethod === "PICKUP" ? "Retiro" : shippingMethod === "MOTO" ? `Moto (${motoZone})` : shippingMethod}\n` +
          `• Total: ${formatARS(total)}`
        );
        window.location.href = `https://wa.me/541131002011?text=${msg}`;
        return;
      }

      if (paymentMethod === "TRANSFER") {
        router.push(`/gracias/${data.orderId}?pay=transfer`);
        return;
      }

      router.push(`/gracias/${data.orderId}`);
      
    } catch (error: any) {
      console.error("Error completo en createOrder:", error);
      
      const errorMessage = error.message || "No se pudo crear el pedido. Por favor, intente nuevamente.";
      setSubmitError(errorMessage);
      
      // No mostrar alert para errores de validación que ya mostramos
      if (!error.message.includes("validación") && !error.message.includes("validar")) {
        setTimeout(() => {
          alert(`Error: ${errorMessage}\n\nSi el problema persiste, por favor contacte a soporte.`);
        }, 100);
      }
    } finally {
      setLoading(false);
    }
  }

  const disabledStep1 = useMemo(() => items.length === 0, [items.length]);
  const disabledStep2 = useMemo(() => items.length === 0, [items.length]);
  
  const disabledStep3 = useMemo(() => {
    if (loading || items.length === 0) return true;
    
    if (!name.trim() || !email.trim()) return true;
    
    if (!isValidEmail(email.trim())) return true;
    
    if (needsAddress) {
      if (!shipStreet.trim() || !shipNumber.trim() || !shipPostalCode.trim()) return true;
      
      if (shippingMethod === "MOTO") {
        const ok = getMotoFromLocality(motoZone, motoLocality);
        if (!motoLocality.trim() || !ok) return true;
      }
    }
    
    if (invoiceType === "A") {
      if (!invoiceCuit.trim() || !invoiceBusinessName.trim()) return true;
      if (!isValidCUIT(invoiceCuit.trim())) return true;
    }
    
    return false;
  }, [
    loading,
    items.length,
    name,
    email,
    needsAddress,
    shippingMethod,
    shipStreet,
    shipNumber,
    shipPostalCode,
    motoZone,
    motoLocality,
    invoiceType,
    invoiceCuit,
    invoiceBusinessName,
  ]);

  // Renderizado del componente (igual que antes, pero con corrección del error de Phone)
  return (
    <main className="p-4 md:p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-conquer-navy mb-2 flex items-center gap-2">
        <ShoppingCart className="w-7 h-7 text-conquer-orange" />
        Checkout
      </h1>
      <p className="text-gray-600 mb-6">Completa los datos para finalizar tu compra</p>

      {items.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-conquer-pink p-8 text-center text-neutral-600 bg-white">
          <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-lg font-medium mb-2">Tu carrito está vacío</p>
          <p className="text-sm text-gray-500 mb-4">Agrega productos para continuar con la compra</p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 rounded-2xl bg-conquer-orange text-white font-medium hover:opacity-90"
          >
            Volver a la tienda
          </button>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* IZQ: wizard */}
          <div className="rounded-3xl border border-conquer-pink bg-white p-5 md:p-6">
            {/* Stepper */}
            <div className="flex items-center gap-2 mb-6">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    if (n === 1) setStep(1);
                    if (n === 2 && validateStep1()) setStep(2);
                    if (n === 3 && validateStep1() && validateStep2()) setStep(3);
                  }}
                  className={`flex items-center gap-2 h-10 px-4 rounded-2xl border transition-all ${
                    step === n 
                      ? "bg-conquer-orange text-white border-conquer-orange shadow-md" 
                      : step > n
                      ? "bg-conquer-pink/10 text-conquer-navy border-conquer-pink"
                      : "border-conquer-pink text-gray-500 hover:bg-conquer-pink/5"
                  }`}
                >
                  {n === 1 && <ShoppingCart className="w-4 h-4" />}
                  {n === 2 && <Edit3 className="w-4 h-4" />}
                  {n === 3 && <Send className="w-4 h-4" />}
                  <span className="text-sm font-medium">Paso {n}</span>
                </button>
              ))}
            </div>

            {/* Paso 1 */}
            {step === 1 && (
              <div className="mt-2">
                <div className="flex items-center gap-2 mb-4">
                  <ShoppingCart className="w-5 h-5 text-conquer-orange" />
                  <h2 className="text-lg font-bold text-conquer-navy">1) Carrito</h2>
                </div>

                <div className="mt-4 space-y-3">
                  {items.map((i) => (
                    <div
                      key={(i as any).key ?? `${i.productId}-${(i as any).variantId ?? ""}-${(i as any).method ?? ""}`}
                      className="flex items-start justify-between gap-3 rounded-2xl border border-conquer-pink p-4 hover:border-conquer-orange/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="font-semibold text-conquer-navy">{i.name}</div>
                        {(i as any).variantName && (
                          <div className="mt-1 text-xs text-gray-600 flex items-center gap-2">
                            <span>Color: <b>{(i as any).variantName}</b></span>
                            {(i as any).colorHex && (
                              <span 
                                className="h-3 w-3 rounded-full border border-gray-300" 
                                style={{ backgroundColor: (i as any).colorHex }} 
                              />
                            )}
                          </div>
                        )}
                        {(i as any).method && (
                          <div className="mt-1 text-xs text-gray-600">
                            Personalización: <b>{(i as any).method}</b>
                          </div>
                        )}
                        <div className="mt-2 text-sm text-gray-700">
                          {i.qty} × {formatARS(i.unitPrice)} <span className="text-xs text-gray-500">+ IVA</span>
                        </div>
                      </div>
                      <div className="font-bold text-conquer-navy">
                        {formatARS(i.qty * i.unitPrice)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-2xl border border-conquer-pink p-5 bg-conquer-pink/5">
                  <div className="flex justify-between text-sm text-gray-700 mb-2">
                    <span className="font-medium">Neto</span>
                    <b>{formatARS(subtotalNet)}</b>
                  </div>
                  <div className="flex justify-between text-sm text-gray-700 mb-2">
                    <span className="font-medium">IVA (21%)</span>
                    <b>{formatARS(vatAmount)}</b>
                  </div>
                  <div className="flex justify-between text-base font-bold text-conquer-navy mt-4 pt-4 border-t border-conquer-pink/60">
                    <span>Total (sin envío)</span>
                    <span>{formatARS(subtotalNet + vatAmount)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={disabledStep1}
                  onClick={handleNextStep}
                  className="mt-6 h-12 w-full rounded-2xl bg-conquer-orange text-white font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  Continuar
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Paso 2 */}
            {step === 2 && (
              <div className="mt-2">
                <div className="flex items-center gap-2 mb-4">
                  <Edit3 className="w-5 h-5 text-conquer-orange" />
                  <h2 className="text-lg font-bold text-conquer-navy">2) Personalización</h2>
                </div>

                <div className="mt-4 space-y-5">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Upload className="w-5 h-5 text-conquer-navy" />
                      <label className="text-sm font-medium text-conquer-navy">Subir archivo (opcional)</label>
                    </div>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*,application/pdf,.doc,.docx"
                        onChange={(e) => {
                          const f = e.target.files?.[0] ?? null;
                          if (f) {
                            const fileError = validateFile(f);
                            if (fileError) {
                              setValidationErrors(prev => ({ ...prev, file: fileError }));
                              return;
                            }
                          }
                          setFile(f);
                          setFileUrl(null);
                          setFileName(null);
                          setValidationErrors(prev => ({ ...prev, file: undefined }));
                        }}
                        className="w-full rounded-2xl border border-conquer-pink p-3 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-conquer-pink/20 file:text-conquer-navy hover:file:bg-conquer-pink/30"
                      />
                      {validationErrors.file && (
                        <div className="text-red-500 text-xs mt-2 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {validationErrors.file}
                        </div>
                      )}
                      {fileName && fileUrl && (
                        <div className="text-green-600 text-xs mt-2 flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          Archivo listo: <b>{fileName}</b>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Formatos aceptados: imágenes, PDF, Word. Máximo 10MB.
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-5 h-5 text-conquer-navy" />
                      <label className="text-sm font-medium text-conquer-navy">Texto personalizado (opcional)</label>
                    </div>
                    <textarea
                      className="min-h-32 rounded-2xl border border-conquer-pink px-4 py-3 w-full focus:border-conquer-orange focus:ring-1 focus:ring-conquer-orange focus:outline-none"
                      placeholder="Ingresa el texto a grabar o cualquier indicación especial..."
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                      maxLength={500}
                    />
                    <div className="flex justify-between mt-2">
                      <p className="text-xs text-gray-500">
                        Esta información será enviada al equipo de producción.
                      </p>
                      <span className="text-xs text-gray-500">
                        {customText.length}/500
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex gap-3">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="h-12 flex-1 rounded-2xl border border-conquer-pink text-conquer-navy font-medium hover:bg-conquer-pink/10 flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Atrás
                  </button>
                  <button
                    type="button"
                    disabled={disabledStep2 || !!validationErrors.file}
                    onClick={handleNextStep}
                    className="h-12 flex-1 rounded-2xl bg-conquer-orange text-white font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    Continuar
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Paso 3 */}
            {step === 3 && (
              <div className="mt-2">
                <div className="flex items-center gap-2 mb-4">
                  <Send className="w-5 h-5 text-conquer-orange" />
                  <h2 className="text-lg font-bold text-conquer-navy">3) Envío · Datos · Pago</h2>
                </div>

                {/* Mostrar error general si existe */}
                {submitError && (
                  <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200">
                    <div className="flex items-center gap-2 text-red-600 font-semibold mb-2">
                      <AlertCircle className="w-5 h-5" />
                      Error al procesar el pedido
                    </div>
                    <p className="text-red-500 text-sm">{submitError}</p>
                    <p className="text-red-400 text-xs mt-2">
                      Por favor, verifica los datos e intenta nuevamente. Si el problema persiste, contacta a soporte.
                    </p>
                  </div>
                )}

                {/* Envío */}
                <div className="mb-6 rounded-2xl border border-conquer-pink p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Truck className="w-5 h-5 text-conquer-navy" />
                    <h3 className="text-base font-semibold text-conquer-navy">Método de envío</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(["PICKUP", "MOTO"] as ShippingMethod[]).map((m) => (
                      <label 
                        key={m} 
                        className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                          shippingMethod === m 
                            ? "border-conquer-orange bg-conquer-orange/5" 
                            : "border-conquer-pink hover:border-conquer-orange/50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="ship"
                          checked={shippingMethod === m}
                          onChange={() => setShippingMethod(m)}
                          className="text-conquer-orange focus:ring-conquer-orange"
                        />
                        <div className="flex items-center gap-3">
                          {m === "PICKUP" ? (
                            <Home className="w-5 h-5 text-conquer-navy" />
                          ) : (
                            <Truck className="w-5 h-5 text-conquer-navy" />
                          )}
                          <div>
                            <div className="font-medium text-conquer-navy">
                              {m === "PICKUP" ? "Retiro en local" : "Envío en moto"}
                            </div>
                            <div className="text-xs text-gray-500">
                              {m === "PICKUP" ? "Sin costo adicional" : "Consultar zonas"}
                            </div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>

                  {shippingMethod === "MOTO" && (
                    <div className="mt-5">
                      <div className="flex items-center gap-2 mb-3">
                        <MapPinIcon className="w-5 h-5 text-conquer-navy" />
                        <label className="text-sm font-medium text-conquer-navy">Selecciona tu localidad *</label>
                      </div>
                      <div className="relative">
                        <select
                          className={`h-12 w-full rounded-2xl border px-4 pr-10 appearance-none transition-all focus:outline-none focus:ring-2 ${
                            getFieldError("motoLocality") 
                              ? "border-red-500 focus:border-red-500 focus:ring-red-200" 
                              : "border-conquer-pink focus:border-conquer-orange focus:ring-conquer-orange/30"
                          }`}
                          value={`${motoZone}||${motoLocality}`}
                          onChange={(e) => {
                            const [z, loc] = e.target.value.split("||");
                            setMotoZone(z as MotoZone);
                            setMotoLocality(loc);
                            setTouchedFields(prev => new Set(prev).add("motoLocality"));
                            if (validationErrors.motoLocality) {
                              setValidationErrors(prev => ({ ...prev, motoLocality: undefined }));
                            }
                          }}
                          onBlur={() => setTouchedFields(prev => new Set(prev).add("motoLocality"))}
                        >
                          <option value="">Selecciona una localidad...</option>
                          {(["CABA", "GBA1", "GBA2"] as MotoZone[]).map((z) => (
                            <optgroup key={z} label={z === "CABA" ? "CABA" : z === "GBA1" ? "GBA Zona 1" : "GBA Zona 2"}>
                              {motoData[z].map((loc) => (
                                <option key={`${z}-${loc}`} value={`${z}||${loc}`}>
                                  {loc}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-conquer-navy">
                          <ChevronRight className="w-4 h-4 rotate-90" />
                        </div>
                      </div>
                      {getFieldError("motoLocality") && (
                        <div className="text-red-500 text-xs mt-2 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {getFieldError("motoLocality")}
                        </div>
                      )}
                      {motoLocality && !getFieldError("motoLocality") && (
                        <div className="mt-3 text-sm text-conquer-navy bg-conquer-pink/10 p-3 rounded-xl">
                          <div className="flex justify-between items-center">
                            <span>Zona: <b>{motoZone}</b></span>
                            <span className="font-bold">{formatARS(MOTO_PRICES[motoZone])}</span>
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            Localidad seleccionada: <b>{motoLocality}</b>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {needsAddress && (
                    <div className="mt-6">
                      <div className="flex items-center gap-2 mb-4">
                        <MapPin className="w-5 h-5 text-conquer-navy" />
                        <h3 className="text-base font-semibold text-conquer-navy">Dirección de envío</h3>
                      </div>
                      <div className="grid gap-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <input
                              className={getFieldClassName("shipStreet")}
                              placeholder="Calle *"
                              value={shipStreet}
                              onChange={(e) => handleFieldChange("shipStreet", e.target.value, setShipStreet)}
                              onBlur={() => setTouchedFields(prev => new Set(prev).add("shipStreet"))}
                            />
                            {getFieldError("shipStreet") && (
                              <div className="text-red-500 text-xs mt-2 flex items-center gap-1">
                                <AlertCircle className="w-4 h-4" />
                                {getFieldError("shipStreet")}
                              </div>
                            )}
                          </div>
                          <div>
                            <input
                              className={getFieldClassName("shipNumber")}
                              placeholder="Número *"
                              value={shipNumber}
                              onChange={(e) => handleFieldChange("shipNumber", e.target.value, setShipNumber)}
                              onBlur={() => setTouchedFields(prev => new Set(prev).add("shipNumber"))}
                            />
                            {getFieldError("shipNumber") && (
                              <div className="text-red-500 text-xs mt-2 flex items-center gap-1">
                                <AlertCircle className="w-4 h-4" />
                                {getFieldError("shipNumber")}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <input
                              className={getFieldClassName("shipPostalCode")}
                              placeholder="Código Postal *"
                              value={shipPostalCode}
                              onChange={(e) => handleFieldChange("shipPostalCode", e.target.value, setShipPostalCode)}
                              onBlur={() => setTouchedFields(prev => new Set(prev).add("shipPostalCode"))}
                            />
                            {getFieldError("shipPostalCode") && (
                              <div className="text-red-500 text-xs mt-2 flex items-center gap-1">
                                <AlertCircle className="w-4 h-4" />
                                {getFieldError("shipPostalCode")}
                              </div>
                            )}
                          </div>
                          <div>
                            <input
                              className="h-11 rounded-2xl border border-conquer-pink px-4 w-full focus:border-conquer-orange focus:outline-none focus:ring-2 focus:ring-conquer-orange/30"
                              placeholder="Depto (opcional)"
                              value={shipApartment}
                              onChange={(e) => setShipApartment(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Datos personales */}
                <div className="mb-6 rounded-2xl border border-conquer-pink p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <User className="w-5 h-5 text-conquer-navy" />
                    <h3 className="text-base font-semibold text-conquer-navy">Datos personales</h3>
                  </div>
                  <div className="grid gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <label className="text-sm text-gray-700">Nombre y apellido *</label>
                      </div>
                      <input
                        className={getFieldClassName("name")}
                        placeholder="Ej: Juan Pérez"
                        value={name}
                        onChange={(e) => handleFieldChange("name", e.target.value, setName)}
                        onBlur={() => setTouchedFields(prev => new Set(prev).add("name"))}
                      />
                      {getFieldError("name") && (
                        <div className="text-red-500 text-xs mt-2 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {getFieldError("name")}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Mail className="w-4 h-4 text-gray-500" />
                        <label className="text-sm text-gray-700">Email *</label>
                      </div>
                      <input
                        className={getFieldClassName("email")}
                        placeholder="ejemplo@email.com"
                        value={email}
                        onChange={(e) => handleFieldChange("email", e.target.value, setEmail)}
                        onBlur={() => setTouchedFields(prev => new Set(prev).add("email"))}
                        type="email"
                      />
                      {getFieldError("email") && (
                        <div className="text-red-500 text-xs mt-2 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {getFieldError("email")}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <label className="text-sm text-gray-700">Teléfono (opcional)</label>
                      </div>
                      <input
                        className={getFieldClassName("phone")}
                        placeholder="11 1234-5678"
                        value={phone}
                        onChange={(e) => handleFieldChange("phone", e.target.value, setPhone)}
                        onBlur={() => setTouchedFields(prev => new Set(prev).add("phone"))}
                        type="tel"
                      />
                      {getFieldError("phone") && (
                        <div className="text-red-500 text-xs mt-2 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {getFieldError("phone")}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Facturación */}
                <div className="mb-6 rounded-2xl border border-conquer-pink p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Receipt className="w-5 h-5 text-conquer-navy" />
                    <h3 className="text-base font-semibold text-conquer-navy">Facturación</h3>
                  </div>
                  <div className="flex flex-wrap gap-4 mb-4">
                    <label className="flex items-center gap-2 px-4 py-2 rounded-xl border border-conquer-pink cursor-pointer hover:bg-conquer-pink/5">
                      <input 
                        type="radio" 
                        checked={invoiceType === "B"} 
                        onChange={() => setInvoiceType("B")} 
                        className="text-conquer-orange"
                      />
                      <span className="text-sm font-medium">Factura B</span>
                    </label>
                    <label className="flex items-center gap-2 px-4 py-2 rounded-xl border border-conquer-pink cursor-pointer hover:bg-conquer-pink/5">
                      <input 
                        type="radio" 
                        checked={invoiceType === "A"} 
                        onChange={() => setInvoiceType("A")} 
                        className="text-conquer-orange"
                      />
                      <span className="text-sm font-medium">Factura A</span>
                    </label>
                  </div>

                  {invoiceType === "A" && (
                    <div className="mt-4 grid gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Building className="w-4 h-4 text-gray-500" />
                          <label className="text-sm text-gray-700">CUIT *</label>
                        </div>
                        <input
                          className={getFieldClassName("invoiceCuit")}
                          placeholder="30-12345678-9 o 30123456789"
                          value={invoiceCuit}
                          onChange={(e) => handleFieldChange("invoiceCuit", e.target.value, setInvoiceCuit)}
                          onBlur={() => setTouchedFields(prev => new Set(prev).add("invoiceCuit"))}
                        />
                        {getFieldError("invoiceCuit") && (
                          <div className="text-red-500 text-xs mt-2 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            {getFieldError("invoiceCuit")}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Building className="w-4 h-4 text-gray-500" />
                          <label className="text-sm text-gray-700">Razón social *</label>
                        </div>
                        <input
                          className={getFieldClassName("invoiceBusinessName")}
                          placeholder="Empresa S.A."
                          value={invoiceBusinessName}
                          onChange={(e) => handleFieldChange("invoiceBusinessName", e.target.value, setInvoiceBusinessName)}
                          onBlur={() => setTouchedFields(prev => new Set(prev).add("invoiceBusinessName"))}
                        />
                        {getFieldError("invoiceBusinessName") && (
                          <div className="text-red-500 text-xs mt-2 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            {getFieldError("invoiceBusinessName")}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Pago */}
                <div className="mb-6 rounded-2xl border border-conquer-pink p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <CreditCard className="w-5 h-5 text-conquer-navy" />
                    <h3 className="text-base font-semibold text-conquer-navy">Método de pago</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                      paymentMethod === "CASH" 
                        ? "border-conquer-orange bg-conquer-orange/5" 
                        : "border-conquer-pink hover:border-conquer-orange/50"
                    } ${shippingMethod !== "PICKUP" ? "opacity-50 cursor-not-allowed" : ""}`}>
                      <input
                        type="radio"
                        checked={paymentMethod === "CASH"}
                        onChange={() => setPaymentMethod("CASH")}
                        disabled={shippingMethod !== "PICKUP"}
                        className="text-conquer-orange"
                      />
                      <div className="flex items-center gap-3">
                        <Wallet className="w-5 h-5 text-conquer-navy" />
                        <div>
                          <div className="font-medium text-conquer-navy">Efectivo</div>
                          <div className="text-xs text-gray-500">Solo retiro</div>
                        </div>
                      </div>
                    </label>

                    <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                      paymentMethod === "TRANSFER" 
                        ? "border-conquer-orange bg-conquer-orange/5" 
                        : "border-conquer-pink hover:border-conquer-orange/50"
                    }`}>
                      <input 
                        type="radio" 
                        checked={paymentMethod === "TRANSFER"} 
                        onChange={() => setPaymentMethod("TRANSFER")} 
                        className="text-conquer-orange"
                      />
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-5 h-5 text-conquer-navy" />
                        <div>
                          <div className="font-medium text-conquer-navy">Transferencia</div>
                          <div className="text-xs text-gray-500">Sin recargo</div>
                        </div>
                      </div>
                    </label>

                    <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                      paymentMethod === "MERCADO_PAGO" 
                        ? "border-conquer-orange bg-conquer-orange/5" 
                        : "border-conquer-pink hover:border-conquer-orange/50"
                    }`}>
                      <input 
                        type="radio" 
                        checked={paymentMethod === "MERCADO_PAGO"} 
                        onChange={() => setPaymentMethod("MERCADO_PAGO")} 
                        className="text-conquer-orange"
                      />
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-5 h-5 text-conquer-navy" />
                        <div>
                          <div className="font-medium text-conquer-navy">Mercado Pago</div>
                          <div className="text-xs text-gray-500">+10% recargo</div>
                        </div>
                      </div>
                    </label>

                    <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                      paymentMethod === "COORDINATE" 
                        ? "border-conquer-orange bg-conquer-orange/5" 
                        : "border-conquer-pink hover:border-conquer-orange/50"
                    }`}>
                      <input 
                        type="radio" 
                        checked={paymentMethod === "COORDINATE"} 
                        onChange={() => setPaymentMethod("COORDINATE")} 
                        className="text-conquer-orange"
                      />
                      <div className="flex items-center gap-3">
                        <MessageCircle className="w-5 h-5 text-conquer-navy" />
                        <div>
                          <div className="font-medium text-conquer-navy">Coordinación</div>
                          <div className="text-xs text-gray-500">Vía WhatsApp</div>
                        </div>
                      </div>
                    </label>
                  </div>
                  
                  {paymentMethod === "MERCADO_PAGO" && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <p className="text-sm text-amber-700 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Se aplica un 10% de recargo por el uso de Mercado Pago.
                      </p>
                    </div>
                  )}
                </div>

                {/* Resumen de errores */}
                {Object.keys(validationErrors).length > 0 && (
                  <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200">
                    <div className="flex items-center gap-2 text-red-600 font-semibold mb-2">
                      <AlertCircle className="w-5 h-5" />
                      Por favor, corrige los siguientes errores:
                    </div>
                    <ul className="text-red-500 text-sm list-disc pl-5 space-y-1">
                      {Object.entries(validationErrors).map(([key, error]) => (
                        error && <li key={key}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Botones finales */}
                <div className="space-y-3">
                  <button
                    type="button"
                    disabled={disabledStep3 || loading}
                    onClick={createOrder}
                    className="h-14 w-full rounded-2xl bg-conquer-orange text-white font-bold text-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-3 transition-all shadow-md hover:shadow-lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Procesando pedido...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Confirmar pedido
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="h-12 w-full rounded-2xl border border-conquer-pink text-conquer-navy font-medium hover:bg-conquer-pink/10 flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    Volver al paso anterior
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* DER: resumen */}
          <div className="rounded-3xl border border-conquer-pink bg-white p-5 md:p-6 h-fit sticky top-6">
            <div className="flex items-center gap-2 mb-6">
              <Receipt className="w-6 h-6 text-conquer-orange" />
              <h2 className="text-lg font-bold text-conquer-navy">Resumen del pedido</h2>
            </div>

            {/* Productos en resumen */}
            <div className="mb-4 max-h-64 overflow-y-auto pr-2">
              {items.map((i) => (
                <div key={`${i.productId}-${(i as any).variantId}`} className="flex justify-between items-center py-3 border-b border-conquer-pink/30 last:border-0">
                  <div className="flex-1">
                    <div className="font-medium text-conquer-navy text-sm">{i.name}</div>
                    <div className="text-xs text-gray-500">
                      Cantidad: {i.qty} × {formatARS(i.unitPrice)}
                    </div>
                  </div>
                  <div className="font-semibold text-conquer-navy">
                    {formatARS(i.qty * i.unitPrice)}
                  </div>
                </div>
              ))}
            </div>

            {/* Totales */}
            <div className="rounded-2xl border border-conquer-pink p-5 bg-conquer-pink/5">
              <div className="space-y-3">
                <div className="flex justify-between text-sm text-gray-700">
                  <span>Subtotal neto</span>
                  <span className="font-medium">{formatARS(subtotalNet)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-700">
                  <span>IVA (21%)</span>
                  <span className="font-medium">{formatARS(vatAmount)}</span>
                </div>
                {shipping > 0 && (
                  <div className="flex justify-between text-sm text-gray-700">
                    <span>Envío</span>
                    <span className="font-medium">{formatARS(shipping)}</span>
                  </div>
                )}
                {surcharge > 0 && (
                  <div className="flex justify-between text-sm text-gray-700">
                    <span>Recargo Mercado Pago</span>
                    <span className="font-medium text-amber-600">{formatARS(surcharge)}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between text-lg font-bold text-conquer-navy mt-4 pt-4 border-t border-conquer-pink/60">
                <span>Total a pagar</span>
                <span>{formatARS(total)}</span>
              </div>
            </div>

            {/* Información adicional */}
            <div className="mt-6 space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
                <Truck className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Envío</p>
                  <p className="text-xs text-blue-600">
                    {shippingMethod === "PICKUP" 
                      ? "Retiro en nuestro local sin costo adicional." 
                      : shippingMethod === "MOTO"
                      ? `Envío en moto a ${motoLocality || "tu localidad"}.`
                      : "El costo de envío será informado posteriormente."}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-green-50 border border-green-100">
                <CreditCard className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-800">Pago</p>
                  <p className="text-xs text-green-600">
                    {paymentMethod === "CASH" && "Pago en efectivo al retirar."}
                    {paymentMethod === "TRANSFER" && "Transferencia bancaria sin recargos."}
                    {paymentMethod === "MERCADO_PAGO" && "Pago con Mercado Pago con 10% de recargo."}
                    {paymentMethod === "COORDINATE" && "Coordinaremos el pago vía WhatsApp."}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 text-xs text-gray-500">
              <p className="mb-2">* Los precios de productos están expresados en neto, se suma IVA en el checkout.</p>
              <p>** Una vez confirmado el pedido, recibirás un email con los detalles.</p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
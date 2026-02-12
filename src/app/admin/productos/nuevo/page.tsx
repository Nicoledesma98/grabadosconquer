"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Tag,
  Hash,
  FileText,
  DollarSign,
  Package,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Layers,
  ChevronRight,
  Save,
} from "lucide-react";

type Category = { id: string; name: string; slug: string };
type PersonalizationMethod = "DTF" | "DTG" | "FULL_COLOR" | "LASER";

export default function AdminNuevoProductoPage() {
  const router = useRouter();

  // Campos del formulario
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [basePrice, setBasePrice] = useState<string>("");
  const [stock, setStock] = useState<string>(""); // 👈 NUEVO
  const [minQtyStep, setMinQtyStep] = useState<number>(1);
  const [active, setActive] = useState(true);
  const [allowedMethods, setAllowedMethods] = useState<PersonalizationMethod[]>([]);

  // Categorías
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);

  // UI
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const disabled = useMemo(() => loading || !name.trim(), [loading, name]);

  // Cargar categorías
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/categories");
      const data = (await res.json()) as Category[];
      setCategories(data);
    })();
  }, []);

  // Validación
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = "El nombre es requerido";

    if (slug.trim() && !/^[a-z0-9-]+$/.test(slug))
      newErrors.slug = "Solo minúsculas, números y guiones";

    if (basePrice) {
      const priceNum = Number(basePrice);
      if (isNaN(priceNum) || priceNum < 0)
        newErrors.basePrice = "Ingrese un precio válido (≥ 0)";
    }

    if (stock) {
      const stockNum = Number(stock);
      if (!Number.isInteger(stockNum) || stockNum < 0)
        newErrors.stock = "Ingrese un número entero ≥ 0";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const toggleCategory = (id: string) => {
    setCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleMethod = (m: PersonalizationMethod) => {
    setAllowedMethods((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug: slug || undefined,
          description: description.trim() || null,
          basePrice: basePrice ? Number(basePrice) : null,
          stock: stock ? Number(stock) : null,
          minQtyStep,
          allowedMethods,
          active,
          categoryIds,
        }),
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(payload?.error || "No se pudo crear el producto");
        return;
      }

      router.push(`/admin/productos/${payload.id}/editar`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Cabecera */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-conquer-navy">Nuevo producto</h1>
          <p className="text-sm text-neutral-500">Completá los datos básicos del producto</p>
        </div>
        <button
          onClick={() => router.push("/admin/productos")}
          className="flex items-center gap-2 rounded-full border border-conquer-pink/30 px-4 py-2 text-sm text-conquer-navy hover:bg-conquer-pink/10"
        >
          <ChevronRight className="h-4 w-4 rotate-180" />
          Volver
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Información básica */}
        <div className="rounded-2xl border border-conquer-pink/30 bg-white p-6 shadow-sm">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Nombre */}
            <div className="space-y-2">
              <label className="flex items-center gap-1 text-sm font-medium text-conquer-navy">
                <Tag className="h-4 w-4" />
                Nombre *
              </label>
              <input
                className={`h-11 w-full rounded-2xl border px-4 outline-none transition-all focus:ring-2 ${
                  touched.name && errors.name
                    ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                    : "border-conquer-pink/30 focus:border-conquer-orange focus:ring-conquer-orange/20"
                }`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => handleBlur("name")}
                placeholder="Ej: Mate de acero 500ml"
              />
              {touched.name && errors.name && (
                <p className="flex items-center gap-1 text-xs text-red-500">
                  <AlertCircle className="h-3 w-3" />
                  {errors.name}
                </p>
              )}
            </div>

            {/* Slug */}
            <div className="space-y-2">
              <label className="flex items-center gap-1 text-sm font-medium text-conquer-navy">
                <Hash className="h-4 w-4" />
                Slug (opcional)
              </label>
              <input
                className={`h-11 w-full rounded-2xl border px-4 outline-none transition-all focus:ring-2 ${
                  touched.slug && errors.slug
                    ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                    : "border-conquer-pink/30 focus:border-conquer-orange focus:ring-conquer-orange/20"
                }`}
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                onBlur={() => handleBlur("slug")}
                placeholder="mate-acero-500"
              />
              {touched.slug && errors.slug && (
                <p className="flex items-center gap-1 text-xs text-red-500">
                  <AlertCircle className="h-3 w-3" />
                  {errors.slug}
                </p>
              )}
              <p className="text-xs text-neutral-500">
                Si lo dejás vacío, se genera desde el nombre.
              </p>
            </div>
          </div>

          {/* Descripción */}
          <div className="mt-4 space-y-2">
            <label className="flex items-center gap-1 text-sm font-medium text-conquer-navy">
              <FileText className="h-4 w-4" />
              Descripción
            </label>
            <textarea
              rows={4}
              className="min-h-28 w-full rounded-2xl border border-conquer-pink/30 px-4 py-3 outline-none transition-all focus:border-conquer-orange focus:ring-2 focus:ring-conquer-orange/20"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción corta para la ficha de producto"
            />
          </div>

          {/* Precio base y stock */}
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {/* Precio base */}
            <div className="space-y-2">
              <label className="flex items-center gap-1 text-sm font-medium text-conquer-navy">
                <DollarSign className="h-4 w-4" />
                Precio base (opcional)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">$</span>
                <input
                  className={`h-11 w-full rounded-2xl border pl-8 pr-4 outline-none transition-all focus:ring-2 ${
                    touched.basePrice && errors.basePrice
                      ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                      : "border-conquer-pink/30 focus:border-conquer-orange focus:ring-conquer-orange/20"
                  }`}
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  onBlur={() => handleBlur("basePrice")}
                  placeholder="0"
                  inputMode="numeric"
                />
              </div>
              {touched.basePrice && errors.basePrice && (
                <p className="flex items-center gap-1 text-xs text-red-500">
                  <AlertCircle className="h-3 w-3" />
                  {errors.basePrice}
                </p>
              )}
            </div>

            {/* Stock */}
            <div className="space-y-2">
              <label className="flex items-center gap-1 text-sm font-medium text-conquer-navy">
                <Package className="h-4 w-4" />
                Stock inicial (opcional)
              </label>
              <input
                className={`h-11 w-full rounded-2xl border px-4 outline-none transition-all focus:ring-2 ${
                  touched.stock && errors.stock
                    ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                    : "border-conquer-pink/30 focus:border-conquer-orange focus:ring-conquer-orange/20"
                }`}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                onBlur={() => handleBlur("stock")}
                placeholder="0"
                inputMode="numeric"
              />
              {touched.stock && errors.stock && (
                <p className="flex items-center gap-1 text-xs text-red-500">
                  <AlertCircle className="h-3 w-3" />
                  {errors.stock}
                </p>
              )}
              <p className="text-xs text-neutral-500">
                Si después creás variantes, el stock se manejará por variante.
              </p>
            </div>
          </div>

          {/* Múltiplos de compra */}
          <div className="mt-6 space-y-2">
            <label className="flex items-center gap-1 text-sm font-medium text-conquer-navy">
              <Layers className="h-4 w-4" />
              Múltiplos de compra
            </label>
            <select
              className="h-11 w-full rounded-2xl border border-conquer-pink/30 bg-white px-4 outline-none focus:border-conquer-orange focus:ring-2 focus:ring-conquer-orange/20"
              value={minQtyStep}
              onChange={(e) => setMinQtyStep(Number(e.target.value))}
            >
              <option value="1">Sin múltiplos (1 en 1)</option>
              <option value="5">Solo múltiplos de 5</option>
              <option value="10">Solo múltiplos de 10</option>
            </select>
          </div>
        </div>

        {/* Categorías */}
        <div className="rounded-2xl border border-conquer-pink/30 bg-white p-6 shadow-sm">
          <label className="flex items-center gap-1 text-sm font-medium text-conquer-navy">
            <Tag className="h-4 w-4" />
            Categorías
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            {categories.map((c) => {
              const isSelected = categoryIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleCategory(c.id)}
                  className={`flex items-center gap-1 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                    isSelected
                      ? "border-conquer-orange bg-conquer-orange text-white"
                      : "border-conquer-pink/30 bg-white text-conquer-navy hover:border-conquer-orange hover:bg-conquer-pink/10"
                  }`}
                >
                  {c.name}
                  {isSelected && <CheckCircle className="h-3.5 w-3.5" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Personalización permitida */}
        <div className="rounded-2xl border border-conquer-pink/30 bg-white p-6 shadow-sm">
          <label className="flex items-center gap-1 text-sm font-medium text-conquer-navy">
            <Sparkles className="h-4 w-4" />
            Personalización permitida (opcional)
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["DTF", "DTG", "FULL_COLOR", "LASER"] as const).map((m) => {
              const isSelected = allowedMethods.includes(m);
              const label =
                m === "FULL_COLOR" ? "Full color" : m === "LASER" ? "Láser" : m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleMethod(m)}
                  className={`flex items-center gap-1 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                    isSelected
                      ? "border-conquer-orange bg-conquer-orange text-white"
                      : "border-conquer-pink/30 bg-white text-conquer-navy hover:border-conquer-orange hover:bg-conquer-pink/10"
                  }`}
                >
                  {label}
                  {isSelected && <CheckCircle className="h-3.5 w-3.5" />}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            Elegí los métodos que aplican a este producto (después podés cambiarlo).
          </p>
        </div>

        {/* Activo */}
        <div className="rounded-2xl border border-conquer-pink/30 bg-white p-6 shadow-sm">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-5 w-5 rounded border-conquer-pink/30 text-conquer-orange focus:ring-conquer-orange/20"
            />
            <div>
              <span className="text-sm font-medium text-conquer-navy">Producto activo</span>
              <p className="text-xs text-neutral-500">
                Si está inactivo, no aparecerá en la tienda.
              </p>
            </div>
          </label>
        </div>

        {/* Botón de creación */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={disabled}
            className="flex items-center justify-center gap-2 rounded-2xl bg-conquer-orange px-8 py-3 text-sm font-semibold text-white shadow-md transition-all hover:scale-[1.02] hover:shadow-xl disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Creando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Crear producto
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
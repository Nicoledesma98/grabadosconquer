"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import ProductVariantsPanel from "@/components/admin/ProductVariantsPanel";
import {
  Save,
  Trash2,
  Upload,
  Image as ImageIcon,
  Tag,
  DollarSign,
  Layers,
  CheckCircle,
  AlertCircle,
  Package,
  Settings,
  ChevronRight,
  Sparkles,
  X,
  Plus,
  Edit,
  Box,
  Hash,
  FileText,
  Eye,
} from "lucide-react";

type Category = { id: string; name: string; slug: string };
type PersonalizationMethod = "DTF" | "DTG" | "FULL_COLOR" | "LASER";

type ProductDTO = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  basePrice: number | null;
  baseUsdPrice: string | number | null;
  stock: number | null; 
  active: boolean;
  minQtyStep?: number;
  images: { id: string; url: string; alt: string | null; sort: number }[];
  categories: { id: string; name: string; slug: string }[];
  priceTiers: { id: string; minQty: number; price: number }[];
  allowedMethods?: PersonalizationMethod[];
  variants: { id: string }[]; // para saber si tiene variantes
};

export default function AdminEditarProductoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  // Estados del formulario
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState<ProductDTO | null>(null);

  // Campos principales
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [baseUsdPrice, setBaseUsdPrice] = useState<string>("");
  const [stock, setStock] = useState<string>("");
  const [active, setActive] = useState(true);
  const [minQtyStep, setMinQtyStep] = useState<number>(1);
  const [allowedMethods, setAllowedMethods] = useState<PersonalizationMethod[]>([]);

  // Categorías
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);

  // Imágenes
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [newImgUrl, setNewImgUrl] = useState("");
  const [newImgAlt, setNewImgAlt] = useState("");

  // Price Tiers
  const [tierMinQty, setTierMinQty] = useState("1");
  const [tierPrice, setTierPrice] = useState("");

  // UI
  const [activeTab, setActiveTab] = useState<"info" | "images" | "variants" | "pricing">("info");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Cargar datos
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [pRes, cRes] = await Promise.all([
          fetch(`/api/admin/products/${id}`),
          fetch("/api/categories"),
        ]);

        if (!pRes.ok) {
          alert("No se pudo cargar el producto");
          router.push("/admin/productos");
          return;
        }

        const p = (await pRes.json()) as ProductDTO;
        const cats = (await cRes.json()) as Category[];

        setProduct(p);
        setName(p.name);
        setSlug(p.slug);
        setDescription(p.description ?? "");
        setBaseUsdPrice(p.baseUsdPrice == null ? "" : String(p.baseUsdPrice));
        setStock(p.stock == null ? "" : String(p.stock));
        setActive(p.active);
        setMinQtyStep(p.minQtyStep ?? 1);
        setAllowedMethods(p.allowedMethods ?? []);
        setCategoryIds(p.categories.map((x) => x.id));
        setCategories(cats);
      } catch (error) {
        console.error(error);
        alert("Error al cargar datos");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, router]);

  // Determinar si tiene variantes
  const hasVariants = useMemo(() => {
    return product?.variants && product.variants.length > 0;
  }, [product]);

  // Validaciones
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = "El nombre es requerido";
    if (!slug.trim()) newErrors.slug = "El slug es requerido";
    else if (!/^[a-zA-Z0-9-]+$/.test(slug))
      newErrors.slug = "Solo letras, números y guiones";

    if (baseUsdPrice === "") {
      newErrors.baseUsdPrice = "El costo base en USD es requerido";
    } else {
      const priceNum = Number(baseUsdPrice);
    
      if (isNaN(priceNum) || priceNum < 0)
        newErrors.baseUsdPrice = "Ingrese un valor en USD válido (mayor o igual a 0)";
    }

    // Stock: solo validar si no tiene variantes
    if (!hasVariants) {
      if (stock === "") {
        newErrors.stock = "El stock es requerido para productos sin variantes";
      } else {
        const stockNum = Number(stock);
        if (isNaN(stockNum) || !Number.isInteger(stockNum) || stockNum < 0)
          newErrors.stock = "Ingrese un número entero mayor o igual a 0";
      }
    }

    setErrors(newErrors);
    console.log("🔍 Errores de validación:", newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Guardar producto
  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    const isSurProduct = slug.startsWith('sur-');
    const stockToSend = (hasVariants || isSurProduct) ? null : (stock ? Number(stock) : null);
  console.log("hasVariants:", hasVariants, "isSurProduct:", isSurProduct, "stockToSend:", stockToSend);
  console.log("Enviando datos:", {
  name,
  slug,
  description,
  baseUsdPrice,
  stock: stockToSend,
  active,
  categoryIds,
  allowedMethods,
  minQtyStep,
});
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          description: description.trim() || null,
          baseUsdPrice: baseUsdPrice ? Number(baseUsdPrice) : null,
          stock: stockToSend,
          active,
          categoryIds,
          allowedMethods,
          minQtyStep,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(payload?.error || "No se pudo guardar");
        return;
      }

      alert("Producto guardado ✅");
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  // Eliminar producto
  async function onDelete() {
    if (!confirm("¿Seguro que querés ELIMINAR este producto? Esta acción no se puede deshacer."))
      return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(payload?.error || "No se pudo borrar");
        return;
      }
      alert("Producto eliminado ✅");
      router.push("/admin/productos");
    } finally {
      setSaving(false);
    }
  }

  // Funciones para imágenes, tiers, etc.
  async function uploadToCloudinary() {
    if (!uploadFile) return alert("Elegí un archivo primero");
    setUploading(true);
    try {
      const signRes = await fetch("/api/cloudinary/sign", { method: "POST" });
      const signed = await signRes.json();
      const form = new FormData();
      form.append("file", uploadFile);
      form.append("api_key", signed.apiKey);
      form.append("timestamp", String(signed.timestamp));
      form.append("signature", signed.signature);
      form.append("folder", signed.folder);

      const cloudRes = await fetch(
        `https://api.cloudinary.com/v1_1/${signed.cloudName}/auto/upload`,
        { method: "POST", body: form }
      );
      const uploaded = await cloudRes.json();
      if (!cloudRes.ok || !uploaded?.secure_url) throw new Error("Error en Cloudinary");

      const saveRes = await fetch(`/api/admin/products/${id}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: uploaded.secure_url, alt: name }),
      });
      if (!saveRes.ok) throw new Error("No se pudo guardar la imagen");

      setUploadFile(null);
      await refreshProduct();
    } catch (error) {
      console.error(error);
      alert("Error subiendo imagen");
    } finally {
      setUploading(false);
    }
  }

  async function setPrimary(imageId: string) {
    const res = await fetch(`/api/admin/products/${id}/images`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageId }),
    });
    if (res.ok) await refreshProduct();
  }

  async function deleteImage(imageId: string) {
    if (!confirm("¿Eliminar esta imagen?")) return;
    const res = await fetch(`/api/admin/products/${id}/images?imageId=${imageId}`, {
      method: "DELETE",
    });
    if (res.ok) await refreshProduct();
  }

  async function addTier() {
    const res = await fetch(`/api/admin/products/${id}/tiers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minQty: tierMinQty, price: tierPrice }),
    });
    if (res.ok) {
      await refreshProduct();
      setTierMinQty("1");
      setTierPrice("");
    } else {
      const payload = await res.json();
      alert(payload?.error || "No se pudo agregar tier");
    }
  }

  async function deleteTier(tierId: string) {
    if (!confirm("¿Eliminar este tier?")) return;
    const res = await fetch(`/api/admin/products/${id}/tiers?tierId=${tierId}`, {
      method: "DELETE",
    });
    if (res.ok) await refreshProduct();
  }

  async function refreshProduct() {
    const pRes = await fetch(`/api/admin/products/${id}`);
    const p = (await pRes.json()) as ProductDTO;
    setProduct(p);
    console.log("Producto cargado:",p)
    console.log("Variantes:", p.variants)
  }

  function toggleCategory(catId: string) {
    setCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((x) => x !== catId) : [...prev, catId]
    );
  }

  function toggleMethod(m: PersonalizationMethod) {
    setAllowedMethods((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  }

  // Marcar campo como tocado
  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-conquer-orange border-t-transparent" />
      </div>
    );
  }

  if (!product) return null;

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Cabecera */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-conquer-navy">Editar producto</h1>
          <p className="text-sm text-neutral-500">ID: {product.id}</p>
        </div>
        <button
          onClick={() => router.push("/admin/productos")}
          className="flex items-center gap-2 rounded-full border border-conquer-pink/30 px-4 py-2 text-sm text-conquer-navy hover:bg-conquer-pink/10"
        >
          <ChevronRight className="h-4 w-4 rotate-180" />
          Volver
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-conquer-pink/20">
        {[
          { id: "info", label: "Información", icon: Package },
          { id: "images", label: "Imágenes", icon: ImageIcon },
          { id: "variants", label: "Variantes", icon: Layers },
          { id: "pricing", label: "Precios", icon: DollarSign },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? "border-conquer-orange text-conquer-orange"
                  : "border-transparent text-conquer-navy/60 hover:text-conquer-navy"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <form onSubmit={onSave} className="space-y-6">
        {/* ========== TAB INFO ========== */}
        {activeTab === "info" && (
          <div className="space-y-6 rounded-2xl border border-conquer-pink/30 bg-white p-6 shadow-sm">
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
                  Slug *
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
                />
                {touched.slug && errors.slug && (
                  <p className="flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle className="h-3 w-3" />
                    {errors.slug}
                  </p>
                )}
              </div>
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <label className="flex items-center gap-1 text-sm font-medium text-conquer-navy">
                <FileText className="h-4 w-4" />
                Descripción
              </label>
              <textarea
                rows={5}
                className="min-h-32 w-full rounded-2xl border border-conquer-pink/30 px-4 py-3 outline-none transition-all focus:border-conquer-orange focus:ring-2 focus:ring-conquer-orange/20"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Precio base y Stock (condicional) */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Precio base */}
              <div className="space-y-2">
  <label className="flex items-center gap-1 text-sm font-medium text-conquer-navy">
    <DollarSign className="h-4 w-4" />
    Costo base en USD *
  </label>
  <div className="relative">
    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">USD</span>
    <input
      className={`h-11 w-full rounded-2xl border pl-14 pr-4 outline-none transition-all focus:ring-2 ${
        touched.baseUsdPrice && errors.baseUsdPrice
          ? "border-red-500 focus:border-red-500 focus:ring-red-200"
          : "border-conquer-pink/30 focus:border-conquer-orange focus:ring-conquer-orange/20"
      }`}
      value={baseUsdPrice}
      onChange={(e) => setBaseUsdPrice(e.target.value)}
      onBlur={() => handleBlur("baseUsdPrice")}
      inputMode="decimal"
      placeholder="0.22"
    />
  </div>
  {touched.baseUsdPrice && errors.baseUsdPrice && (
    <p className="flex items-center gap-1 text-xs text-red-500">
      <AlertCircle className="h-3 w-3" />
      {errors.baseUsdPrice}
    </p>
  )}
  <p className="text-xs text-neutral-500">
    El precio final en pesos se recalcula automáticamente según el dólar configurado y las reglas.
  </p>
</div>

              {/* Stock - solo si no tiene variantes */}
              {!hasVariants && (
                <div className="space-y-2">
                  <label className="flex items-center gap-1 text-sm font-medium text-conquer-navy">
                    <Package className="h-4 w-4" />
                    Stock *
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
                    inputMode="numeric"
                    placeholder="0"
                  />
                  {touched.stock && errors.stock && (
                    <p className="flex items-center gap-1 text-xs text-red-500">
                      <AlertCircle className="h-3 w-3" />
                      {errors.stock}
                    </p>
                  )}
                  <p className="text-xs text-neutral-500">
                    Este producto no tiene variantes, el stock se maneja globalmente.
                  </p>
                </div>
              )}
            </div>

            {/* Múltiplos de compra */}
            <div className="space-y-2">
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

            {/* Categorías */}
            <div className="space-y-3">
              <label className="flex items-center gap-1 text-sm font-medium text-conquer-navy">
                <Tag className="h-4 w-4" />
                Categorías
              </label>
              <div className="flex flex-wrap gap-2">
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
            <div className="space-y-3">
              <label className="flex items-center gap-1 text-sm font-medium text-conquer-navy">
                <Sparkles className="h-4 w-4" />
                Personalización permitida
              </label>
              <div className="flex flex-wrap gap-2">
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
              <p className="text-xs text-neutral-500">
                Elegí solo los métodos que apliquen a este producto.
              </p>
            </div>

            {/* Activo */}
            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-conquer-pink/30 bg-conquer-pink/5 p-4">
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
        )}

        {/* ========== TAB IMÁGENES ========== */}
        {activeTab === "images" && (
          <div className="space-y-6 rounded-2xl border border-conquer-pink/30 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-conquer-navy">
                <ImageIcon className="h-5 w-5" />
                Imágenes del producto
              </h3>
              <span className="text-xs text-neutral-500">
                {product.images.length} / 10 imágenes
              </span>
            </div>

            {/* Lista de imágenes */}
            {product.images.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-conquer-pink/30 bg-conquer-pink/5 p-8">
                <ImageIcon className="h-12 w-12 text-conquer-pink/40" />
                <p className="mt-2 text-sm text-neutral-600">Sin imágenes</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {product.images.map((img) => (
                  <div
                    key={img.id}
                    className="group relative overflow-hidden rounded-2xl border border-conquer-pink/30 bg-white p-3 transition-all hover:border-conquer-orange"
                  >
                    <div className="relative mb-2 aspect-square w-full overflow-hidden rounded-xl bg-conquer-pink/5">
                      <Image
                        src={img.url}
                        alt={img.alt ?? name}
                        fill
                        className="object-contain p-2"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {img.sort === 0 && (
                          <span className="rounded-full bg-conquer-orange/20 px-2 py-0.5 text-[10px] font-semibold text-conquer-orange">
                            Principal
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {img.sort !== 0 && (
                          <button
                            type="button"
                            onClick={() => setPrimary(img.id)}
                            className="rounded-full p-2 text-conquer-navy/60 hover:bg-conquer-pink/10 hover:text-conquer-orange"
                            title="Hacer principal"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => deleteImage(img.id)}
                          className="rounded-full p-2 text-conquer-navy/60 hover:bg-red-50 hover:text-red-600"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Subir imagen */}
            <div className="rounded-2xl border border-conquer-pink/30 bg-conquer-pink/5 p-5">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-conquer-navy">
                <Upload className="h-4 w-4" />
                Subir nueva imagen
              </h4>
              <div className="flex flex-col gap-4 sm:flex-row">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                  className="flex-1 rounded-full border border-conquer-pink/30 bg-white px-4 py-2 text-sm file:mr-4 file:rounded-full file:border-0 file:bg-conquer-orange file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-conquer-orange/90"
                />
                <button
                  type="button"
                  onClick={uploadToCloudinary}
                  disabled={uploading || !uploadFile}
                  className="flex items-center justify-center gap-2 rounded-full bg-conquer-orange px-6 py-2 text-sm font-semibold text-white shadow-md transition-all hover:scale-105 hover:shadow-xl disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Subir
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========== TAB VARIANTES ========== */}
        {activeTab === "variants" && (
          <div className="rounded-2xl border border-conquer-pink/30 bg-white p-6 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-conquer-navy">
              <Layers className="h-5 w-5" />
              Variantes (colores/talles)
            </h3>
            <ProductVariantsPanel productId={id} />
            {hasVariants && (
              <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
                <AlertCircle className="mr-2 inline h-4 w-4" />
                Este producto tiene variantes. El stock se maneja por variante, no globalmente.
              </div>
            )}
          </div>
        )}

        {/* ========== TAB PRECIOS ========== */}
        {activeTab === "pricing" && (
          <div className="space-y-6 rounded-2xl border border-conquer-pink/30 bg-white p-6 shadow-sm">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-conquer-navy">
              <DollarSign className="h-5 w-5" />
              Precios por cantidad (tiers)
            </h3>

            {product.priceTiers.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-conquer-pink/30 bg-conquer-pink/5 p-8 text-center">
                <Tag className="mx-auto h-10 w-10 text-conquer-pink/40" />
                <p className="mt-2 text-sm text-neutral-600">No hay precios por cantidad</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {product.priceTiers.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-2xl border border-conquer-pink/30 bg-white p-4"
                  >
                    <div>
                      <span className="text-sm font-medium text-conquer-navy">
                        Desde {t.minQty} unidades
                      </span>
                      <span className="ml-4 text-lg font-bold text-conquer-orange">
                        ${t.price}
                      </span>
                      <span className="ml-2 text-xs text-neutral-500">c/u</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteTier(t.id)}
                      className="rounded-full p-2 text-conquer-navy/60 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-2xl border border-conquer-pink/30 bg-conquer-pink/5 p-5">
              <h4 className="mb-3 text-sm font-semibold text-conquer-navy">Agregar nuevo tier</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-neutral-500">
                    desde
                  </span>
                  <input
                    className="h-11 w-full rounded-2xl border border-conquer-pink/30 pl-16 pr-4 outline-none focus:border-conquer-orange focus:ring-2 focus:ring-conquer-orange/20"
                    placeholder="10"
                    value={tierMinQty}
                    onChange={(e) => setTierMinQty(e.target.value)}
                    inputMode="numeric"
                  />
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-neutral-500">
                    precio
                  </span>
                  <input
                    className="h-11 w-full rounded-2xl border border-conquer-pink/30 pl-16 pr-4 outline-none focus:border-conquer-orange focus:ring-2 focus:ring-conquer-orange/20"
                    placeholder="11000"
                    value={tierPrice}
                    onChange={(e) => setTierPrice(e.target.value)}
                    inputMode="numeric"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={addTier}
                disabled={!tierMinQty || !tierPrice}
                className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-conquer-orange text-white shadow-md transition-all hover:scale-[1.02] hover:shadow-xl disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Agregar tier
              </button>
            </div>
          </div>
        )}

        {/* Botones de acción globales */}
        <div className="flex flex-col-reverse gap-4 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={onDelete}
            disabled={saving}
            className="flex items-center justify-center gap-2 rounded-2xl border border-red-300 px-6 py-3 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Eliminar producto
          </button>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push("/admin/productos")}
              className="flex items-center justify-center gap-2 rounded-2xl border border-conquer-pink/30 px-6 py-3 text-sm font-medium text-conquer-navy transition-colors hover:bg-conquer-pink/10"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || hasErrors}
              className="flex items-center justify-center gap-2 rounded-2xl bg-conquer-orange px-8 py-3 text-sm font-semibold text-white shadow-md transition-all hover:scale-[1.02] hover:shadow-xl disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Guardar cambios
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
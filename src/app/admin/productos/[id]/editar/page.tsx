"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Category = { id: string; name: string; slug: string };

type ProductDTO = {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    basePrice: number | null;
    active: boolean;
    images: { id: string; url: string; alt: string | null; sort: number }[];
    categories: { id: string; name: string; slug: string }[];
    priceTiers: { id: string; minQty: number; price: number }[];

};

export default function AdminEditarProductoPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [tierMinQty, setTierMinQty] = useState("1");
    const [tierPrice, setTierPrice] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [newImgUrl, setNewImgUrl] = useState("");
    const [newImgAlt, setNewImgAlt] = useState("");
    const [product, setProduct] = useState<ProductDTO | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [description, setDescription] = useState("");
    const [basePrice, setBasePrice] = useState<string>("");
    const [active, setActive] = useState(true);
    const [imageUrl, setImageUrl] = useState("");
    const [categories, setCategories] = useState<Category[]>([]);
    const [categoryIds, setCategoryIds] = useState<string[]>([]);

    const disabled = useMemo(() => saving || !name.trim(), [saving, name]);

    useEffect(() => {
        (async () => {
            setLoading(true);

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
            setBasePrice(p.basePrice == null ? "" : String(p.basePrice));
            setActive(p.active);
            setImageUrl(p.images[0]?.url ?? "");
            setCategoryIds(p.categories.map((x) => x.id));

            setCategories(cats);
            setLoading(false);
        })();
    }, [id, router]);
    async function onDelete() {
        if (!confirm("¿Seguro que querés ELIMINAR este producto? Esta acción no se puede deshacer.")) return;

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
    async function addTier() {
        const res = await fetch(`/api/admin/products/${id}/tiers`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ minQty: tierMinQty, price: tierPrice }),
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
            alert(payload?.error || "No se pudo agregar tier");
            return;
        }

        // recargar producto
        const pRes = await fetch(`/api/admin/products/${id}`);
        const p = (await pRes.json()) as ProductDTO;
        setProduct(p);
        setTierMinQty("1");
        setTierPrice("");
    }

    async function deleteTier(tierId: string) {
        if (!confirm("¿Eliminar este tier?")) return;

        const res = await fetch(`/api/admin/products/${id}/tiers?tierId=${tierId}`, {
            method: "DELETE",
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
            alert(payload?.error || "No se pudo eliminar");
            return;
        }

        const pRes = await fetch(`/api/admin/products/${id}`);
        const p = (await pRes.json()) as ProductDTO;
        setProduct(p);
    }
    async function refreshProduct() {
        const pRes = await fetch(`/api/admin/products/${id}`);
        const p = (await pRes.json()) as ProductDTO;
        setProduct(p);
    }

    async function addImage() {
        const res = await fetch(`/api/admin/products/${id}/images`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: newImgUrl, alt: newImgAlt }),
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) return alert(payload?.error || "No se pudo agregar imagen");

        setNewImgUrl("");
        setNewImgAlt("");
        await refreshProduct();
    }

    async function deleteImage(imageId: string) {
        if (!confirm("¿Eliminar esta imagen?")) return;

        const res = await fetch(`/api/admin/products/${id}/images?imageId=${imageId}`, {
            method: "DELETE",
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) return alert(payload?.error || "No se pudo eliminar imagen");

        await refreshProduct();
    }
    async function uploadToCloudinary() {
        if (!uploadFile) return alert("Elegí un archivo primero");

        setUploading(true);
        try {
            // 1) pedir firma al server
            const signRes = await fetch("/api/cloudinary/sign", { method: "POST" });
            const signed = await signRes.json();

            // 2) subir a Cloudinary
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

            if (!cloudRes.ok || !uploaded?.secure_url) {
                console.error("Cloudinary error:", uploaded);
                alert("Error subiendo a Cloudinary (mirá la consola)");
                return;
            }

            // 3) guardar en DB
            const saveRes = await fetch(`/api/admin/products/${id}/images`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: uploaded.secure_url, alt: name }),
            });

            const payload = await saveRes.json().catch(() => ({}));

            if (!saveRes.ok) {
                console.error("DB save error:", payload);
                alert(payload?.error || "No se pudo guardar la imagen");
                return;
            }

            // limpiar + refrescar
            setUploadFile(null);
            await refreshProduct();
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
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) return alert(payload?.error || "No se pudo setear principal");

        await refreshProduct();
    }


    function toggleCategory(catId: string) {
        setCategoryIds((prev) =>
            prev.includes(catId) ? prev.filter((x) => x !== catId) : [...prev, catId]
        );
    }

    async function onSave(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);

        try {
            const res = await fetch(`/api/admin/products/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    slug,
                    description: description.trim() || null,
                    basePrice,
                    active,
                    imageUrl: imageUrl.trim() || null,
                    categoryIds,
                }),
            });

            const payload = await res.json().catch(() => ({}));

            if (!res.ok) {
                alert(payload?.error || "No se pudo guardar");
                return;
            }

            alert("Guardado ✅");
            router.refresh();
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <main className="p-6 max-w-3xl mx-auto">
                <div className="rounded-2xl border p-6 text-neutral-600">Cargando...</div>
            </main>
        );
    }

    if (!product) return null;

    return (
        <main className="p-6 max-w-3xl mx-auto">
            <div className="flex items-center justify-between gap-4">
                <h1 className="text-2xl font-semibold">Editar producto</h1>
                <button
                    onClick={() => router.push("/admin/productos")}
                    className="h-10 px-4 rounded-2xl border hover:bg-neutral-50"
                >
                    Volver
                </button>
            </div>

            <form onSubmit={onSave} className="mt-6 rounded-2xl border p-5 grid gap-4">
                <div className="grid gap-2">
                    <label className="text-sm text-neutral-700">Nombre *</label>
                    <input
                        className="h-11 rounded-2xl border px-4"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>

                <div className="grid gap-2">
                    <label className="text-sm text-neutral-700">Slug</label>
                    <input
                        className="h-11 rounded-2xl border px-4"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                    />
                </div>

                <div className="grid gap-2">
                    <label className="text-sm text-neutral-700">Descripción</label>
                    <textarea
                        className="min-h-28 rounded-2xl border px-4 py-3"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>

                <div className="grid gap-2">
                    <label className="text-sm text-neutral-700">Precio base</label>
                    <input
                        className="h-11 rounded-2xl border px-4"
                        value={basePrice}
                        onChange={(e) => setBasePrice(e.target.value)}
                        inputMode="numeric"
                    />
                </div>

                <div className="grid gap-2">
                    <label className="text-sm text-neutral-700">Imágenes</label>

                    <div className="rounded-2xl border p-4">
                        {product.images.length === 0 ? (
                            <div className="text-sm text-neutral-600">Sin imágenes.</div>
                        ) : (
                            <div className="grid gap-3">
                                {product.images.map((img) => (
                                    <div key={img.id} className="flex items-center gap-3">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={img.url} alt={img.alt ?? name} className="h-16 w-16 rounded-xl border object-cover" />

                                        <div className="flex-1">
                                            <div className="text-sm break-all">{img.url}</div>
                                            <div className="text-xs text-neutral-500">
                                                {img.sort === 0 ? "Principal" : `Orden: ${img.sort}`}
                                            </div>
                                        </div>

                                        {img.sort !== 0 && (
                                            <button
                                                type="button"
                                                onClick={() => setPrimary(img.id)}
                                                className="text-sm rounded-xl border px-3 py-1.5 hover:bg-neutral-50"
                                            >
                                                Hacer principal
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => deleteImage(img.id)}
                                            className="text-sm rounded-xl border border-red-300 text-red-700 px-3 py-1.5 hover:bg-red-50"
                                        >
                                            Borrar
                                        </button>
                                    </div>
                                ))}

                            </div>
                        )}
                        <div className="mt-4 rounded-2xl border p-4">
                            <div className="text-sm font-medium">Subir imagen (Cloudinary)</div>

                            <input
                                className="mt-3"
                                type="file"
                                accept="image/*"
                                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                            />

                            <button
                                type="button"
                                onClick={uploadToCloudinary}
                                disabled={uploading || !uploadFile}
                                className="mt-3 h-11 w-full rounded-2xl bg-black text-white disabled:opacity-50"
                            >
                                {uploading ? "Subiendo..." : "Subir y guardar"}
                            </button>

                            <div className="mt-6 border-t pt-4">
                                <div className="text-sm font-medium">Agregar imagen por URL</div>

                                <div className="mt-3 grid gap-3">
                                    <input
                                        className="h-11 rounded-2xl border px-4"
                                        placeholder="URL imagen (https://...)"
                                        value={newImgUrl}
                                        onChange={(e) => setNewImgUrl(e.target.value)}
                                    />
                                    <input
                                        className="h-11 rounded-2xl border px-4"
                                        placeholder="Alt (opcional)"
                                        value={newImgAlt}
                                        onChange={(e) => setNewImgAlt(e.target.value)}
                                    />

                                    <button
                                        type="button"
                                        onClick={addImage}
                                        className="h-11 w-full rounded-2xl bg-black text-white hover:opacity-90"
                                    >
                                        Agregar imagen
                                    </button>
                                </div>
                            </div>
                        </div>


                    </div>
                </div>


                <div className="grid gap-2">
                    <label className="text-sm text-neutral-700">Categorías</label>
                    <div className="flex flex-wrap gap-2">
                        {categories.map((c) => {
                            const on = categoryIds.includes(c.id);
                            return (
                                <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => toggleCategory(c.id)}
                                    className={`px-3 py-1.5 rounded-full border text-sm ${on ? "bg-black text-white" : "hover:bg-neutral-50"
                                        }`}
                                >
                                    {c.name}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div className="grid gap-2">
                    <label className="text-sm text-neutral-700">Price Tiers (precio por cantidad)</label>

                    <div className="rounded-2xl border p-4">
                        {product.priceTiers.length === 0 ? (
                            <div className="text-sm text-neutral-600">Sin tiers. Se usa el precio base.</div>
                        ) : (
                            <div className="grid gap-2">
                                {product.priceTiers.map((t) => (
                                    <div key={t.id} className="flex items-center justify-between gap-3">
                                        <div className="text-sm">
                                            Desde <b>{t.minQty}</b> → <b>${t.price}</b>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => deleteTier(t.id)}
                                            className="text-sm rounded-xl border px-3 py-1.5 hover:bg-neutral-50"
                                        >
                                            Eliminar
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="mt-4 grid grid-cols-2 gap-3">
                            <input
                                className="h-11 rounded-2xl border px-4"
                                placeholder="minQty (ej: 10)"
                                value={tierMinQty}
                                onChange={(e) => setTierMinQty(e.target.value)}
                                inputMode="numeric"
                            />
                            <input
                                className="h-11 rounded-2xl border px-4"
                                placeholder="precio (ej: 11000)"
                                value={tierPrice}
                                onChange={(e) => setTierPrice(e.target.value)}
                                inputMode="numeric"
                            />
                        </div>

                        <button
                            type="button"
                            onClick={addTier}
                            className="mt-3 h-11 w-full rounded-2xl bg-black text-white hover:opacity-90"
                        >
                            Agregar tier
                        </button>
                    </div>
                </div>

                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={active}
                        onChange={(e) => setActive(e.target.checked)}
                    />
                    Producto activo
                </label>
                <button
                    disabled={disabled}
                    className="h-11 rounded-2xl bg-black text-white disabled:opacity-50"
                >
                    {saving ? "Guardando..." : "Guardar cambios"}
                </button>
                <div className="pt-4 border-t flex items-center justify-between">
                    <div className="text-sm text-neutral-600">
                        Si el producto ya tiene pedidos, no se puede borrar. Desactivalo.
                    </div>
                    <button
                        type="button"
                        onClick={onDelete}
                        className="h-11 px-4 rounded-2xl border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50"
                        disabled={saving}
                    >
                        Eliminar producto
                    </button>
                </div>
            </form>
        </main>
    );
}

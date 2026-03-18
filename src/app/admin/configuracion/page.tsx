"use client";

import { useEffect, useState } from "react";
import { Save, Plus, Trash2, Edit, AlertCircle, CheckCircle } from "lucide-react";

type PriceRule = {
  id?: string;
  minUsd: number;
  maxUsd: number;
  multiplier: number;
};

export default function ConfiguracionPage() {
  const [exchangeRate, setExchangeRate] = useState<number>(1200);
  const [rules, setRules] = useState<PriceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Estado para el formulario de nuevo/editar
  const [formRule, setFormRule] = useState<PriceRule>({ minUsd: 0, maxUsd: 0, multiplier: 1.5 });
  const [editingId, setEditingId] = useState<string | null>(null);

  // Cargar configuración actual
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch("/api/admin/configuracion");
        const data = await res.json();
        setExchangeRate(data.exchangeRate);
        setRules(data.rules);
      } catch (error) {
        console.error("Error cargando configuración:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/configuracion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exchangeRate, rules }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Configuración guardada correctamente" });
        // Opcional: recargar los datos para asegurar consistencia
        const updated = await fetch("/api/admin/configuracion").then(r => r.json());
        setExchangeRate(updated.exchangeRate);
        setRules(updated.rules);
      } else {
        setMessage({ type: "error", text: "Error al guardar la configuración" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error de conexión" });
    } finally {
      setSaving(false);
    }
  };

  const addRule = () => {
    if (formRule.minUsd === 0 && formRule.maxUsd === 0 && formRule.multiplier === 1.5) {
      // Si el formulario está vacío, agregar uno nuevo con valores por defecto
      const newRule = { minUsd: 0, maxUsd: 0, multiplier: 1.5 };
      setRules([...rules, newRule]);
    } else {
      // Agregar el que está en el formulario
      if (editingId) {
        // Actualizar existente
        setRules(rules.map(r => r.id === editingId ? { ...formRule, id: editingId } : r));
        setEditingId(null);
      } else {
        // Agregar nuevo (sin id)
        setRules([...rules, { ...formRule }]);
      }
      // Limpiar formulario
      setFormRule({ minUsd: 0, maxUsd: 0, multiplier: 1.5 });
    }
  };

  const editRule = (rule: PriceRule) => {
    setFormRule({ minUsd: rule.minUsd, maxUsd: rule.maxUsd, multiplier: rule.multiplier });
    setEditingId(rule.id || null);
  };

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-conquer-orange"></div></div>;

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-bold text-conquer-navy mb-6">⚙️ Configuración de precios</h1>

      {/* Mensaje de éxito/error */}
      {message && (
        <div className={`mb-4 p-4 rounded-2xl flex items-center gap-2 ${
          message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {message.type === "success" ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          <span className="text-sm">{message.text}</span>
        </div>
      )}

      {/* Cotización del dólar */}
      <div className="bg-white rounded-2xl border border-conquer-pink/30 p-6 mb-6 shadow-sm">
        <h2 className="text-lg font-semibold text-conquer-navy mb-4 flex items-center gap-2">
          <span>💵</span> Cotización del dólar (en pesos)
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-neutral-600">ARS/USD</span>
          <input
            type="number"
            value={exchangeRate}
            onChange={(e) => setExchangeRate(Number(e.target.value))}
            className="h-11 rounded-2xl border border-conquer-pink/30 px-4 w-48 focus:border-conquer-orange focus:ring-2 focus:ring-conquer-orange/20 outline-none"
            step="0.01"
            min="0"
          />
        </div>
      </div>

      {/* Márgenes por rangos */}
      <div className="bg-white rounded-2xl border border-conquer-pink/30 p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-conquer-navy flex items-center gap-2">
            <span>📊</span> Márgenes por rango de precio (USD)
          </h2>
          <button
            onClick={addRule}
            className="flex items-center gap-2 rounded-full bg-conquer-orange px-4 py-2 text-sm font-semibold text-white shadow-sm hover:scale-105 transition-all"
          >
            <Plus className="h-4 w-4" />
            Agregar rango
          </button>
        </div>

        {/* Tabla de márgenes */}
        {rules.length === 0 ? (
          <div className="text-center py-8 text-neutral-500 border-2 border-dashed border-conquer-pink/30 rounded-2xl">
            No hay márgenes configurados. Agregá uno usando el botón.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-conquer-pink/10 border-b border-conquer-pink/30">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-conquer-navy">Precio mínimo (USD)</th>
                  <th className="px-4 py-3 text-left font-semibold text-conquer-navy">Precio máximo (USD)</th>
                  <th className="px-4 py-3 text-left font-semibold text-conquer-navy">Multiplicador</th>
                  <th className="px-4 py-3 text-right font-semibold text-conquer-navy">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule, index) => (
                  <tr key={rule.id || index} className="border-b border-conquer-pink/10 hover:bg-conquer-pink/5">
                    <td className="px-4 py-3 text-conquer-navy">{rule.minUsd}</td>
                    <td className="px-4 py-3 text-conquer-navy">{rule.maxUsd}</td>
                    <td className="px-4 py-3 text-conquer-navy">{rule.multiplier}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => editRule(rule)}
                        className="p-2 text-conquer-navy/60 hover:bg-conquer-pink/10 rounded-full mr-1"
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => removeRule(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Formulario para nuevo/editar margen */}
        <div className="mt-6 p-4 bg-conquer-pink/5 rounded-2xl border border-conquer-pink/30">
          <h3 className="text-sm font-medium text-conquer-navy mb-3">
            {editingId ? "✏️ Editar margen" : "➕ Agregar nuevo margen"}
          </h3>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Mín USD</label>
              <input
                type="number"
                value={formRule.minUsd}
                onChange={(e) => setFormRule({ ...formRule, minUsd: Number(e.target.value) })}
                className="h-11 rounded-2xl border border-conquer-pink/30 px-4 w-32 focus:border-conquer-orange focus:ring-2 focus:ring-conquer-orange/20 outline-none"
                step="0.01"
                min="0"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Máx USD</label>
              <input
                type="number"
                value={formRule.maxUsd}
                onChange={(e) => setFormRule({ ...formRule, maxUsd: Number(e.target.value) })}
                className="h-11 rounded-2xl border border-conquer-pink/30 px-4 w-32 focus:border-conquer-orange focus:ring-2 focus:ring-conquer-orange/20 outline-none"
                step="0.01"
                min="0"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Multiplicador</label>
              <input
                type="number"
                value={formRule.multiplier}
                onChange={(e) => setFormRule({ ...formRule, multiplier: Number(e.target.value) })}
                className="h-11 rounded-2xl border border-conquer-pink/30 px-4 w-32 focus:border-conquer-orange focus:ring-2 focus:ring-conquer-orange/20 outline-none"
                step="0.01"
                min="0"
              />
            </div>
            <button
              onClick={addRule}
              className="h-11 px-6 rounded-2xl bg-conquer-orange text-white font-semibold hover:scale-105 transition-all shadow-sm"
            >
              {editingId ? "Actualizar" : "Agregar"}
            </button>
            {editingId && (
              <button
                onClick={() => {
                  setFormRule({ minUsd: 0, maxUsd: 0, multiplier: 1.5 });
                  setEditingId(null);
                }}
                className="h-11 px-4 rounded-2xl border border-conquer-pink/30 text-conquer-navy hover:bg-conquer-pink/10"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Botón guardar configuración */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-2xl bg-conquer-orange px-6 py-3 text-white font-semibold shadow-md hover:scale-105 transition-all disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? "Guardando..." : "Guardar configuración"}
        </button>
      </div>
    </div>
  );
}
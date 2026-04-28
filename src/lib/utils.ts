export function formatOrderCode(orderNumber: number): string {
  return `CNQ-${String(orderNumber).padStart(5, "0")}`;
}

export function formatARS(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}


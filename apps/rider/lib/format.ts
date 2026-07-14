/** Format an amount as PKR currency, e.g. `PKR 1,250`. */
export function formatMoney(n: number): string {
  return `PKR ${n.toLocaleString()}`;
}

/** Short, uppercased order reference from a UUID, e.g. `#A1B2C3D4`. */
export function formatOrderRef(id: string): string {
  return `#${id.slice(0, 8).toUpperCase()}`;
}

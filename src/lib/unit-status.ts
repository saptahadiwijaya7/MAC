// Shared helpers for unit status + sale flag presentation.

export interface StatusMeta {
  label: string;
  cls: string;
  dot: string;
}

export function isAvailable(status: string): boolean {
  return status.trim().toLowerCase() === "available";
}

export function statusMeta(status: string): StatusMeta {
  switch (status.trim().toLowerCase()) {
    case "available":
      return { label: "Available", cls: "bg-ok-soft text-ok", dot: "bg-ok" };
    case "borrowed":
      return { label: "Borrowed", cls: "bg-brand-soft text-brand", dot: "bg-brand" };
    case "maintenance":
      return { label: "Maintenance", cls: "bg-warn-soft text-warn", dot: "bg-warn" };
    case "lost":
      return { label: "Hilang", cls: "bg-danger-soft text-danger", dot: "bg-danger" };
    case "sold":
      return { label: "Terjual", cls: "bg-slate-800 text-white", dot: "bg-white" };
    default:
      return {
        label: status || "—",
        cls: "bg-slate-100 text-slate-500",
        dot: "bg-slate-400",
      };
  }
}

// how a unit came to be "for sale"
export function saleLabel(sale: string): string {
  const s = sale.trim().toLowerCase();
  if (s === "auto") return "Dijual (umur)";
  if (s === "manual") return "Dijual";
  return "";
}

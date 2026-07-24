import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  ArrowDownToLine,
  ArrowUpFromLine,
  Tag,
  Receipt,
  History,
  Activity,
  BarChart3,
  ClipboardCheck,
  QrCode,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  group?: string;
  minRole?: "user" | "admin";
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Asset", href: "/assets", icon: Package, group: "Inventory" },
  { label: "Opname", href: "/opname", icon: ClipboardCheck, group: "Inventory", minRole: "user" },
  { label: "Label QR", href: "/labels", icon: QrCode, group: "Inventory", minRole: "user" },
  { label: "Peminjaman", href: "/transaction/borrow", icon: ArrowUpFromLine, group: "Transaksi", minRole: "user" },
  { label: "Pengembalian", href: "/transaction/return", icon: ArrowDownToLine, group: "Transaksi", minRole: "user" },
  { label: "Ready Dijual", href: "/ready-dijual", icon: Tag, group: "Transaksi" },
  { label: "Rekap Jual", href: "/sales", icon: Receipt, group: "Transaksi" },
  { label: "History", href: "/history", icon: History, group: "Insight" },
  { label: "Tracking", href: "/tracking", icon: Activity, group: "Insight" },
  { label: "Report", href: "/report", icon: BarChart3, group: "Insight" },
  { label: "Settings", href: "/settings", icon: Settings, group: "System", minRole: "admin" },
];

// kept for future quick-action wiring
export const TRANSACTION_ICON = ArrowLeftRight;

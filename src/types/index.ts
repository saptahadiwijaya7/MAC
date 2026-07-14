export type AssetStatus =
  | "available"
  | "borrowed"
  | "maintenance"
  | "ready-sale"
  | "overdue";

export interface Asset {
  id: string;
  assetNo: string;
  name: string;
  group: string;
  location: string;
  status: AssetStatus;
  timesBorrowed: number;
  lastBorrowed: string | null;
}

export interface ActivityItem {
  id: string;
  time: string;
  actor: string;
  action: "borrow" | "return" | "overdue";
  target: string;
}

export interface BorrowPoint {
  month: string;
  count: number;
}

export interface StatDatum {
  label: string;
  value: number;
  tone: "brand" | "info" | "warn" | "danger" | "ok";
}

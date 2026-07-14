import type { Asset, ActivityItem, BorrowPoint, StatDatum } from "@/types";

export const STATS: StatDatum[] = [
  { label: "Total Asset", value: 248, tone: "brand" },
  { label: "Sedang Dipinjam", value: 18, tone: "info" },
  { label: "Ready Dijual", value: 12, tone: "ok" },
  { label: "Maintenance", value: 3, tone: "warn" },
  { label: "Terlambat", value: 2, tone: "danger" },
];

export const BORROW_ACTIVITY: BorrowPoint[] = [
  { month: "Jan", count: 34 },
  { month: "Feb", count: 71 },
  { month: "Mar", count: 22 },
  { month: "Apr", count: 55 },
  { month: "Mei", count: 83 },
  { month: "Jun", count: 61 },
  { month: "Jul", count: 47 },
];

export const RECENT_ACTIVITY: ActivityItem[] = [
  { id: "a1", time: "09.12", actor: "Ahmad", action: "borrow", target: "Sony A7 IV" },
  { id: "a2", time: "10.20", actor: "Rudi", action: "return", target: "DJI RS3" },
  { id: "a3", time: "11.15", actor: "Marketing", action: "borrow", target: "Lighting Kit" },
  { id: "a4", time: "13.02", actor: "Video Team", action: "overdue", target: "Sony A7 III" },
  { id: "a5", time: "14.40", actor: "Sarah", action: "return", target: "MAONO PD100" },
];

export const TOP_ASSETS: { name: string; count: number }[] = [
  { name: "Sony A7 IV", count: 86 },
  { name: "MAONO PD100", count: 74 },
  { name: "Tripod Manfrotto", count: 69 },
  { name: "DJI RS3", count: 58 },
  { name: "Lighting Kit", count: 41 },
];

export const ASSETS: Asset[] = [
  { id: "1", assetNo: "A0025", name: "MAONO PD100", group: "Audio", location: "Rak Video", status: "available", timesBorrowed: 24, lastBorrowed: "8 Jul 2026" },
  { id: "2", assetNo: "A0026", name: "TOA ZT1015S", group: "Audio", location: "Rak 2", status: "borrowed", timesBorrowed: 12, lastBorrowed: "9 Jul 2026" },
  { id: "3", assetNo: "A0027", name: "Kabel XLR 10M", group: "Cable", location: "Box Audio", status: "available", timesBorrowed: 41, lastBorrowed: "5 Jul 2026" },
  { id: "4", assetNo: "V0012", name: "Sony A7 IV", group: "Camera", location: "Rak Kamera", status: "borrowed", timesBorrowed: 86, lastBorrowed: "10 Jul 2026" },
  { id: "5", assetNo: "V0013", name: "DJI RS3", group: "Gimbal", location: "Rak Kamera", status: "maintenance", timesBorrowed: 58, lastBorrowed: "3 Jul 2026" },
  { id: "6", assetNo: "V0014", name: "Tripod Manfrotto", group: "Support", location: "Rak Video", status: "available", timesBorrowed: 69, lastBorrowed: "7 Jul 2026" },
  { id: "7", assetNo: "L0003", name: "Lighting Kit Godox", group: "Lighting", location: "Rak Lampu", status: "overdue", timesBorrowed: 41, lastBorrowed: "1 Jul 2026" },
  { id: "8", assetNo: "A0031", name: "Rode Wireless GO II", group: "Audio", location: "Box Audio", status: "available", timesBorrowed: 33, lastBorrowed: "6 Jul 2026" },
  { id: "9", assetNo: "V0020", name: "Sony A7 III", group: "Camera", location: "Rak Kamera", status: "ready-sale", timesBorrowed: 120, lastBorrowed: "20 Jun 2026" },
  { id: "10", assetNo: "L0007", name: "Softbox 80cm", group: "Lighting", location: "Rak Lampu", status: "available", timesBorrowed: 18, lastBorrowed: "4 Jul 2026" },
];

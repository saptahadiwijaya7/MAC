// Clean types for MAC data, mapped from the Apps Script (sheet-header) shapes.

export interface Unit {
  unitId: string;
  indukNo: string;
  item: string;
  group: string;
  lokasi: string;
  status: string; // available | borrowed | maintenance | lost
  sale: string; // "" | manual | auto
  kondisi: string;
  tag: string;
  timesBorrowed: number;
  lastBorrowed: string;
  photo: string; // Drive file id ("" if none)
  purchaseDate: string;
  hargaBeli: number;
  hargaJual: number; // recommended sale price from MASTER
}

export interface TransactionItem {
  transactionId: string;
  unitId: string;
  item: string;
  statusItem: string; // dipinjam | kembali
  kondisiKembali: string;
  returnedAt: string;
  lokasi: string;
  photo: string;
}

export interface Transaction {
  id: string;
  peminjam: string;
  divisi: string;
  tanggalPinjam: string;
  kembaliRencana: string;
  kembaliAktual: string;
  status: string; // dipinjam | sebagian kembali | selesai
  catatan: string;
  kegiatan: string;
  createdAt: string;
  createdBy: string;
  items?: TransactionItem[];
}

export interface BorrowPayload {
  createdBy?: string;
  peminjam: string;
  divisi: string;
  kegiatan: string;
  kembaliRencana: string;
  catatan: string;
  unitIds: string[];
}

export interface UploadPhotoPayload {
  unitId: string;
  base64: string;
  mimeType: string;
}

export interface ReturnPayload {
  transactionId: string;
  returns: { unitId: string; kondisi: string }[];
}

export interface UpdateUnitPayload {
  unitId: string;
  status?: string;
  sale?: string;
  kondisi?: string;
  lokasi?: string;
}

export interface AddAssetPayload {
  group: string;
  item: string;
  qty: number;
  no?: string;
  lokasi?: string;
  purchaseDate?: string;
  hargaBeli?: string;
  remarks?: string;
}

// ---- mappers (raw = object keyed by sheet headers) ----
type Raw = Record<string, unknown>;
const s = (v: unknown) => (v === null || v === undefined ? "" : String(v)).trim();
const n = (v: unknown) => {
  const x = parseInt(String(v), 10);
  return isNaN(x) ? 0 : x;
};

export function mapUnit(r: Raw): Unit {
  return {
    unitId: s(r["Unit ID"]),
    indukNo: s(r["Induk No"]),
    item: s(r["Item"]),
    group: s(r["Group"]),
    lokasi: s(r["Lokasi"]),
    status: s(r["Status"]),
    sale: s(r["Sale"]),
    kondisi: s(r["Kondisi"]),
    tag: s(r["Tag"]),
    timesBorrowed: n(r["Times Borrowed"]),
    lastBorrowed: s(r["Last Borrowed"]),
    photo: s(r["Photo"]),
    purchaseDate: s(r["Purchase Date"]),
    hargaBeli: n(r["Harga Beli"]),
    hargaJual: n(r["Rekom Hrg Jual"]),
  };
}

export function mapTransaction(r: Raw): Transaction {
  const items = Array.isArray(r["items"])
    ? (r["items"] as Raw[]).map(mapTransactionItem)
    : undefined;
  return {
    id: s(r["Transaction ID"]),
    peminjam: s(r["Peminjam"]),
    divisi: s(r["Divisi"]),
    tanggalPinjam: s(r["Tanggal Pinjam"]),
    kembaliRencana: s(r["Kembali Rencana"]),
    kembaliAktual: s(r["Kembali Aktual"]),
    status: s(r["Status"]),
    catatan: s(r["Catatan"]),
    kegiatan: s(r["Kegiatan"]),
    createdBy: s(r["Created By"]),
    createdAt: s(r["Created At"]),
    items,
  };
}

export function mapTransactionItem(r: Raw): TransactionItem {
  return {
    transactionId: s(r["Transaction ID"]),
    unitId: s(r["Unit ID"]),
    item: s(r["Item"]),
    statusItem: s(r["Status Item"]),
    kondisiKembali: s(r["Kondisi Kembali"]),
    returnedAt: s(r["Returned At"]),
    lokasi: s(r["Lokasi"]),
    photo: s(r["Photo"]),
  };
}

export interface UsageRow {
  item: string;
  count: number;
  last: string;
}

export interface SellPayload {
  unitId: string;
  buyer: string;
  salePrice: number;
  saleDate?: string;
  proofBase64?: string;
  proofMimeType?: string;
}

export interface SaleRecord {
  saleId: string;
  unitId: string;
  item: string;
  group: string;
  buyer: string;
  salePrice: number;
  saleDate: string;
  proof: string; // Drive file id ("" if none)
  recordedAt: string;
  recordedBy: string;
}

export function mapSale(r: Raw): SaleRecord {
  return {
    saleId: s(r["Sale ID"]),
    unitId: s(r["Unit ID"]),
    item: s(r["Item"]),
    group: s(r["Group"]),
    buyer: s(r["Buyer"]),
    salePrice: n(r["Sale Price"]),
    saleDate: s(r["Sale Date"]),
    proof: s(r["Proof Photo"]),
    recordedAt: s(r["Recorded At"]),
    recordedBy: s(r["Recorded By"]),
  };
}

export interface AppConfig {
  divisions: string[];
  companyName: string;
  saleAgeMonths: number;
  overdueDays: number;
}

export interface UserRow {
  name: string;
  email: string;
  role: "admin" | "user";
  active: boolean;
  createdAt: string;
}

export interface UpdateTransactionPayload {
  transactionId: string;
  peminjam?: string;
  divisi?: string;
  kegiatan?: string;
  kembaliRencana?: string;
  catatan?: string;
  addUnitIds?: string[];
  removeUnitIds?: string[];
}

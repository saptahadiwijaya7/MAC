/**
 * Marketing Asset Center — Apps Script backend (v2)
 * ------------------------------------------------------------
 * Data model (per-unit):
 *   MASTER              -> your existing master (structure untouched)
 *   Units               -> one row per PHYSICAL unit (borrowing happens here)
 *   Transactions        -> one row per borrow (ID: BOR-YYYYMMDD-###)
 *   TransactionItems    -> one row per unit inside a transaction
 *
 * v2 changes:
 *   - "Sale" is now a SEPARATE flag on each unit ("" | "manual" | "auto"),
 *     independent from Status. A unit that is available AND for-sale is still
 *     borrowable. Status values: available | borrowed | maintenance | lost.
 *   - Admin can change a unit's status / sale flag manually (action "updateUnit").
 *   - Auto sale-by-age: on Build/Refresh Units, units past their lifespan are
 *     flagged Sale = "auto" (never overwriting a "manual" flag).
 *
 * Setup:  MAC menu -> 1) Setup tabs -> 2) Build / Refresh Units. Then deploy Web App.
 */

// ============================================================
// CONFIG  — change TOKEN before you deploy.
// ============================================================
var CONFIG = {
  MASTER_SHEET: "MASTER",
  UNITS_SHEET: "Units",
  TX_SHEET: "Transactions",
  TXITEMS_SHEET: "TransactionItems",
  SALES_SHEET: "Sales",
  DIVISIONS_SHEET: "Divisions",
  USERS_SHEET: "Users",
  SETTINGS_SHEET: "Settings",

  TOKEN: "CHANGE_ME_TO_A_LONG_RANDOM_STRING",

  DEFAULT_QTY_WHEN_BLANK: 1,
  UPDATE_MASTER_COUNTS: true,

  // Auto-flag units "Sale = auto" once they are OLDER THAN SALE_AGE_MONTHS.
  // Accounting rule: >= 4 years (48 months). Below that -> admin-manual only.
  AUTO_SALE_BY_AGE: true,
  SALE_AGE_MONTHS: 48,

  // Loan considered overdue when no return-date set and borrowed longer than this many days.
  OVERDUE_DAYS: 7,

  // Google Drive folder that stores asset photos.
  PHOTO_FOLDER_ID: "1oCpOvesmp-4NqbP6Ibej3tvilox6tBUN",
};

var MASTER_HEADERS = {
  no: "No",
  group: "Group",
  item: "Item",
  qty: "Qty",
  picked: "Picked",
  available: "Available",
  purchaseDate: "Purchase Date",
  lifeSpan: "LifeSpan (Month)",
  hargaBeli: "Harga Beli",
  lokasi: "Lokasi",
  assetNo: "Asset No.",
  remarks: "Remarks",
  status: "Status",
  image: "Image",
};

// NOTE: new columns appended at the END so existing sheets migrate in place.
var UNIT_HEADERS = [
  "Unit ID", "Induk No", "Item", "Group", "Lokasi",
  "Status", "Kondisi", "Tag", "Times Borrowed", "Last Borrowed", "Sale", "Photo",
];
var TX_HEADERS = [
  "Transaction ID", "Peminjam", "Divisi", "Tanggal Pinjam",
  "Kembali Rencana", "Kembali Aktual", "Status", "Catatan", "Created At", "Kegiatan", "Created By",
];
var TXITEM_HEADERS = [
  "Transaction ID", "Unit ID", "Item", "Status Item", "Kondisi Kembali", "Returned At",
];
var SALES_HEADERS = [
  "Sale ID", "Unit ID", "Item", "Group", "Buyer", "Sale Price", "Sale Date", "Proof Photo", "Recorded At", "Recorded By",
];
var USER_HEADERS = ["Name", "Email", "Password Hash", "Role", "Active", "Created At"];
var VALID_ROLES = ["admin", "user"];
var DEFAULT_DIVISIONS = ["Marketing", "Video Team", "Design", "Social Media", "Sales", "HR", "Umum"];

var VALID_STATUS = ["available", "borrowed", "maintenance", "lost", "sold"];
var VALID_SALE = ["", "manual", "auto"];

// ============================================================
// MENU
// ============================================================
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("MAC")
    .addItem("1) Setup tabs", "setup")
    .addItem("2) Build / Refresh Units", "buildUnits")
    .addSeparator()
    .addItem("3) Buat / Reset Admin…", "menuCreateAdmin")
    .addItem("Set API Token…", "menuSetApiToken")
    .addItem("Health check (log)", "healthCheck")
    .addToUi();
}

/** Store the API token in Script Properties so it survives Code.gs pastes. */
function menuSetApiToken() {
  var ui = SpreadsheetApp.getUi();
  var cur = "";
  try {
    cur = PropertiesService.getScriptProperties().getProperty("API_TOKEN") || "";
  } catch (e) {
    cur = "";
  }
  var hint = cur
    ? "Token saat ini sudah diset (tersembunyi). Isi baru untuk mengganti, atau Batal untuk membiarkannya."
    : "Belum ada token tersimpan. Masukkan token (samakan persis dengan MAC_API_TOKEN di .env.local).";
  var r = ui.prompt("Set API Token", hint, ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var val = r.getResponseText().trim();
  if (!val) {
    ui.alert("Dibatalkan: token kosong.");
    return;
  }
  PropertiesService.getScriptProperties().setProperty("API_TOKEN", val);
  ui.alert(
    "Token API tersimpan di Script Properties.\n\n" +
      "Langkah berikutnya:\n" +
      "1) Set MAC_API_TOKEN di .env.local = token yang sama.\n" +
      "2) Jalankan 'Buat / Reset Admin…' untuk membuat ulang password admin.\n" +
      "3) Re-deploy Web App (New version), lalu restart server Next."
  );
}

/** Bootstrap / reset: create the first admin, or reset an existing user's password + make them admin. */
function menuCreateAdmin() {
  var ui = SpreadsheetApp.getUi();
  var e = ui.prompt("Buat / Reset Admin", "Email (mis. nama@cpssoft.com):", ui.ButtonSet.OK_CANCEL);
  if (e.getSelectedButton() !== ui.Button.OK) return;
  var n = ui.prompt("Buat / Reset Admin", "Nama lengkap:", ui.ButtonSet.OK_CANCEL);
  if (n.getSelectedButton() !== ui.Button.OK) return;
  var p = ui.prompt("Buat / Reset Admin", "Password baru:", ui.ButtonSet.OK_CANCEL);
  if (p.getSelectedButton() !== ui.Button.OK) return;
  var res = upsertAdmin_(n.getResponseText(), e.getResponseText(), p.getResponseText());
  ui.alert(res.ok ? "Admin siap: " + res.email : "Gagal: " + res.error);
}

/** Create the admin if new, otherwise reset password + role=admin + active. */
function upsertAdmin_(name, email, password) {
  name = String(name || "").trim();
  email = String(email || "").trim().toLowerCase();
  password = String(password || "");
  if (!email) return { ok: false, error: "email wajib" };
  if (!password) return { ok: false, error: "password wajib" };
  var sh = usersSheet_();
  var row = findUserRow_(sh, email);
  if (row < 0) {
    sh.appendRow([name || email, email, hashPassword_(password), "admin", true, now_()]);
    return { ok: true, email: email, created: true };
  }
  if (name) sh.getRange(row, 1).setValue(name);
  sh.getRange(row, 3).setValue(hashPassword_(password));
  sh.getRange(row, 4).setValue("admin");
  sh.getRange(row, 5).setValue(true);
  return { ok: true, email: email, created: false };
}

function healthCheck() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var master = ss.getSheetByName(CONFIG.MASTER_SHEET);
  var msg = master
    ? "MASTER found. Rows: " + master.getLastRow()
    : "MASTER NOT found — check CONFIG.MASTER_SHEET.";
  var propSet = false;
  try {
    propSet = !!PropertiesService.getScriptProperties().getProperty("API_TOKEN");
  } catch (e) {
    propSet = false;
  }
  var tokMsg = propSet
    ? "API token: dari Script Properties (aman dari paste)."
    : (getToken_() === "CHANGE_ME_TO_A_LONG_RANDOM_STRING"
        ? "API token: BELUM diset (auth nonaktif). Jalankan Set API Token…"
        : "API token: dari CONFIG.TOKEN (akan ketimpa saat paste Code.gs). Sebaiknya Set API Token…");
  ss.toast(msg + " | " + tokMsg, "MAC", 8);
  Logger.log(msg + " | " + tokMsg);
}

// ============================================================
// SETUP
// ============================================================
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheetWithHeaders_(ss, CONFIG.UNITS_SHEET, UNIT_HEADERS);
  ensureSheetWithHeaders_(ss, CONFIG.TX_SHEET, TX_HEADERS);
  ensureSheetWithHeaders_(ss, CONFIG.TXITEMS_SHEET, TXITEM_HEADERS);
  ensureSheetWithHeaders_(ss, CONFIG.SALES_SHEET, SALES_HEADERS);

  // Config-ish tabs
  var divSh = ensureSheetWithHeaders_(ss, CONFIG.DIVISIONS_SHEET, ["Division"]);
  if (divSh.getLastRow() < 2) {
    var seed = DEFAULT_DIVISIONS.map(function (d) { return [d]; });
    divSh.getRange(2, 1, seed.length, 1).setValues(seed);
  }
  ensureSheetWithHeaders_(ss, CONFIG.USERS_SHEET, USER_HEADERS);
  var setSh = ensureSheetWithHeaders_(ss, CONFIG.SETTINGS_SHEET, ["Key", "Value"]);
  ensureSetting_(setSh, "company_name", "Accurate Marketing");
  ensureSetting_(setSh, "sale_age_months", CONFIG.SALE_AGE_MONTHS);
  ensureSetting_(setSh, "overdue_days", CONFIG.OVERDUE_DAYS);
  ss.toast("Tabs ready. Now run Build / Refresh Units.", "MAC", 5);
}

function ensureSheetWithHeaders_(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    ensureColumns_(sh, headers); // migrate: append any missing columns
  }
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight("bold");
  return sh;
}

/** Append any header in `headers` that is missing from row 1 (keeps existing data). */
function ensureColumns_(sh, headers) {
  var lastCol = sh.getLastColumn();
  var current = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) {
    return String(h).trim().toLowerCase();
  });
  headers.forEach(function (h) {
    if (current.indexOf(String(h).trim().toLowerCase()) === -1) {
      lastCol++;
      sh.getRange(1, lastCol).setValue(h);
      current.push(String(h).trim().toLowerCase());
    }
  });
}

// ============================================================
// BUILD UNITS (idempotent) + sale-flag refresh
// ============================================================
function buildUnits() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var unitsSh = ensureSheetWithHeaders_(ss, CONFIG.UNITS_SHEET, UNIT_HEADERS);

    var master = readMaster_();
    var masterByNo = {};
    master.rows.forEach(function (r) {
      var no = String(r.no || "").trim();
      if (no) masterByNo[no] = r;
    });

    // existing unit ids
    var existing = {};
    if (unitsSh.getLastRow() > 1) {
      var ids = unitsSh.getRange(2, 1, unitsSh.getLastRow() - 1, 1).getValues();
      for (var i = 0; i < ids.length; i++) existing[String(ids[i][0]).trim()] = true;
    }

    var newRows = [];
    var flagged = [];

    master.rows.forEach(function (r) {
      var no = String(r.no || "").trim();
      if (!no) return;

      var qty = parseInt(r.qty, 10);
      if (isNaN(qty) || qty < 1) {
        qty = CONFIG.DEFAULT_QTY_WHEN_BLANK;
        flagged.push(no);
      }

      var alreadyUnit = /-\d+$/.test(no);
      var unitIds = [];
      if (alreadyUnit || qty === 1) unitIds.push(no);
      else for (var u = 1; u <= qty; u++) unitIds.push(no + "-" + u);

      var kondisi = String(r.status || "").trim();
      var status = "available";
      if (/hilang|lost/i.test(kondisi)) status = "lost";
      else if (/rusak|broken/i.test(kondisi)) status = "maintenance";

      var sale = saleFor_(r); // "", "manual" or "auto"

      unitIds.forEach(function (uid) {
        if (existing[uid]) return;
        newRows.push([
          uid, no, r.item, r.group, r.lokasi,
          status, kondisi, String(r.remarks || "").trim(), 0, "", sale, "",
        ]);
        existing[uid] = true;
      });
    });

    if (newRows.length) {
      unitsSh
        .getRange(unitsSh.getLastRow() + 1, 1, newRows.length, UNIT_HEADERS.length)
        .setValues(newRows);
    }

    // Recompute the Sale column for ALL units (preserve manual; apply/clear auto).
    refreshSaleColumn_(unitsSh, masterByNo);

    if (CONFIG.UPDATE_MASTER_COUNTS) refreshAllMasterCounts_();

    var note = "Units built. Added " + newRows.length + " new unit(s).";
    if (flagged.length) {
      note += " Qty blank on: " + flagged.slice(0, 6).join(", ") +
        (flagged.length > 6 ? " …" : "") + " (assumed " + CONFIG.DEFAULT_QTY_WHEN_BLANK + ").";
    }
    ss.toast(note, "MAC", 8);
  } finally {
    lock.releaseLock();
  }
}

/** Decide initial sale flag for a master row. */
function saleFor_(r) {
  if (/for sale/i.test(String(r.remarks || ""))) return "manual";
  if (CONFIG.AUTO_SALE_BY_AGE && isOlderThanMonths_(r.purchaseDate, CONFIG.SALE_AGE_MONTHS)) return "auto";
  return "";
}

/** One batched pass over the Sale column. Manual stays; auto applied/cleared by age. */
function refreshSaleColumn_(unitsSh, masterByNo) {
  if (unitsSh.getLastRow() < 2) return;
  var values = unitsSh.getDataRange().getValues();
  var head = values[0];
  var cInduk = head.indexOf("Induk No");
  var cSale = head.indexOf("Sale");
  var cStatus = head.indexOf("Status");
  if (cSale === -1) return;

  var out = [];
  for (var i = 1; i < values.length; i++) {
    var current = String(values[i][cSale]).trim();
    // sold units are terminal — leave their flag untouched
    if (cStatus !== -1 && String(values[i][cStatus]).trim().toLowerCase() === "sold") {
      out.push([current]);
      continue;
    }
    var induk = String(values[i][cInduk]).trim();
    var m = masterByNo[induk];
    var manual = current === "manual" || (m && /for sale/i.test(String(m.remarks || "")));
    var sale;
    if (manual) sale = "manual";
    else if (CONFIG.AUTO_SALE_BY_AGE && m && isOlderThanMonths_(m.purchaseDate, CONFIG.SALE_AGE_MONTHS)) sale = "auto";
    else sale = "";
    out.push([sale]);
  }
  unitsSh.getRange(2, cSale + 1, out.length, 1).setValues(out);
}

function isOlderThanMonths_(purchaseDate, thresholdMonths) {
  var threshold = parseInt(thresholdMonths, 10);
  if (isNaN(threshold) || threshold <= 0) return false;
  var pd = purchaseDate instanceof Date ? purchaseDate : (purchaseDate ? new Date(purchaseDate) : null);
  if (!pd || isNaN(pd.getTime())) return false;
  var now = new Date();
  var months = (now.getFullYear() - pd.getFullYear()) * 12 + (now.getMonth() - pd.getMonth());
  return months >= threshold;
}

// ============================================================
// WEB APP API
// ============================================================
function doGet(e) {
  try {
    var p = (e && e.parameter) || {};
    checkToken_(p.token);
    var action = p.action || "ping";
    if (action === "ping") return jsonOut_({ ok: true, service: "MAC", ts: now_() });
    if (action === "units") return jsonOut_({ ok: true, units: listUnits_(p) });
    if (action === "history") return jsonOut_({ ok: true, transactions: listTransactions_() });
    if (action === "usage") return jsonOut_({ ok: true, usage: listUsage_(p) });
    if (action === "sales") return jsonOut_({ ok: true, sales: listSales_(p) });
    if (action === "sale") {
      if (!p.id) return jsonOut_({ ok: false, error: "missing id" });
      return jsonOut_({ ok: true, sale: getSale_(p.id) });
    }
    if (action === "config") return jsonOut_({ ok: true, config: getConfig_() });
    if (action === "users") return jsonOut_({ ok: true, users: listUsers_() });
    if (action === "role") return jsonOut_(getRole_(p));
    if (action === "photo") {
      if (!p.id) return jsonOut_({ ok: false, error: "missing id" });
      return jsonOut_(getPhoto_(p.id));
    }
    if (action === "transaction") {
      if (!p.id) return jsonOut_({ ok: false, error: "missing id" });
      return jsonOut_({ ok: true, transaction: getTransaction_(p.id) });
    }
    return jsonOut_({ ok: false, error: "unknown action: " + action });
  } catch (err) {
    return jsonOut_({ ok: false, error: errStr_(err) });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) body = JSON.parse(e.postData.contents);
    checkToken_(body.token);
    var action = body.action;
    if (action === "borrow") return jsonOut_(createBorrow_(body));
    if (action === "return") return jsonOut_(processReturn_(body));
    if (action === "updateUnit") return jsonOut_(updateUnit_(body));
    if (action === "addAsset") return jsonOut_(addAsset_(body));
    if (action === "sellAsset") return jsonOut_(sellAsset_(body));
    if (action === "setDivisions") return jsonOut_(setDivisions_(body));
    if (action === "setSettings") return jsonOut_(setSettings_(body));
    if (action === "updateTransaction") return jsonOut_(updateTransaction_(body));
    if (action === "deleteTransaction") return jsonOut_(deleteTransaction_(body));
    if (action === "addUser") return jsonOut_(addUser_(body));
    if (action === "updateUser") return jsonOut_(updateUser_(body));
    if (action === "deleteUser") return jsonOut_(deleteUser_(body));
    if (action === "login") return jsonOut_(login_(body));
    if (action === "uploadPhoto") return jsonOut_(uploadPhoto_(body));
    return jsonOut_({ ok: false, error: "unknown action: " + String(action) });
  } catch (err) {
    return jsonOut_({ ok: false, error: errStr_(err) });
  } finally {
    lock.releaseLock();
  }
}

// ---- admin: change a unit's status and/or sale flag ----
function updateUnit_(body) {
  var unitId = String(body.unitId || "").trim();
  if (!unitId) return { ok: false, error: "unitId wajib" };

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var unitsSh = ss.getSheetByName(CONFIG.UNITS_SHEET);
  var u = indexUnits_(unitsSh);
  var row = u.byId[unitId];
  if (!row) return { ok: false, error: "unit tidak ditemukan: " + unitId };

  var currentStatus = String(u.data[row - 2][u.col.Status]).trim().toLowerCase();
  if (currentStatus === "sold") {
    return { ok: false, error: "unit sudah terjual — status terkunci" };
  }

  var changed = {};

  if (body.status !== undefined) {
    var st = String(body.status).trim().toLowerCase();
    if (VALID_STATUS.indexOf(st) === -1) return { ok: false, error: "status tidak valid: " + st };
    if (st === "sold" && currentStatus === "borrowed") {
      return { ok: false, error: "kembalikan dulu sebelum ditandai terjual" };
    }
    unitsSh.getRange(row, u.col.Status + 1).setValue(st);
    changed.status = st;
  }
  if (body.sale !== undefined) {
    var sl = String(body.sale).trim().toLowerCase();
    if (VALID_SALE.indexOf(sl) === -1) return { ok: false, error: "sale tidak valid: " + sl };
    unitsSh.getRange(row, u.col.Sale + 1).setValue(sl);
    changed.sale = sl;
  }
  if (body.kondisi !== undefined) {
    unitsSh.getRange(row, u.col.Kondisi + 1).setValue(String(body.kondisi));
    changed.kondisi = String(body.kondisi);
  }
  if (body.lokasi !== undefined) {
    unitsSh.getRange(row, u.col.Lokasi + 1).setValue(String(body.lokasi));
    changed.lokasi = String(body.lokasi);
  }

  if (changed.status !== undefined && CONFIG.UPDATE_MASTER_COUNTS) {
    var induk = u.data[row - 2][u.col["Induk No"]];
    updateMasterCounts_(induk);
  }
  return { ok: true, unitId: unitId, changed: changed };
}

// ---- sell an asset (records a Sale + locks the unit as sold) ----
function sellAsset_(body) {
  var unitId = String(body.unitId || "").trim();
  var buyer = String(body.buyer || "").trim();
  if (!unitId) return { ok: false, error: "unitId wajib" };
  if (!buyer) return { ok: false, error: "nama pembeli wajib" };

  var price = Number(body.salePrice);
  if (isNaN(price) || price < 0) price = 0;
  var saleDate = String(body.saleDate || "").trim() || todayStr_();

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var unitsSh = ss.getSheetByName(CONFIG.UNITS_SHEET);
    var u = indexUnits_(unitsSh);
    var row = u.byId[unitId];
    if (!row) return { ok: false, error: "unit tidak ditemukan: " + unitId };

    var d = u.data[row - 2];
    var st = String(d[u.col.Status]).trim().toLowerCase();
    if (st === "sold") return { ok: false, error: "unit sudah terjual" };
    if (st === "borrowed") return { ok: false, error: "kembalikan dulu sebelum menjual" };

    var item = d[u.col.Item];
    var group = d[u.col.Group];
    var induk = d[u.col["Induk No"]];

    // optional proof photo -> Drive
    var proofId = "";
    if (body.proofBase64 && CONFIG.PHOTO_FOLDER_ID) {
      var raw = String(body.proofBase64);
      var ci = raw.indexOf("base64,");
      if (ci >= 0) raw = raw.substring(ci + 7);
      var bytes = Utilities.base64Decode(raw);
      var mime = String(body.proofMimeType || "image/jpeg");
      var blob = Utilities.newBlob(bytes, mime, "SALE_" + unitId + "_" + Utilities.formatDate(new Date(), tz_(), "yyyyMMdd-HHmmss") + ".jpg");
      proofId = DriveApp.getFolderById(CONFIG.PHOTO_FOLDER_ID).createFile(blob).getId();
    }

    var saleId = nextSaleId_();
    var salesSh = ensureSheetWithHeaders_(ss, CONFIG.SALES_SHEET, SALES_HEADERS);
    salesSh.appendRow([saleId, unitId, item, group, buyer, price, saleDate, proofId, now_(), String(body.recordedBy || "")]);

    // lock the unit
    unitsSh.getRange(row, u.col.Status + 1).setValue("sold");
    if (CONFIG.UPDATE_MASTER_COUNTS) updateMasterCounts_(induk);

    return { ok: true, saleId: saleId, unitId: unitId, proof: proofId };
  } finally {
    lock.releaseLock();
  }
}

function nextSaleId_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SALES_SHEET);
  var prefix = "SALE-" + Utilities.formatDate(new Date(), tz_(), "yyyyMMdd") + "-";
  var max = 0;
  if (sh && sh.getLastRow() > 1) {
    var ids = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      var id = String(ids[i][0]).trim();
      if (id.indexOf(prefix) === 0) {
        var nn = parseInt(id.substring(prefix.length), 10);
        if (!isNaN(nn) && nn > max) max = nn;
      }
    }
  }
  return prefix + ("000" + (max + 1)).slice(-3);
}

function listSales_(p) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SALES_SHEET);
  if (!sh || sh.getLastRow() < 2) return [];
  var values = sh.getDataRange().getValues();
  var head = values[0];
  var from = String(p.from || "");
  var to = String(p.to || "");
  var out = [];
  for (var i = 1; i < values.length; i++) {
    var obj = {};
    for (var c = 0; c < head.length; c++) obj[head[c]] = values[i][c];
    var d = ymdStr_(obj["Sale Date"]);
    if (from && d < from) continue;
    if (to && d > to) continue;
    obj["Sale Date"] = d;
    out.push(obj);
  }
  // newest first
  out.sort(function (a, b) { return a["Sale ID"] < b["Sale ID"] ? 1 : -1; });
  return out;
}

function getSale_(id) {
  id = String(id || "").trim();
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SALES_SHEET);
  if (!sh || sh.getLastRow() < 2) return null;
  var values = sh.getDataRange().getValues();
  var head = values[0];
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim() === id) {
      var obj = {};
      for (var c = 0; c < head.length; c++) obj[head[c]] = values[i][c];
      obj["Sale Date"] = ymdStr_(obj["Sale Date"]);
      return obj;
    }
  }
  return null;
}

// ============================================================
// SETTINGS · DIVISIONS · USERS
// ============================================================
function readDivisions_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.DIVISIONS_SHEET);
  if (!sh || sh.getLastRow() < 2) return DEFAULT_DIVISIONS.slice();
  var vals = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
  var out = [];
  vals.forEach(function (r) {
    var v = String(r[0] || "").trim();
    if (v) out.push(v);
  });
  return out.length ? out : DEFAULT_DIVISIONS.slice();
}

/** Append a Settings key with a default value only if it doesn't already exist. */
function ensureSetting_(sh, key, val) {
  var vals = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues() : [];
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][0]).trim() === key) return;
  }
  sh.appendRow([key, val]);
}

function readSettingsKV_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SETTINGS_SHEET);
  var kv = {};
  if (sh && sh.getLastRow() > 1) {
    var vals = sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues();
    vals.forEach(function (r) {
      var k = String(r[0] || "").trim();
      if (k) kv[k] = r[1];
    });
  }
  return kv;
}

function getConfig_() {
  var cached = cacheGet_("config_v1");
  if (cached) return cached;
  var kv = readSettingsKV_();
  var cfg = {
    divisions: readDivisions_(),
    companyName: kv.company_name ? String(kv.company_name) : "Accurate Marketing",
    saleAgeMonths: kv.sale_age_months !== undefined && kv.sale_age_months !== ""
      ? Number(kv.sale_age_months) : CONFIG.SALE_AGE_MONTHS,
    overdueDays: kv.overdue_days !== undefined && kv.overdue_days !== ""
      ? Number(kv.overdue_days) : CONFIG.OVERDUE_DAYS,
  };
  cachePut_("config_v1", cfg, 60);
  return cfg;
}

function setDivisions_(body) {
  var list = body.divisions;
  if (!Array.isArray(list)) return { ok: false, error: "divisions harus array" };
  var clean = [];
  var seen = {};
  list.forEach(function (d) {
    var v = String(d || "").trim();
    if (v && !seen[v.toLowerCase()]) { seen[v.toLowerCase()] = true; clean.push(v); }
  });
  if (!clean.length) return { ok: false, error: "minimal 1 divisi" };
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ensureSheetWithHeaders_(ss, CONFIG.DIVISIONS_SHEET, ["Division"]);
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 1).clearContent();
  sh.getRange(2, 1, clean.length, 1).setValues(clean.map(function (d) { return [d]; }));
  cacheDel_(["config_v1"]);
  return { ok: true, divisions: clean };
}

function setSettings_(body) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ensureSheetWithHeaders_(ss, CONFIG.SETTINGS_SHEET, ["Key", "Value"]);
  function put(key, val) {
    var vals = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues() : [];
    for (var i = 0; i < vals.length; i++) {
      if (String(vals[i][0]).trim() === key) { sh.getRange(i + 2, 2).setValue(val); return; }
    }
    sh.appendRow([key, val]);
  }
  if (body.companyName !== undefined) put("company_name", String(body.companyName));
  if (body.saleAgeMonths !== undefined && body.saleAgeMonths !== "") put("sale_age_months", Number(body.saleAgeMonths));
  if (body.overdueDays !== undefined && body.overdueDays !== "") put("overdue_days", Number(body.overdueDays));
  cacheDel_(["config_v1"]);
  return { ok: true };
}

function hashPassword_(pw) {
  var raw = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    getToken_() + ":" + String(pw)
  );
  return raw.map(function (b) { return ("0" + (b & 0xff).toString(16)).slice(-2); }).join("");
}

function usersSheet_() {
  return ensureSheetWithHeaders_(SpreadsheetApp.getActiveSpreadsheet(), CONFIG.USERS_SHEET, USER_HEADERS);
}

function listUsers_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.USERS_SHEET);
  if (!sh || sh.getLastRow() < 2) return [];
  var vals = sh.getDataRange().getValues();
  var h = vals[0];
  var out = [];
  for (var i = 1; i < vals.length; i++) {
    var o = {};
    for (var c = 0; c < h.length; c++) o[h[c]] = vals[i][c];
    out.push({
      name: String(o["Name"] || ""),
      email: String(o["Email"] || ""),
      role: String(o["Role"] || "user"),
      active: String(o["Active"]).toLowerCase() !== "false" && o["Active"] !== false,
      createdAt: String(o["Created At"] || ""),
    });
  }
  return out;
}

function findUserRow_(sh, email) {
  if (sh.getLastRow() < 2) return -1;
  var emails = sh.getRange(2, 2, sh.getLastRow() - 1, 1).getValues();
  var target = String(email || "").trim().toLowerCase();
  for (var i = 0; i < emails.length; i++) {
    if (String(emails[i][0]).trim().toLowerCase() === target) return i + 2;
  }
  return -1;
}

function addUser_(body) {
  var name = String(body.name || "").trim();
  var email = String(body.email || "").trim().toLowerCase();
  var role = String(body.role || "user").trim().toLowerCase();
  var pw = String(body.password || "");
  if (!name) return { ok: false, error: "nama wajib" };
  if (!email) return { ok: false, error: "email wajib" };
  if (!pw) return { ok: false, error: "password wajib" };
  if (VALID_ROLES.indexOf(role) === -1) return { ok: false, error: "role tidak valid" };
  var sh = usersSheet_();
  if (findUserRow_(sh, email) > 0) return { ok: false, error: "email sudah terdaftar" };
  sh.appendRow([name, email, hashPassword_(pw), role, true, now_()]);
  return { ok: true, email: email, role: role };
}

function updateUser_(body) {
  var email = String(body.email || "").trim().toLowerCase();
  if (!email) return { ok: false, error: "email wajib" };
  var sh = usersSheet_();
  var row = findUserRow_(sh, email);
  if (row < 0) return { ok: false, error: "user tidak ditemukan" };
  if (body.name !== undefined) sh.getRange(row, 1).setValue(String(body.name));
  if (body.role !== undefined) {
    var r = String(body.role).trim().toLowerCase();
    if (VALID_ROLES.indexOf(r) === -1) return { ok: false, error: "role tidak valid" };
    sh.getRange(row, 4).setValue(r);
  }
  if (body.active !== undefined) sh.getRange(row, 5).setValue(!!body.active);
  if (body.password) sh.getRange(row, 3).setValue(hashPassword_(body.password));
  return { ok: true };
}

function deleteUser_(body) {
  var email = String(body.email || "").trim().toLowerCase();
  var sh = usersSheet_();
  var row = findUserRow_(sh, email);
  if (row < 0) return { ok: false, error: "user tidak ditemukan" };
  sh.deleteRow(row);
  return { ok: true };
}

function login_(body) {
  var email = String(body.email || "").trim().toLowerCase();
  var pw = String(body.password || "");
  if (!email || !pw) return { ok: false, error: "email & password wajib" };
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.USERS_SHEET);
  if (!sh || sh.getLastRow() < 2) return { ok: false, error: "belum ada user terdaftar" };
  var row = findUserRow_(sh, email);
  if (row < 0) return { ok: false, error: "email atau password salah" };
  var rec = sh.getRange(row, 1, 1, USER_HEADERS.length).getValues()[0];
  var active = String(rec[4]).toLowerCase() !== "false" && rec[4] !== false;
  if (!active) return { ok: false, error: "akun nonaktif" };
  if (hashPassword_(pw) !== String(rec[2])) return { ok: false, error: "email atau password salah" };
  return { ok: true, user: { name: String(rec[0]), email: String(rec[1]), role: String(rec[3] || "user") } };
}

/** Resolve a user's role by email. Unlisted -> viewer; inactive -> viewer. */
function getRole_(p) {
  var email = String(p.email || "").trim().toLowerCase();
  if (!email) return { ok: true, role: "viewer", active: true, name: "" };
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.USERS_SHEET);
  if (!sh) return { ok: true, role: "viewer", active: true, name: "" };
  var row = findUserRow_(sh, email);
  if (row < 0) return { ok: true, role: "viewer", active: true, name: "" };
  var rec = sh.getRange(row, 1, 1, USER_HEADERS.length).getValues()[0];
  var active = String(rec[4]).toLowerCase() !== "false" && rec[4] !== false;
  var role = active ? String(rec[3] || "user").toLowerCase() : "viewer";
  if (["admin", "user", "viewer"].indexOf(role) === -1) role = "viewer";
  return { ok: true, role: role, active: active, name: String(rec[0]) };
}

// ---- admin: add a brand-new asset (new MASTER row + units) ----
function addAsset_(body) {
  var group = String(body.group || "").trim();
  var item = String(body.item || "").trim();
  if (!group) return { ok: false, error: "group wajib" };
  if (!item) return { ok: false, error: "nama barang wajib" };

  var qty = parseInt(body.qty, 10);
  if (isNaN(qty) || qty < 1) qty = 1;

  var m = readMaster_();
  var noSet = {};
  m.rows.forEach(function (r) {
    var n = String(r.no || "").trim();
    if (n) noSet[n] = true;
  });

  var no = String(body.no || "").trim();
  if (!no) {
    no = nextNoForGroup_(m, group);
    if (!no) return { ok: false, error: "Grup baru tanpa pola No — isi kolom 'No' manual." };
  }
  if (noSet[no]) return { ok: false, error: "No sudah dipakai: " + no };

  var lastCol = m.sheet.getLastColumn();
  var row = [];
  for (var i = 0; i < lastCol; i++) row.push("");

  var setCols = {};
  function set(key, val) {
    if (m.idx[key] >= 0) { row[m.idx[key]] = val; setCols[m.idx[key]] = true; }
  }
  set("no", no);
  set("group", group);
  set("item", item);
  set("qty", qty);
  set("picked", 0);
  set("available", qty);
  set("lokasi", String(body.lokasi || ""));
  set("remarks", String(body.remarks || ""));
  set("assetNo", no);
  if (body.purchaseDate) set("purchaseDate", body.purchaseDate);
  if (body.hargaBeli !== undefined && body.hargaBeli !== "") {
    var hb = Number(body.hargaBeli);
    set("hargaBeli", isNaN(hb) ? body.hargaBeli : hb);
  }

  var newRowNum = m.sheet.getLastRow() + 1;
  m.sheet.getRange(newRowNum, 1, 1, lastCol).setValues([row]);

  // Copy formulas (Today, LifeSpan, Depreciation, …) from the previous data row
  // for any column we did NOT fill, so computed columns keep working.
  try {
    var prev = newRowNum - 1;
    if (prev >= m.headerRow + 2) {
      var fs = m.sheet.getRange(prev, 1, 1, lastCol).getFormulasR1C1()[0];
      for (var c = 0; c < lastCol; c++) {
        if (fs[c] && !setCols[c]) m.sheet.getRange(newRowNum, c + 1).setFormulaR1C1(fs[c]);
      }
    }
  } catch (e) { /* formulas are best-effort */ }

  var sale = saleFor_({ remarks: String(body.remarks || ""), purchaseDate: body.purchaseDate || "" });
  var count = createUnitsForNo_(no, item, group, String(body.lokasi || ""), qty, sale);
  if (CONFIG.UPDATE_MASTER_COUNTS) updateMasterCounts_(no);

  cacheDel_(["master_info_v1"]);
  return { ok: true, no: no, units: count };
}

/** Next "No" for a group, following its existing prefix + zero-padding. Null if new group. */
function nextNoForGroup_(m, group) {
  var g = group.trim().toLowerCase();
  var prefix = null, maxNum = 0, width = 4;
  m.rows.forEach(function (r) {
    if (String(r.group).trim().toLowerCase() !== g) return;
    var mm = /^([A-Za-z]+)(\d+)/.exec(String(r.no).trim());
    if (!mm) return;
    if (!prefix) prefix = mm[1];
    if (mm[1].toUpperCase() === prefix.toUpperCase()) {
      var num = parseInt(mm[2], 10);
      if (num > maxNum) maxNum = num;
      if (mm[2].length > width) width = mm[2].length;
    }
  });
  if (!prefix) return null;
  var s = "" + (maxNum + 1);
  while (s.length < width) s = "0" + s;
  return prefix + s;
}

function createUnitsForNo_(no, item, group, lokasi, qty, sale) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var unitsSh = ensureSheetWithHeaders_(ss, CONFIG.UNITS_SHEET, UNIT_HEADERS);
  var alreadyUnit = /-\d+$/.test(no);
  var ids = [];
  if (alreadyUnit || qty === 1) ids.push(no);
  else for (var i = 1; i <= qty; i++) ids.push(no + "-" + i);
  var rows = ids.map(function (uid) {
    return [uid, no, item, group, lokasi, "available", "", "", 0, "", sale, ""];
  });
  if (rows.length) {
    unitsSh.getRange(unitsSh.getLastRow() + 1, 1, rows.length, UNIT_HEADERS.length).setValues(rows);
  }
  return ids.length;
}

// ---- photo: upload to Drive + read back ----
function uploadPhoto_(body) {
  var unitId = String(body.unitId || "").trim();
  if (!unitId) return { ok: false, error: "unitId wajib" };
  if (!body.base64) return { ok: false, error: "data foto (base64) wajib" };
  if (!CONFIG.PHOTO_FOLDER_ID) return { ok: false, error: "PHOTO_FOLDER_ID belum di-set" };

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var unitsSh = ss.getSheetByName(CONFIG.UNITS_SHEET);
  var u = indexUnits_(unitsSh);
  var row = u.byId[unitId];
  if (!row) return { ok: false, error: "unit tidak ditemukan: " + unitId };
  if (u.col.Photo === undefined) {
    return { ok: false, error: "kolom Photo belum ada — jalankan MAC → Setup tabs dulu" };
  }

  var mime = String(body.mimeType || "image/jpeg");
  var raw = String(body.base64 || "");
  var ci = raw.indexOf("base64,");
  if (ci >= 0) raw = raw.substring(ci + 7);
  var bytes = Utilities.base64Decode(raw);
  var name = unitId + "_" + Utilities.formatDate(new Date(), tz_(), "yyyyMMdd-HHmmss") + ".jpg";
  var blob = Utilities.newBlob(bytes, mime, name);
  var folder = DriveApp.getFolderById(CONFIG.PHOTO_FOLDER_ID);
  var file = folder.createFile(blob);
  var fileId = file.getId();

  unitsSh.getRange(row, u.col.Photo + 1).setValue(fileId);
  return { ok: true, unitId: unitId, photo: fileId };
}

function getPhoto_(id) {
  id = String(id || "").trim();
  if (!id) return { ok: false, error: "id wajib" };
  var file = DriveApp.getFileById(id);
  var blob = file.getBlob();
  return {
    ok: true,
    mimeType: blob.getContentType(),
    base64: Utilities.base64Encode(blob.getBytes()),
  };
}

// ---- borrow ----
function createBorrow_(body) {
  var peminjam = String(body.peminjam || "").trim();
  var divisi = String(body.divisi || "").trim();
  var unitIds = body.unitIds || [];
  if (!peminjam) return { ok: false, error: "peminjam wajib diisi" };
  if (!unitIds.length) return { ok: false, error: "pilih minimal 1 unit" };

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var unitsSh = ss.getSheetByName(CONFIG.UNITS_SHEET);
  var u = indexUnits_(unitsSh);

  for (var i = 0; i < unitIds.length; i++) {
    var id = String(unitIds[i]).trim();
    var row = u.byId[id];
    if (!row) return { ok: false, error: "unit tidak ditemukan: " + id };
    var st = String(u.data[row - 2][u.col.Status]).trim().toLowerCase();
    if (st !== "available") return { ok: false, error: "unit tidak available: " + id + " (" + st + ")" };
  }

  var txId = nextTransactionId_();
  var stamp = now_();

  var txSh = ss.getSheetByName(CONFIG.TX_SHEET);
  txSh.appendRow([
    txId, peminjam, divisi, todayStr_(),
    String(body.kembaliRencana || ""), "", "dipinjam",
    String(body.catatan || ""), stamp, String(body.kegiatan || ""),
    String(body.createdBy || ""),
  ]);

  var itemsSh = ss.getSheetByName(CONFIG.TXITEMS_SHEET);
  var itemRows = [];
  var indukTouched = {};
  unitIds.forEach(function (rawId) {
    var id = String(rawId).trim();
    var r = u.byId[id];
    var d = u.data[r - 2];
    var item = d[u.col.Item];
    indukTouched[d[u.col["Induk No"]]] = true;
    itemRows.push([txId, id, item, "dipinjam", "", ""]);
    unitsSh.getRange(r, u.col.Status + 1).setValue("borrowed");
    var tb = parseInt(d[u.col["Times Borrowed"]], 10) || 0;
    unitsSh.getRange(r, u.col["Times Borrowed"] + 1).setValue(tb + 1);
    unitsSh.getRange(r, u.col["Last Borrowed"] + 1).setValue(todayStr_());
  });
  if (itemRows.length) {
    itemsSh.getRange(itemsSh.getLastRow() + 1, 1, itemRows.length, TXITEM_HEADERS.length).setValues(itemRows);
  }

  if (CONFIG.UPDATE_MASTER_COUNTS) {
    Object.keys(indukTouched).forEach(function (no) { updateMasterCounts_(no); });
  }
  return { ok: true, id: txId, count: unitIds.length };
}

// ---- return ----
function processReturn_(body) {
  var txId = String(body.transactionId || "").trim();
  if (!txId) return { ok: false, error: "transactionId wajib" };
  var returns = body.returns || [];
  if (!returns.length) return { ok: false, error: "tidak ada unit untuk dikembalikan" };

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var itemsSh = ss.getSheetByName(CONFIG.TXITEMS_SHEET);
  var unitsSh = ss.getSheetByName(CONFIG.UNITS_SHEET);
  var u = indexUnits_(unitsSh);

  var itemData = itemsSh.getDataRange().getValues();
  var stamp = now_();
  var indukTouched = {};
  var returnedNow = 0;

  returns.forEach(function (ret) {
    var unitId = String(ret.unitId || "").trim();
    var kondisi = String(ret.kondisi || "").trim();

    for (var i = 1; i < itemData.length; i++) {
      if (String(itemData[i][0]).trim() === txId &&
          String(itemData[i][1]).trim() === unitId &&
          String(itemData[i][3]).trim() === "dipinjam") {
        itemsSh.getRange(i + 1, 4).setValue("kembali");
        itemsSh.getRange(i + 1, 5).setValue(kondisi);
        itemsSh.getRange(i + 1, 6).setValue(stamp);
        returnedNow++;
        break;
      }
    }

    var r = u.byId[unitId];
    if (r) {
      var d = u.data[r - 2];
      indukTouched[d[u.col["Induk No"]]] = true;
      var lost = /hilang|lost/i.test(kondisi);
      var broken = /rusak|broken/i.test(kondisi);
      var newStatus = lost ? "lost" : broken ? "maintenance" : "available";
      unitsSh.getRange(r, u.col.Status + 1).setValue(newStatus);
      if (kondisi) unitsSh.getRange(r, u.col.Kondisi + 1).setValue(kondisi);
    }
  });

  var stillOut = 0;
  var refreshed = itemsSh.getDataRange().getValues();
  for (var j = 1; j < refreshed.length; j++) {
    if (String(refreshed[j][0]).trim() === txId && String(refreshed[j][3]).trim() === "dipinjam") stillOut++;
  }
  var txSh = ss.getSheetByName(CONFIG.TX_SHEET);
  var txData = txSh.getDataRange().getValues();
  for (var k = 1; k < txData.length; k++) {
    if (String(txData[k][0]).trim() === txId) {
      txSh.getRange(k + 1, 7).setValue(stillOut === 0 ? "selesai" : "sebagian kembali");
      if (stillOut === 0) txSh.getRange(k + 1, 6).setValue(todayStr_());
      break;
    }
  }

  if (CONFIG.UPDATE_MASTER_COUNTS) {
    Object.keys(indukTouched).forEach(function (no) { updateMasterCounts_(no); });
  }
  return { ok: true, id: txId, returned: returnedNow, remaining: stillOut };
}

// ---- edit transaction (items + header) ----
function updateTransaction_(body) {
  var txId = String(body.transactionId || "").trim();
  if (!txId) return { ok: false, error: "transactionId wajib" };

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var txSh = ss.getSheetByName(CONFIG.TX_SHEET);
    var itemsSh = ss.getSheetByName(CONFIG.TXITEMS_SHEET);
    var unitsSh = ss.getSheetByName(CONFIG.UNITS_SHEET);

    // locate tx
    var txData = txSh.getDataRange().getValues();
    var txRow = -1;
    for (var i = 1; i < txData.length; i++) {
      if (String(txData[i][0]).trim() === txId) { txRow = i + 1; break; }
    }
    if (txRow < 0) return { ok: false, error: "transaksi tidak ditemukan" };
    if (String(txData[txRow - 1][6]).trim().toLowerCase() === "selesai")
      return { ok: false, error: "transaksi sudah selesai, tidak bisa diedit" };

    var u = indexUnits_(unitsSh);
    var addIds = (body.addUnitIds || []).map(function (x) { return String(x).trim(); }).filter(Boolean);
    var removeIds = (body.removeUnitIds || []).map(function (x) { return String(x).trim(); }).filter(Boolean);

    // ---- VALIDATE everything before writing ----
    for (var a = 0; a < addIds.length; a++) {
      var rr = u.byId[addIds[a]];
      if (!rr) return { ok: false, error: "unit tidak ditemukan: " + addIds[a] };
      var st = String(u.data[rr - 2][u.col.Status]).trim().toLowerCase();
      if (st !== "available") return { ok: false, error: "unit tidak available: " + addIds[a] + " (" + st + ")" };
    }
    var iv = itemsSh.getDataRange().getValues();
    var curDipinjam = 0, curKembali = 0, willRemove = 0;
    for (var j = 1; j < iv.length; j++) {
      if (String(iv[j][0]).trim() !== txId) continue;
      var si = String(iv[j][3]).trim().toLowerCase();
      if (si === "dipinjam") {
        curDipinjam++;
        if (removeIds.indexOf(String(iv[j][1]).trim()) >= 0) willRemove++;
      } else if (si === "kembali") curKembali++;
    }
    var plannedDipinjam = curDipinjam - willRemove + addIds.length;
    if (plannedDipinjam + curKembali === 0)
      return { ok: false, error: "transaksi tidak boleh kosong. Gunakan Hapus Peminjaman." };

    // ---- WRITE header fields ----
    if (body.peminjam !== undefined) txSh.getRange(txRow, 2).setValue(String(body.peminjam).trim());
    if (body.divisi !== undefined) txSh.getRange(txRow, 3).setValue(String(body.divisi).trim());
    if (body.kembaliRencana !== undefined) txSh.getRange(txRow, 5).setValue(String(body.kembaliRencana));
    if (body.catatan !== undefined) txSh.getRange(txRow, 8).setValue(String(body.catatan));
    if (body.kegiatan !== undefined) txSh.getRange(txRow, 10).setValue(String(body.kegiatan));

    var indukTouched = {};

    // REMOVE currently-borrowed items -> free unit, delete item row
    var rowsToDelete = [];
    removeIds.forEach(function (uid) {
      for (var j2 = 1; j2 < iv.length; j2++) {
        if (String(iv[j2][0]).trim() === txId &&
            String(iv[j2][1]).trim() === uid &&
            String(iv[j2][3]).trim().toLowerCase() === "dipinjam") {
          rowsToDelete.push(j2 + 1);
          var r = u.byId[uid];
          if (r) {
            var d = u.data[r - 2];
            indukTouched[d[u.col["Induk No"]]] = true;
            unitsSh.getRange(r, u.col.Status + 1).setValue("available");
          }
          break;
        }
      }
    });
    rowsToDelete.sort(function (x, y) { return y - x; });
    rowsToDelete.forEach(function (rn) { itemsSh.deleteRow(rn); });

    // ADD available units -> borrow + new item row
    var addRows = [];
    addIds.forEach(function (uid) {
      var r = u.byId[uid];
      var d = u.data[r - 2];
      indukTouched[d[u.col["Induk No"]]] = true;
      addRows.push([txId, uid, d[u.col.Item], "dipinjam", "", ""]);
      unitsSh.getRange(r, u.col.Status + 1).setValue("borrowed");
      var tb = parseInt(d[u.col["Times Borrowed"]], 10) || 0;
      unitsSh.getRange(r, u.col["Times Borrowed"] + 1).setValue(tb + 1);
      unitsSh.getRange(r, u.col["Last Borrowed"] + 1).setValue(todayStr_());
    });
    if (addRows.length) {
      itemsSh.getRange(itemsSh.getLastRow() + 1, 1, addRows.length, TXITEM_HEADERS.length).setValues(addRows);
    }

    // recompute status from the (now mutated) item sheet
    var refreshed = itemsSh.getDataRange().getValues();
    var dip = 0, kmb = 0;
    for (var k = 1; k < refreshed.length; k++) {
      if (String(refreshed[k][0]).trim() !== txId) continue;
      var s2 = String(refreshed[k][3]).trim().toLowerCase();
      if (s2 === "dipinjam") dip++; else if (s2 === "kembali") kmb++;
    }
    var newStatus = dip === 0 ? "selesai" : (kmb > 0 ? "sebagian kembali" : "dipinjam");
    txSh.getRange(txRow, 7).setValue(newStatus);
    txSh.getRange(txRow, 6).setValue(dip === 0 ? todayStr_() : "");

    if (CONFIG.UPDATE_MASTER_COUNTS) {
      Object.keys(indukTouched).forEach(function (no) { updateMasterCounts_(no); });
    }
    return { ok: true, id: txId, status: newStatus, dipinjam: dip, added: addRows.length, removed: rowsToDelete.length };
  } finally {
    lock.releaseLock();
  }
}

// ---- delete active transaction (admin) ----
function deleteTransaction_(body) {
  var txId = String(body.transactionId || "").trim();
  if (!txId) return { ok: false, error: "transactionId wajib" };

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var txSh = ss.getSheetByName(CONFIG.TX_SHEET);
    var itemsSh = ss.getSheetByName(CONFIG.TXITEMS_SHEET);
    var unitsSh = ss.getSheetByName(CONFIG.UNITS_SHEET);

    var txData = txSh.getDataRange().getValues();
    var txRow = -1, status = "";
    for (var i = 1; i < txData.length; i++) {
      if (String(txData[i][0]).trim() === txId) {
        txRow = i + 1; status = String(txData[i][6]).trim().toLowerCase(); break;
      }
    }
    if (txRow < 0) return { ok: false, error: "transaksi tidak ditemukan" };
    if (status === "selesai")
      return { ok: false, error: "peminjaman yang sudah selesai tidak bisa dihapus (arsip riwayat)" };

    var u = indexUnits_(unitsSh);
    var indukTouched = {};
    var freed = 0;

    var iv = itemsSh.getDataRange().getValues();
    var rowsToDelete = [];
    for (var j = 1; j < iv.length; j++) {
      if (String(iv[j][0]).trim() !== txId) continue;
      rowsToDelete.push(j + 1);
      if (String(iv[j][3]).trim().toLowerCase() === "dipinjam") {
        var r = u.byId[String(iv[j][1]).trim()];
        if (r) {
          var d = u.data[r - 2];
          indukTouched[d[u.col["Induk No"]]] = true;
          unitsSh.getRange(r, u.col.Status + 1).setValue("available");
          freed++;
        }
      }
    }
    rowsToDelete.sort(function (x, y) { return y - x; });
    rowsToDelete.forEach(function (rn) { itemsSh.deleteRow(rn); });
    txSh.deleteRow(txRow);

    if (CONFIG.UPDATE_MASTER_COUNTS) {
      Object.keys(indukTouched).forEach(function (no) { updateMasterCounts_(no); });
    }
    return { ok: true, id: txId, freed: freed };
  } finally {
    lock.releaseLock();
  }
}

// ============================================================
// READERS
// ============================================================
function listUnits_(p) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.UNITS_SHEET);
  if (!sh || sh.getLastRow() < 2) return [];
  var values = sh.getDataRange().getValues();
  var head = values[0];
  var out = [];
  var q = String(p.q || "").toLowerCase();
  var fStatus = String(p.status || "").toLowerCase();
  var fGroup = String(p.group || "").toLowerCase();
  var fSale = String(p.sale || "").toLowerCase();

  for (var i = 1; i < values.length; i++) {
    var obj = {};
    for (var c = 0; c < head.length; c++) obj[head[c]] = values[i][c];
    if (fStatus && String(obj.Status).toLowerCase() !== fStatus) continue;
    if (fGroup && String(obj.Group).toLowerCase() !== fGroup) continue;
    if (fSale && String(obj.Sale).toLowerCase() !== fSale) continue;
    if (q) {
      var hay = (obj.Item + " " + obj["Unit ID"] + " " + obj["Induk No"]).toLowerCase();
      if (hay.indexOf(q) === -1) continue;
    }
    out.push(obj);
  }

  // enrich with MASTER-only fields (for Ready-Dijual cards): purchase date + prices
  var minfo = masterInfoByNo_();
  out.forEach(function (o) {
    var info = minfo[String(o["Induk No"]).trim()] || {};
    o["Purchase Date"] = info.purchaseDate || "";
    o["Harga Beli"] = info.hargaBeli || "";
    o["Rekom Hrg Jual"] = info.rekomJual || "";
  });
  return out;
}

/** Map Induk No -> { purchaseDate, hargaBeli, rekomJual } from MASTER (fuzzy headers). */
// ---- lightweight caching (CacheService) ----
function cacheGet_(key) {
  try {
    var c = CacheService.getScriptCache().get(key);
    return c ? JSON.parse(c) : null;
  } catch (e) {
    return null;
  }
}
function cachePut_(key, obj, ttlSeconds) {
  try {
    var s = JSON.stringify(obj);
    if (s.length < 95000) CacheService.getScriptCache().put(key, s, ttlSeconds || 60);
  } catch (e) {
    /* value too big / quota — skip caching */
  }
}
function cacheDel_(keys) {
  try {
    CacheService.getScriptCache().removeAll(keys);
  } catch (e) {
    /* ignore */
  }
}

function masterInfoByNo_() {
  var cached = cacheGet_("master_info_v1");
  if (cached) return cached;
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.MASTER_SHEET);
  if (!sh) return {};
  var values = sh.getDataRange().getValues();
  var headerRow = findHeaderRow_(values);
  if (headerRow < 0) return {};
  var head = values[headerRow];
  var cNo = colIndexByName_(head, MASTER_HEADERS.no);
  var cPur = colIndexByName_(head, MASTER_HEADERS.purchaseDate);
  var cBeli = colIndexByName_(head, MASTER_HEADERS.hargaBeli);
  var cJual = -1;
  for (var c = 0; c < head.length; c++) {
    var h = String(head[c]).toLowerCase();
    if (cJual < 0 && h.indexOf("jual") >= 0) cJual = c; // "Rekom Hrg Jual" / "Harga Jual"
  }
  var map = {};
  for (var i = headerRow + 1; i < values.length; i++) {
    var no = String(cNo >= 0 ? values[i][cNo] : "").trim();
    if (!no) continue;
    map[no] = {
      purchaseDate: cPur >= 0 ? values[i][cPur] : "",
      hargaBeli: cBeli >= 0 ? values[i][cBeli] : "",
      rekomJual: cJual >= 0 ? values[i][cJual] : "",
    };
  }
  cachePut_("master_info_v1", map, 120);
  return map;
}

/** Per-item borrow usage from TransactionItems joined with Transactions dates. */
function listUsage_(p) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var txSh = ss.getSheetByName(CONFIG.TX_SHEET);
  var itSh = ss.getSheetByName(CONFIG.TXITEMS_SHEET);
  if (!txSh || !itSh || txSh.getLastRow() < 2 || itSh.getLastRow() < 2) return [];
  var from = String(p.from || "");
  var to = String(p.to || "");

  var tv = txSh.getDataRange().getValues();
  var th = tv[0];
  var cTxId = th.indexOf("Transaction ID");
  var cDate = th.indexOf("Tanggal Pinjam");
  var txDate = {};
  for (var i = 1; i < tv.length; i++) {
    txDate[String(tv[i][cTxId]).trim()] = ymdStr_(tv[i][cDate]);
  }

  var iv = itSh.getDataRange().getValues();
  var ih = iv[0];
  var cItTx = ih.indexOf("Transaction ID");
  var cItem = ih.indexOf("Item");
  var agg = {};
  for (var j = 1; j < iv.length; j++) {
    var tid = String(iv[j][cItTx]).trim();
    var d = txDate[tid];
    if (!d) continue;
    if (from && d < from) continue;
    if (to && d > to) continue;
    var item = String(iv[j][cItem]).trim();
    if (!item) continue;
    var a = agg[item] || { item: item, count: 0, last: "" };
    a.count++;
    if (d > a.last) a.last = d;
    agg[item] = a;
  }
  return Object.keys(agg).map(function (k) { return agg[k]; });
}

function ymdStr_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, tz_(), "yyyy-MM-dd");
  var s = String(v || "").trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
  var d = new Date(s);
  if (!isNaN(d.getTime())) return Utilities.formatDate(d, tz_(), "yyyy-MM-dd");
  return s;
}

function listTransactions_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.TX_SHEET);
  if (!sh || sh.getLastRow() < 2) return [];
  var values = sh.getDataRange().getValues();
  var head = values[0];
  var out = [];
  for (var i = values.length - 1; i >= 1; i--) {
    var obj = {};
    for (var c = 0; c < head.length; c++) obj[head[c]] = values[i][c];
    out.push(obj);
  }
  return out;
}

function getTransaction_(txId) {
  txId = String(txId).trim();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var txSh = ss.getSheetByName(CONFIG.TX_SHEET);
  var itemsSh = ss.getSheetByName(CONFIG.TXITEMS_SHEET);

  var tx = null;
  var tv = txSh.getDataRange().getValues();
  var th = tv[0];
  for (var i = 1; i < tv.length; i++) {
    if (String(tv[i][0]).trim() === txId) {
      tx = {};
      for (var c = 0; c < th.length; c++) tx[th[c]] = tv[i][c];
      break;
    }
  }
  if (!tx) return null;

  var items = [];
  var iv = itemsSh.getDataRange().getValues();
  var ih = iv[0];
  for (var j = 1; j < iv.length; j++) {
    if (String(iv[j][0]).trim() === txId) {
      var it = {};
      for (var d = 0; d < ih.length; d++) it[ih[d]] = iv[j][d];
      items.push(it);
    }
  }

  // enrich each item with the unit's current Lokasi + Photo
  var unitsSh = ss.getSheetByName(CONFIG.UNITS_SHEET);
  var uMap = {};
  if (unitsSh && unitsSh.getLastRow() > 1) {
    var uv = unitsSh.getDataRange().getValues();
    var uh = uv[0];
    var cUid = uh.indexOf("Unit ID");
    var cLok = uh.indexOf("Lokasi");
    var cPhoto = uh.indexOf("Photo");
    for (var x = 1; x < uv.length; x++) {
      uMap[String(uv[x][cUid]).trim()] = {
        lokasi: cLok >= 0 ? uv[x][cLok] : "",
        photo: cPhoto >= 0 ? uv[x][cPhoto] : "",
      };
    }
  }
  items.forEach(function (it) {
    var info = uMap[String(it["Unit ID"]).trim()];
    it["Lokasi"] = info ? info.lokasi : "";
    it["Photo"] = info ? info.photo : "";
  });

  tx.items = items;
  return tx;
}

// ============================================================
// MASTER helpers
// ============================================================
function readMaster_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.MASTER_SHEET);
  if (!sh) throw new Error("Sheet '" + CONFIG.MASTER_SHEET + "' tidak ditemukan.");
  var values = sh.getDataRange().getValues();
  var headerRow = findHeaderRow_(values);
  if (headerRow < 0) throw new Error("Header MASTER tidak ditemukan (butuh kolom No, Item, Qty).");
  var head = values[headerRow];
  var idx = {};
  Object.keys(MASTER_HEADERS).forEach(function (key) {
    idx[key] = colIndexByName_(head, MASTER_HEADERS[key]);
  });
  var rows = [];
  for (var i = headerRow + 1; i < values.length; i++) {
    var v = values[i];
    rows.push({
      rowNumber: i + 1,
      no: idx.no >= 0 ? v[idx.no] : "",
      group: idx.group >= 0 ? v[idx.group] : "",
      item: idx.item >= 0 ? v[idx.item] : "",
      qty: idx.qty >= 0 ? v[idx.qty] : "",
      lokasi: idx.lokasi >= 0 ? v[idx.lokasi] : "",
      remarks: idx.remarks >= 0 ? v[idx.remarks] : "",
      status: idx.status >= 0 ? v[idx.status] : "",
      purchaseDate: idx.purchaseDate >= 0 ? v[idx.purchaseDate] : "",
      lifeSpan: idx.lifeSpan >= 0 ? v[idx.lifeSpan] : "",
    });
  }
  return { sheet: sh, headerRow: headerRow, idx: idx, rows: rows };
}

function findHeaderRow_(values) {
  for (var r = 0; r < Math.min(values.length, 12); r++) {
    var row = values[r].map(function (x) { return String(x).trim().toLowerCase(); });
    if (row.indexOf("no") !== -1 && row.indexOf("item") !== -1 && row.indexOf("qty") !== -1) return r;
  }
  return -1;
}

function colIndexByName_(head, name) {
  var target = String(name).trim().toLowerCase();
  for (var i = 0; i < head.length; i++) {
    if (String(head[i]).trim().toLowerCase() === target) return i;
  }
  return -1;
}

function refreshAllMasterCounts_() {
  var m = readMaster_();
  var seen = {};
  m.rows.forEach(function (r) {
    var no = String(r.no || "").trim();
    if (no && !seen[no]) { seen[no] = true; updateMasterCounts_(no); }
  });
}

function updateMasterCounts_(indukNo) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var m = readMaster_();
  if (m.idx.picked < 0 && m.idx.available < 0) return;
  var unitsSh = ss.getSheetByName(CONFIG.UNITS_SHEET);
  var picked = 0;
  var sold = 0;
  if (unitsSh && unitsSh.getLastRow() > 1) {
    var uv = unitsSh.getDataRange().getValues();
    var uh = uv[0];
    var cInduk = uh.indexOf("Induk No");
    var cStatus = uh.indexOf("Status");
    for (var i = 1; i < uv.length; i++) {
      if (String(uv[i][cInduk]).trim() !== String(indukNo).trim()) continue;
      var stt = String(uv[i][cStatus]).trim().toLowerCase();
      if (stt === "borrowed") picked++;
      else if (stt === "sold") sold++;
    }
  }
  for (var j = 0; j < m.rows.length; j++) {
    if (String(m.rows[j].no).trim() === String(indukNo).trim()) {
      var rowNum = m.rows[j].rowNumber;
      var qty = parseInt(m.rows[j].qty, 10);
      if (isNaN(qty)) qty = CONFIG.DEFAULT_QTY_WHEN_BLANK;
      if (m.idx.picked >= 0) m.sheet.getRange(rowNum, m.idx.picked + 1).setValue(picked);
      if (m.idx.available >= 0) m.sheet.getRange(rowNum, m.idx.available + 1).setValue(Math.max(qty - picked - sold, 0));
      break;
    }
  }
}

// ============================================================
// Units index
// ============================================================
function indexUnits_(unitsSh) {
  var values = unitsSh.getDataRange().getValues();
  var head = values[0];
  var col = {};
  for (var c = 0; c < head.length; c++) col[head[c]] = c;
  var byId = {};
  var data = values.slice(1);
  for (var i = 0; i < data.length; i++) byId[String(data[i][col["Unit ID"]]).trim()] = i + 2;
  return { data: data, col: col, byId: byId };
}

// ============================================================
// ID + utilities
// ============================================================
function nextTransactionId_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.TX_SHEET);
  var prefix = "BOR-" + Utilities.formatDate(new Date(), tz_(), "yyyyMMdd") + "-";
  var max = 0;
  if (sh && sh.getLastRow() > 1) {
    var ids = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      var id = String(ids[i][0]).trim();
      if (id.indexOf(prefix) === 0) {
        var nn = parseInt(id.substring(prefix.length), 10);
        if (!isNaN(nn) && nn > max) max = nn;
      }
    }
  }
  return prefix + ("000" + (max + 1)).slice(-3);
}

function tz_() { return SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone() || "Asia/Jakarta"; }
function todayStr_() { return Utilities.formatDate(new Date(), tz_(), "yyyy-MM-dd"); }
function now_() { return Utilities.formatDate(new Date(), tz_(), "yyyy-MM-dd HH:mm:ss"); }
function errStr_(err) { return String(err && err.message ? err.message : err); }

/**
 * The effective API token. Priority:
 *   1) Script Property "API_TOKEN" (survives Code.gs pastes)
 *   2) CONFIG.TOKEN literal (fallback for fresh installs)
 * Used both for API auth and as the password-hash salt.
 */
function getToken_() {
  var p = "";
  try {
    p = PropertiesService.getScriptProperties().getProperty("API_TOKEN") || "";
  } catch (e) {
    p = "";
  }
  return p || CONFIG.TOKEN;
}

function checkToken_(token) {
  var expected = getToken_();
  if (expected && expected !== "CHANGE_ME_TO_A_LONG_RANDOM_STRING") {
    if (String(token) !== expected) throw new Error("unauthorized");
  }
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * WeighmentPages.jsx  —  All weighment screens
 *
 * Exports:
 *   CreateGeneralWeighment   — blank manual-entry form (direct create, no GIN list)
 *   CreateInwardWeighment    — GIN list with vehicle-no search → auto-creates weighment
 *   CreateOutwardWeighment   — GIN list with vehicle-no search → auto-creates weighment
 *   WeighmentDetail          — view / edit existing record (imported from WeighmentDetail.jsx)
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import ModuleNavbar from "../../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../../config";
import "./WeightmentPages.css";   /* ← wc-* styles for create / list pages */

/* ─── API endpoints ──────────────────────────────────────────────────────── */
const GIN_API         = `${API_URL}/api/goods-inward-note`;
const WEIGHMENT_API   = `${API_URL}/api/weighment`;
const PO_API          = `${API_URL}/api/purchase-order`;
const PARTY_API       = `${API_URL}/api/parties`;
const ITEM_MASTER_API = `${API_URL}/api`;
const today           = new Date().toISOString().split("T")[0];

/* ─── Shared helpers ─────────────────────────────────────────────────────── */
const blankItem = (sNo) => ({
  sNo, itemCode: "", itemName: "", uom: "",
  firstWeight: "", secondWeight: "", netWeight: "", remarks: "", _checked: false,
});

/* 2-digit-year date fragment builder — mirrors CreateGIN / DocumentSequence logic */
const buildDatePart = (format) => {
  const d  = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  if (format === "mm/dd/yy") return `${mm}${dd}${yy}`;
  if (format === "yy/mm/dd") return `${yy}${mm}${dd}`;
  if (format === "julian") {
    /* Julian: YY + DDD (3-digit day-of-year, 1-indexed) — matches
       documentSequenceRoutes.js's buildDatePart, e.g. 01-Jan-2026 → 26001 */
    const year   = d.getFullYear();
    const start  = new Date(year, 0, 0);
    const oneDay = 1000 * 60 * 60 * 24;
    const doy    = String(Math.floor((d - start) / oneDay)).padStart(3, "0");
    return `${yy}${doy}`;
  }
  return `${dd}${mm}${yy}`;
};

const hasMainWeight    = (data) => !!(data?.firstWeight || data?.secondWeight || data?.netWeight);
const hasAnyItemWeight = (rows) => rows.some((r) => r.firstWeight || r.secondWeight || r.netWeight || r.remarks);

const makeItems = (data) => {
  const rows =
    Array.isArray(data.items) && data.items.length > 0
      ? data.items.map((it, i) => ({
          sNo: it.sNo || i + 1,
          itemCode: it.itemCode || "", itemName: it.itemName || "", uom: it.uom || "",
          firstWeight: it.firstWeight || "", secondWeight: it.secondWeight || "",
          netWeight: it.netWeight || "", remarks: it.remarks || "", _checked: false,
        }))
      : Array.from({ length: 4 }, (_, i) => blankItem(i + 1));

  if (hasMainWeight(data) && !hasAnyItemWeight(rows)) {
    rows[0] = { ...rows[0], sNo: 1,
      firstWeight: data.firstWeight || "",
      secondWeight: data.secondWeight || "",
      netWeight: data.netWeight || "",
    };
  }
  return rows.map((row, idx) => ({ ...row, sNo: idx + 1 }));
};

const STATUS_OPTIONS = ["Open", "Draft", "Saved", "Convert", "Closed"];

/* ═══════════════════════════════════════════════════════════════════════════
   FIELD VISIBILITY CONFIG
   Defines which header fields are shown per transaction type.
   "General" shows all fields. "Inward" and "Outward" show only relevant ones.
═══════════════════════════════════════════════════════════════════════════ */
const INWARD_FIELDS = new Set([
  "weighmentNo", "description", "weighmentDate", "transactionType",
  "inwardOutwardNoteNo", "vehicleNo", "partyCode", "partyName", "site", "status",
  "weighmentInDate", "weighmentInTime", "weighmentOutDate", "weighmentOutTime",
  "transactionCategory", "transporterName",
  "poCpoNo",
  "supplierInvoiceNo", "supplierInvoiceDate",
  "remarks",
]);

const OUTWARD_FIELDS = new Set([
  "weighmentNo", "description", "weighmentDate", "transactionType",
  "inwardOutwardNoteNo", "vehicleNo", "partyCode", "partyName", "site", "status",
  "weighmentInDate", "weighmentInTime", "weighmentOutDate", "weighmentOutTime",
  "transactionCategory", "transporterName",
  "remarks",
]);

const GENERAL_FIELDS = new Set([
  "weighmentNo", "description", "weighmentDate", "transactionType",
  "inwardOutwardNoteNo", "vehicleNo", "partyCode", "partyName", "site", "status",
  "weighmentInDate", "weighmentInTime", "weighmentOutDate", "weighmentOutTime",
  "transactionCategory", "transporterName",
  "poCpoNo",
  "supplierInvoiceNo", "supplierInvoiceDate",
  "challanDate", "ewayDate",
  "remarks",
]);

const getVisibleFields = (type) => {
  if (type === "Inward")  return INWARD_FIELDS;
  if (type === "Outward") return OUTWARD_FIELDS;
  return GENERAL_FIELDS;
};

/* ─── BLANK_FORM ── */
const BLANK_FORM = {
  weighmentNo: "", description: "", weighmentDate: today,
  transactionType: "General", inwardOutwardNoteNo: "", vehicleNo: "",
  partyCode: "", partyName: "", site: "", status: "Open",
  weighmentInDate: today, weighmentInTime: "", weighmentOutDate: today, weighmentOutTime: "",
  transactionCategory: "", transporterName: "",
  poCpoNo: "",
  supplierInvoiceNo: "", supplierInvoiceDate: "",
  challanDate: "", ewayDate: "",
  remarks: "",
  firstWeight: "", secondWeight: "", netWeight: "", currentWeight: "",
};

/* ═══════════════════════════════════════════════════════════════════════════
   WeighmentForm
   Used by CreateGeneralWeighment, CreateInwardWeighment, CreateOutwardWeighment.
   Items table is ALWAYS directly editable.
   Default insertCount = 1.
═══════════════════════════════════════════════════════════════════════════ */
const WeighmentForm = ({
  initialForm,
  initialItems,
  recordId,
  pageTitle,
  transactionType: propType,
  alwaysEditable,
}) => {
  const navigate = useNavigate();

  /* For Detail page: start read-only; Edit button unlocks form fields.
     For Create page: always editable. Items are ALWAYS editable regardless. */
  const [editMode, setEditMode] = useState(false);
  const canEditForm = alwaysEditable || editMode;

  const effectiveType = propType || "General";
  const visibleFields = getVisibleFields(effectiveType);

  const [form, setForm] = useState(() => ({
    ...BLANK_FORM,
    transactionType: effectiveType,
    ...(initialForm || {}),
    firstWeight: "", secondWeight: "", netWeight: "", currentWeight: "",
  }));

  /* ── Default insertCount = 1 per requirements ── */
  const [items,          setItems]          = useState(() => {
    const rows = initialItems || Array.from({ length: 4 }, (_, i) => blankItem(i + 1));
    const pendingIdx = rows.findIndex((r) => r.firstWeight && !r.secondWeight);
    if (pendingIdx !== -1) {
      return rows.map((r, i) => ({ ...r, _checked: i === pendingIdx }));
    }
    return rows;
  });
  const [saving,         setSaving]         = useState(false);
  const [insertCount,    setInsertCount]    = useState(1);

  useEffect(() => {
    const idx = items.findIndex((r) => r._checked);
    if (idx !== -1) {
      setActiveRowIdx(idx);
      const pendingRow = items[idx];
      if (pendingRow.firstWeight && !pendingRow.secondWeight) {
        setForm((prev) => ({
          ...prev,
          firstWeight:   pendingRow.firstWeight,
          secondWeight:  "",
          netWeight:     "",
          currentWeight: "",
        }));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [activeRowIdx,   setActiveRowIdx]   = useState(null);
  const [itemSuggestions,setItemSuggestions]= useState([]);
  const [activeSugRow,   setActiveSugRow]   = useState(null);
  const [activeSugField, setActiveSugField] = useState(null);
  const [transactionCategories, setTransactionCategories] = useState([]);
  const [parties, setParties] = useState([]);
  const [showPartySug, setShowPartySug] = useState(false);
  const itemsSectionRef = useRef(null);

  /* Load parties — for Party Code / Party Name typeahead */
  useEffect(() => {
    const load = async () => {
      try {
        const res  = await axios.get(PARTY_API);
        const list = Array.isArray(res.data) ? res.data : [];
        setParties(list.filter((p) => p.status === "Active"));
      } catch { setParties([]); }
    };
    load();
  }, []);

  const partySuggestions = parties.filter((p) => {
    const q = `${form.partyCode || ""} ${form.partyName || ""}`.trim().toLowerCase();
    if (!q) return true;
    return (
      (p.partyCode || "").toLowerCase().includes(q) ||
      (p.partyName || "").toLowerCase().includes(q)
    );
  }).slice(0, 10);

  const handlePartySelect = (p) => {
    setForm((prev) => ({ ...prev, partyCode: p.partyCode || "", partyName: p.partyName || "" }));
    setShowPartySug(false);
  };

  /* Load transaction categories — only Weighment business entity, Open status */
  useEffect(() => {
    const load = async () => {
      try {
        const res  = await axios.get(`${API_URL}/api/transactions`);
        const list = Array.isArray(res.data) ? res.data : [];
        const filtered = list.filter((tx) =>
          tx.businessEntity === "Weighment" &&
          (tx.status || "").toLowerCase() === "open"
        );
        setTransactionCategories(filtered);
      } catch { setTransactionCategories([]); }
    };
    load();
  }, []);

  /* ── Preview Weighment No from Transaction Category + Document Sequence ──
     Links to the Document Sequence configured for THIS Transaction Category
     via module + businessEntity + transactionCategory (description) — Entity
     Prefix is entered manually on the Document Sequence screen and has no
     fixed relationship to the transaction category code, so it must be read
     from the matched sequence record, not derived from the category code.
     The increment is only OFFICIALLY committed (via /api/create-document-sequence)
     at save time in persistWeighment. ── */
  useEffect(() => {
    if (recordId) return; // only preview on create
    if (!form.transactionCategory) {
      setForm((prev) => ({ ...prev, weighmentNo: "" }));
      return;
    }
    const cat = transactionCategories.find((tx) => tx.categoryDescription === form.transactionCategory);
    if (!cat) {
      setForm((prev) => ({ ...prev, weighmentNo: "" }));
      return;
    }
    const mod    = cat.module         || "Inventory";
    const entity = cat.businessEntity || "Weighment";

    axios.get(`${API_URL}/api/document-sequence`)
      .then((res) => {
        const matching = (Array.isArray(res.data) ? res.data : []).filter(
          (r) => r.module === mod && r.businessEntity === entity && r.transactionCategory === cat.categoryDescription
        );
        if (!matching.length) {
          setForm((prev) => ({ ...prev, weighmentNo: `(Create a Document Sequence for "${cat.categoryDescription}" first)` }));
          return;
        }
        const last   = matching.reduce((a, b) => Number(a.incrementNo) > Number(b.incrementNo) ? a : b);
        const prefix = (last.entityPrefix || "").trim().toUpperCase();
        const digits = Math.max(1, Number(last.sequenceDigits) || 2);
        const step   = Math.max(1, Number(last.incrementStep) || 1);
        const nextNo = Number(last.incrementNo) + step;
        const date   = last.useDateFragment ? buildDatePart(last.sequenceFormat || "dd/mm/yy") : "";
        setForm((prev) => ({ ...prev, weighmentNo: `${prefix}${date}${String(nextNo).padStart(digits, "0")}` }));
      })
      .catch(() => setForm((prev) => ({ ...prev, weighmentNo: "" })));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.transactionCategory, transactionCategories, recordId]);

  /* ── Field change — form fields respect canEditForm ── */
  const handleChange = (e) => {
    const { name, value, type: t, checked } = e.target;
    if (!canEditForm && name !== "currentWeight") return;
    setForm((prev) => ({ ...prev, [name]: t === "checkbox" ? checked : value }));
  };

  /* ── Weight strip ── */
  const handleItemCheck = (rowIdx, checked) => {
    const row          = items[rowIdx];
    if (checked && isRowLocked(row)) return;
    const inheritWeight = row?.secondWeight || row?.firstWeight || "";
    setItems((prev) => prev.map((r, i) => ({ ...r, _checked: i === rowIdx ? checked : false })));
    if (checked) {
      setActiveRowIdx(rowIdx);
      setItems((prev) => {
        const next = [...prev];
        next[rowIdx] = { ...next[rowIdx], _checked: true,
          firstWeight: inheritWeight || next[rowIdx].firstWeight };
        return next;
      });
      setForm((prev) => ({ ...prev, firstWeight: inheritWeight, secondWeight: "", netWeight: "", currentWeight: "" }));
    } else {
      setActiveRowIdx(null);
    }
  };

  const getWeight = () => {
    if (activeRowIdx === null) {
      alert("Please tick a row in the Items table before capturing weight.");
      return;
    }
    const weight = parseFloat(form.currentWeight);
    if (!weight) { alert("Enter a weight value first"); return; }

    if (!form.firstWeight) {
      setForm((prev) => ({ ...prev, firstWeight: String(weight), currentWeight: "" }));
      setItems((prev) => {
        const next = [...prev];
        next[activeRowIdx] = { ...next[activeRowIdx], firstWeight: String(weight) };
        return next;
      });
      return;
    }

    if (!form.secondWeight) {
      const first = parseFloat(form.firstWeight) || 0;
      const net   = parseFloat(Math.abs(first - weight).toFixed(2));
      setForm((prev) => ({ ...prev, secondWeight: String(weight), netWeight: String(net), currentWeight: "" }));
      setItems((prev) => {
        const next = [...prev];
        next[activeRowIdx] = { ...next[activeRowIdx], secondWeight: String(weight), netWeight: String(net), _checked: false };
        return next;
      });
      setActiveRowIdx(null);
      setTimeout(() => {
        itemsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
      return;
    }
    alert("First and Second Weight already recorded");
  };

  const handleRowFocus = (rowIdx) => {
    setItems((prev) => {
      const next = [...prev];
      if (rowIdx === 0) return next;
      const previous = next[rowIdx - 1];
      if (previous.secondWeight && !next[rowIdx].firstWeight) {
        next[rowIdx] = { ...next[rowIdx], firstWeight: previous.secondWeight };
      }
      return next;
    });
  };

  /* ── Item master lookup ── */
  const fetchItemSuggestions = useCallback(async (query, field = "itemCode") => {
    if (!query) { setItemSuggestions([]); return; }
    try {
      const res  = await axios.get(`${ITEM_MASTER_API}/items/search`, {
        params: { [field]: query, status: "Active" },
      });
      const list = res.data?.data || res.data || [];
      setItemSuggestions((Array.isArray(list) ? list : []).slice(0, 10));
    } catch { setItemSuggestions([]); }
  }, []);

  const handleItemCodeChange = (rowIdx, value) => {
    setItems((prev) => { const next = [...prev]; next[rowIdx] = { ...next[rowIdx], itemCode: value, itemName: "", uom: "" }; return next; });
    setActiveSugRow(rowIdx); setActiveSugField("itemCode");
    fetchItemSuggestions(value, "itemCode");
  };

  const handleItemNameChange = (rowIdx, value) => {
    setItems((prev) => { const next = [...prev]; next[rowIdx] = { ...next[rowIdx], itemName: value, itemCode: "", uom: "" }; return next; });
    setActiveSugRow(rowIdx); setActiveSugField("itemName");
    fetchItemSuggestions(value, "itemName");
  };

  const selectItemSuggestion = (rowIdx, item) => {
    setItems((prev) => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx],
        itemCode: item.itemCode || item.code || "",
        itemName: item.itemName || item.name || "",
        uom:      item.uom || item.baseUom || item.unit || "",
      };
      return next;
    });
    setItemSuggestions([]); setActiveSugRow(null); setActiveSugField(null);
  };

  const fetchItemDetailsByCode = async (rowIdx, itemCode) => {
    if (!itemCode?.trim()) return;
    try {
      const res  = await axios.get(`${ITEM_MASTER_API}/item/${encodeURIComponent(itemCode.trim())}`);
      const item = res.data?.data || res.data;
      if (!item?.itemCode && !item?.itemName) return;
      setItems((prev) => {
        const next = [...prev];
        next[rowIdx] = { ...next[rowIdx],
          itemCode: item.itemCode || next[rowIdx].itemCode || "",
          itemName: item.itemName || item.name || "",
          uom:      item.uom || item.baseUom || item.unit || "",
        };
        return next;
      });
    } catch {} finally {
      setItemSuggestions([]); setActiveSugRow(null); setActiveSugField(null);
    }
  };

  const fetchItemDetailsByName = async (rowIdx, itemName) => {
    if (!itemName?.trim()) return;
    try {
      const res  = await axios.get(`${ITEM_MASTER_API}/items/search`, { params: { itemName: itemName.trim(), status: "Active" } });
      const list = res.data?.data || res.data || [];
      const found = Array.isArray(list)
        ? list.find((it) => it.itemName?.toLowerCase() === itemName.trim().toLowerCase()) || list[0]
        : null;
      if (!found) return;
      setItems((prev) => {
        const next = [...prev];
        next[rowIdx] = { ...next[rowIdx],
          itemCode: found.itemCode || found.code || "",
          itemName: found.itemName || found.name || next[rowIdx].itemName || "",
          uom:      found.uom || found.baseUom || found.unit || next[rowIdx].uom || "",
        };
        return next;
      });
    } catch {} finally {
      setItemSuggestions([]); setActiveSugRow(null); setActiveSugField(null);
    }
  };

  /* ── item field change — ALWAYS editable (no form-edit gate) ── */
  const handleItemChange = (rowIdx, field, value) => {
    setItems((prev) => { const next = [...prev]; next[rowIdx] = { ...next[rowIdx], [field]: value }; return next; });
  };

  const handleDeleteChecked = () => {
    setItems((prev) => prev.filter((r) => !r._checked).map((r, i) => ({ ...r, sNo: i + 1 })));
    setActiveRowIdx(null);
  };

  /* ── Delete a single row directly (works on any row, locked or not) ── */
  const handleDeleteRow = (rowIdx) => {
    setItems((prev) => {
      if (prev.length <= 1) {
        alert("At least one item row is required.");
        return prev;
      }
      const row = prev[rowIdx];
      if ((row.firstWeight || row.secondWeight) &&
          !window.confirm("This row has weight captured. Delete it anyway?")) {
        return prev;
      }
      return prev.filter((_, i) => i !== rowIdx).map((r, i) => ({ ...r, sNo: i + 1 }));
    });
    if (activeRowIdx === rowIdx) setActiveRowIdx(null);
  };

  /* ── Insert rows — default count = 1 ── */
  const handleInsertRows = () => {
    const count = Math.max(1, Math.min(50, Number(insertCount) || 1));
    setItems((prev) => [...prev, ...Array.from({ length: count }, (_, i) => blankItem(prev.length + i + 1))]);
  };

  /* ── Shared: build payload + POST/PUT + cascade GIN/PO status ── */
  const persistWeighment = async (forcedStatus) => {
    const { currentWeight, _id, __v, createdAt, updatedAt, ...mainForm } = form;
    const cleanItems = items
      .filter((r) => { const { sNo, _checked, ...rest } = r; return Object.values(rest).some((v) => v !== ""); })
      .map(({ _checked, ...r }) => r);

    const isDraft = forcedStatus === "Draft";
    const isSaved = forcedStatus === "Saved";

    const payload = {
      ...mainForm,
      transactionType: effectiveType,
      status: forcedStatus,
      items: cleanItems,
    };

    let res;
    if (recordId) {
      res = await axios.put(`${WEIGHMENT_API}/${recordId}`, payload);
    } else {
      /* Officially register the document sequence to commit the increment,
         mirroring the Inward GIN flow. transactionCategory is mandatory,
         so a matching Document Sequence record must exist. Entity Prefix is
         entered manually on the Document Sequence screen — it must be read
         from the actual configured sequence, not derived from the category code. */
      const cat = transactionCategories.find((tx) => tx.categoryDescription === payload.transactionCategory);
      if (!cat) {
        throw new Error("Please select a valid Transaction Category before saving.");
      }
      const mod    = cat.module         || "Inventory";
      const entity = cat.businessEntity || "Weighment";
      try {
        const seqListRes  = await axios.get(`${API_URL}/api/document-sequence`);
        const matchingSeq = (Array.isArray(seqListRes.data) ? seqListRes.data : []).filter(
          (r) => r.module === mod && r.businessEntity === entity && r.transactionCategory === cat.categoryDescription
        );
        if (!matchingSeq.length) {
          throw new Error(`No Document Sequence is set up for "${cat.categoryDescription}". Please create one first.`);
        }
        const seqEntry     = matchingSeq.reduce((a, b) => (Number(a.incrementNo) > Number(b.incrementNo) ? a : b));
        const entityPrefix = (seqEntry.entityPrefix || "").trim().toUpperCase();

        const seqRes = await axios.post(`${API_URL}/api/create-document-sequence`, {
          module:              mod,
          businessEntity:      entity,
          entityPrefix,
          transactionCategory: cat.categoryDescription,
        });
        if (seqRes.data?.generatedCode) payload.weighmentNo = seqRes.data.generatedCode;
      } catch (seqErr) {
        console.warn("Could not register document sequence:", seqErr.message);
        /* Fallback to legacy next-no endpoint so save is never blocked */
        if (!payload.weighmentNo || payload.weighmentNo.includes("???") || payload.weighmentNo.startsWith("(")) {
          try {
            const fallbackRes = await axios.get(`${WEIGHMENT_API}/next-no`, {
              params: { transactionType: payload.transactionType },
            });
            if (fallbackRes.data?.weighmentNo) payload.weighmentNo = fallbackRes.data.weighmentNo;
          } catch (fbErr) {
            console.warn("Fallback weighment number fetch failed:", fbErr.message);
          }
        }
      }
      res = await axios.post(WEIGHMENT_API, payload);
    }

    if (!res.data?.success) {
      throw new Error(res.data?.message || "Save failed");
    }

    const savedWeighment = res.data.data;
    const ginNo          = savedWeighment?.inwardOutwardNoteNo || payload.inwardOutwardNoteNo;

    /* ── Cascade status to linked GIN and PO ─────────────────────────────────
       Save as Draft  → Weighment: Draft  | GIN: Convert  | PO: Convert
       Save           → Weighment: Saved  | GIN: Vout     | PO: no change
       Only runs when a GIN is linked (inwardOutwardNoteNo is set).
    ──────────────────────────────────────────────────────────────────────── */
    if (ginNo && (isDraft || isSaved)) {
      try {
        const ginListRes = await axios.get(GIN_API);
        /* Support both wrapped { data: [...] } and bare [...] responses */
        const allGINs    = Array.isArray(ginListRes.data)
          ? ginListRes.data
          : Array.isArray(ginListRes.data?.data)
            ? ginListRes.data.data
            : [];
        const linkedGIN  = allGINs.find((g) => g.ginNo === ginNo);

        if (linkedGIN?._id) {
          /* Draft → GIN: Convert | Saved → GIN: Vout */
          const ginNewStatus = isSaved ? "Vout" : "Convert";

          if (linkedGIN.status !== ginNewStatus && linkedGIN.status !== "Closed") {
            await axios.put(`${GIN_API}/${linkedGIN._id}`, {
              ...linkedGIN,
              status: ginNewStatus,
            });
          }

          /* Draft only → PO: Convert */
          if (isDraft && linkedGIN.poCpoNo) {
            try {
              const poListRes = await axios.get(`${API_URL}/api/purchase-orders`);
              const allPOs    = Array.isArray(poListRes.data) ? poListRes.data : [];
              const linkedPO  = allPOs.find((po) => po.poNo === linkedGIN.poCpoNo);
              if (linkedPO?._id && linkedPO.status !== "Convert" && linkedPO.status !== "Closed") {
                await axios.put(`${PO_API}/${linkedPO._id}`, {
                  ...linkedPO,
                  status: "Convert",
                });
              }
            } catch (poErr) {
              console.warn("Could not update PO to Convert:", poErr.message);
            }
          }
        }
      } catch (cascadeErr) {
        console.warn("Status cascade warning:", cascadeErr.message);
      }
    }

    return res;
  };

  /* ── Save as Draft — status: "Draft" | GIN → Convert | PO → Convert ── */
  const handleSaveDraft = async () => {
    if (!recordId && !form.transactionCategory) { alert("Transaction Category is required"); return; }
    if (!form.vehicleNo?.trim()) { alert("Vehicle Number is required"); return; }
    setSaving(true);
    try {
      await persistWeighment("Draft");
      alert(recordId ? "Weighment Saved as Draft (Updated)" : "Weighment Saved as Draft");
      navigate("/weighment-search");
    } catch (err) {
      console.error(err);
      alert("Save failed: " + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  /* ── Save — status: "Saved" | GIN → Vout | PO: no change ── */
  const handleSave = async () => {
    if (!recordId && !form.transactionCategory) { alert("Transaction Category is required"); return; }
    if (!form.vehicleNo?.trim()) { alert("Vehicle Number is required"); return; }
    setSaving(true);
    try {
      await persistWeighment("Saved");
      alert(recordId ? "Weighment Updated Successfully" : "Weighment Created Successfully");
      navigate("/weighment-search");
    } catch (err) {
      console.error(err);
      alert("Save failed: " + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  /* ── Derived display values ── */
  const typeClass        = effectiveType.toLowerCase();
  const statusClass      = (form.status || "open").toLowerCase();
  const anyChecked       = items.some((r) => r._checked);
  const isRowLocked = (row) => !!(row.firstWeight && row.secondWeight && row.netWeight);
  const weightButtonText = !form.firstWeight ? "Get Weight (→ 1st)" : !form.secondWeight ? "Get Weight (→ 2nd)" : "Completed";
  const weightHint       = !form.firstWeight ? " — will set First Weight" : !form.secondWeight ? " — will set Second Weight" : " — completed";
  const weightDisabled   = (!!form.firstWeight && !!form.secondWeight) || activeRowIdx === null;

  /* ── Helper: show field only if in visibleFields set ── */
  const show = (fieldName) => visibleFields.has(fieldName);

  return (
    <div className="wc-page">
      <ModuleNavbar />

      {/* ── Header — styled like InwardOutwardNote page ── */}
      <div className="gin-search-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="create-btn" style={{ background: "#2563eb" }} onClick={() => navigate(-1)}>← Back</button>
          <h2 style={{ fontSize: 18, color: "#1e293b", fontWeight: 700, margin: 0 }}>{pageTitle}</h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {form.weighmentNo && (
            <span style={{
              fontSize: 13, fontWeight: 700, color: "#4f46e5",
              background: "#eef2ff", border: "1.5px solid #c7d2fe",
              borderRadius: 7, padding: "3px 12px", letterSpacing: "0.4px",
              whiteSpace: "nowrap",
            }}>
              ⚖ {form.weighmentNo}
            </span>
          )}
          {!recordId && !form.weighmentNo && (
            <span style={{
              fontSize: 12, color: "#9ca3af", fontStyle: "italic",
            }}>
              Generating No…
            </span>
          )}
          <span className={`wc-badge wc-badge-${typeClass}`}>{effectiveType}</span>
          {recordId && <span className={`wc-badge wc-badge-${statusClass}`}>{form.status || "Open"}</span>}
          {!alwaysEditable && recordId && (
            editMode
              ? <button className="wc-edit-toggle edit-mode" onClick={() => setEditMode(false)}>👁 View Mode</button>
              : <button className="wc-edit-toggle view-mode" onClick={() => setEditMode(true)}>✏ Edit</button>
          )}
        </div>
      </div>

      {/* Edit mode info bar */}
      {!alwaysEditable && recordId && editMode && (
        <div className="wc-edit-bar">
          ✏️ <strong>Edit mode</strong> — fields are now editable. Click Save &amp; Update to save changes.
        </div>
      )}

      {/* ── Part 1: Weighment Header ── */}
      <div className="wc-card">
        <div className="wc-section-title">📋 Weighment Header</div>
        <div className="wc-grid wc-grid-5">

          {show("transactionCategory") && (
            <div
              className="wc-field"
              style={{
                background: "#fffbeb",
                border: "1.5px solid #fbbf24",
                borderRadius: 8,
                padding: "8px 10px",
              }}
            >
              <label style={{ color: "#92400e", fontWeight: 700 }}>
                ★ Transaction Category <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <select
                name="transactionCategory"
                value={form.transactionCategory || ""}
                onChange={handleChange}
                disabled={!canEditForm || !!recordId}
                required
                style={{
                  border: "1.5px solid #fbbf24",
                  background: "#fff",
                  fontWeight: 600,
                }}
              >
                <option value="">- Select Transaction Category -</option>
                {form.transactionCategory &&
                  !transactionCategories.some((tx) => tx.categoryDescription === form.transactionCategory) && (
                    <option value={form.transactionCategory}>{form.transactionCategory}</option>
                  )}
                {transactionCategories.map((tx) => (
                  <option key={tx._id} value={tx.categoryDescription}>
                    {tx.transactionCategoryCode} - {tx.categoryDescription}
                  </option>
                ))}
              </select>
              {!recordId && !form.transactionCategory && (
                <span style={{ fontSize: 10.5, color: "#b45309", marginTop: 3, display: "block" }}>
                  Select category first — Weighment No is generated from it
                </span>
              )}
            </div>
          )}

          {show("weighmentNo") && (
            <div className="wc-field">
              <label>Weighment No</label>
              <input name="weighmentNo" value={form.weighmentNo || ""}
                onChange={handleChange}
                readOnly={!canEditForm || !!recordId || !recordId}
                className="wc-readonly"
                placeholder={
                  !recordId
                    ? (form.transactionCategory ? "Generating…" : "Select Transaction Category first")
                    : "—"
                }
                style={form.weighmentNo && !recordId ? {
                  background: "#eef2ff", color: "#4f46e5", fontWeight: 700,
                  border: "1.5px solid #c7d2fe", letterSpacing: "0.4px",
                } : {}}
              />
            </div>
          )}

          {show("description") && (
            <div className="wc-field">
              <label>Description</label>
              <input name="description" value={form.description || ""}
                onChange={handleChange} readOnly={!canEditForm}
                className={!canEditForm ? "wc-readonly" : ""} placeholder="Enter description" />
            </div>
          )}

          {show("weighmentDate") && (
            <div className="wc-field">
              <label>Date</label>
              <input type="date" name="weighmentDate" value={form.weighmentDate || ""}
                onChange={handleChange} readOnly={!canEditForm}
                className={!canEditForm ? "wc-readonly" : ""} />
            </div>
          )}

          {show("transactionType") && (
            <div className="wc-field">
              <label>Transaction Type</label>
              {alwaysEditable && !recordId && effectiveType === "General"
                ? (
                  <select name="transactionType" value={form.transactionType || "General"}
                    onChange={handleChange}>
                    <option value="General">General</option>
                    <option value="Inward">Inward</option>
                    <option value="Outward">Outward</option>
                  </select>
                )
                : <input value={effectiveType} readOnly className="wc-readonly" />
              }
            </div>
          )}

        </div>
      </div>

      {/* ── Part 2: Operational Fields ── */}
      <div className="wc-card">
        <div className="wc-section-title">🚛 Weighment Details</div>
        <div className="wc-grid wc-grid-5">

          {show("inwardOutwardNoteNo") && (
            <div className="wc-field">
              <label>Inward / Outward Note No</label>
              <input name="inwardOutwardNoteNo" value={form.inwardOutwardNoteNo || ""}
                onChange={handleChange} readOnly={!canEditForm}
                className={!canEditForm ? "wc-readonly" : ""} />
            </div>
          )}

          {show("vehicleNo") && (
            <div className="wc-field">
              <label>Vehicle No *</label>
              <input name="vehicleNo" value={form.vehicleNo || ""}
                onChange={handleChange} readOnly={!canEditForm}
                className={!canEditForm ? "wc-readonly" : ""} placeholder="Required" />
            </div>
          )}

          {show("partyCode") && (
            <div className="wc-field">
              <label>Party Code</label>
              <input
                name="partyCode"
                value={form.partyCode || ""}
                readOnly
                className="wc-readonly"
                placeholder="Auto-filled"
                title="Party Code is auto-filled — set it via Party Name or the linked Inward/Outward record"
              />
            </div>
          )}

          {show("partyName") && (
            <div className="wc-field" style={{ position: "relative" }}>
              <label>Party Name</label>
              <input name="partyName" value={form.partyName || ""}
                onChange={(e) => { handleChange(e); setShowPartySug(true); }}
                onFocus={() => setShowPartySug(true)}
                onBlur={() => setTimeout(() => setShowPartySug(false), 150)}
                readOnly={!canEditForm}
                className={!canEditForm ? "wc-readonly" : ""} autoComplete="off" />
              {canEditForm && showPartySug && partySuggestions.length > 0 && (
                <ul style={{
                  position: "absolute", top: "100%", left: 0, right: 0, zIndex: 999,
                  background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.10)", margin: 0, padding: 0,
                  listStyle: "none", maxHeight: 200, overflowY: "auto", fontSize: 13,
                }}>
                  {partySuggestions.map((p) => (
                    <li key={p._id || p.partyCode} onMouseDown={() => handlePartySelect(p)}
                      style={{ padding: "8px 12px", cursor: "pointer", color: "#1e293b" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#f1f5f9"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                      {p.partyCode} — {p.partyName}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {show("site") && (
            <div className="wc-field">
              <label>Site</label>
              <input name="site" value={form.site || ""}
                onChange={handleChange} readOnly={!canEditForm}
                className={!canEditForm ? "wc-readonly" : ""} />
            </div>
          )}

          {show("status") && (
            <div className="wc-field">
              <label>Status</label>
              <select name="status" value={form.status || "Open"}
                onChange={handleChange} disabled={!canEditForm}>
                {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          )}

          {show("weighmentInDate") && (
            <div className="wc-field">
              <label>Weight In Date</label>
              <input type="date" name="weighmentInDate" value={form.weighmentInDate || ""}
                onChange={handleChange} readOnly={!canEditForm}
                className={!canEditForm ? "wc-readonly" : ""} />
            </div>
          )}

          {show("weighmentInTime") && (
            <div className="wc-field">
              <label>Weight In Time</label>
              <input type="time" name="weighmentInTime" value={form.weighmentInTime || ""}
                onChange={handleChange} readOnly={!canEditForm}
                className={!canEditForm ? "wc-readonly" : ""} />
            </div>
          )}

          {show("weighmentOutDate") && (
            <div className="wc-field">
              <label>Weight Out Date</label>
              <input type="date" name="weighmentOutDate" value={form.weighmentOutDate || ""}
                onChange={handleChange} readOnly={!canEditForm}
                className={!canEditForm ? "wc-readonly" : ""} />
            </div>
          )}

          {show("weighmentOutTime") && (
            <div className="wc-field">
              <label>Weight Out Time</label>
              <input type="time" name="weighmentOutTime" value={form.weighmentOutTime || ""}
                onChange={handleChange} readOnly={!canEditForm}
                className={!canEditForm ? "wc-readonly" : ""} />
            </div>
          )}

          {show("transporterName") && (
            <div className="wc-field">
              <label>Transporter Name</label>
              <input name="transporterName" value={form.transporterName || ""}
                onChange={handleChange} readOnly={!canEditForm}
                className={!canEditForm ? "wc-readonly" : ""} />
            </div>
          )}

          {show("poCpoNo") && (
            <div className="wc-field">
              <label>PO / CPO No</label>
              <input name="poCpoNo" value={form.poCpoNo || ""}
                onChange={handleChange} readOnly={!canEditForm}
                className={!canEditForm ? "wc-readonly" : ""} />
            </div>
          )}

          {show("supplierInvoiceNo") && (
            <div className="wc-field">
              <label>Supplier Invoice No</label>
              <input name="supplierInvoiceNo" value={form.supplierInvoiceNo || ""}
                onChange={handleChange} readOnly={!canEditForm}
                className={!canEditForm ? "wc-readonly" : ""} />
            </div>
          )}

          {show("supplierInvoiceDate") && (
            <div className="wc-field">
              <label>Supplier Invoice Date</label>
              <input type="date" name="supplierInvoiceDate" value={form.supplierInvoiceDate || ""}
                onChange={handleChange} readOnly={!canEditForm}
                className={!canEditForm ? "wc-readonly" : ""} />
            </div>
          )}

          {show("challanDate") && (
            <div className="wc-field">
              <label>Challan Date</label>
              <input type="date" name="challanDate" value={form.challanDate || ""}
                onChange={handleChange} readOnly={!canEditForm}
                className={!canEditForm ? "wc-readonly" : ""} />
            </div>
          )}

          {show("ewayDate") && (
            <div className="wc-field">
              <label>E-Way Date</label>
              <input type="date" name="ewayDate" value={form.ewayDate || ""}
                onChange={handleChange} readOnly={!canEditForm}
                className={!canEditForm ? "wc-readonly" : ""} />
            </div>
          )}

          {show("remarks") && (
            <div className="wc-field wc-field-full">
              <label>Remarks</label>
              <textarea rows="2" name="remarks" value={form.remarks || ""}
                onChange={handleChange} readOnly={!canEditForm}
                className={!canEditForm ? "wc-readonly" : ""} />
            </div>
          )}

        </div>
      </div>

      {/* ── Part 3: Weight Capture ── */}
      <div className="wc-card">
        <div className="wc-section-title">⚖️ Weight Capture</div>
        <div className="wc-weight-strip">

          <div className="wc-weight-box">
            <label>First Weight</label>
            <input value={form.firstWeight || ""} readOnly className="wc-wt-yellow" placeholder="—" />
          </div>

          <div className="wc-weight-box">
            <label>Second Weight</label>
            <input value={form.secondWeight || ""} readOnly className="wc-wt-yellow" placeholder="—" />
          </div>

          <div className="wc-weight-box">
            <label>Net Weight</label>
            <input
              value={form.netWeight !== "" && form.netWeight != null
                ? parseFloat(parseFloat(form.netWeight).toFixed(2))
                : ""}
              readOnly className="wc-wt-green" placeholder="—" />
          </div>

          <div className="wc-weight-box wc-weight-get-box">
            <label>
              Weight (In MT)
              <span className="wc-wt-hint">{weightHint}</span>
            </label>
            <div className="wc-get-weight-wrap">
              <input
                type="number" step="0.001" name="currentWeight"
                value={form.currentWeight || ""}
                onChange={(e) => setForm((prev) => ({ ...prev, currentWeight: e.target.value }))}
                placeholder={activeRowIdx === null ? "Tick a row first…" : "Enter value"}
                disabled={weightDisabled}
                className="wc-get-wt-input"
              />
              <button
                type="button"
                className={`wc-get-btn ${weightDisabled ? "wc-get-btn-done" : ""}`}
                onClick={getWeight} disabled={weightDisabled}
              >
                {activeRowIdx === null ? "Tick a row first" : weightButtonText}
              </button>
            </div>
          </div>

        </div>

        {activeRowIdx === null && !(form.firstWeight && form.secondWeight) && (
          <div className="wc-active-row-hint" style={{ background: "#fef9c3", borderColor: "#fde68a", color: "#92400e" }}>
            ⚠️ Please tick a row in the Items table below before entering weight.
          </div>
        )}
        {activeRowIdx !== null && (
          <div className="wc-active-row-hint">
            ✏️ Row {activeRowIdx + 1} selected — enter weight above and click Get Weight
          </div>
        )}
      </div>

      {/* ── Part 4: Items — ALWAYS directly editable, no Edit button needed ── */}
      <div className="wc-card" ref={itemsSectionRef}>
        <div className="wc-items-header">
          <span className="wc-items-title">📦 Items</span>
          <div className="wc-items-actions">
            {activeRowIdx !== null && (
              <span className="wc-active-badge">Row {activeRowIdx + 1} active</span>
            )}
            {anyChecked && (
              <button className="wc-del-rows-btn" onClick={handleDeleteChecked}>🗑 Delete Selected</button>
            )}
          </div>
        </div>

        <div className="wc-items-table-wrap">
          <table className="wc-items-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}></th>
                <th style={{ width: 40 }}>Sl No</th>
                <th style={{ width: 120 }}>Item Code</th>
                <th style={{ minWidth: 180 }}>Item Name</th>
                <th style={{ width: 70 }}>UOM</th>
                <th style={{ width: 110 }}>First Weight</th>
                <th style={{ width: 110 }}>Second Weight</th>
                <th style={{ width: 110 }}>Net Weight</th>
                <th style={{ minWidth: 130 }}>Remarks</th>
                <th style={{ width: 50 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row, idx) => {
                const isActive = activeRowIdx === idx;
                const locked   = isRowLocked(row);
                return (
                  <tr
                    key={idx}
                    className={[
                      row._checked ? "wc-row-checked" : "",
                      isActive     ? "wc-row-active"  : "",
                      locked       ? "wc-row-locked"  : "",
                    ].filter(Boolean).join(" ")}
                    onFocus={() => !locked && handleRowFocus(idx)}
                  >
                    <td className="wc-check-cell">
                      <input type="checkbox" checked={!!row._checked}
                        onChange={(e) => handleItemCheck(idx, e.target.checked)}
                        disabled={locked}
                        title={locked ? "Row complete — locked" : "Tick to capture weight for this row"}
                      />
                    </td>
                    <td className="wc-sno">
                      {row.sNo}
                      {locked && <span style={{ marginLeft: 3, fontSize: 10 }} title="Complete">🔒</span>}
                    </td>

                    {/* Item Code */}
                    <td className="wc-item-code-cell">
                      <input className="wc-item-input" value={row.itemCode}
                        onChange={(e) => handleItemCodeChange(idx, e.target.value)}
                        onBlur={() => setTimeout(() => fetchItemDetailsByCode(idx, row.itemCode), 200)}
                        placeholder="Code" />
                      {activeSugRow === idx && activeSugField === "itemCode" && itemSuggestions.length > 0 && (
                        <ul className="wc-item-suggestions">
                          {itemSuggestions.map((s, si) => (
                            <li key={si} onMouseDown={() => selectItemSuggestion(idx, s)}>
                              <strong>{s.itemCode || s.code}</strong> — {s.itemName || s.name}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>

                    {/* Item Name */}
                    <td className="wc-item-code-cell">
                      <input className="wc-item-input" value={row.itemName}
                        onChange={(e) => handleItemNameChange(idx, e.target.value)}
                        onBlur={() => setTimeout(() => fetchItemDetailsByName(idx, row.itemName), 200)}
                        placeholder="Item name" />
                      {activeSugRow === idx && activeSugField === "itemName" && itemSuggestions.length > 0 && (
                        <ul className="wc-item-suggestions">
                          {itemSuggestions.map((s, si) => (
                            <li key={si} onMouseDown={() => selectItemSuggestion(idx, s)}>
                              <strong>{s.itemName || s.name}</strong> — {s.itemCode || s.code}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>

                    {/* UOM */}
                    <td>
                      <input className="wc-item-input wc-uom-input" value={row.uom}
                        onChange={(e) => handleItemChange(idx, "uom", e.target.value)}
                        placeholder="UOM"
                        readOnly={!!row.itemCode && !!row.uom} />
                    </td>

                    {/* First Weight */}
                    <td>
                      <input className={`wc-item-input wc-wt-input ${row.firstWeight ? "wc-wt-filled" : ""}`}
                        value={row.firstWeight} readOnly placeholder="← auto" />
                    </td>

                    {/* Second Weight */}
                    <td>
                      <input className={`wc-item-input wc-wt-input ${row.secondWeight ? "wc-wt-filled" : ""}`}
                        value={row.secondWeight} readOnly placeholder="—" />
                    </td>

                    {/* Net Weight */}
                    <td>
                      <input className={`wc-item-input wc-net-input ${row.netWeight ? "wc-net-filled" : ""}`}
                        value={row.netWeight !== "" && row.netWeight != null
                          ? parseFloat(parseFloat(row.netWeight).toFixed(2))
                          : ""}
                        readOnly placeholder="—" />
                    </td>

                    {/* Remarks — always editable */}
                    <td>
                      <input className="wc-item-input" style={{ minWidth: 120 }}
                        value={row.remarks}
                        onChange={(e) => handleItemChange(idx, "remarks", e.target.value)}
                        placeholder="Remarks" />
                    </td>

                    {/* Delete this row — works regardless of checkbox/lock state */}
                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        className="wc-row-del-btn"
                        title="Delete this row"
                        onClick={() => handleDeleteRow(idx)}
                        style={{
                          background: "#fef2f2", color: "#dc2626",
                          border: "1px solid #fecaca", borderRadius: 5,
                          width: 26, height: 26, cursor: "pointer",
                          fontSize: 13, lineHeight: 1,
                        }}
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Insert bar — default count = 1 ── */}
        <div className="wc-insert-bar">
          <span className="wc-insert-label">Rows to add:</span>
          <input type="number" min="1" max="50" className="wc-insert-count"
            value={insertCount} onChange={(e) => setInsertCount(e.target.value)} />
          <button className="wc-insert-btn" onClick={handleInsertRows}>+ Insert Row</button>
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="wc-actions">
        <button className="wc-btn-cancel" onClick={() => navigate(-1)} disabled={saving}>Cancel</button>
        <button
          className="wc-btn-draft"
          onClick={handleSaveDraft}
          disabled={saving}
          style={{
            padding: "8px 20px",
            background: "#f59e0b",
            color: "#fff",
            border: "none",
            borderRadius: 7,
            fontSize: 13,
            fontWeight: 700,
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.6 : 1,
            transition: "background 0.18s",
          }}
        >
          {saving ? "Saving…" : "Save as Draft"}
        </button>
        <button className="wc-btn-save" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : (recordId ? "Save & Update" : "Save & Create")}
        </button>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   CreateGeneralWeighment — all fields visible
═══════════════════════════════════════════════════════════════════════════ */
export const CreateGeneralWeighment = () => (
  <WeighmentForm
    initialForm={null}
    initialItems={null}
    recordId={null}
    pageTitle="Create Weighment"
    transactionType="General"
    alwaysEditable={true}
  />
);

/* ═══════════════════════════════════════════════════════════════════════════
   InwardOutwardList — GIN list, vehicle search, auto-create weighment
═══════════════════════════════════════════════════════════════════════════ */
const InwardOutwardList = ({ type }) => {
  const navigate = useNavigate();

  const accentCls = type === "Inward" ? "wc-badge-inward" : "wc-badge-outward";

  const [allRecords,    setAllRecords]    = useState([]);
  const [records,       setRecords]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [creating,      setCreating]      = useState(null);
  const [vehicleSearch, setVehicleSearch] = useState("");

  useEffect(() => {
    const fetchRecords = async () => {
      setLoading(true);
      try {
        /* 1. Fetch GIN records for this type */
        const params = new URLSearchParams();
        params.append("inOutType", type);
        ["Open", "Convert", "Vout", "Weighted", "OutPending"].forEach((s) => params.append("statusIn", s));
        const res     = await axios.get(`${GIN_API}?${params.toString()}`);
        const data    = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        const ginList = data.filter((r) => (r.status || "").toLowerCase() !== "closed");

        /* 2. Fetch all weighments for this type to find which GINs already have one */
        let usedGinNos = new Set();
        try {
          const wRes  = await axios.get(WEIGHMENT_API, { params: { transactionType: type } });
          const wList = wRes.data?.data || [];
          wList.forEach((w) => { if (w.inwardOutwardNoteNo) usedGinNos.add(w.inwardOutwardNoteNo); });
        } catch { /* ignore — show all GINs if weighment fetch fails */ }

        /* 3. Only show GINs that do NOT yet have a weighment created */
        const fresh = ginList.filter((r) => !usedGinNos.has(r.ginNo));
        setAllRecords(fresh);
        setRecords(fresh);
      } catch (err) {
        console.error(err);
        alert(`Failed to load ${type} records`);
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
  }, [type]);

  useEffect(() => {
    if (!vehicleSearch.trim()) {
      setRecords(allRecords);
    } else {
      const q = vehicleSearch.trim().toLowerCase();
      setRecords(allRecords.filter((r) => (r.vehicleNo || "").toLowerCase().includes(q)));
    }
  }, [vehicleSearch, allRecords]);

  const openOrCreate = async (e, gin) => {
    e.stopPropagation();
    const ginNo = gin?.ginNo;
    if (!ginNo) { alert("GIN number not found"); return; }
    setCreating(ginNo);

    try {
      /* Safety check — if a weighment was created for this GIN after the list loaded,
         open it instead of going to the create form */
      const searchRes = await axios.get(WEIGHMENT_API, {
        params: { inwardOutwardNoteNo: ginNo, transactionType: type },
      });
      const list     = searchRes.data?.data || [];
      const existing = list.find((w) => w.inwardOutwardNoteNo === ginNo);

      if (existing?._id) {
        navigate(`/weighment-detail/${existing._id}`, {
          state: { allowEdit: true, fromInwardOutward: true },
        });
        return;
      }

      /* No weighment yet — go to pre-filled form. Nothing is written to DB here.
         Record only created when user clicks Save or Save as Draft on the form. */
      const ginData = {
        transactionType: type,
        transactionCategory: gin.transactionCategory || "",
        inwardOutwardNoteNo: gin.ginNo,

        vehicleNo: gin.vehicleNo || "",

        // Party Code / Name are auto-filled from the linked GIN record —
        // Party Code is locked (read-only) on the form itself.
        partyCode: gin.partyCode || gin.vendorCode || "",
        partyName: gin.partyName || gin.vendorName || "",

        site: gin.site || "",

        weighmentDate: gin.ginDate || today,
        weighmentInDate: gin.ginDate || today,

        // Blank by default
        weighmentOutDate: "",

        // Auto-fetched from the linked Inward/Outward (GIN) record
        supplierInvoiceNo: gin.challanInvoiceNo || "",
        supplierInvoiceDate: gin.challanDate || "",

        remarks: gin.remarks || gin.comments || "",

        vendorCode: gin.vendorCode || "",
        vendorName: gin.vendorName || "",

        poCpoNo: gin.poCpoNo || "",

        challanDate: gin.challanDate || "",
        ewayDate: gin.ewayDate || "",

        items: Array.isArray(gin.items) && gin.items.length > 0
          ? gin.items
              .filter((r) => r.itemCode || r.itemName)
              .map((it, i) => ({
                sNo: i + 1,
                itemCode: it.itemCode || "",
                itemName: it.itemName || "",
                uom: it.uom || "",
                remarks: "",
                firstWeight: "",
                secondWeight: "",
                netWeight: "",
              }))
          : [],
      };

      const route = type === "Inward"
        ? "/weighment/create/inward/form"
        : "/weighment/create/outward/form";

      navigate(route, { state: { ginData } });
    } catch (err) {
      console.error(err);
      alert("Error: " + (err.response?.data?.message || err.message));
    } finally {
      setCreating(null);
    }
  };

  return (
    <div className="wc-page">
      <ModuleNavbar />

      <div className="gin-search-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="create-btn" style={{ background: "#2563eb" }} onClick={() => navigate("/weighment-search")}>← Back</button>
          <h2 style={{ fontSize: 18, color: "#1e293b", fontWeight: 700, margin: 0 }}>Create {type} Weighment</h2>
        </div>
        <span className={`wc-badge ${accentCls}`}>{type}</span>
      </div>

      {/* Vehicle No Search Bar */}
      <div className="wc-vsearch-card">
        <div className="wc-vsearch-row">
          <label className="wc-vsearch-label">🔍 Vehicle No</label>
          <input
            type="text"
            className="wc-vsearch-input"
            value={vehicleSearch}
            onChange={(e) => setVehicleSearch(e.target.value)}
            placeholder={`Search ${type.toLowerCase()} records by vehicle number…`}
            autoFocus
          />
          {vehicleSearch && (
            <button className="wc-vsearch-clear" onClick={() => setVehicleSearch("")}>
              ✕ Clear
            </button>
          )}
        </div>
        {vehicleSearch && (
          <div style={{ marginTop: 6, fontSize: 11, color: "#6b7280" }}>
            {records.length} matching record{records.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Records table */}
      <div className="wc-card wc-card-accent-top" style={{ marginTop: 8 }}>
        <div className="wc-section-title">
          🚛 {type} Vehicle Records — Open
          {!loading && (
            <span className="wc-section-count">
              {records.length} record{records.length !== 1 ? "s" : ""}
              {records.length > 0 && " — click row to open or create weighment"}
            </span>
          )}
        </div>

        {loading && <div className="wc-placeholder">Loading records…</div>}

        {!loading && records.length === 0 && (
          <div className="wc-placeholder">
            {vehicleSearch
              ? `No ${type.toLowerCase()} records found for vehicle "${vehicleSearch}". Try a different search.`
              : `No open ${type.toLowerCase()} vehicle records found.`
            }
          </div>
        )}

        {!loading && records.length > 0 && (
          <div className="wc-table-wrap">
            <table className="wc-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Inward/Outward Note No</th>
                  <th>Weighment No</th>
                  <th>Vehicle No</th>
                  <th>Trans Type</th>
                  <th>Trans Category</th>
                  <th>Party Name</th>
                  <th>Net Weight</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {records.map((row, idx) => (
                  <tr key={row._id || idx} onClick={(e) => openOrCreate(e, row)}
                    style={{ cursor: creating === row.ginNo ? "wait" : "pointer" }}>
                    <td>{idx + 1}</td>
                    <td>
                      <button className="wc-link-btn" onClick={(e) => openOrCreate(e, row)}
                        disabled={creating === row.ginNo}>
                        {creating === row.ginNo ? "Opening…" : (row.ginNo || "—")}
                      </button>
                    </td>
                    <td>{row.weighmentNo || <span className="wc-wt-none">—</span>}</td>
                    <td>{row.vehicleNo || "—"}</td>
                    <td>{row.inOutType || row.transactionType || type}</td>
                    <td>{row.transactionCategory || "—"}</td>
                    <td>{row.partyName || row.vendorName || "—"}</td>
                    <td>{row.netWeight ? `${row.netWeight} MT` : "—"}</td>
                    <td>
                      <span className={`wc-status wc-status-${(row.status || "open").toLowerCase()}`}>
                        {row.status || "Open"}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button
                        className="wc-link-btn"
                        style={{
                          background: "#eff0ff", padding: "3px 12px", borderRadius: 5,
                          border: "1px solid #c7d2fe", textDecoration: "none",
                          fontSize: 11, fontWeight: 700,
                        }}
                        onClick={(e) => openOrCreate(e, row)}
                        disabled={creating === row.ginNo}
                      >
                        {creating === row.ginNo ? "Opening…" : "Open / Create"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Inward / Outward list exports ── */
export const CreateInwardWeighment  = () => <InwardOutwardList type="Inward"  />;
export const CreateOutwardWeighment = () => <InwardOutwardList type="Outward" />;

/* ── Inward / Outward FORM exports (navigated to after clicking a GIN row) ──
   Reads pre-filled data from location.state.ginData (set by InwardOutwardList).
   Nothing is saved to the DB until the user clicks Save or Save as Draft.       */
export const CreateInwardWeighmentForm = () => {
  const location = useLocation();
  const ginData  = location.state?.ginData || {};
  /* Strip transactionCategory (and any stray weighmentNo) from the GIN's data —
     the GIN's own category belongs to the Inward/GIN module, not Weighment.
     The user must pick the Weighment Transaction Category fresh, which then
     drives the Weighment No via the Document Sequence. */
  const { items: ginItems, transactionCategory: _ginCat, weighmentNo: _ginWtNo, ...ginForm } = ginData;
  const initialItems = Array.isArray(ginItems) && ginItems.length > 0
    ? ginItems.map((it, i) => ({ ...blankItem(i + 1), ...it }))
    : null;
  return (
    <WeighmentForm
      initialForm={ginForm}
      initialItems={initialItems}
      recordId={null}
      pageTitle="Create Inward Weighment"
      transactionType="Inward"
      alwaysEditable={true}
    />
  );
};

export const CreateOutwardWeighmentForm = () => {
  const location = useLocation();
  const ginData  = location.state?.ginData || {};
  /* Same as Inward — don't carry the GIN's transactionCategory into the
     Weighment form; the user must pick the Weighment category explicitly. */
  const { items: ginItems, transactionCategory: _ginCat, weighmentNo: _ginWtNo, ...ginForm } = ginData;
  const initialItems = Array.isArray(ginItems) && ginItems.length > 0
    ? ginItems.map((it, i) => ({ ...blankItem(i + 1), ...it }))
    : null;
  return (
    <WeighmentForm
      initialForm={ginForm}
      initialItems={initialItems}
      recordId={null}
      pageTitle="Create Outward Weighment"
      transactionType="Outward"
      alwaysEditable={true}
    />
  );
};

export default {
  CreateGeneralWeighment,
  CreateInwardWeighment,
  CreateOutwardWeighment,
  CreateInwardWeighmentForm,
  CreateOutwardWeighmentForm,
};
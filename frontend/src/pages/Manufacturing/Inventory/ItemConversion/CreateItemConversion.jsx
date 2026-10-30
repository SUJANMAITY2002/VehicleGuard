import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";
import "./ItemConversion.css";

const WEIGHMENT_API = `${API_URL}/api/weighment`;
const GIN_API       = `${API_URL}/api/goods-inward-note`;

/* 2-digit-year date fragment builder — mirrors GIN / Weighment / DocumentSequence logic */
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

/* ════════════════════════════════════════════════════════
   PORTAL HELPERS — dropdowns render on <body> so they are
   NEVER clipped by table overflow or scroll containers
════════════════════════════════════════════════════════ */

/* ── Portal: plain string list (used for item-code column) ── */
const PortalCodeTypeAhead = ({ value, onChange, suggestions, onSelect, placeholder, className }) => {
  const [show,   setShow]   = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef(null);
  const listRef  = useRef(null);

  const filtered = suggestions
    .filter((s) => !value || s?.toLowerCase().includes(value.toLowerCase()))
    .slice(0, 10);

  const calcCoords = useCallback(() => {
    if (!inputRef.current) return;
    const rect       = inputRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropH      = Math.min(filtered.length * 34 + 8, 220);
    const goUp       = spaceBelow < dropH + 8;
    setCoords({
      left:  rect.left,
      width: rect.width,
      top:   goUp ? rect.top - dropH - 2 : rect.bottom + 2,
    });
  }, [filtered.length]);

  useEffect(() => {
    if (!show) return;
    calcCoords();
    window.addEventListener("scroll", calcCoords, true);
    window.addEventListener("resize", calcCoords);
    return () => {
      window.removeEventListener("scroll", calcCoords, true);
      window.removeEventListener("resize", calcCoords);
    };
  }, [show, calcCoords]);

  useEffect(() => {
    const h = (e) => {
      if (
        inputRef.current && !inputRef.current.contains(e.target) &&
        listRef.current  && !listRef.current.contains(e.target)
      ) setShow(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const dropdown = show && filtered.length > 0
    ? ReactDOM.createPortal(
        <ul
          ref={listRef}
          style={{
            position: "fixed", top: coords.top, left: coords.left, width: coords.width,
            zIndex: 99999, background: "#fff", border: "1.5px solid #93c5fd",
            borderRadius: 6, listStyle: "none", margin: 0, padding: "4px 0",
            maxHeight: 220, overflowY: "auto",
            boxShadow: "0 8px 24px rgba(37,99,235,0.15)", scrollbarWidth: "thin",
          }}
        >
          {filtered.map((s, i) => (
            <li
              key={i}
              onMouseDown={(e) => { e.preventDefault(); onSelect(s); setShow(false); }}
              style={{ padding: "7px 12px", fontSize: 12, cursor: "pointer", borderBottom: "1px solid #f1f5f9", color: "#1e293b" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#eff6ff"; e.currentTarget.style.color = "#1d4ed8"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = ""; e.currentTarget.style.color = "#1e293b"; }}
            >
              {s}
            </li>
          ))}
        </ul>,
        document.body
      )
    : null;

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        className={className || "ic-item-input"}
        style={{ width: "100%", boxSizing: "border-box" }}
        value={value}
        onChange={(e) => { onChange(e.target.value); setShow(true); }}
        onFocus={() => { setShow(true); calcCoords(); }}
        placeholder={placeholder || "Item code…"}
        autoComplete="off"
      />
      {dropdown}
    </>
  );
};

/* ── Portal: full item object by name or code (used for item-name column & base item) ── */
const PortalItemTypeAhead = ({ value, onChange, items, onSelectItem, placeholder, className, readOnly }) => {
  const [show,   setShow]   = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef(null);
  const listRef  = useRef(null);

  const filtered = items.filter((item) => {
    if (!value) return true;
    const q = value.toLowerCase();
    return item.itemName?.toLowerCase().includes(q) || item.itemCode?.toLowerCase().includes(q);
  }).slice(0, 12);

  const calcCoords = useCallback(() => {
    if (!inputRef.current) return;
    const rect       = inputRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropH      = Math.min(filtered.length * 34 + 8, 220);
    const goUp       = spaceBelow < dropH + 8;
    setCoords({
      left:  rect.left,
      width: rect.width,
      top:   goUp ? rect.top - dropH - 2 : rect.bottom + 2,
    });
  }, [filtered.length]);

  useEffect(() => {
    if (!show) return;
    calcCoords();
    window.addEventListener("scroll", calcCoords, true);
    window.addEventListener("resize", calcCoords);
    return () => {
      window.removeEventListener("scroll", calcCoords, true);
      window.removeEventListener("resize", calcCoords);
    };
  }, [show, calcCoords]);

  useEffect(() => {
    const h = (e) => {
      if (
        inputRef.current && !inputRef.current.contains(e.target) &&
        listRef.current  && !listRef.current.contains(e.target)
      ) setShow(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  /* Read-only variant — no dropdown */
  if (readOnly) {
    return (
      <input
        type="text"
        className={`ic-readonly ${className || ""}`}
        style={{ width: "100%", boxSizing: "border-box" }}
        value={value}
        readOnly
        placeholder={placeholder}
      />
    );
  }

  const dropdown = show && filtered.length > 0
    ? ReactDOM.createPortal(
        <ul
          ref={listRef}
          style={{
            position: "fixed", top: coords.top, left: coords.left, width: coords.width,
            zIndex: 99999, background: "#fff", border: "1.5px solid #93c5fd",
            borderRadius: 6, listStyle: "none", margin: 0, padding: "4px 0",
            maxHeight: 220, overflowY: "auto",
            boxShadow: "0 8px 24px rgba(37,99,235,0.15)", scrollbarWidth: "thin",
          }}
        >
          {filtered.map((item, i) => (
            <li
              key={item._id || i}
              onMouseDown={(e) => { e.preventDefault(); onSelectItem(item); setShow(false); }}
              style={{
                padding: "7px 12px", fontSize: 12, cursor: "pointer",
                borderBottom: "1px solid #f1f5f9", color: "#1e293b",
                display: "flex", justifyContent: "space-between", gap: 8,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#eff6ff"; e.currentTarget.style.color = "#1d4ed8"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = ""; e.currentTarget.style.color = "#1e293b"; }}
            >
              <span>{item.itemName}</span>
              <span style={{ opacity: 0.5, fontSize: "0.82em", whiteSpace: "nowrap" }}>
                {item.itemCode}{item.uom ? ` · ${item.uom}` : ""}
              </span>
            </li>
          ))}
        </ul>,
        document.body
      )
    : null;

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        className={className || "ic-item-input"}
        style={{ width: "100%", boxSizing: "border-box" }}
        value={value}
        onChange={(e) => { onChange(e.target.value); setShow(true); }}
        onFocus={() => { setShow(true); calcCoords(); }}
        placeholder={placeholder || "Type to search item…"}
        autoComplete="off"
      />
      {dropdown}
    </>
  );
};

/* ── Portal: party name search ── */
const PortalPartyTypeAhead = ({ value, onChange, parties, onSelectParty, placeholder, className, readOnly }) => {
  const [show,   setShow]   = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef(null);
  const listRef  = useRef(null);

  const filtered = parties.filter((p) => {
    if (!value) return true;
    const q = value.toLowerCase();
    return p.partyName?.toLowerCase().includes(q) || p.partyCode?.toLowerCase().includes(q);
  }).slice(0, 10);

  const calcCoords = useCallback(() => {
    if (!inputRef.current) return;
    const rect       = inputRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropH      = Math.min(filtered.length * 34 + 8, 220);
    const goUp       = spaceBelow < dropH + 8;
    setCoords({
      left:  rect.left,
      width: rect.width,
      top:   goUp ? rect.top - dropH - 2 : rect.bottom + 2,
    });
  }, [filtered.length]);

  useEffect(() => {
    if (!show) return;
    calcCoords();
    window.addEventListener("scroll", calcCoords, true);
    window.addEventListener("resize", calcCoords);
    return () => {
      window.removeEventListener("scroll", calcCoords, true);
      window.removeEventListener("resize", calcCoords);
    };
  }, [show, calcCoords]);

  useEffect(() => {
    const h = (e) => {
      if (
        inputRef.current && !inputRef.current.contains(e.target) &&
        listRef.current  && !listRef.current.contains(e.target)
      ) setShow(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  if (readOnly) {
    return (
      <input
        type="text"
        className={`ic-readonly ${className || ""}`}
        style={{ width: "100%", boxSizing: "border-box" }}
        value={value}
        readOnly
        placeholder={placeholder}
      />
    );
  }

  const dropdown = show && filtered.length > 0
    ? ReactDOM.createPortal(
        <ul
          ref={listRef}
          style={{
            position: "fixed", top: coords.top, left: coords.left, width: coords.width,
            zIndex: 99999, background: "#fff", border: "1.5px solid #93c5fd",
            borderRadius: 6, listStyle: "none", margin: 0, padding: "4px 0",
            maxHeight: 220, overflowY: "auto",
            boxShadow: "0 8px 24px rgba(37,99,235,0.15)", scrollbarWidth: "thin",
          }}
        >
          {filtered.map((p, i) => (
            <li
              key={p._id || i}
              onMouseDown={(e) => { e.preventDefault(); onSelectParty(p); setShow(false); }}
              style={{
                padding: "7px 12px", fontSize: 12, cursor: "pointer",
                borderBottom: "1px solid #f1f5f9", color: "#1e293b",
                display: "flex", justifyContent: "space-between", gap: 8,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#eff6ff"; e.currentTarget.style.color = "#1d4ed8"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = ""; e.currentTarget.style.color = "#1e293b"; }}
            >
              <span>{p.partyName}</span>
              <span style={{ opacity: 0.5, fontSize: "0.82em", whiteSpace: "nowrap" }}>{p.partyCode}</span>
            </li>
          ))}
        </ul>,
        document.body
      )
    : null;

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        className={className || "ic-item-input"}
        style={{ width: "100%", boxSizing: "border-box" }}
        value={value}
        onChange={(e) => { onChange(e.target.value); setShow(true); }}
        onFocus={() => { setShow(true); calcCoords(); }}
        placeholder={placeholder || "Search party name…"}
        autoComplete="off"
      />
      {dropdown}
    </>
  );
};

/* ── Blank conversion row ── */
const blankRow = (sNo, prevUom = "") => ({
  sNo,
  inventoryCode: "",
  inventoryName: "",
  uom: prevUom,
  raQty: "",
});

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════ */
const CreateItemConversion = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isFromWeighment = !!location.state?.fromWeighment;
  const isFromGIN       = !!location.state?.fromGIN;
  const isImport        = isFromWeighment || isFromGIN;

  const [loading,   setLoading]   = useState(false);
  const [itemList,  setItemList]  = useState([]);
  const [partyList, setPartyList] = useState([]);

  /* ── form header ── */
  const [icNo,                setIcNo]                = useState("");
  const [transactionCategory, setTransactionCategory] = useState("");
  const [transactionCategories, setTransactionCategories] = useState([]);
  const [conversionDate, setConversionDate] = useState("");
  const [poNo,           setPoNo]           = useState("");
  const [vehicleNo,      setVehicleNo]      = useState("");
  const [partyName,      setPartyName]      = useState("");
  const [partyCode,      setPartyCode]      = useState("");
  const [ginId,          setGinId]          = useState("");
  const [weighmentId,    setWeighmentId]    = useState(""); /* _id of linked Weighment, if any */
  const [remarks,        setRemarks]        = useState("");

  /* ── base item ── */
  const [itemCode,        setItemCode]        = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [baseQty,         setBaseQty]         = useState("");
  const [uom,             setUom]             = useState("");

  /* ── conversion rows ── */
  const [rows, setRows] = useState([blankRow(1)]);

  /* ── derived total ── */
  const totalRaQty = rows.reduce((s, r) => s + (Number(r.raQty) || 0), 0);

  /* ── Fetch item master ── */
  useEffect(() => {
    axios.get(`${API_URL}/api/items`)
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];
        setItemList(data.filter((i) => !i.status || i.status === "Active" || i.status === "Open"));
      })
      .catch(console.error);
  }, []);

  /* ── Fetch party master ── */
  useEffect(() => {
    axios.get(`${API_URL}/api/parties`)
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];
        setPartyList(data.filter((p) => !p.status || p.status === "Active"));
      })
      .catch(console.error);
  }, []);

  /* ── Fetch Transaction Categories — businessEntity "Item Conversion", Open status ── */
  useEffect(() => {
    axios.get(`${API_URL}/api/transactions`)
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        setTransactionCategories(
          list.filter((tx) =>
            tx.businessEntity === "Item Conversion" &&
            (tx.status || "").toLowerCase() === "open"
          )
        );
      })
      .catch(() => setTransactionCategories([]));
  }, []);

  /* ── Preview IC No from Transaction Category + Document Sequence ──
     Links to the Document Sequence configured for THIS Transaction Category
     via module + businessEntity + transactionCategory (description) — Entity
     Prefix is entered manually on the Document Sequence screen and has no
     fixed relationship to the transaction category code, so it must be read
     from the matched sequence record. The increment is only OFFICIALLY
     committed (via /api/create-document-sequence) at save time. ── */
  useEffect(() => {
    if (!transactionCategory) { setIcNo(""); return; }
    const cat = transactionCategories.find((tx) => tx.categoryDescription === transactionCategory);
    if (!cat) { setIcNo(""); return; }
    const mod    = cat.module         || "Inventory";
    const entity = cat.businessEntity || "Item Conversion";

    axios.get(`${API_URL}/api/document-sequence`)
      .then((res) => {
        const matching = (Array.isArray(res.data) ? res.data : []).filter(
          (r) => r.module === mod && r.businessEntity === entity && r.transactionCategory === cat.categoryDescription
        );
        if (!matching.length) {
          setIcNo(`(Create a Document Sequence for "${cat.categoryDescription}" first)`);
          return;
        }
        const last   = matching.reduce((a, b) => Number(a.incrementNo) > Number(b.incrementNo) ? a : b);
        const prefix = (last.entityPrefix || "").trim().toUpperCase();
        const digits = Math.max(1, Number(last.sequenceDigits) || 2);
        const step   = Math.max(1, Number(last.incrementStep) || 1);
        const nextNo = Number(last.incrementNo) + step;
        const date   = last.useDateFragment ? buildDatePart(last.sequenceFormat || "dd/mm/yy") : "";
        setIcNo(`${prefix}${date}${String(nextNo).padStart(digits, "0")}`);
      })
      .catch(() => setIcNo(""));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionCategory, transactionCategories]);

  /* ── Default today ── */
  useEffect(() => {
    setConversionDate(new Date().toISOString().split("T")[0]);
  }, []);

  /* ══════════════════════════════════════════════════════
     PRE-FILL FROM GIN (Import from Inward)
  ══════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!location.state?.fromGIN) return;
    const gin = location.state.fromGIN;
    setGinId(gin._id       || "");
    setPoNo(gin.poCpoNo    || gin.poNo    || "");
    setVehicleNo(gin.vehicleNo || "");
    setPartyName(gin.partyName || "");
    setPartyCode(gin.partyCode || "");

    if (gin.items && gin.items.length > 0) {
      const first = gin.items[0];
      setItemCode(first.itemCode || "");
      setItemDescription(first.itemName || "");
      setBaseQty(first.qty || "");
      setUom(first.uom || "");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ══════════════════════════════════════════════════════
     PRE-FILL FROM WEIGHMENT
  ══════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!location.state?.fromWeighment) return;
    const wt = location.state.fromWeighment;

    setGinId(wt.weighmentId   || "");
    setWeighmentId(wt.weighmentId || ""); /* store the weighment's own _id for cascade */
    setPoNo(wt.poNo           || "");
    setVehicleNo(wt.vehicleNo || "");
    setPartyName(wt.partyName || "");
    setPartyCode(wt.partyCode || "");

    /* Fallback: if Party Code wasn't carried over in the import state
       (e.g. older records, or the field name mismatch), fetch it
       directly from the Weighment record by its _id. */
    if (!wt.partyCode && wt.weighmentId) {
      axios.get(`${WEIGHMENT_API}/${wt.weighmentId}`)
        .then((res) => {
          const fullWt = res.data?.data || res.data;
          if (fullWt?.partyCode) setPartyCode(fullWt.partyCode);
          if (!wt.partyName && fullWt?.partyName) setPartyName(fullWt.partyName);
        })
        .catch(() => {});
    }

    if (wt.items && wt.items.length > 0) {
      const first = wt.items[0];
      setItemCode(first.itemCode || "");
      setItemDescription(first.itemName || "");
      setBaseQty(first.netWeight || first.qty || wt.netWeight || "");
      setUom(first.uom || "MT");

      const prefilled = wt.items.map((it, i) => ({
        sNo:           i + 1,
        inventoryCode: it.itemCode  || "",
        inventoryName: it.itemName  || "",
        uom:           it.uom       || "MT",
        raQty:         it.netWeight || it.qty || "",
      }));
      setRows(prefilled.length > 0 ? prefilled : [blankRow(1)]);
    } else {
      setBaseQty(wt.netWeight || "");
      setUom("MT");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Party select ── */
  const handlePartySelect = (party) => {
    setPartyName(party.partyName || "");
    setPartyCode(party.partyCode || "");
  };

  /* ── Base item: search by NAME → auto-fill code & UOM ── */
  const handleBaseItemSelect = (item) => {
    setItemDescription(item.itemName || "");
    setItemCode(item.itemCode || "");
    setUom(item.uom || "");
  };
  const handleBaseItemTyping = (v) => {
    setItemDescription(v);
    setItemCode("");
    setUom("");
  };

  /* ── Row handlers ── */
  const rowItemCodes = itemList.map((i) => i.itemCode).filter(Boolean);

  /* Code column → auto-fill name + UOM */
  const handleRowCodeSelect = (idx, code) => {
    const found = itemList.find((i) => i.itemCode === code);
    setRows((prev) => {
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        inventoryCode: code,
        inventoryName: found?.itemName || next[idx].inventoryName,
        uom:           found?.uom      || next[idx].uom,
      };
      return next;
    });
  };
  const handleRowCodeTyping = (idx, v) => {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], inventoryCode: v, inventoryName: "", uom: next[idx].uom };
      return next;
    });
  };

  /* Name column → auto-fill code + UOM */
  const handleRowItemSelect = (idx, item) => {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        inventoryName: item.itemName || "",
        inventoryCode: item.itemCode || "",
        uom:           item.uom      || "",
      };
      return next;
    });
  };
  const handleRowItemTyping = (idx, v) => {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], inventoryName: v, inventoryCode: "", uom: next[idx].uom };
      return next;
    });
  };

  const updateRow = (idx, field, value) => {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const addRow = () =>
    setRows((prev) => {
      const lastUom = prev.length > 0 ? (prev[prev.length - 1].uom || "") : "";
      return [...prev, blankRow(prev.length + 1, lastUom)];
    });

  const deleteRow = (idx) =>
    setRows((prev) =>
      prev.filter((_, i) => i !== idx).map((r, i) => ({ ...r, sNo: i + 1 }))
    );

  /* ── Shared: resolve linked Weighment via 3 paths ─────────────────────────
     PATH 1 — weighmentId is the weighment's own _id (most reliable)
     PATH 2 — ginId is a GIN _id → resolve GIN No → find weighment by inwardOutwardNoteNo
     PATH 3 — ginId is itself a Weighment _id (legacy / direct-import path)
  ──────────────────────────────────────────────────────────────────────────── */
  const resolveLinkedWeighment = async () => {
    let linkedWtId   = null;
    let linkedWtData = null;

    if (weighmentId && /^[a-f0-9]{24}$/i.test(weighmentId)) {
      try {
        const wtRes = await axios.get(`${WEIGHMENT_API}/${weighmentId}`);
        const wt    = wtRes.data?.data || wtRes.data;
        if (wt?._id) { linkedWtId = wt._id; linkedWtData = wt; }
      } catch { /* not found */ }
    }

    if (!linkedWtId && ginId && /^[a-f0-9]{24}$/i.test(ginId)) {
      try {
        const ginRes = await axios.get(`${GIN_API}/${ginId}`);
        const ginNo  = ginRes.data?.ginNo || ginRes.data?.data?.ginNo;
        if (ginNo) {
          const wtRes  = await axios.get(WEIGHMENT_API);
          const allWts = Array.isArray(wtRes.data?.data) ? wtRes.data.data : [];
          const wt     = allWts.find((w) => w.inwardOutwardNoteNo === ginNo);
          if (wt) { linkedWtId = wt._id; linkedWtData = wt; }
        }
      } catch { /* GIN not found or no linked weighment */ }
    }

    if (!linkedWtId && ginId && /^[a-f0-9]{24}$/i.test(ginId)) {
      try {
        const wtRes = await axios.get(`${WEIGHMENT_API}/${ginId}`);
        const wt    = wtRes.data?.data || wtRes.data;
        if (wt?._id) { linkedWtId = wt._id; linkedWtData = wt; }
      } catch { /* not a weighment id */ }
    }

    return { linkedWtId, linkedWtData };
  };

  /* ── Shared: build IC payload ── */
  const buildPayload = (icStatus) => ({
    icNo,
    transactionCategory,
    ginId,
    weighmentId,
    poNo,
    vehicleNo,
    partyName,
    partyCode,
    itemCode,
    itemDescription,
    baseQty:    Number(baseQty) || 0,
    uom,
    conversionDate,
    remarks,
    status:      icStatus,
    totalRaQty,
    totalAmount: 0,
    totalRate:   0,
    conversionRows: rows.map((r) => ({
      sNo:           r.sNo,
      inventoryCode: r.inventoryCode || "",
      inventoryName: r.inventoryName,
      uom:           r.uom,
      raQty:         Number(r.raQty) || 0,
      rate:          0,
      amount:        0,
      cQty:          Number(baseQty) || 0,
      rQty:          Number(r.raQty) || 0,
    })),
  });

  /* ── Shared: POST IC then cascade Weighment status ─────────────────────────
     Save as Draft  → IC: Draft  | Weighment: Convert  (IC in progress, locked)
     Save           → IC: Saved  | Weighment: Closed   (IC finalised, consumed)
  ──────────────────────────────────────────────────────────────────────────── */
  const persistIC = async (icStatus, weighmentCascadeStatus) => {
    if (!transactionCategory)          { alert("Transaction Category is required"); return; }
    if (!itemCode && !itemDescription) { alert("Item is required in Base Item"); return; }
    if (!conversionDate)               { alert("Conversion Date is required");    return; }

    const cat = transactionCategories.find((tx) => tx.categoryDescription === transactionCategory);
    if (!cat) { alert("Invalid Transaction Category"); return; }

    setLoading(true);
    try {
      /* Officially register the document sequence to commit the increment,
         mirroring the Inward GIN / Weighment flow. Entity Prefix is entered
         manually on the Document Sequence screen — it must be read from the
         actual configured sequence, not derived from the category code. */
      let finalIcNo = icNo;
      const mod    = cat.module         || "Inventory";
      const entity = cat.businessEntity || "Item Conversion";
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
        if (seqRes.data?.generatedCode) finalIcNo = seqRes.data.generatedCode;
      } catch (seqErr) {
        console.warn("Could not register document sequence:", seqErr.message);
        alert(seqErr.message || "Could not register the document sequence for this Transaction Category.");
        setLoading(false);
        return;
      }

      const res = await axios.post(`${API_URL}/api/item-conversion`, { ...buildPayload(icStatus), icNo: finalIcNo });

      if (res.data.success) {
        try {
          const { linkedWtId, linkedWtData } = await resolveLinkedWeighment();

          if (linkedWtId) {
            const currentStatus = (linkedWtData?.status || "").toLowerCase();
            /* Never downgrade: Convert < Closed */
            const shouldUpdate =
              weighmentCascadeStatus === "Closed"
                ? currentStatus !== "closed"
                : currentStatus !== "convert" && currentStatus !== "closed";

            if (shouldUpdate) {
              await axios.put(`${WEIGHMENT_API}/${linkedWtId}`, {
                ...linkedWtData,
                status: weighmentCascadeStatus,
              });
            }
          }
        } catch (cascadeErr) {
          console.warn("IC create cascade warning:", cascadeErr.message);
        }

        navigate("/item-conversion");
      } else {
        alert(res.data.message || "Save failed");
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Save Failed");
    } finally {
      setLoading(false);
    }
  };

  /* ── Save as Draft — IC: Draft | Weighment: Convert ── */
  const handleSaveDraft = () => persistIC("Draft", "Convert");

  /* ── Save — IC: Saved | Weighment: Closed ── */
  const handleSave = () => persistIC("Saved", "Closed");

  /* ── Source badge ── */
  const sourceLabel = isFromWeighment
    ? `⚖️ Imported from Weighment: ${location.state.fromWeighment.weighmentNo || ""}`
    : isFromGIN
    ? `📥 Imported from GIN`
    : null;

  return (
    <div className="ic-page">
      <ModuleNavbar />

      {/* TOPBAR */}
      <div className="ic-topbar">
        <div className="ic-topbar-left">
          <button
            className="ic-back-btn"
            onClick={() => navigate("/item-conversion")}
            style={{ backgroundColor: "#2563eb", color: "#fff", border: "none" }}
          >
            ← Back
          </button>
          <div>
            <h2>Create Item Conversion</h2>
            <span className="ic-topbar-sub">{sourceLabel || "Fill in details and save"}</span>
          </div>
        </div>
      </div>

      {/* ── SECTION 1: CONVERSION INFORMATION ── */}
      <div className="ic-card">
        <div className="ic-card-title">
          <span className="ic-card-icon">📋</span> Conversion Information
        </div>
        <div className="ic-form-grid">
          <div
            className="ic-field"
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
              value={transactionCategory}
              onChange={(e) => setTransactionCategory(e.target.value)}
              required
              style={{ border: "1.5px solid #fbbf24", background: "#fff", fontWeight: 600 }}
            >
              <option value="">- Select Transaction Category -</option>
              {transactionCategories.map((tx) => (
                <option key={tx._id} value={tx.categoryDescription}>
                  {tx.transactionCategoryCode} - {tx.categoryDescription}
                </option>
              ))}
            </select>
            {!transactionCategory && (
              <span style={{ fontSize: 10.5, color: "#b45309", marginTop: 3, display: "block" }}>
                Select category first — IC No is generated from it
              </span>
            )}
          </div>

          <div className="ic-field">
            <label>IC No</label>
            <input
              type="text" readOnly
              value={icNo || (transactionCategory ? "Generating…" : "Select Transaction Category first")}
              className="ic-readonly ic-mono"
              style={icNo ? {
                background: "#eef2ff", color: "#4f46e5", fontWeight: 700,
                border: "1.5px solid #c7d2fe",
              } : {}}
            />
          </div>

          <div className="ic-field">
            <label>* Conversion Date</label>
            <input type="date" value={conversionDate} onChange={(e) => setConversionDate(e.target.value)} />
          </div>

          <div className="ic-field">
            <label>PO No</label>
            <input
              type="text" value={poNo}
              onChange={(e) => setPoNo(e.target.value)}
              readOnly={isImport} className={isImport ? "ic-readonly" : ""}
              placeholder="PO reference…"
            />
          </div>

          <div className="ic-field">
            <label>Vehicle No</label>
            <input
              type="text" value={vehicleNo}
              onChange={(e) => setVehicleNo(e.target.value)}
              readOnly={isImport} className={isImport ? "ic-readonly" : ""}
              placeholder="Vehicle number…"
            />
          </div>

          {/* Party Name — portal TypeAhead from party master (normal); read-only on import */}
          <div className="ic-field">
            <label>Party Name</label>
            <PortalPartyTypeAhead
              value={partyName}
              onChange={setPartyName}
              parties={partyList}
              onSelectParty={handlePartySelect}
              placeholder="Search party name…"
              readOnly={isImport}
            />
          </div>

          {/* Party Code — always auto-filled / read-only */}
          <div className="ic-field">
            <label>Party Code</label>
            <input type="text" value={partyCode} readOnly className="ic-readonly ic-mono" placeholder="Auto-filled from party" />
          </div>

          <div className="ic-field ic-field-full">
            <label>Remarks</label>
            <textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Enter remarks…" />
          </div>
        </div>
      </div>

      {/* ── SECTION 2: BASE ITEM ── */}
      <div className="ic-card">
        <div className="ic-card-title">
          <span className="ic-card-icon">📦</span> Base Item
        </div>
        <div className="ic-base-item-grid">

          {/* Item Name — portal TypeAhead → auto-fills code & UOM (read-only on import) */}
          <div className="ic-field">
            <label>* Item Name</label>
            <PortalItemTypeAhead
              value={itemDescription}
              onChange={handleBaseItemTyping}
              items={itemList}
              onSelectItem={handleBaseItemSelect}
              placeholder="Search item name…"
              readOnly={isImport}
            />
          </div>

          {/* Item Code — always auto-filled */}
          <div className="ic-field">
            <label>Item Code</label>
            <input type="text" value={itemCode} readOnly className="ic-readonly ic-mono" placeholder="Auto-filled from item" />
          </div>

          <div className="ic-field">
            <label>UOM</label>
            <input type="text" value={uom} readOnly className="ic-readonly" placeholder="Auto-filled" />
          </div>

          <div className="ic-field">
            <label>CQty (Base Qty)</label>
            <input type="number" value={baseQty} onChange={(e) => setBaseQty(e.target.value)} placeholder="Enter base qty" min="0" />
          </div>

          <div className="ic-field">
            <label>RQty <span className="ic-auto-badge">Auto</span></label>
            <input
              type="text"
              value={(() => {
                const cQty = Number(baseQty) || 0;
                const rQty = cQty - totalRaQty;
                return cQty > 0 || totalRaQty > 0 ? rQty.toLocaleString("en-IN") : "—";
              })()}
              readOnly className="ic-readonly ic-auto-green"
              title="RQty = CQty (Base Qty) − Total RaQty"
            />
          </div>
        </div>
      </div>

      {/* ── SECTION 3: CONVERSION BIFURCATION ── */}
      <div className="ic-card">
        <div className="ic-card-header-row">
          <div className="ic-card-title">
            <span className="ic-card-icon">🔄</span> Conversion Bifurcation
          </div>
          <div className="ic-total-badge">
            Total RaQty: <strong>{totalRaQty.toLocaleString("en-IN")}</strong>
          </div>
        </div>

        <div className="ic-conv-table-wrap">
          <table className="ic-conv-table">
            <colgroup>
              <col style={{ width: "5%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "32%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "6%" }} />
            </colgroup>
            <thead>
              <tr>
                <th>S No</th>
                <th>Item Code</th>
                <th>Item Name</th>
                <th>UOM</th>
                <th>RaQty</th>
                <th>Del</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? "ic-row-even" : "ic-row-odd"}>
                  <td className="ic-sno">{row.sNo}</td>

                  {/* Item Code — portal TypeAhead → auto-fills name + UOM */}
                  <td>
                    <PortalCodeTypeAhead
                      value={row.inventoryCode}
                      onChange={(v) => handleRowCodeTyping(idx, v)}
                      suggestions={rowItemCodes}
                      onSelect={(code) => handleRowCodeSelect(idx, code)}
                      placeholder="Item code…"
                      className="ic-item-input"
                    />
                  </td>

                  {/* Item Name — portal TypeAhead → auto-fills code + UOM */}
                  <td>
                    <PortalItemTypeAhead
                      value={row.inventoryName}
                      onChange={(v) => handleRowItemTyping(idx, v)}
                      items={itemList}
                      onSelectItem={(item) => handleRowItemSelect(idx, item)}
                      placeholder="Search item name…"
                      className="ic-item-input"
                    />
                  </td>

                  {/* UOM — auto-filled, read-only */}
                  <td>
                    <input
                      type="text" className="ic-item-input ic-readonly"
                      readOnly value={row.uom || ""} placeholder="—"
                      title="Auto-filled from Item Master"
                    />
                  </td>

                  {/* RaQty */}
                  <td>
                    <input
                      type="number" className="ic-item-input ic-num"
                      value={row.raQty}
                      onChange={(e) => updateRow(idx, "raQty", e.target.value)}
                      placeholder="0" min="0" step="0.01"
                    />
                  </td>

                  {/* Delete */}
                  <td style={{ textAlign: "center" }}>
                    <button className="ic-del-row-btn" onClick={() => deleteRow(idx)} title="Remove row">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="ic-total-label">Total</td>
                <td className="ic-total-qty">{totalRaQty.toLocaleString("en-IN")}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="ic-conv-actions">
          <button className="ic-add-row-btn" onClick={addRow}>+ Add Row</button>
        </div>
      </div>

      {/* SAVE / CANCEL */}
      <div className="ic-page-actions">
        <button className="ic-cancel-btn" onClick={() => navigate("/item-conversion")} disabled={loading}>
          Cancel
        </button>
        <button
          onClick={handleSaveDraft}
          disabled={loading}
          style={{
            padding: "9px 22px",
            background: loading ? "#d1d5db" : "#f59e0b",
            color: loading ? "#9ca3af" : "#fff",
            border: "none",
            borderRadius: 7,
            fontSize: 13,
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
            transition: "background 0.18s",
          }}
        >
          {loading ? "Saving…" : "📝 Save as Draft"}
        </button>
        <button className="ic-save-btn" onClick={handleSave} disabled={loading}>
          {loading ? "Saving…" : "💾 Save"}
        </button>
      </div>
    </div>
  );
};

export default CreateItemConversion;
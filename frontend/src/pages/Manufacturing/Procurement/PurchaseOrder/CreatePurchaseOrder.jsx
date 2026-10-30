import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";
import "./PurchaseOrder.css";

const PAYMENT_MODES  = ["Cash", "Cheque", "NEFT/RTGS", "UPI", "Credit", "LC"];
const DEFAULT_STATUS = "Ordered";
const TABS = ["Items", "Service", "Charges / Discount", "Tax Details"];

/* ── blank row factories ── */
const blankRow        = (n) => ({ sNo: n, itemCategory: "", itemCode: "", itemName: "", uom: "", qty: "", rate: "", basicAmount: "", _checked: false });
const blankServiceRow = (n) => ({ sNo: n, serviceCode: "", serviceName: "", qty: "", rate: "", amount: "" });
const blankChargeRow  = (n) => ({ sNo: n, code: "", description: "", amount: "" });
const blankTaxRow     = (n) => ({ sNo: n, taxType: "", taxCode: "", taxName: "", totalTax: "", amount: "" });

/* ══════════════════════════════════════════════════════
   PORTAL ITEM TYPEAHEAD
   Dropdown renders on <body> — never clipped by table overflow.
   Shows item name + code hint; selects an item object.
══════════════════════════════════════════════════════ */
const PortalItemTypeAhead = ({ value, onChange, items, onSelectItem, placeholder, className }) => {
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

  const dropdown = show && filtered.length > 0
    ? ReactDOM.createPortal(
        <ul
          ref={listRef}
          style={{
            position: "fixed", top: coords.top, left: coords.left, width: Math.max(coords.width, 220),
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
        className={className || "cgin-item-input cgin-item-wide"}
        style={{ width: "100%", boxSizing: "border-box" }}
        value={value}
        onChange={(e) => { onChange(e.target.value); setShow(true); }}
        onFocus={() => { setShow(true); calcCoords(); }}
        placeholder={placeholder || "Search item…"}
        autoComplete="off"
      />
      {dropdown}
    </>
  );
};

/* ── Transaction Category typeahead (header) — searches code + description, selects an object ── */
const TxnCategoryTypeAhead = ({ value, onChange, options, onSelect, required }) => {
  const [show, setShow] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setShow(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const q = (value || "").toLowerCase();
  const filtered = options.filter((t) => {
    const label = `${t.transactionCategoryCode || ""} ${t.categoryDescription || ""}`.toLowerCase();
    return label.includes(q);
  });
  return (
    <div className="cgin-field" ref={ref}>
      <label>{required ? "* Transaction Category" : "Transaction Category"}</label>
      <div style={{ position: "relative" }}>
        <input
          type="text" value={value} autoComplete="off" placeholder="Search Transaction Category…"
          onChange={(e) => { onChange(e.target.value); setShow(true); }}
          onFocus={() => setShow(true)}
        />
        {show && filtered.length > 0 && (
          <ul className="po-suggestion-list">
            {filtered.map((t) => (
              <li key={t._id} onMouseDown={() => { onSelect(t); setShow(false); }}>
                {t.transactionCategoryCode} — {t.categoryDescription}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};


const TypeAhead = ({ label, value, onChange, suggestions, onSelect, required }) => {
  const [show, setShow] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setShow(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const filtered = suggestions.filter((s) => s?.toLowerCase().includes((value || "").toLowerCase()));
  return (
    <div className="cgin-field" ref={ref}>
      <label>{required ? `* ${label}` : label}</label>
      <div style={{ position: "relative" }}>
        <input type="text" value={value} autoComplete="off" placeholder={`Search ${label}…`}
          onChange={(e) => { onChange(e.target.value); setShow(true); }}
          onFocus={() => setShow(true)} />
        {show && value && filtered.length > 0 && (
          <ul className="po-suggestion-list">
            {filtered.map((s) => <li key={s} onMouseDown={() => { onSelect(s); setShow(false); }}>{s}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
};

const CreatePurchaseOrder = () => {
  const navigate = useNavigate();

  /* masters */
  const [parties,       setParties]       = useState([]);
  const [categories,    setCategories]    = useState([]);
  const [allItems,      setAllItems]      = useState([]);
  const [sites,         setSites]         = useState([]);
  const [serviceMaster, setServiceMaster] = useState([]);
  const [chargesMaster, setChargesMaster] = useState([]);
  const [taxMaster,     setTaxMaster]     = useState([]);
  const [transactionCategories, setTransactionCategories] = useState([]);

  /* computed PO No / IN-OUT WARD NO (driven by Transaction Category) */
  const [poNoPreview, setPoNoPreview] = useState("");
  const [txnCatQuery, setTxnCatQuery] = useState("");

  /* guard against duplicate PO creation from rapid/double clicks on Save.
     isSavingRef gives an instant, synchronous lock (state updates are async
     and a second click can slip in before React re-renders the disabled
     button), while isSaving (state) is used to disable/relabel the button. */
  const isSavingRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);

  /* header form */
  const [form, setForm] = useState({
    transactionCategory: "",
    poNo: "", poDate: new Date().toISOString().split("T")[0],
    poType: "", partyCode: "", partyName: "", site: "",
    paymentMode: "", eta: "", dueDate: "", status: DEFAULT_STATUS, remarks: "",
  });

  /* rows */
  const [rows,        setRows]        = useState([blankRow(1)]);
  const [insertCount, setInsertCount] = useState(1);
  const [serviceRows, setServiceRows] = useState([blankServiceRow(1)]);
  const [chargeRows,  setChargeRows]  = useState([blankChargeRow(1)]);
  const [taxRows,     setTaxRows]     = useState([blankTaxRow(1)]);

  /* active tab */
  const [activeTab, setActiveTab] = useState("Items");

  /* ── fetch masters ── */
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const go = async () => {
      try {
        const [partyRes, catRes, itemRes, txnRes, siteRes, svcRes, chgRes, taxRes] = await Promise.all([
          axios.get(`${API_URL}/api/parties`),
          axios.get(`${API_URL}/api/item-categories`),
          axios.get(`${API_URL}/api/items`),
          axios.get(`${API_URL}/api/transactions`),
          axios.get(`${API_URL}/api/sites`),
          axios.get(`${API_URL}/api/service-master`),
          axios.get(`${API_URL}/api/charges-master`),
          axios.get(`${API_URL}/api/tax-details`),
        ]);
        setParties(partyRes.data.filter((p) => p.status === "Active"));
        setCategories(catRes.data.filter((c) => c.status === "Active"));
        setAllItems(itemRes.data.filter((i) => i.status === "Active"));
        setSites(siteRes.data.filter((s) => s.status === "Active"));
        setServiceMaster(svcRes.data.filter((s) => s.status === "Active"));
        setChargesMaster(chgRes.data.filter((c) => c.status === "Active"));
        setTaxMaster(taxRes.data.filter((t) => t.status === "Active"));

        /* Transaction Category master — restricted to ones set up for Purchase Order.
           Matches common naming variants admins use when creating the master:
           module="Procurement"/"Purchase Order", businessEntity="PO"/"Purchase Order"/"REQ.PO" */
        setTransactionCategories(
          (txnRes.data || []).filter((t) => {
            if (t.status !== "Open") return false;
            const mod = (t.module || "").toLowerCase();
            const ent = (t.businessEntity || "").toLowerCase();
            return (
              mod.includes("purchase order") ||
              mod.includes("procurement") ||
              ent.includes("purchase order") ||
              ent === "po" ||
              ent === "req.po"
            );
          })
        );

        setForm((p) => ({ ...p, poDate: today }));
      } catch (err) {
        console.error(err);
        setForm((p) => ({ ...p, poDate: today }));
      }
    };
    go();
  }, []);

  /* ── Compute PO No / IN-OUT WARD NO whenever Transaction Category changes ── */
  useEffect(() => {
    if (!form.transactionCategory) { setPoNoPreview(""); setForm((f) => ({ ...f, poNo: "" })); return; }
    const cat = transactionCategories.find((t) => t._id === form.transactionCategory);
    if (!cat) { setPoNoPreview(""); return; }

    axios.get(`${API_URL}/api/document-sequence`)
      .then((res) => {
        /* Link to the Document Sequence configured for THIS Transaction Category.
           Entity Prefix is entered manually on the Document Sequence screen and
           has no fixed relationship to the transaction category code — so we
           match on module + businessEntity + transactionCategory (description)
           instead, and use that record's own entityPrefix. */
        const matching = (res.data || []).filter(
          (r) =>
            r.module === cat.module &&
            r.businessEntity === cat.businessEntity &&
            r.transactionCategory === cat.categoryDescription
        );
        if (!matching.length) {
          const preview = `(Create a Document Sequence for "${cat.categoryDescription}" first)`;
          setPoNoPreview(preview);
          setForm((f) => ({ ...f, poNo: "" }));
          return;
        }
        const last   = matching.reduce((a, b) => (Number(a.incrementNo) > Number(b.incrementNo) ? a : b));
        const prefix = (last.entityPrefix || "").trim().toUpperCase();
        const digits = Math.max(1, Number(last.sequenceDigits) || 2);
        const step   = Math.max(1, Number(last.incrementStep) || 1);
        const nextNo = Number(last.incrementNo) + step;
        const useDate = last.useDateFragment ?? true;
        let datePart = "";
        if (useDate) {
          const d  = new Date();
          const dd = String(d.getDate()).padStart(2, "0");
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const yy = String(d.getFullYear()).slice(-2);
          const fmt = last.sequenceFormat || "dd/mm/yy";
          if (fmt === "mm/dd/yy") {
            datePart = `${mm}${dd}${yy}`;
          } else if (fmt === "yy/mm/dd") {
            datePart = `${yy}${mm}${dd}`;
          } else if (fmt === "julian") {
            /* Julian: YY + DDD (3-digit day-of-year, 1-indexed) — matches the
               backend's buildDatePart, e.g. 01-Jan-2026 → 26001 */
            const year   = d.getFullYear();
            const start  = new Date(year, 0, 0);
            const oneDay = 1000 * 60 * 60 * 24;
            const doy    = String(Math.floor((d - start) / oneDay)).padStart(3, "0");
            datePart = `${yy}${doy}`;
          } else {
            datePart = `${dd}${mm}${yy}`;
          }
        }
        const preview = `${prefix}${datePart}${String(nextNo).padStart(digits, "0")}`;
        setPoNoPreview(preview);
        setForm((f) => ({ ...f, poNo: preview }));
      })
      .catch(() => setPoNoPreview(""));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.transactionCategory, transactionCategories]);

  const partyNames    = [...new Set(parties.map((p) => p.partyName).filter(Boolean))].sort();
  const categoryNames = [...new Set(categories.map((c) => c.categoryName).filter(Boolean))].sort();

  const handlePartySelect = (name) => {
    const p = parties.find((x) => x.partyName === name);
    setForm((f) => ({ ...f, partyName: name, partyCode: p?.partyCode || "" }));
  };
  const handleChange = (e) => { const { name, value } = e.target; setForm((f) => ({ ...f, [name]: value })); };

  /* ── item helpers ── */
  const handleRowChange = (idx, field, value) => {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      if (field === "qty" || field === "rate") {
        const qty  = Number(field === "qty"  ? value : next[idx].qty  || 0);
        const rate = Number(field === "rate" ? value : next[idx].rate || 0);
        next[idx].basicAmount = qty && rate ? (qty * rate).toFixed(2) : "";
      }
      return next;
    });
  };

  /* Portal item select — fills name, code, uom, recalculates amount */
  const handleRowItemSelect = (idx, item) => {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        itemName:     item.itemName  || "",
        itemCode:     item.itemCode  || "",
        uom:          item.uom       || "",
        itemCategory: item.category  || next[idx].itemCategory,
      };
      const qty  = Number(next[idx].qty  || 0);
      const rate = Number(next[idx].rate || 0);
      next[idx].basicAmount = qty && rate ? (qty * rate).toFixed(2) : "";
      return next;
    });
  };

  const itemsForCategory = (rowIdx) => {
    const cat  = rows[rowIdx].itemCategory;
    return cat ? allItems.filter((i) => i.category === cat) : allItems;
  };

  const handleRowCheck      = (idx, checked) => setRows((p) => { const n = [...p]; n[idx] = { ...n[idx], _checked: checked }; return n; });
  const handleInsertRows    = () => {
    const count = Math.max(1, Math.min(50, Number(insertCount) || 1));
    setRows((prev) => { const start = prev.length + 1; return [...prev, ...Array.from({ length: count }, (_, i) => blankRow(start + i))]; });
  };
  const handleDeleteChecked = () => setRows((prev) => { const k = prev.filter((r) => !r._checked).map((r, i) => ({ ...r, sNo: i + 1 })); return k.length > 0 ? k : [blankRow(1)]; });

  /* ── service helpers ── */
  const handleSvcChange = (idx, field, value) => {
    setServiceRows((prev) => {
      const next = [...prev]; next[idx] = { ...next[idx], [field]: value };
      if (field === "serviceCode") { const s = serviceMaster.find((x) => x.serviceCode === value); if (s) next[idx].serviceName = s.serviceDetails || ""; }
      if (field === "qty" || field === "rate") { const q = Number(field === "qty" ? value : next[idx].qty || 0); const r = Number(field === "rate" ? value : next[idx].rate || 0); next[idx].amount = q && r ? (q * r).toFixed(2) : ""; }
      return next;
    });
  };

  /* ── charges helpers ── */
  const handleChgChange = (idx, field, value) => {
    setChargeRows((prev) => {
      const next = [...prev]; next[idx] = { ...next[idx], [field]: value };
      if (field === "code") { const c = chargesMaster.find((x) => x.code === value); if (c) next[idx].description = c.details || ""; }
      return next;
    });
  };

  /* ── tax helpers ── */
  const handleTaxChange = (idx, field, value) => {
    setTaxRows((prev) => {
      const next = [...prev]; next[idx] = { ...next[idx], [field]: value };
      if (field === "taxCode") { const t = taxMaster.find((x) => x.taxCode === value); if (t) { next[idx].taxType = t.taxType || ""; next[idx].taxName = t.taxName || ""; next[idx].totalTax = t.percentage ? `${t.percentage}%` : ""; } }
      return next;
    });
  };

  /* ── totals ── */
  const itemBasic    = rows.reduce((s, r) => s + Number(r.basicAmount || 0), 0);
  const totalQty     = rows.reduce((s, r) => s + Number(r.qty || 0), 0);
  const serviceTotal = serviceRows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const chargeTotal  = chargeRows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const taxTotal     = taxRows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const grandTotal   = itemBasic + serviceTotal + chargeTotal + taxTotal;

  /* ── save ── */
  const handleSave = async () => {
    // Block re-entry: if a save is already in flight, ignore this click
    // entirely so double/rapid clicks can't fire a second create request.
    if (isSavingRef.current) return;

    if (!form.transactionCategory) return alert("Transaction Category is required.");
    if (!form.partyName.trim()) return alert("Party Name is required.");
    const validRows = rows.filter((r) => r.itemName && r.itemName.trim());
    if (validRows.length === 0) return alert("Add at least one item.");
    const cat = transactionCategories.find((t) => t._id === form.transactionCategory);
    if (!cat) return alert("Invalid Transaction Category");

    isSavingRef.current = true;
    setIsSaving(true);

    const toNum = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
    const payload = {
      ...form, status: DEFAULT_STATUS,
      transactionCategory: cat.categoryDescription || "",
      items: validRows.map(({ _checked, ...r }) => ({ ...r, qty: toNum(r.qty), rate: toNum(r.rate), basicAmount: toNum(r.basicAmount), netAmount: toNum(r.basicAmount), serviceCharge: 0, charges: 0, discount: 0 })),
      basicAmount: Number(itemBasic.toFixed(2)),
      netAmount:   Number(grandTotal.toFixed(2)),
      totalQty:    Number(totalQty.toFixed(2)),
      serviceRows, chargeRows, taxRows,
    };
    try {
      /* Find the Document Sequence configured for THIS Transaction Category
         (module + businessEntity + transactionCategory description) and use
         ITS entityPrefix. Entity Prefix is entered manually on the Document
         Sequence screen — it must NOT be re-derived from the category code,
         or this ends up registering against an unrelated / auto-created
         sequence instead of the one actually set up for this category. */
      const seqListRes = await axios.get(`${API_URL}/api/document-sequence`);
      const matchingSeq = (seqListRes.data || []).filter(
        (r) =>
          r.module === cat.module &&
          r.businessEntity === cat.businessEntity &&
          r.transactionCategory === cat.categoryDescription
      );
      if (!matchingSeq.length) {
        return alert(`No Document Sequence is set up for "${cat.categoryDescription}". Please create one first.`);
      }
      const seqEntry     = matchingSeq.reduce((a, b) => (Number(a.incrementNo) > Number(b.incrementNo) ? a : b));
      const entityPrefix = (seqEntry.entityPrefix || "").trim().toUpperCase();

      /* Register sequence → get official PO No / IN-OUT WARD NO */
      const seqRes = await axios.post(`${API_URL}/api/create-document-sequence`, {
        module:              cat.module,
        businessEntity:      cat.businessEntity,
        entityPrefix,
        transactionCategory: cat.categoryDescription,
      });
      const officialNo = seqRes.data.generatedCode || form.poNo;
      payload.poNo = officialNo;

      await axios.post(`${API_URL}/api/create-purchase-order`, payload);
      alert("Purchase Order saved successfully!");
      navigate("/purchase-order");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Error saving Purchase Order");
    } finally {
      // Always release the lock — whether the save succeeded, failed, or
      // threw — so the form isn't left stuck if the user needs to retry.
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setRows([blankRow(1)]); setServiceRows([blankServiceRow(1)]); setChargeRows([blankChargeRow(1)]); setTaxRows([blankTaxRow(1)]);
    setActiveTab("Items");
    setTxnCatQuery("");
    setForm((f) => ({ ...f, transactionCategory: "", poNo: "", poType: "", partyCode: "", partyName: "", site: "", paymentMode: "", eta: "", dueDate: "", status: DEFAULT_STATUS, remarks: "" }));
  };

  /* ── tab total badge ── */
  const tabBadge = (tab) => {
    if (tab === "Items")              return itemBasic    > 0 ? itemBasic.toFixed(0)    : null;
    if (tab === "Service")            return serviceTotal > 0 ? serviceTotal.toFixed(0) : null;
    if (tab === "Charges / Discount") return chargeTotal  > 0 ? chargeTotal.toFixed(0)  : null;
    if (tab === "Tax Details")        return taxTotal     > 0 ? taxTotal.toFixed(0)     : null;
    return null;
  };

  return (
    <div className="cpo-page">
      <ModuleNavbar />

      {/* PAGE HEADER */}
      <div className="cgin-header">
        <div className="cgin-header-left">
          <button className="back-btn" onClick={() => navigate("/purchase-order")}>←</button>
          <h2>Create Purchase Order</h2>
        </div>
        <span className="cpo-pono-badge">PO No: {form.poNo}</span>
      </div>

      {/* ══════ ORDER DETAILS CARD ══════ */}
      <div className="cgin-card">
        <div className="cgin-card-title">Order Details</div>
        <div className="cgin-grid">

          <TxnCategoryTypeAhead
            required
            value={txnCatQuery}
            onChange={(v) => { setTxnCatQuery(v); if (!v) setForm((f) => ({ ...f, transactionCategory: "" })); }}
            options={transactionCategories}
            onSelect={(t) => {
              setTxnCatQuery(`${t.transactionCategoryCode} — ${t.categoryDescription}`);
              setForm((f) => ({ ...f, transactionCategory: t._id }));
            }}
          />

          <div className="cgin-field">
            <label>PO No (IN/OUT WARD NO)</label>
            <input
              type="text"
              readOnly
              value={!form.transactionCategory ? "Select category first…" : (poNoPreview || "Generating…")}
              style={{ background: "#f1f5f9", fontWeight: 700, color: "#15803d" }}
            />
          </div>

          <div className="cgin-field">
            <label>* PO Date</label>
            <input type="date" name="poDate" value={form.poDate} onChange={handleChange} />
          </div>

          <div className="cgin-field">
            <label>PO Type</label>
            <select name="poType" value={form.poType} onChange={handleChange}>
              <option value="">- Select -</option>
              <option value="T">T</option>
              <option value="UT">UT</option>
            </select>
          </div>

          <div className="cgin-field">
            <label>Party Code</label>
            <input type="text" value={form.partyCode} readOnly style={{ background: "#f1f5f9" }} />
          </div>

          <div className="cgin-field" style={{ position: "relative" }}>
            <TypeAhead label="Party Name" required
              value={form.partyName}
              onChange={(v) => setForm((f) => ({ ...f, partyName: v }))}
              suggestions={partyNames}
              onSelect={handlePartySelect} />
          </div>

          <div className="cgin-field">
            <label>Site</label>
            <select name="site" value={form.site} onChange={handleChange}>
              <option value="">- Select Site -</option>
              {sites.map((s) => <option key={s._id} value={s.siteCode}>{s.siteCode} - {s.siteName}</option>)}
            </select>
          </div>

          <div className="cgin-field">
            <label>Payment Mode</label>
            <select name="paymentMode" value={form.paymentMode} onChange={handleChange}>
              <option value="">- Select -</option>
              {PAYMENT_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div className="cgin-field">
            <label>ETA</label>
            <input type="date" name="eta" value={form.eta} onChange={handleChange} />
          </div>

          <div className="cgin-field">
            <label>Due Date</label>
            <input type="date" name="dueDate" value={form.dueDate} onChange={handleChange} />
          </div>

          <div className="cgin-field">
            <label>Status</label>
            <input type="text" value={DEFAULT_STATUS} readOnly style={{ background: "#f1f5f9", color: "#1d4ed8", fontWeight: 600 }} />
          </div>

          <div className="cgin-field" style={{ gridColumn: "span 2" }}>
            <label>Remarks</label>
            <input type="text" name="remarks" value={form.remarks} onChange={handleChange} placeholder="Optional remarks" />
          </div>

        </div>
      </div>

      {/* ══════ TABBED SECTION CARD ══════ */}
      <div className="cgin-card cpo-tab-card">

        {/* Tab bar */}
        <div className="cpo-tab-bar">
          {TABS.map((tab) => {
            const badge = tabBadge(tab);
            return (
              <button
                key={tab}
                className={`cpo-tab-btn ${activeTab === tab ? "active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
                {badge && <span className="cpo-tab-badge">₹{Number(badge).toLocaleString("en-IN")}</span>}
              </button>
            );
          })}
          <div className="cpo-tab-grand-total">
            <span style={{ marginRight: 18 }}>Total Qty: <strong>{totalQty.toLocaleString("en-IN")}</strong></span>
            Grand Total: <strong>₹ {grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
          </div>
        </div>

        {/* ── ITEMS panel ── */}
        {activeTab === "Items" && (
          <div className="cpo-tab-panel">
            <div className="cgin-items-header">
              <span className="cgin-items-title">Items</span>
              <button className="cgin-del-rows-btn" onClick={handleDeleteChecked}>Delete Selected</button>
            </div>
            <div className="cgin-items-table-wrap">
              <table className="cgin-items-table">
                <thead>
                  <tr>
                    <th style={{ width: 32 }}>
                      <input type="checkbox" onChange={(e) => setRows((p) => p.map((r) => ({ ...r, _checked: e.target.checked })))} />
                    </th>
                    <th>S No</th>
                    <th>Item Category</th>
                    <th>Item Code</th>
                    <th>Item Name</th>
                    <th>UOM</th>
                    <th>Qty</th>
                    <th>Rate</th>
                    <th>Basic Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={idx} className={row._checked ? "cgin-row-checked" : ""}>
                      <td className="cgin-check-cell">
                        <input type="checkbox" checked={row._checked} onChange={(e) => handleRowCheck(idx, e.target.checked)} />
                      </td>
                      <td className="cgin-sno-cell">{row.sNo}</td>
                      <td>
                        <select className="cgin-item-input cgin-item-wide" value={row.itemCategory}
                          onChange={(e) => {
                            handleRowChange(idx, "itemCategory", e.target.value);
                            handleRowChange(idx, "itemName", "");
                            handleRowChange(idx, "itemCode", "");
                          }}>
                          <option value="">- Select -</option>
                          {categoryNames.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>
                      {/* Item Code — auto-filled, read-only */}
                      <td>
                        <input className="cgin-item-input" value={row.itemCode} readOnly style={{ background: "#f8fafc" }} />
                      </td>
                      {/* Item Name — Portal TypeAhead */}
                      <td>
                        <PortalItemTypeAhead
                          value={row.itemName}
                          onChange={(v) => handleRowChange(idx, "itemName", v)}
                          items={itemsForCategory(idx)}
                          onSelectItem={(item) => handleRowItemSelect(idx, item)}
                          placeholder="Search item…"
                          className="cgin-item-input cgin-item-wide"
                        />
                      </td>
                      {/* UOM — auto-filled */}
                      <td>
                        <input className="cgin-item-input cgin-item-sm" value={row.uom} readOnly style={{ background: "#f8fafc" }} />
                      </td>
                      <td>
                        <input type="number" className="cgin-item-input cgin-item-num" value={row.qty} min="0"
                          onChange={(e) => handleRowChange(idx, "qty", e.target.value)} />
                      </td>
                      <td>
                        <input type="number" className="cgin-item-input cgin-item-num" value={row.rate} min="0"
                          onChange={(e) => handleRowChange(idx, "rate", e.target.value)} />
                      </td>
                      <td>
                        <input className="cgin-item-input cgin-item-num" value={row.basicAmount} readOnly
                          style={{ background: "#f8fafc", fontWeight: 600 }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="8" style={{ textAlign: "right", fontWeight: 700, padding: "6px 10px", background: "#eef1f7", fontSize: 12 }}>Item Basic Total:</td>
                    <td style={{ fontWeight: 700, padding: "6px 8px", background: "#eef1f7", fontFamily: "monospace", color: "#1e40af" }}>{itemBasic.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="cgin-insert-row-bar">
              <span style={{ fontSize: 12, color: "#555" }}>Insert rows:</span>
              <input type="number" className="cgin-insert-count" min={1} max={50} value={insertCount}
                onChange={(e) => setInsertCount(e.target.value)} />
              <button className="cgin-insert-row-btn" onClick={handleInsertRows}>+ Add Rows</button>
            </div>
          </div>
        )}

        {/* ── SERVICE panel ── */}
        {activeTab === "Service" && (
          <div className="cpo-tab-panel">
            <div className="cgin-items-table-wrap">
              <table className="cgin-items-table">
                <thead>
                  <tr>
                    <th>S No</th><th>Service Code</th><th>Service Name</th><th>Qty</th><th>Rate</th><th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceRows.map((row, idx) => (
                    <tr key={idx}>
                      <td className="cgin-sno-cell">{row.sNo}</td>
                      <td>
                        <select className="cgin-item-input" value={row.serviceCode} onChange={(e) => handleSvcChange(idx, "serviceCode", e.target.value)}>
                          <option value="">- Select -</option>
                          {serviceMaster.map((s) => <option key={s._id} value={s.serviceCode}>{s.serviceCode}</option>)}
                        </select>
                      </td>
                      <td><input className="cgin-item-input cgin-item-wide" value={row.serviceName} readOnly style={{ background: "#f8fafc" }} /></td>
                      <td><input type="number" className="cgin-item-input cgin-item-num" value={row.qty} onChange={(e) => handleSvcChange(idx, "qty", e.target.value)} /></td>
                      <td><input type="number" className="cgin-item-input cgin-item-num" value={row.rate} onChange={(e) => handleSvcChange(idx, "rate", e.target.value)} /></td>
                      <td><input className="cgin-item-input cgin-item-num" value={row.amount} readOnly style={{ background: "#f8fafc", fontWeight: 600 }} /></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="5" style={{ textAlign: "right", fontWeight: 700, padding: "6px 10px", background: "#eef1f7", fontSize: 12 }}>Service Total:</td>
                    <td style={{ fontWeight: 700, padding: "6px 8px", background: "#eef1f7", fontFamily: "monospace", color: "#1e40af" }}>{serviceTotal.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="cgin-insert-row-bar">
              <button className="cgin-insert-row-btn" onClick={() => setServiceRows((p) => [...p, blankServiceRow(p.length + 1)])}>+ Add Row</button>
            </div>
          </div>
        )}

        {/* ── CHARGES / DISCOUNT panel ── */}
        {activeTab === "Charges / Discount" && (
          <div className="cpo-tab-panel">
            <div className="cgin-items-table-wrap">
              <table className="cgin-items-table">
                <thead>
                  <tr>
                    <th>S No</th><th>Code</th><th>Description</th><th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {chargeRows.map((row, idx) => (
                    <tr key={idx}>
                      <td className="cgin-sno-cell">{row.sNo}</td>
                      <td>
                        <select className="cgin-item-input" value={row.code} onChange={(e) => handleChgChange(idx, "code", e.target.value)}>
                          <option value="">- Select -</option>
                          {chargesMaster.map((c) => <option key={c._id} value={c.code}>{c.code}</option>)}
                        </select>
                      </td>
                      <td><input className="cgin-item-input cgin-item-wide" value={row.description} readOnly style={{ background: "#f8fafc" }} /></td>
                      <td><input type="number" className="cgin-item-input cgin-item-num" value={row.amount} onChange={(e) => handleChgChange(idx, "amount", e.target.value)} /></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="3" style={{ textAlign: "right", fontWeight: 700, padding: "6px 10px", background: "#eef1f7", fontSize: 12 }}>Charges Total:</td>
                    <td style={{ fontWeight: 700, padding: "6px 8px", background: "#eef1f7", fontFamily: "monospace", color: "#1e40af" }}>{chargeTotal.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="cgin-insert-row-bar">
              <button className="cgin-insert-row-btn" onClick={() => setChargeRows((p) => [...p, blankChargeRow(p.length + 1)])}>+ Add Row</button>
            </div>
          </div>
        )}

        {/* ── TAX DETAILS panel ── */}
        {activeTab === "Tax Details" && (
          <div className="cpo-tab-panel">
            <div className="cgin-items-table-wrap">
              <table className="cgin-items-table">
                <thead>
                  <tr>
                    <th>S No</th><th>Tax Type</th><th>Tax Code</th><th>Tax Name</th><th>Total Tax %</th><th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {taxRows.map((row, idx) => (
                    <tr key={idx}>
                      <td className="cgin-sno-cell">{row.sNo}</td>
                      <td><input className="cgin-item-input" value={row.taxType} readOnly style={{ background: "#f8fafc" }} /></td>
                      <td>
                        <select className="cgin-item-input" value={row.taxCode} onChange={(e) => handleTaxChange(idx, "taxCode", e.target.value)}>
                          <option value="">- Select -</option>
                          {taxMaster.map((t) => <option key={t._id} value={t.taxCode}>{t.taxCode}</option>)}
                        </select>
                      </td>
                      <td><input className="cgin-item-input cgin-item-wide" value={row.taxName} readOnly style={{ background: "#f8fafc" }} /></td>
                      <td><input className="cgin-item-input" value={row.totalTax} readOnly style={{ background: "#f8fafc", maxWidth: 70 }} /></td>
                      <td><input type="number" className="cgin-item-input cgin-item-num" value={row.amount} onChange={(e) => handleTaxChange(idx, "amount", e.target.value)} /></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="5" style={{ textAlign: "right", fontWeight: 700, padding: "6px 10px", background: "#eef1f7", fontSize: 12 }}>Tax Total:</td>
                    <td style={{ fontWeight: 700, padding: "6px 8px", background: "#eef1f7", fontFamily: "monospace", color: "#1e40af" }}>{taxTotal.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="cgin-insert-row-bar">
              <button className="cgin-insert-row-btn" onClick={() => setTaxRows((p) => [...p, blankTaxRow(p.length + 1)])}>+ Add Row</button>
            </div>
          </div>
        )}

      </div>{/* end tab card */}

      {/* ACTION BUTTONS */}
      <div className="cgin-actions">
        <button className="btn-reset" onClick={handleReset} disabled={isSaving}>Reset</button>
        <button
          className="btn-save"
          onClick={handleSave}
          disabled={isSaving}
          style={isSaving ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
        >
          {isSaving ? "Saving…" : "Save PO"}
        </button>
      </div>

    </div>
  );
};

export default CreatePurchaseOrder;
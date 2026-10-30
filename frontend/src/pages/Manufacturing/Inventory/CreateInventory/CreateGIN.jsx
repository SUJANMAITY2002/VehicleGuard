import React, { useEffect, useRef, useState, useCallback } from "react";
import ReactDOM from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import "./CreateGIN.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";

const PO_API = `${API_URL}/api/purchase-order`;
import useSiteOptions from "../../../../hooks/useSiteOptions";

/*
  Create Inward Outward Note
  ──────────────────────────
  • Transaction Category drives the IN/OUT WARD NO prefix
  • Party Code lookup → auto-fills Party Name (and vice-versa)
  • Item Group → filters items; Item Name/Code typeahead auto-fills Code/Name + UOM
  • PO No dropdown shows only "Intransit" POs; selecting one auto-fills party + items
*/

/* ── 2-digit year date builder (mirrors Document Sequence backend) ── */
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

const blankItem = (sNo) => ({
  sNo,
  itemCode: "",
  itemName: "",
  uom:      "",
  qty:      "",
  _checked: false,
});

/* ── Portal TypeAhead — dropdown renders on <body>, escapes any overflow:hidden/auto parent ── */
const TypeAhead = ({ value, onChange, suggestions, onSelect, placeholder, className }) => {
  const [show,    setShow]    = useState(false);
  const [coords,  setCoords]  = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef(null);
  const listRef  = useRef(null);

  const filtered = value
    ? suggestions.filter((s) => s?.toLowerCase().includes(value.toLowerCase())).slice(0, 10)
    : [];

  /* Recalculate position every time the dropdown opens or window scrolls/resizes */
  const calcCoords = useCallback(() => {
    if (!inputRef.current) return;
    const rect   = inputRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropH  = Math.min(filtered.length * 32 + 8, 220);
    /* If there is not enough space below, place above */
    const goUp   = spaceBelow < dropH + 8;
    setCoords({
      left:  rect.left,
      width: rect.width,
      top:   goUp
        ? rect.top  - dropH - 2
        : rect.bottom + 2,
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

  /* Close on outside click */
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
            position:  "fixed",
            top:       coords.top,
            left:      coords.left,
            width:     coords.width,
            zIndex:    9999,
            background: "#fff",
            border:    "1.5px solid #93c5fd",
            borderRadius: 6,
            listStyle: "none",
            margin:    0,
            padding:   0,
            maxHeight: 220,
            overflowY: "auto",
            boxShadow: "0 8px 24px rgba(37,99,235,0.15)",
            scrollbarWidth: "thin",
          }}
        >
          {filtered.map((s, i) => (
            <li
              key={i}
              onMouseDown={(e) => { e.preventDefault(); onSelect(s); setShow(false); }}
              style={{
                padding: "7px 12px",
                fontSize: 12,
                cursor: "pointer",
                borderBottom: "1px solid #f1f5f9",
                color: "#1e293b",
              }}
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
        className={className || "cgin-item-input"}
        value={value}
        onChange={(e) => { onChange(e.target.value); setShow(true); }}
        onFocus={() => { setShow(true); calcCoords(); }}
        placeholder={placeholder}
        autoComplete="off"
      />
      {dropdown}
    </>
  );
};

const CreateGIN = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading,     setLoading]     = useState(false);
  const [insertCount, setInsertCount] = useState(1);

  /* ── Vehicle duplicate check ─────────────────────────────────────────────
     Fires 500ms after the user stops typing in Vehicle No.
     If a GIN with this vehicle exists and is NOT Closed → block + show alert.
  ──────────────────────────────────────────────────────────────────────────── */
  const [vehicleConflict,   setVehicleConflict]   = useState(null); // { ginNo, status } | null
  const vehicleCheckTimerRef = useRef(null);

  const checkVehicleConflict = useCallback(async (vehicleNo) => {
    if (!vehicleNo || !vehicleNo.trim()) { setVehicleConflict(null); return; }
    try {
      const res     = await axios.get(`${API_URL}/api/goods-inward-note`);
      const allGINs = Array.isArray(res.data) ? res.data : [];
      const vNo     = vehicleNo.trim().toUpperCase();
      const found   = allGINs.find(
        (g) => g.vehicleNo?.trim().toUpperCase() === vNo && g.status !== "Closed"
      );
      setVehicleConflict(found ? { ginNo: found.ginNo, status: found.status } : null);
    } catch { setVehicleConflict(null); }
  }, []);

  /* ── master data ── */
  const { sites: siteOptions, loading: sitesLoading } = useSiteOptions("Inventory", "Inward/Outward");
  const [transactionCategories, setTransactionCategories] = useState([]);
  const [parties,    setParties]    = useState([]);
  const [itemList,   setItemList]   = useState([]);
  const [intransitPOs, setIntransitPOs] = useState([]);

  /* ── computed IN/OUT WARD NO ── */
  const [inOutNo, setInOutNo] = useState("");

  const [form, setForm] = useState({
    transactionCategory: "",
    ginNo:               "",
    inOutDescription:    "",
    inOutType:           "Inward",
    poCpoNo:             "",
    ginDate:             "",
    entryTime:           "",   // manual entry by user
    partyCode:           "",
    partyName:           "",
    status:              "Open",
    challanInvoiceNo:    "",
    challanDate:         "",
    challanTime:         "",
    vehicleNo:           "",
    remarks:             "",
    site:                "",
    closedAt:            "",
    closedDate:          "",   // manual closed date (shown when status = Closed)
    closedTime:          "",   // manual closed time (shown when status = Closed)
    exitTime:            "",
    grossWeight:         "",
    tareWeight:          "",
    netWeight:           "",
  });

  const [items, setItems] = useState([blankItem(1)]);

  /* ── Set default date for GIN date only; challanDate is manual ── */
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setForm((p) => ({ ...p, ginDate: today }));
  }, []);

  /* ── Default site ── */
  useEffect(() => {
    if (siteOptions.length > 0 && !form.site) {
      setForm((p) => ({ ...p, site: siteOptions[0].siteCode }));
    }
  }, [siteOptions]);

  /* ── Fetch transaction categories ── */
  useEffect(() => {
    axios.get(`${API_URL}/api/transactions`)
      .then((res) => {
        setTransactionCategories(
          res.data.filter(
            (t) => t.module === "Inventory" && t.businessEntity === "Inward/Outward" && t.status === "Open"
          )
        );
      })
      .catch(console.error);
  }, []);

  /* ── Fetch parties ── */
  useEffect(() => {
    axios.get(`${API_URL}/api/parties`)
      .then((res) => setParties(res.data.filter((p) => p.status === "Active")))
      .catch(console.error);
  }, []);

  /* ── Fetch items ── */
  useEffect(() => {
    axios.get(`${API_URL}/api/items`)
      .then((res) => setItemList(res.data.filter((i) => i.status === "Active")))
      .catch(console.error);
  }, []);

  /* ── Fetch Intransit POs — exclude those already linked to an existing GIN ── */
  const [usedPONos, setUsedPONos] = useState(new Set());

  useEffect(() => {
    Promise.all([
      axios.get(`${API_URL}/api/purchase-orders`),
      axios.get(`${API_URL}/api/goods-inward-note`),
    ])
      .then(([poRes, ginRes]) => {
        const allPOs  = poRes.data.filter((po) => po.status === "Intransit");
        const ginData = Array.isArray(ginRes.data) ? ginRes.data : [];
        const used    = new Set(ginData.map((g) => g.poCpoNo).filter(Boolean));
        setUsedPONos(used);
        setIntransitPOs(allPOs.filter((po) => !used.has(po.poNo)));
      })
      .catch(console.error);
  }, []);

  /* ── Pre-fill from PO if navigated with state ── */
  useEffect(() => {
    if (location.state?.fromPO) {
      const po = location.state.fromPO;
      setForm((f) => ({
        ...f,
        poCpoNo:   po.poNo   || "",
        partyCode: po.partyCode || "",
        partyName: po.partyName || "",
        site:      po.site   || f.site,
      }));
      if (po.items && po.items.length > 0) {
        setItems(
          po.items.map((it, idx) => ({
            sNo:       idx + 1,
            itemCode:  it.itemCode     || "",
            itemName:  it.itemName     || "",
            uom:       it.uom          || "",
            qty:       it.qty ?? "",
            _checked:  false,
          }))
        );
      }
    }
  }, [location.state]);

  /* ── Compute IN/OUT WARD NO when transaction category changes ── */
  useEffect(() => {
    if (!form.transactionCategory) { setInOutNo(""); return; }
    const cat = transactionCategories.find((t) => t._id === form.transactionCategory);
    if (!cat) { setInOutNo(""); return; }

    axios.get(`${API_URL}/api/document-sequence`)
      .then((res) => {
        /* Link to the Document Sequence configured for THIS Transaction Category
           (module + businessEntity + transactionCategory description) — Entity
           Prefix is entered manually on the Document Sequence screen and has no
           fixed relationship to the transaction category code. */
        const matching = res.data.filter(
          (r) =>
            r.module === "Inventory" &&
            r.businessEntity === "Inward/Outward" &&
            r.transactionCategory === cat.categoryDescription
        );
        if (!matching.length) {
          setInOutNo(`(Create a Document Sequence for "${cat.categoryDescription}" first)`);
          return;
        }
        const last   = matching.reduce((a, b) => Number(a.incrementNo) > Number(b.incrementNo) ? a : b);
        const prefix = (last.entityPrefix || "").trim().toUpperCase();
        const digits = Math.max(1, Number(last.sequenceDigits) || 2);
        const step   = Math.max(1, Number(last.incrementStep) || 1);
        const nextNo = Number(last.incrementNo) + step;
        const date   = last.useDateFragment ? buildDatePart(last.sequenceFormat || "dd/mm/yy") : "";
        setInOutNo(`${prefix}${date}${String(nextNo).padStart(digits, "0")}`);
      })
      .catch(() => setInOutNo(""));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.transactionCategory, transactionCategories]);

  /* ── helpers for party typeahead ── */
  const partyNames = parties.map((p) => p.partyName).filter(Boolean);
  const partyCodes = parties.map((p) => p.partyCode).filter(Boolean);

  const handlePartyNameSelect = (name) => {
    const p = parties.find((x) => x.partyName === name);
    setForm((f) => ({ ...f, partyName: name, partyCode: p?.partyCode || "" }));
  };
  const handlePartyCodeSelect = (code) => {
    const p = parties.find((x) => x.partyCode === code);
    setForm((f) => ({ ...f, partyCode: code, partyName: p?.partyName || "" }));
  };

  /* ── PO selection handler — auto-fills form + items ── */
  const handlePOSelect = (poNo) => {
    setForm((f) => ({ ...f, poCpoNo: poNo }));
    if (!poNo) return;
    const po = intransitPOs.find((p) => p.poNo === poNo);
    if (!po) return;
    setForm((f) => ({
      ...f,
      poCpoNo:   po.poNo      || "",
      partyCode: po.partyCode || "",
      partyName: po.partyName || "",
      site:      po.site      || f.site,
    }));
    if (po.items && po.items.length > 0) {
      setItems(
        po.items.map((it, idx) => ({
          sNo:       idx + 1,
          itemCode:  it.itemCode  || "",
          itemName:  it.itemName  || "",
          uom:       it.uom       || "",
          qty:       it.qty ?? "",
          _checked:  false,
        }))
      );
    }
  };

  /* ── helpers for item typeahead in rows ── */
  const allItemCodes = itemList.map((i) => i.itemCode).filter(Boolean);
  const allItemNames = itemList.map((i) => i.itemName).filter(Boolean);

  const handleItemCodeSelect = (rowIdx, code) => {
    const found = itemList.find((i) => i.itemCode === code);
    setItems((prev) => {
      const next = [...prev];
      next[rowIdx] = {
        ...next[rowIdx],
        itemCode: code,
        itemName: found?.itemName || "",
        uom:      found?.uom      || "",
      };
      return next;
    });
  };
  const handleItemNameSelect = (rowIdx, name) => {
    const found = itemList.find((i) => i.itemName === name);
    setItems((prev) => {
      const next = [...prev];
      next[rowIdx] = {
        ...next[rowIdx],
        itemName: name,
        itemCode: found?.itemCode || "",
        uom:      found?.uom      || "",
      };
      return next;
    });
  };

const handleChange = (e) => {
  const { name, value } = e.target;

  /* ── Vehicle No: debounced duplicate check ── */
  if (name === "vehicleNo") {
    clearTimeout(vehicleCheckTimerRef.current);
    vehicleCheckTimerRef.current = setTimeout(() => checkVehicleConflict(value), 500);
  }

  setForm((p) => {
    const updated = { ...p, [name]: value };

    const gross =
      name === "grossWeight"
        ? Number(value || 0)
        : Number(p.grossWeight || 0);

    const tare =
      name === "tareWeight"
        ? Number(value || 0)
        : Number(p.tareWeight || 0);

    updated.netWeight = gross > 0 || tare > 0
      ? parseFloat((gross - tare).toFixed(6))
      : "";

    // Clear closed fields when status changes away from Closed
    if (name === "status" && value !== "Closed") {
      updated.closedDate = "";
      updated.closedTime = "";
      updated.closedAt   = "";
      updated.exitTime   = "";
    }

    return updated;
  });
};

  /* ── item row handlers ── */
  const handleItemChange = (rowIdx, field, value) => {
    setItems((prev) => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], [field]: value };
      return next;
    });
  };
  const handleItemCheck = (rowIdx, checked) => {
    setItems((prev) => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], _checked: checked };
      return next;
    });
  };
  const handleInsertRows = () => {
    const count = Math.max(1, Math.min(50, Number(insertCount) || 1));
    setItems((prev) => {
      const start = prev.length + 1;
      return [...prev, ...Array.from({ length: count }, (_, i) => blankItem(start + i))];
    });
  };
  const handleDeleteChecked = () => {
    setItems((prev) => prev.filter((r) => !r._checked).map((r, i) => ({ ...r, sNo: i + 1 })));
  };

  /* ── Save ── */
  const handleSave = async () => {
    if (!form.transactionCategory) { alert("Please select a Transaction Category"); return; }
    if (!form.ginDate)             { alert("Date is required");                     return; }
    if (!form.vehicleNo || !form.vehicleNo.trim()) { alert("Vehicle No is required"); return; }

    /* Block if this vehicle has an active (non-Closed) GIN — re-check at save time.
       This is a hard ERROR, not a soft warning: the record is NOT created. */
    if (vehicleConflict) {
      alert(`❌ Error: Vehicle "${form.vehicleNo.trim()}" has not exited yet (still IN).\nExisting GIN: ${vehicleConflict.ginNo} | Status: ${vehicleConflict.status}\n\nMark that vehicle OUT (Closed) before creating a new Inward entry.\nThis entry was NOT created.`);
      return;
    }
    /* Also do a live check in case the state hasn't resolved yet — final guard before any write */
    try {
      const checkRes = await axios.get(`${API_URL}/api/goods-inward-note`);
      const allGINs  = Array.isArray(checkRes.data) ? checkRes.data : [];
      const vNo      = form.vehicleNo.trim().toUpperCase();
      const conflict = allGINs.find(
        (g) => g.vehicleNo?.trim().toUpperCase() === vNo && g.status !== "Closed"
      );
      if (conflict) {
        alert(`❌ Error: Vehicle "${form.vehicleNo.trim()}" has not exited yet (still IN).\nExisting GIN: ${conflict.ginNo} | Status: ${conflict.status}\n\nMark that vehicle OUT (Closed) before creating a new Inward entry.\nThis entry was NOT created.`);
        setVehicleConflict({ ginNo: conflict.ginNo, status: conflict.status });
        return;
      }
    } catch { /* non-blocking */ }

    const cat = transactionCategories.find((t) => t._id === form.transactionCategory);
    if (!cat) { alert("Invalid transaction category"); return; }

    try {
      setLoading(true);

      /* Find the Document Sequence configured for THIS Transaction Category
         (module + businessEntity + transactionCategory description) and use
         ITS entityPrefix — Entity Prefix is entered manually on the Document
         Sequence screen, not derived from the category code. */
      const seqListRes = await axios.get(`${API_URL}/api/document-sequence`);
      const matchingSeq = (seqListRes.data || []).filter(
        (r) =>
          r.module === "Inventory" &&
          r.businessEntity === "Inward/Outward" &&
          r.transactionCategory === cat.categoryDescription
      );
      if (!matchingSeq.length) {
        alert(`No Document Sequence is set up for "${cat.categoryDescription}". Please create one first.`);
        setLoading(false);
        return;
      }
      const seqEntry     = matchingSeq.reduce((a, b) => (Number(a.incrementNo) > Number(b.incrementNo) ? a : b));
      const entityPrefix = (seqEntry.entityPrefix || "").trim().toUpperCase();

      /* 1. Register sequence → get official number */
      const seqRes = await axios.post(`${API_URL}/api/create-document-sequence`, {
        module:              "Inventory",
        businessEntity:      "Inward/Outward",
        entityPrefix,
        transactionCategory: cat.categoryDescription,
      });
      const officialNo = seqRes.data.generatedCode;

      /* 2. Clean items */
      const cleanItems = items
        .filter((r) => {
          const { sNo, _checked, ...rest } = r;
          return Object.values(rest).some((v) => String(v).trim() !== "");
        })
        .map(({ _checked, ...r }) => ({ ...r, qty: Number(r.qty) || 0 }));

      /* 3. Build entry/exit time from manual inputs */
      const entryTime   = form.entryTime || "";
      const isClosed    = form.status === "Closed";

      let exitTime = "";
      let closedAt = "";
      if (isClosed) {
        if (!form.closedDate || !form.closedTime) {
          alert("Please enter both Closed Date and Closed Time when status is Closed");
          setLoading(false);
          return;
        }
        exitTime = `${form.closedTime}:00`;
        closedAt = new Date(`${form.closedDate}T${form.closedTime}:00`).toISOString();
      }

      const payload = {
        ...form,
        ginNo:               officialNo,
        transactionCategory: cat.categoryDescription,
        items:               cleanItems,
        entryTime,
        exitTime,
        closedAt,
      };

      const res = await axios.post(`${API_URL}/api/goods-inward-note`, payload);
      if (res.data.success) {
        /* ── Step 2 → PO: Intransit → Convert ──────────────────────────────
           When an Inward GIN is created and its status is "Open", advance
           the linked PO from "Intransit" to "Convert" so the flow progresses.
           Only triggers for Inward entries with status Open, and only when
           the PO is currently Intransit (avoids overwriting other statuses
           like Partial/Closed/Cancelled).
        ──────────────────────────────────────────────────────────────────── */
        if (payload.poCpoNo && payload.inOutType === "Inward" && payload.status === "Open") {
          try {
            const poListRes = await axios.get(`${API_URL}/api/purchase-orders`);
            const allPOs    = Array.isArray(poListRes.data) ? poListRes.data : [];
            const linkedPO  = allPOs.find((po) => po.poNo === payload.poCpoNo);
            if (linkedPO?._id && linkedPO.status === "Intransit") {
              await axios.put(`${PO_API}/${linkedPO._id}`, {
                ...linkedPO,
                status: "Convert",
              });
            }
          } catch (poErr) {
            console.warn("Could not update PO status to Convert:", poErr.message);
            /* non-blocking — GIN is already saved, PO update is a best-effort */
          }
        }

        alert("Inward Outward Note Saved Successfully");
        navigate("/inward-outward-note");
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Save Failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const anyChecked = items.some((r) => r._checked);

  return (
    <div className="cgin-page">
      <ModuleNavbar />

      {/* HEADER */}
      <div className="cgin-header">
        <div className="cgin-header-left">
          <button className="app-back-btn" onClick={() => navigate("/inward-outward-note")}>← Back</button>
          <h2>Create Inward Outward Note</h2>
        </div>
      </div>

      <div className="cgin-card">
        <div className="cgin-section-title">IN/OUT WARD INFORMATION</div>

        <div className="cgin-grid">

          {/* 1. TRANSACTION CATEGORY */}
          <div className="cgin-field">
            <label>* Transaction Category</label>
            <select name="transactionCategory" value={form.transactionCategory} onChange={handleChange}>
              <option value="">- Select -</option>
              {transactionCategories.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.transactionCategoryCode} — {t.categoryDescription}
                </option>
              ))}
            </select>
          </div>

          {/* 2. IN/OUT WARD NO */}
          <div className="cgin-field">
            <label>IN/OUT WARD NO</label>
            <input
              type="text"
              readOnly
              value={!form.transactionCategory ? "Select category first…" : inOutNo || "Generating…"}
              style={{ fontWeight: 600, letterSpacing: 1, color: "#15803d" }}
            />
          </div>

          {/* 3. IN/OUT DESCRIPTION */}
          <div className="cgin-field">
            <label>IN/OUT Description</label>
            <input
              type="text"
              name="inOutDescription"
              value={form.inOutDescription}
              onChange={handleChange}
              placeholder="Enter description"
            />
          </div>

          {/* 4. IN/OUT TYPE */}
          <div className="cgin-field">
            <label>IN/OUT Type</label>
            <select name="inOutType" value={form.inOutType} onChange={handleChange}>
              <option value="Inward">Inward</option>
              <option value="Outward">Outward</option>
              {/* <option value="General">General</option> */}
            </select>
          </div>

          {/* 5. PO NO — dropdown of Intransit POs with auto-fill */}
          <div className="cgin-field">
            <label>PO No (Intransit)</label>
            <select
              name="poCpoNo"
              value={form.poCpoNo}
              onChange={(e) => handlePOSelect(e.target.value)}
            >
              <option value="">- Select PO -</option>
              {intransitPOs.map((po) => (
                <option key={po._id} value={po.poNo}>
                  {po.poNo} — {po.partyName}
                </option>
              ))}
            </select>
          </div>

          {/* 6. DATE */}
          <div className="cgin-field">
            <label>* Date</label>
            <input type="date" name="ginDate" value={form.ginDate} onChange={handleChange} />
          </div>

          {/* GATE ENTRY TIME — manual entry */}
          <div className="cgin-field">
            <label>Gate Entry Time</label>
            <input
              type="time"
              name="entryTime"
              value={form.entryTime}
              onChange={handleChange}
              style={{
                height: 34,
                border: "1px solid #86efac",
                borderRadius: 6,
                padding: "0 8px",
                fontSize: 12,
                background: "#f0fdf4",
                color: "#15803d",
                fontWeight: 600,
              }}
            />
          </div>

          {/* 7. PARTY CODE — typeahead */}
          <div className="cgin-field">
            <label>Party Code</label>
            <TypeAhead
              value={form.partyCode}
              onChange={(v) => setForm((f) => ({ ...f, partyCode: v }))}
              suggestions={partyCodes}
              onSelect={handlePartyCodeSelect}
              placeholder="Type party code…"
            />
          </div>

          {/* 8. PARTY NAME — typeahead, auto-fills code */}
          <div className="cgin-field">
            <label>Party Name</label>
            <TypeAhead
              value={form.partyName}
              onChange={(v) => setForm((f) => ({ ...f, partyName: v }))}
              suggestions={partyNames}
              onSelect={handlePartyNameSelect}
              placeholder="Type party name…"
            />
          </div>

          {/* 9. STATUS */}
          <div className="cgin-field">
            <label>Status</label>
            <select name="status" value={form.status} onChange={handleChange}>
              <option value="Open">Open</option>
              {/* <option value="Weighted">Weighted</option>
              <option value="OutPending">OutPending</option> */}
              <option value="Closed">Closed</option>
            </select>
          </div>

          {/* 13. CHALLAN NO */}
          <div className="cgin-field">
            <label>Challan / Invoice No</label>
            <input
              type="text"
              name="challanInvoiceNo"
              value={form.challanInvoiceNo}
              onChange={handleChange}
              placeholder="Enter challan / invoice no"
              className="inp-highlight"
            />
          </div>

          {/* CHALLAN INVOICE DATE + TIME */}
          <div className="cgin-field">
            <label>Challan Invoice Date &amp; Time</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="date"
                name="challanDate"
                value={form.challanDate}
                onChange={handleChange}
                className="inp-highlight"
                style={{ flex: 1 }}
              />
              <input
                type="time"
                name="challanTime"
                value={form.challanTime}
                onChange={handleChange}
                className="inp-highlight"
                style={{ width: 110 }}
              />
            </div>
          </div>

          {/* CLOSED DATE + TIME — shown only when status = Closed, manual entry */}
          {form.status === "Closed" && (
            <>
              <div className="cgin-field">
                <label style={{ color: "#dc2626", fontWeight: 700 }}>🚪 * Closed Date</label>
                <input
                  type="date"
                  name="closedDate"
                  value={form.closedDate}
                  onChange={handleChange}
                  style={{ height: 34, border: "1.5px solid #fca5a5", borderRadius: 6, padding: "0 8px", fontSize: 12, background: "#fff1f2" }}
                />
              </div>
              <div className="cgin-field">
                <label style={{ color: "#dc2626", fontWeight: 700 }}>⏱ * Closed Time</label>
                <input
                  type="time"
                  name="closedTime"
                  value={form.closedTime}
                  onChange={handleChange}
                  style={{ height: 34, border: "1.5px solid #fca5a5", borderRadius: 6, padding: "0 8px", fontSize: 12, background: "#fff1f2", color: "#dc2626", fontWeight: 600 }}
                />
              </div>
            </>
          )}

          {/* 15. VEHICLE NO — REQUIRED */}
          <div className="cgin-field">
            <label>* Vehicle No</label>
            <input
              type="text"
              name="vehicleNo"
              value={form.vehicleNo}
              onChange={handleChange}
              onBlur={(e) => { clearTimeout(vehicleCheckTimerRef.current); checkVehicleConflict(e.target.value); }}
              placeholder="Enter vehicle no (required)"
              required
            />
          </div>

          {/* 16. SITE */}
          <div className="cgin-field">
            <label>Site</label>
            <select name="site" value={form.site} onChange={handleChange} disabled={sitesLoading}>
              <option value="">{sitesLoading ? "Loading…" : "- Select Site -"}</option>
              {siteOptions.map((s) => (
                <option key={s._id} value={s.siteCode}>{s.siteCode} — {s.siteName}</option>
              ))}
            </select>
          </div>

          {/* GROSS WEIGHT */}
          <div className="cgin-field">
            <label>Gross Weight</label>
            <input
              type="number"
              name="grossWeight"
              value={form.grossWeight}
              onChange={handleChange}
              placeholder="e.g. 25000"
              min="0"
              step="0.01"
            />
          </div>

          {/* TARE WEIGHT */}
          <div className="cgin-field">
            <label>Tare Weight</label>
            <input
              type="number"
              name="tareWeight"
              value={form.tareWeight}
              onChange={handleChange}
              placeholder="e.g. 7500"
              min="0"
              step="0.01"
            />
          </div>

          {/* NET WEIGHT */}
          <div className="cgin-field">
            <label>Net Weight</label>
            <input
              type="number"
              name="netWeight"
              value={form.netWeight}
              readOnly
              style={{
                background: "#f8fafc",
                fontWeight: "600",
              }}
            />
          </div>

          {/* REMARKS — compact, inside grid */}
          <div className="cgin-field">
            <label>Remarks</label>
            <textarea
              rows="1"
              name="remarks"
              value={form.remarks}
              onChange={handleChange}
              placeholder="Enter remarks…"
              style={{ resize: "vertical", minHeight: 36 }}
            />
          </div>

        </div>

        {/* ── ITEMS SECTION ── */}
        <div className="cgin-items-section">
          <div className="cgin-items-header">
            <span className="cgin-items-title">Items</span>
            {anyChecked && (
              <button className="cgin-del-rows-btn" onClick={handleDeleteChecked}>
                Delete Selected
              </button>
            )}
          </div>

          <div className="cgin-items-table-wrap">
            <table className="cgin-items-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>✓</th>
                  <th style={{ width: 50 }}>Sl No</th>
                  <th style={{ minWidth: 160 }}>Item Code</th>
                  <th style={{ minWidth: 200 }}>Item Name</th>
                  <th style={{ width: 90 }}>UOM</th>
                  <th style={{ width: 90 }}>Qty</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row, idx) => (
                  <tr key={idx} className={row._checked ? "cgin-row-checked" : ""}>
                    <td className="cgin-check-cell">
                      <input
                        type="checkbox"
                        checked={row._checked}
                        onChange={(e) => handleItemCheck(idx, e.target.checked)}
                      />
                    </td>
                    <td className="cgin-sno-cell">{row.sNo}</td>

                    {/* Item Code typeahead */}
                    <td style={{ position: "relative" }}>
                      <TypeAhead
                        value={row.itemCode}
                        onChange={(v) => handleItemChange(idx, "itemCode", v)}
                        suggestions={allItemCodes}
                        onSelect={(v) => handleItemCodeSelect(idx, v)}
                        placeholder="Code…"
                        className="cgin-item-input"
                      />
                    </td>

                    {/* Item Name typeahead */}
                    <td style={{ position: "relative" }}>
                      <TypeAhead
                        value={row.itemName}
                        onChange={(v) => handleItemChange(idx, "itemName", v)}
                        suggestions={allItemNames}
                        onSelect={(v) => handleItemNameSelect(idx, v)}
                        placeholder="Name…"
                        className="cgin-item-input cgin-item-wide"
                      />
                    </td>

                    {/* UOM — auto-filled, editable */}
                    <td>
                      <input
                        type="text"
                        className="cgin-item-input cgin-item-sm"
                        value={row.uom}
                        onChange={(e) => handleItemChange(idx, "uom", e.target.value)}
                        placeholder="MT"
                      />
                    </td>

                    {/* Qty — auto-filled from PO, editable */}
                    <td>
                      <input
                        type="number"
                        className="cgin-item-input cgin-item-sm"
                        value={row.qty}
                        onChange={(e) => handleItemChange(idx, "qty", e.target.value)}
                        placeholder="Qty"
                        min="0"
                      />
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Insert Rows bar */}
          <div className="cgin-insert-row-bar">
            <input
              type="number"
              min="1"
              max="50"
              className="cgin-insert-count"
              value={insertCount}
              onChange={(e) => setInsertCount(e.target.value)}
            />
            <button className="cgin-insert-row-btn" onClick={handleInsertRows}>
              Insert Row
            </button>
          </div>
        </div>

        {/* ── Vehicle conflict ERROR banner — blocks save, record is NOT created ── */}
        {vehicleConflict && (
          <div style={{
            margin: "0 0 12px 0", padding: "12px 16px",
            background: "#fef2f2", border: "1.5px solid #ef4444",
            borderRadius: 8, color: "#991b1b", fontSize: 13, fontWeight: 600,
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <span style={{ fontSize: 18 }}>❌</span>
            <span>
              <strong>Error:</strong> Vehicle <strong>{form.vehicleNo}</strong> has not exited yet (still IN).
              {" "}GIN: <strong>{vehicleConflict.ginNo}</strong> | Status: <strong>{vehicleConflict.status}</strong>.
              {" "}Mark that vehicle <strong>OUT (Closed)</strong> first — this entry cannot be created until then.
            </span>
          </div>
        )}

        {/* ACTIONS */}
        <div className="cgin-actions">
          <button className="btn-cancel" onClick={() => navigate("/inward-outward-note")} disabled={loading}>
            Cancel
          </button>
          <button
            className="btn-save"
            onClick={handleSave}
            disabled={loading || !!vehicleConflict}
            title={vehicleConflict ? "Resolve vehicle conflict before saving" : ""}
            style={vehicleConflict ? { opacity: 0.5, cursor: "not-allowed" } : {}}
          >
            {loading ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {/* Typeahead dropdown styles injected inline */}
      <style>{`
        .cgin-suggestions {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: #fff;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          max-height: 180px;
          overflow-y: auto;
          z-index: 999;
          margin: 0;
          padding: 0;
          list-style: none;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .cgin-suggestions li {
          padding: 8px 12px;
          cursor: pointer;
          font-size: 13px;
          color: #1e293b;
        }
        .cgin-suggestions li:hover {
          background: #f0f9ff;
          color: #0369a1;
        }
      `}</style>
    </div>
  );
};

export default CreateGIN;
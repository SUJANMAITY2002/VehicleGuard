import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "./Createdirectgrn.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";

const GRN_API           = `${API_URL}/api/direct-grn`;
const IC_API            = `${API_URL}/api/item-conversion`;
const PO_API            = `${API_URL}/api/purchase-order`;
const GIN_API           = `${API_URL}/api/goods-inward-note`; // Inward/Outward note — source of Inv/Challan No & Date
const DIRECT_GRN_MODULE = "Inventory";
const DIRECT_GRN_ENTITY = "GRN";
const today             = new Date().toISOString().split("T")[0];

/* ─── blank row factories ─── */
const blankItem = (sNo) => ({
  sNo, itemCode: "", itemName: "", uom: "", qty: "", rate: "", totalAmount: "", _checked: false,
});
const blankCharge = (sNo) => ({
  sNo, code: "", description: "", addOrSubtract: "", amount: "", _checked: false,
});
const defaultForm = () => ({
  // challanInvoiceNo / challanDate are left blank by default — they are
  // auto-fetched from the matching Inward/Outward (GIN) note once a PO No
  // is known (see the poNo-driven enrichment effect in the main component).
  grnNo: "", status: "Draft", grnDate: today, grnDescription: "", grnType: "",
  transactionCategory: "", site: "", challanInvoiceNo: "", challanDate: "",
  partyCode: "", partyName: "", vehicleNo: "", poNo: "", linkedGinNo: "", linkedIcNo: "", remarks: "",
});

/* ─── Rate logic ─── */
const resolveItemRate = (itemCode, baseItemCode, poRate, itemMaster) => {
  if (!itemCode) return "";
  const masterRecord = itemMaster.find((m) => m.itemCode === itemCode);

  // If rateDiff is explicitly 0 on the item master → use the full base rate
  // (PO rate if available, otherwise the item master's own base rate) instead of 0.
  if (itemCode === "RM025") {
  return 0;
}
  
  if (masterRecord && Number(masterRecord.rateDiff) === 0 && masterRecord.rateDiff !== undefined && masterRecord.rateDiff !== null && masterRecord.rateDiff !== "") {
    if (poRate > 0) return poRate;
    return Number(masterRecord?.rate || masterRecord?.baseRate || masterRecord?.price || 0) || "";
  }

  // Base item itself — use PO rate directly
  if (itemCode === baseItemCode && poRate > 0) return poRate;

  // Other items with a non-zero rateDiff — apply diff on top of PO rate
  if (poRate > 0) {
    const rateDiff = Number(masterRecord?.rateDiff || 0);
    return Math.max(0, poRate + rateDiff);
  }

  return Number(masterRecord?.rate || masterRecord?.baseRate || masterRecord?.price || 0) || "";
};

/* ═══════════════════════════════════════════════════════════════════════
   IC PICKER SCREEN
   - Full row is clickable (no Select button)
   - IC No highlighted as blue pill
   - If a GRN already exists for that IC's vehicle (status != Closed) → row is disabled
═══════════════════════════════════════════════════════════════════════ */
const IcPickerScreen = ({ onSelect, onBack, loading, existingGrns = [] }) => {
  const [icList,       setIcList]       = useState([]);
  const [icLoading,    setIcLoading]    = useState(false);
  const [srchIcNo,     setSrchIcNo]     = useState("");
  const [srchVehicle,  setSrchVehicle]  = useState("");
  const [srchItemCode, setSrchItemCode] = useState("");

  useEffect(() => {
    setIcLoading(true);
    axios.get(IC_API)
      .then((res) => setIcList(Array.isArray(res.data) ? res.data : []))
      .catch(() => setIcList([]))
      .finally(() => setIcLoading(false));
  }, []);

  /* IC IDs that already have a non-Closed GRN */
  const blockedIcNos = useMemo(() => {
    const set = new Set();
    existingGrns.forEach((grn) => {
      if (grn.linkedIcNo && (grn.status || "").toLowerCase() !== "closed") {
        set.add(grn.linkedIcNo);
      }
    });
    return set;
  }, [existingGrns]);

  const filtered = useMemo(() => {
    /* Only show ICs with status "Saved" — Draft ICs are not yet ready for GRN */
    let f = icList.filter((r) => r.status === "Saved" && !blockedIcNos.has(r.icNo));
    if (srchIcNo)     f = f.filter((r) => r.icNo?.toLowerCase().includes(srchIcNo.toLowerCase()));
    if (srchVehicle)  f = f.filter((r) => r.vehicleNo?.toLowerCase().includes(srchVehicle.toLowerCase()));
    if (srchItemCode) f = f.filter((r) => r.itemCode?.toLowerCase().includes(srchItemCode.toLowerCase()));
    return f;
  }, [icList, blockedIcNos, srchIcNo, srchVehicle, srchItemCode]);

  return (
    <div className="cdgrn-page">
      <ModuleNavbar />

      {/* Top bar */}
      <div className="cdgrn-topbar">
        <div className="cdgrn-topbar-left">
          <button className="cdgrn-back-btn" onClick={onBack}>← Back</button>
          <h2>Select Item Conversion</h2>
        </div>
      </div>

      <div className="cdgrn-content">
        {/* Search bar */}
        <div className="cdgrn-card">
          <div className="cdgrn-section-label">Search Item Conversions</div>
          <div className="cdgrn-ic-search-grid">
            <div className="cdgrn-fg">
              <label>IC No</label>
              <input value={srchIcNo} onChange={(e) => setSrchIcNo(e.target.value)} placeholder="Search IC No…" />
            </div>
            <div className="cdgrn-fg">
              <label>Vehicle No</label>
              <input value={srchVehicle} onChange={(e) => setSrchVehicle(e.target.value)} placeholder="Search vehicle…" />
            </div>
            <div className="cdgrn-fg">
              <label>Item Code</label>
              <input value={srchItemCode} onChange={(e) => setSrchItemCode(e.target.value)} placeholder="Search item code…" />
            </div>
          </div>
        </div>

        {/* IC list */}
        <div className="cdgrn-card" style={{ padding: 0 }}>
          {icLoading && <div className="cdgrn-placeholder">Loading Item Conversions…</div>}
          {!icLoading && filtered.length === 0 && (
            <div className="cdgrn-placeholder">No Item Conversion records found</div>
          )}
          {!icLoading && filtered.length > 0 && (
            <div className="cdgrn-table-wrap">
              <table className="cdgrn-ic-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>IC NO</th>
                    <th>DATE</th>
                    <th>PO NO</th>
                    <th>PARTY NAME</th>
                    <th>VEHICLE NO</th>
                    <th>BASE ITEM</th>
                    <th>BASE QTY</th>
                    <th>CONV ROWS</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((ic, idx) => {
                    return (
                      <tr
                        key={ic._id}
                        className="cdgrn-ic-row"
                        onClick={() => !loading && onSelect(ic)}
                        title="Click to create GRN from this IC"
                      >
                        <td className="cdgrn-sno-cell">{idx + 1}</td>
                        <td>
                          <span className="cdgrn-ic-no-badge">{ic.icNo || "—"}</span>
                        </td>
                        <td>{ic.conversionDate || "-"}</td>
                        <td>{ic.poNo || "-"}</td>
                        <td>{ic.partyName || "-"}</td>
                        <td>{ic.vehicleNo || "-"}</td>
                        <td>
                          <span className="cdgrn-item-code-pill">{ic.itemCode || "-"}</span>
                          {ic.itemDescription ? <span style={{ marginLeft: 4, color: "#6b7280", fontSize: 12 }}>{ic.itemDescription}</span> : null}
                        </td>
                        <td>{ic.baseQty ?? "-"} {ic.uom || ""}</td>
                        <td style={{ color: "#6b7280", fontSize: 12 }}>{(ic.conversionRows || []).length} row(s)</td>
                        <td>
                          <span className={`dgrn-badge dgrn-badge-${(ic.status || "active").toLowerCase()}`}>
                            {ic.status || "Active"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════ */
const CreateDirectGRN = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { id }    = useParams();

  const fromItemConversion = !!location.state?.fromItemConversion;
  const existingGrns       = location.state?.existingGrns || [];
  const directIc           = location.state?.directIc || null; // set by ItemConversionDetail "Import to GRN"
  const fromPO             = location.state?.fromPO || null;    // set by PODetails "Export to DGRN"
  const isDetail           = !!id;

  const [form,              setForm]              = useState(defaultForm());
  const [items,             setItems]             = useState([blankItem(1)]);
  const [charges,           setCharges]           = useState([blankCharge(1)]);
  const [insertCount,       setInsertCount]       = useState(1);
  const [chargeInsertCount, setChargeInsertCount] = useState(1);
  const [loading,           setLoading]           = useState(false);

  const [sites,          setSites]          = useState([]);
  const [txCategories,   setTxCategories]   = useState([]);
  const [parties,        setParties]        = useState([]);
  const [itemMaster,     setItemMaster]     = useState([]);
  const [chargeMaster,   setChargeMaster]   = useState([]);
  const [showCharges,    setShowCharges]    = useState(false);
  const [editMode,       setEditMode]       = useState(isDetail); // auto-edit when opening detail
  const canEdit = !isDetail || editMode;

  const [viewMode,     setViewMode]     = useState(
    /* directIc (from detail page) → go straight to form
       fromItemConversion (from list page) → show IC picker first */
    (directIc || (fromItemConversion && isDetail)) ? "form" : fromItemConversion && !isDetail ? "list" : "form"
  );
  const [previewGrnNo, setPreviewGrnNo] = useState("");
  const [selectedIc,   setSelectedIc]   = useState(null);

  /* ── Master data ── */
  useEffect(() => {
    axios.get(`${API_URL}/api/sites`).then((res) => setSites((Array.isArray(res.data) ? res.data : []).filter((s) => s.status !== "Inactive"))).catch(() => setSites([]));
    axios.get(`${API_URL}/api/transactions`).then((res) => {
      const list = Array.isArray(res.data) ? res.data : [];
      setTxCategories(list.filter((tx) => tx.module === DIRECT_GRN_MODULE && tx.businessEntity === DIRECT_GRN_ENTITY && (tx.status || "").toLowerCase() === "open"));
    }).catch(() => setTxCategories([]));
    axios.get(`${API_URL}/api/items`).then((res) => setItemMaster((Array.isArray(res.data) ? res.data : []).filter((it) => it.status !== "Inactive"))).catch(() => setItemMaster([]));
    axios.get(`${API_URL}/api/charges-master`).then((res) => setChargeMaster((Array.isArray(res.data) ? res.data : []).filter((ch) => ch.status !== "Inactive"))).catch(() => setChargeMaster([]));
    axios.get(`${API_URL}/api/parties`).then((res) => setParties((Array.isArray(res.data) ? res.data : []).filter((p) => p.status !== "Inactive"))).catch(() => setParties([]));
  }, []);

  /* ── Load existing record ── */
  useEffect(() => {
    if (!isDetail) return;
    const loadRecord = async () => {
      setLoading(true);
      try {
        const res  = await axios.get(`${GRN_API}/${id}`);
        const data = res.data?.data || res.data;
        setForm({ ...defaultForm(), ...data });
        setItems(Array.isArray(data.items) && data.items.length > 0
          ? data.items.map((item, idx) => ({ ...blankItem(idx + 1), ...item, sNo: idx + 1, _checked: false }))
          : [blankItem(1)]);
        setCharges(Array.isArray(data.charges) && data.charges.length > 0
          ? data.charges.map((charge, idx) => ({ ...blankCharge(idx + 1), ...charge, sNo: idx + 1, _checked: false }))
          : [blankCharge(1)]);
        setShowCharges(Array.isArray(data.charges) && data.charges.length > 0);
      } catch (err) {
        console.error(err);
        alert("Failed to load Direct GRN");
        navigate("/direct-grn");
      } finally {
        setLoading(false);
      }
    };
    loadRecord();
  }, [id, isDetail, navigate]);

  /* ── GRN No preview — ONLY generate once a Transaction Category is
     selected (mirrors IC No behaviour on the Item Conversion create page).
     Previously this fired on mount with an empty transactionCategory and
     showed a number before the category was even picked. ── */
  useEffect(() => {
    if (isDetail) return;
    if (!form.transactionCategory) { setPreviewGrnNo(""); return; }
    axios.get(`${GRN_API}/preview-grn-no`, { params: { transactionCategory: form.transactionCategory } })
      .then((res) => setPreviewGrnNo(res.data?.grnNo || ""))
      .catch(() => setPreviewGrnNo(""));
  }, [isDetail, form.transactionCategory]);

  /* ── Default first site ── */
  useEffect(() => {
    if (sites.length > 0 && !form.site) {
      const site = sites[0];
      setForm((prev) => ({ ...prev, site: site.siteCode || site.siteName || "" }));
    }
  }, [sites, form.site]);

  /* ── Auto-populate from directIc (navigated from ItemConversionDetail) ── */
  useEffect(() => {
    if (!directIc || itemMaster.length === 0 || isDetail) return;
    selectItemConversion(directIc);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directIc, itemMaster]);

  /* ── Auto-populate from fromPO (navigated from PODetails "Export to DGRN")
     PO No, Party Code, Party Name, GRN Type (T/UT ← PO Type) and Items are
     pulled straight from the PO. Inv/Challan No & Date are then resolved by
     the poNo-driven enrichment effect below (from the matching Inward/Outward
     note), same as the Item-Conversion path. ── */
  useEffect(() => {
    if (!fromPO || isDetail) return;
    setForm((prev) => ({
      ...prev,
      poNo:           fromPO.poNo   || prev.poNo,
      grnType:        fromPO.poType || prev.grnType,     // T / UT
      partyCode:      fromPO.partyCode || prev.partyCode,
      partyName:      fromPO.partyName || prev.partyName,
      site:           fromPO.site   || prev.site,
      grnDescription: prev.grnDescription || `From Purchase Order ${fromPO.poNo || ""}`,
    }));
    if (Array.isArray(fromPO.items) && fromPO.items.length > 0) {
      setItems(fromPO.items.map((it, idx) => {
        const qty  = Number(it.qty  || 0);
        const rate = Number(it.rate || 0);
        return {
          sNo: idx + 1,
          itemCode:    it.itemCode || "",
          itemName:    it.itemName || "",
          uom:         it.uom || "",
          qty:         qty  || "",
          rate:        rate || "",
          totalAmount: qty && rate ? String(qty * rate) : "",
          _checked:    false,
        };
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromPO, isDetail]);

  /* ── PO-driven enrichment — whenever the GRN has a PO No attached (either
     from the Item-Conversion path above, which resolves the IC's linked PO,
     or from the direct "Export to DGRN" path above), pull:
       • GRN Type  ← PO's poType (T / UT)
       • Party Code / Party Name ← PO (only fills if still blank)
       • Inv/Challan No & Date, Vehicle No ← matching Inward/Outward (GIN)
         record for that PO No
     Only fills blanks — never overwrites a value the user already has. ── */
  useEffect(() => {
    if (isDetail || !form.poNo) return;
    let cancelled = false;

    axios.get(`${PO_API}s`)
      .then((res) => {
        if (cancelled) return;
        const poList    = Array.isArray(res.data) ? res.data : [];
        const matchedPO = poList.find((po) => po.poNo === form.poNo);
        if (!matchedPO) return;
        setForm((prev) => ({
          ...prev,
          grnType:   prev.grnType   || matchedPO.poType    || prev.grnType,
          partyCode: prev.partyCode || matchedPO.partyCode || prev.partyCode,
          partyName: prev.partyName || matchedPO.partyName || prev.partyName,
        }));
      })
      .catch((err) => console.warn("Could not auto-fetch PO for GRN Type/Party:", err.message));

    axios.get(GIN_API)
      .then((res) => {
        if (cancelled) return;
        const ginList   = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        const matchedGin = ginList
          .filter((g) => g.poCpoNo === form.poNo)
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0];
        if (!matchedGin) return;
        setForm((prev) => ({
          ...prev,
          challanInvoiceNo: prev.challanInvoiceNo || matchedGin.challanInvoiceNo || prev.challanInvoiceNo,
          challanDate:      prev.challanDate      || matchedGin.challanDate      || prev.challanDate,
          vehicleNo:        prev.vehicleNo        || matchedGin.vehicleNo        || prev.vehicleNo,
        }));
      })
      .catch((err) => console.warn("Could not auto-fetch Inward/Outward for Inv/Challan details:", err.message));

    return () => { cancelled = true; };
  }, [form.poNo, isDetail]);

  const itemNameOptions = useMemo(() => itemMaster.map((it) => it.itemName).filter(Boolean), [itemMaster]);
  const itemCodeOptions = useMemo(() => itemMaster.map((it) => it.itemCode).filter(Boolean), [itemMaster]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (!canEdit) return;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  /* ─── Select IC → auto-fill ─── */
  const selectItemConversion = async (ic) => {
    setLoading(true);
    try {
      const icRes  = await axios.get(`${IC_API}/${ic._id}`);
      const fullIc = icRes.data?.data || icRes.data || ic;

      let poRate    = 0;
      let poPartyCode = "";
      if (fullIc.poNo) {
        try {
          const poRes = await axios.get(`${PO_API}s`);
          const poList = Array.isArray(poRes.data) ? poRes.data : [];
          const matchedPO = poList.find((po) => po.poNo === fullIc.poNo);
          if (matchedPO) {
            const poItem = (matchedPO.items || []).find((it) => it.itemCode === fullIc.itemCode);
            poRate      = Number(poItem?.rate || 0);
            poPartyCode = matchedPO.partyCode || "";   // ← pull partyCode from PO
          }
        } catch (poErr) {
          console.warn("Could not fetch PO for rate resolution:", poErr.message);
        }
      }

      setSelectedIc(fullIc);
      setForm((prev) => ({
        ...prev,
        grnDate:        fullIc.conversionDate || prev.grnDate,
        grnDescription: `From Item Conversion ${fullIc.icNo || ""}`,
        partyCode:      fullIc.partyCode  || poPartyCode  || prev.partyCode,   // ← IC first, then PO fallback
        partyName:      fullIc.partyName  || prev.partyName,                  // PO fallback handled by poNo-driven enrichment effect once poNo is set below
        vehicleNo:      fullIc.vehicleNo  || prev.vehicleNo,
        poNo:           fullIc.poNo       || prev.poNo,   // ← drives GRN Type / Party / Challan auto-fetch
        linkedGinNo:    fullIc.ginId      || prev.linkedGinNo,
        linkedIcNo:     fullIc.icNo       || "",
        remarks:        fullIc.remarks    || prev.remarks,
      }));

      const rows = Array.isArray(fullIc.conversionRows) ? fullIc.conversionRows : [];
      if (rows.length === 0) {
        const masterRec    = itemMaster.find((m) => m.itemCode === fullIc.itemCode);
        const fallbackRate = poRate > 0 ? poRate : Number(masterRec?.rate || masterRec?.baseRate || masterRec?.price || 0);
        const qty          = Number(fullIc.baseQty || 0);
        setItems([{ ...blankItem(1), itemCode: fullIc.itemCode || "", itemName: fullIc.itemDescription || "", uom: fullIc.uom || "", qty: qty || "", rate: fallbackRate || "", totalAmount: qty && fallbackRate ? String(qty * fallbackRate) : "" }]);
      } else {
        setItems(rows.map((row, idx) => {
          const itemCode    = row.inventoryCode || "";
          const itemName    = row.inventoryName || "";
          const uom         = row.uom           || "";
          const qty         = Number(row.raQty  || row.rQty || 0);
          const rate        = resolveItemRate(itemCode, fullIc.itemCode, poRate, itemMaster);
          const totalAmount = qty && rate ? qty * Number(rate) : "";
          return { sNo: idx + 1, itemCode, itemName, uom, qty: qty || "", rate: rate !== "" ? rate : "", totalAmount: totalAmount !== "" ? String(totalAmount) : "", _checked: false };
        }));
      }

      setCharges([blankCharge(1)]);
      setShowCharges(false);
      setViewMode("form");
    } catch (err) {
      console.error(err);
      alert("Failed to fetch Item Conversion details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ─── Item grid handlers ─── */
  const handleItemChange = (idx, field, value) => {
    if (!canEdit) return;
    setItems((prev) => {
      const next = [...prev];
      const row  = { ...next[idx], [field]: value };
      if (field === "qty" || field === "rate") {
        const qty  = Number(field === "qty"  ? value : row.qty)  || 0;
        const rate = Number(field === "rate" ? value : row.rate) || 0;
        row.totalAmount = qty && rate ? String(qty * rate) : "";
      }
      next[idx] = row;
      return next;
    });
  };

  const fillItemFromMaster = (idx, field, value) => {
    const found = itemMaster.find((it) => it[field] === value);
    setItems((prev) => {
      const next    = [...prev];
      const current = next[idx];
      let rate = current.rate;
      if (found) {
        // rateDiff === 0 explicitly → use the full base/PO rate (not 0)
        const hasZeroRateDiff =
          found.rateDiff !== undefined &&
          found.rateDiff !== null &&
          found.rateDiff !== "" &&
          Number(found.rateDiff) === 0;

        if (hasZeroRateDiff) {
          const poRate = Number(current._poRate || 0);
          rate = poRate > 0 ? poRate : (Number(found.rate || found.baseRate || found.price || 0) || "");
        } else if (selectedIc) {
          const poRate = Number(current._poRate || 0);
          rate = resolveItemRate(found.itemCode, selectedIc.itemCode, poRate, itemMaster);
        } else {
          rate = Number(found.rate || found.baseRate || found.price || 0) || "";
        }
      }
      const qty         = Number(current.qty) || 0;
      const totalAmount = qty && rate ? String(qty * Number(rate)) : "";
      next[idx] = { ...current, [field]: value, itemCode: found?.itemCode || current.itemCode || "", itemName: found?.itemName || current.itemName || "", uom: found?.uom || current.uom || "", rate, totalAmount };
      return next;
    });
  };

  const handleItemCheck   = (idx, checked) => { if (!canEdit) return; setItems((prev) => { const next = [...prev]; next[idx] = { ...next[idx], _checked: checked }; return next; }); };
  const handleInsertRows  = () => { if (!canEdit) return; const count = Math.max(1, Math.min(50, Number(insertCount) || 1)); setItems((prev) => [...prev, ...Array.from({ length: count }, (_, i) => blankItem(prev.length + i + 1))]); };
  const handleDeleteChecked = () => { if (!canEdit) return; setItems((prev) => prev.filter((row) => !row._checked).map((row, idx) => ({ ...row, sNo: idx + 1 }))); };

  const handleChargeChange  = (idx, field, value) => { if (!canEdit) return; setCharges((prev) => { const next = [...prev]; next[idx] = { ...next[idx], [field]: value }; return next; }); };
  const selectCharge        = (idx, code) => { if (!canEdit) return; const found = chargeMaster.find((ch) => ch.code === code); setCharges((prev) => { const next = [...prev]; next[idx] = { ...next[idx], code, description: found?.details || "", addOrSubtract: found?.addOrSubtract || "" }; return next; }); };
  const handleChargeCheck   = (idx, checked) => { if (!canEdit) return; setCharges((prev) => { const next = [...prev]; next[idx] = { ...next[idx], _checked: checked }; return next; }); };
  const handleInsertCharges = () => { if (!canEdit) return; const count = Math.max(1, Math.min(50, Number(chargeInsertCount) || 1)); setCharges((prev) => [...prev, ...Array.from({ length: count }, (_, i) => blankCharge(prev.length + i + 1))]); };
  const handleDeleteCharges = () => { if (!canEdit) return; setCharges((prev) => prev.filter((row) => !row._checked).map((row, idx) => ({ ...row, sNo: idx + 1 }))); };


  const runCascades = async (resolvedStatus, linkedIcNo) => {
    if (!linkedIcNo) return;

    /* ── Fetch IC ── */
    let linkedIc = null;
    try {
      const icListRes = await axios.get(IC_API);
      const allIcs    = Array.isArray(icListRes.data)
        ? icListRes.data
        : Array.isArray(icListRes.data?.data) ? icListRes.data.data : [];
      linkedIc = allIcs.find((ic) => ic.icNo === linkedIcNo) || null;
    } catch (err) {
      console.warn("Cascade: could not fetch IC list:", err.message);
    }

    /* ── IC → Closed (always, for both Draft and Approved) ── */
    if (linkedIc?._id && linkedIc.status !== "Closed") {
      try {
        await axios.put(`${IC_API}/${linkedIc._id}`, { ...linkedIc, status: "Closed" });
      } catch (err) {
        console.warn("Cascade: IC → Closed failed:", err.message);
      }
    }

    /* ── PO → Partial (only when GRN is Approved) ── */
    if (resolvedStatus === "Approved") {
      const poNo = linkedIc?.poNo || null;
      if (!poNo) return;
      try {
        const poListRes = await axios.get(`${PO_API}s`);
        const allPos    = Array.isArray(poListRes.data) ? poListRes.data : [];
        const linkedPo  = allPos.find((po) => po.poNo === poNo);
        if (linkedPo?._id && linkedPo.status !== "Closed" && linkedPo.status !== "Partial") {
          await axios.put(`${PO_API}/${linkedPo._id}`, { ...linkedPo, status: "Partial" });
        }
      } catch (err) {
        console.warn("Cascade: PO → Partial failed:", err.message);
      }
    }
  };

  const handleSave = async (resolvedStatus) => {
    if (!form.grnDate)             { alert("Date is required");                 return; }
    if (!form.transactionCategory) { alert("Transaction Category is required"); return; }
    if (!form.site)                { alert("Site is required");                 return; }

    const cleanItems   = items.filter(({ sNo, _checked, ...rest }) => Object.values(rest).some((v) => String(v ?? "").trim() !== "")).map(({ _checked, ...row }) => row);
    const cleanCharges = charges.filter(({ sNo, _checked, ...rest }) => Object.values(rest).some((v) => String(v ?? "").trim() !== "")).map(({ _checked, ...row }) => row);

    try {
      setLoading(true);

      const payload = { ...form, status: resolvedStatus, items: cleanItems, charges: cleanCharges };
      const res = isDetail
        ? await axios.put(`${GRN_API}/${id}`, payload)
        : await axios.post(GRN_API, payload);

      if (res.data?.success) {
        const savedGrn    = res.data.data || payload;
        const linkedIcNo  = savedGrn.linkedIcNo || form.linkedIcNo || "";

        /* Run IC → Closed + (if Approved) PO → Partial */
        await runCascades(resolvedStatus, linkedIcNo);

        const msg =
          resolvedStatus === "Draft"    ? "Saved as Draft successfully" :
          resolvedStatus === "Approved" ? "GRN Approved. Linked IC closed and PO updated to Partial." :
                                          "Direct GRN Saved Successfully";
        alert(msg);
        navigate("/direct-grn");
      } else {
        alert(res.data?.message || "Save failed");
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Save Failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const anyItemsChecked   = items.some((row) => row._checked);
  const anyChargesChecked = charges.some((row) => row._checked);
  const itemsTotal        = items.reduce((sum, row) => sum + (Number(row.totalAmount) || 0), 0);
  const chargesTotal      = charges.reduce((sum, row) => { const a = Number(row.amount) || 0; return row.addOrSubtract === "Subtraction" ? sum - a : sum + a; }, 0);
  const grandTotal        = itemsTotal + chargesTotal;

  /* ── IC Picker screen ── */
  if (fromItemConversion && !isDetail && viewMode === "list") {
    return (
      <IcPickerScreen
        onSelect={selectItemConversion}
        onBack={() => navigate("/direct-grn")}
        loading={loading}
        existingGrns={existingGrns}
      />
    );
  }

  /* ── GRN form ── */
  return (
    <div className="cdgrn-page">
      <ModuleNavbar />

      {/* Top bar */}
      <div className="cdgrn-topbar">
        <div className="cdgrn-topbar-left">
          <button
            className="cdgrn-back-btn"
            onClick={() => fromItemConversion && !isDetail ? setViewMode("list") : navigate("/direct-grn")}
          >
            ← Back
          </button>
          <h2>
            {isDetail ? "Direct GRN Detail" : fromItemConversion ? "Create GRN from Item Conversion" : "Create GRN"}
          </h2>
          {isDetail && form.grnNo && (
            <span className="cdgrn-grn-no-badge">{form.grnNo}</span>
          )}
        </div>
        {isDetail && (
          <div className="cdgrn-topbar-right">
            {(form.status === "Draft" || form.status === "Open") && (
              <button
                className="cdgrn-submit-btn"
                style={{ background: "#059669" }}
                disabled={loading}
                onClick={() => {
                  if (!window.confirm("Approve this GRN? This will close the linked IC and set the linked PO to Partial.")) return;
                  handleSave("Approved");
                }}
              >
                ✅ Approve
              </button>
            )}
          </div>
        )}
      </div>

      <div className="cdgrn-content">

        {/* GRN Header */}
        <div className="cdgrn-card">
          <div className="cdgrn-section-label">Direct GRN Header</div>
          <div className="cdgrn-main-grid">

            <div
              className="cdgrn-fg"
              style={{
                background: "#fffbeb",
                border: "1.5px solid #fbbf24",
                borderRadius: 8,
                padding: "8px 10px",
              }}
            >
              <label style={{ color: "#92400e", fontWeight: 700 }}>★ Transaction Category *</label>
              <select
                name="transactionCategory"
                value={form.transactionCategory}
                onChange={handleChange}
                disabled={!canEdit || isDetail}
                style={{ border: "1.5px solid #fbbf24", background: "#fff", fontWeight: 600 }}
              >
                <option value="">Select</option>
                {form.transactionCategory && !txCategories.some((tx) => tx.categoryDescription === form.transactionCategory) && (
                  <option value={form.transactionCategory}>{form.transactionCategory}</option>
                )}
                {txCategories.map((tx) => (
                  <option key={tx._id} value={tx.categoryDescription}>
                    {tx.transactionCategoryCode} - {tx.categoryDescription}
                  </option>
                ))}
              </select>
              {!isDetail && !form.transactionCategory && (
                <span style={{ fontSize: 10.5, color: "#b45309", marginTop: 3, display: "block" }}>
                  Select category first — GRN No is generated from it
                </span>
              )}
            </div>

            <div className="cdgrn-fg">
              <label>GRN No</label>
              <input
                name="grnNo"
                value={
                  isDetail
                    ? form.grnNo
                    : previewGrnNo || (form.transactionCategory ? "Generating…" : "Select Transaction Category first")
                }
                readOnly
                className="cdgrn-readonly"
              />
            </div>

            <div className="cdgrn-fg">
              <label>Date *</label>
              <input type="date" name="grnDate" value={form.grnDate} onChange={handleChange} readOnly={!canEdit} />
            </div>

            <div className="cdgrn-fg">
              <label>GRN Type</label>
              <select name="grnType" value={form.grnType} onChange={handleChange} disabled={!canEdit}>
                <option value="">Select</option>
                <option value="T">T</option>
                <option value="UT">UT</option>
              </select>
              {!isDetail && !form.grnType && form.poNo && (
                <span style={{ fontSize: 10.5, color: "#6b7280", marginTop: 3, display: "block" }}>
                  Auto-fetching from PO {form.poNo}…
                </span>
              )}
            </div>

            <div className="cdgrn-fg">
              <label>PO No</label>
              <input name="poNo" value={form.poNo} readOnly className="cdgrn-readonly" placeholder="Auto-filled from PO" />
            </div>

            <div className="cdgrn-fg">
              <label>Site *</label>
              <select name="site" value={form.site} onChange={handleChange} disabled={!canEdit}>
                <option value="">Select</option>
                {sites.map((site) => (
                  <option key={site._id} value={site.siteCode || site.siteName}>
                    {site.siteCode || site.siteName}{site.siteName ? ` - ${site.siteName}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="cdgrn-fg">
              <label>Party Name</label>
              {canEdit ? (
                <>
                  <input
                    list="cdgrn-party-names"
                    name="partyName"
                    value={form.partyName}
                    onChange={(e) => {
                      const val = e.target.value;
                      const match = parties.find((p) => p.partyName === val);
                      setForm((prev) => ({ ...prev, partyName: val, partyCode: match?.partyCode || prev.partyCode }));
                    }}
                    placeholder="Search party name…"
                    autoComplete="off"
                  />
                  <datalist id="cdgrn-party-names">
                    {parties.map((p) => <option key={p._id} value={p.partyName} />)}
                  </datalist>
                </>
              ) : (
                <input value={form.partyName} readOnly className="cdgrn-readonly" />
              )}
            </div>

            <div className="cdgrn-fg">
              <label>Party Code</label>
              <input name="partyCode" value={form.partyCode} readOnly className="cdgrn-readonly" placeholder="Auto-filled from party" />
            </div>

            <div className="cdgrn-fg">
              <label>Vehicle No</label>
              <input name="vehicleNo" value={form.vehicleNo} onChange={handleChange} readOnly={!canEdit} />
            </div>

            <div className="cdgrn-fg">
              <label>Inv / Challan No</label>
              <input name="challanInvoiceNo" value={form.challanInvoiceNo} onChange={handleChange} readOnly={!canEdit} placeholder="Auto-fetched from Inward/Outward" />
            </div>

            <div className="cdgrn-fg">
              <label>Inv / Challan Date</label>
              <input type="date" name="challanDate" value={form.challanDate} onChange={handleChange} readOnly={!canEdit} />
            </div>

            <div className="cdgrn-fg">
              <label>Status</label>
              {!isDetail ? (
                /* New GRN — always Draft, read-only */
                <input value="Draft" readOnly className="cdgrn-readonly" />
              ) : (
                /* Existing GRN — editable with Approved option */
                <select name="status" value={form.status} onChange={handleChange} disabled={!canEdit}>
                  <option>Draft</option>
                  <option>Open</option>
                  <option>Approved</option>
                  <option>Closed</option>
                </select>
              )}
            </div>

            <div className="cdgrn-fg">
              <label>GRN Description</label>
              <input name="grnDescription" value={form.grnDescription} onChange={handleChange} readOnly={!canEdit} />
            </div>

            <div className="cdgrn-fg cdgrn-fg-full">
              <label>Remarks</label>
              <textarea name="remarks" value={form.remarks} onChange={handleChange} readOnly={!canEdit} rows={2} />
            </div>

          </div>
        </div>

        {/* Items */}
        <div className="cdgrn-card">
          <div className="cdgrn-items-header">
            <span className="cdgrn-items-title">Items</span>
            {anyItemsChecked && (
              <button className="cdgrn-del-rows-btn" onClick={handleDeleteChecked}>Delete Selected</button>
            )}
          </div>

          <div className="cdgrn-items-table-wrap">
            <table className="cdgrn-items-table">
              <thead>
                <tr>
                  <th>Sl No</th>
                  <th>Del</th>
                  <th>Item Code</th>
                  <th>Item Name</th>
                  <th>UOM</th>
                  <th>Qty</th>
                  <th>Rate</th>
                  <th>Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row, idx) => (
                  <tr key={idx} className={row._checked ? "cdgrn-row-checked" : ""}>
                    <td className="cdgrn-sno">{row.sNo}</td>
                    <td className="cdgrn-check-cell">
                      <input type="checkbox" checked={!!row._checked} onChange={(e) => handleItemCheck(idx, e.target.checked)} />
                    </td>
                    <td>
                      <input className="cdgrn-item-input" list="cdgrn-item-codes" value={row.itemCode} onChange={(e) => handleItemChange(idx, "itemCode", e.target.value)} onBlur={() => fillItemFromMaster(idx, "itemCode", row.itemCode)} readOnly={!canEdit} />
                    </td>
                    <td>
                      <input className="cdgrn-item-input cdgrn-item-wide" list="cdgrn-item-names" value={row.itemName} onChange={(e) => handleItemChange(idx, "itemName", e.target.value)} onBlur={() => fillItemFromMaster(idx, "itemName", row.itemName)} readOnly={!canEdit} />
                    </td>
                    <td><input className="cdgrn-item-input cdgrn-item-sm" value={row.uom} onChange={(e) => handleItemChange(idx, "uom", e.target.value)} readOnly={!canEdit} /></td>
                    <td><input type="number" className="cdgrn-item-input cdgrn-item-num" value={row.qty} onChange={(e) => handleItemChange(idx, "qty", e.target.value)} readOnly={!canEdit} /></td>
                    <td><input type="number" className="cdgrn-item-input cdgrn-item-num" value={row.rate} onChange={(e) => handleItemChange(idx, "rate", e.target.value)} readOnly={!canEdit} /></td>
                    <td><input type="number" className="cdgrn-item-input cdgrn-item-num" value={row.totalAmount} onChange={(e) => handleItemChange(idx, "totalAmount", e.target.value)} readOnly={!canEdit} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <datalist id="cdgrn-item-codes">{itemCodeOptions.map((code) => <option key={code} value={code} />)}</datalist>
          <datalist id="cdgrn-item-names">{itemNameOptions.map((name) => <option key={name} value={name} />)}</datalist>

          <div className="cdgrn-insert-bar">
            <input type="number" min="1" max="50" className="cdgrn-insert-count" value={insertCount} onChange={(e) => setInsertCount(e.target.value)} />
            <button className="cdgrn-insert-btn" onClick={handleInsertRows} disabled={!canEdit}>Add Row</button>
          </div>
          <div className="cdgrn-total-row">
            Item Total: <strong>{itemsTotal.toFixed(2)}</strong>
          </div>
        </div>

        {/* Charges */}
        <div className="cdgrn-card">
          <div className="cdgrn-items-header">
            <button className="cdgrn-toggle-btn" type="button" onClick={() => setShowCharges((prev) => !prev)}>
              {showCharges ? "▲ Hide" : "▼ Show"} Charges &amp; Discount
            </button>
            {showCharges && anyChargesChecked && (
              <button className="cdgrn-del-rows-btn" onClick={handleDeleteCharges}>Delete Selected</button>
            )}
          </div>

          {showCharges && (
            <div className="cdgrn-items-table-wrap">
              <table className="cdgrn-items-table">
                <thead>
                  <tr>
                    <th>Sl No</th>
                    <th>Del</th>
                    <th>Code</th>
                    <th>Description</th>
                    <th>Add / Sub</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {charges.map((row, idx) => (
                    <tr key={idx} className={row._checked ? "cdgrn-row-checked" : ""}>
                      <td className="cdgrn-sno">{row.sNo}</td>
                      <td className="cdgrn-check-cell">
                        <input type="checkbox" checked={!!row._checked} onChange={(e) => handleChargeCheck(idx, e.target.checked)} disabled={!canEdit} />
                      </td>
                      <td>
                        <select className="cdgrn-item-input cdgrn-charge-code" value={row.code} onChange={(e) => selectCharge(idx, e.target.value)} disabled={!canEdit}>
                          <option value="">Select</option>
                          {chargeMaster.map((ch) => (<option key={ch._id} value={ch.code}>{ch.code}</option>))}
                        </select>
                      </td>
                      <td><input className="cdgrn-item-input cdgrn-charge-desc" value={row.description} onChange={(e) => handleChargeChange(idx, "description", e.target.value)} readOnly={!canEdit} /></td>
                      <td>
                        <select className="cdgrn-item-input cdgrn-charge-code" value={row.addOrSubtract} onChange={(e) => handleChargeChange(idx, "addOrSubtract", e.target.value)} disabled={!canEdit}>
                          <option value="">Select</option>
                          <option>Addition</option>
                          <option>Subtraction</option>
                        </select>
                      </td>
                      <td><input type="number" className="cdgrn-item-input cdgrn-item-num" value={row.amount} onChange={(e) => handleChargeChange(idx, "amount", e.target.value)} readOnly={!canEdit} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {showCharges && (
            <div className="cdgrn-insert-bar">
              <input type="number" min="1" max="50" className="cdgrn-insert-count" value={chargeInsertCount} onChange={(e) => setChargeInsertCount(e.target.value)} />
              <button className="cdgrn-insert-btn" onClick={handleInsertCharges} disabled={!canEdit}>Add Row</button>
            </div>
          )}

          <div className="cdgrn-total-row">
            Grand Total: <strong>{grandTotal.toFixed(2)}</strong>
          </div>
        </div>

        {/* Actions */}
        {canEdit && (
          <div className="cdgrn-form-actions">
            <button className="cdgrn-cancel-btn" onClick={() => navigate("/direct-grn")} disabled={loading}>
              Cancel
            </button>

            {/* ── CREATE page: two buttons — Save as Draft + Approve ── */}
            {!isDetail && (
              <>
                <button
                  className="cdgrn-draft-btn"
                  onClick={() => handleSave("Draft")}
                  disabled={loading}
                >
                  {loading ? "Saving…" : "Save as Draft"}
                </button>
                <button
                  className="cdgrn-submit-btn"
                  style={{ background: "#059669" }}
                  onClick={() => {
                    if (!window.confirm("Approve this GRN? This will close the linked IC and set the linked PO to Partial.")) return;
                    handleSave("Approved");
                  }}
                  disabled={loading}
                >
                  {loading ? "Saving…" : "✅ Approve"}
                </button>
              </>
            )}

            {/* ── DETAIL page: Save as Draft + Save Changes (uses current form.status) ── */}
            {isDetail && (
              <>
                <button
                  className="cdgrn-draft-btn"
                  onClick={() => handleSave("Draft")}
                  disabled={loading}
                >
                  {loading ? "Saving…" : "Save as Draft"}
                </button>
                <button
                  className="cdgrn-submit-btn"
                  onClick={() => handleSave(form.status)}
                  disabled={loading}
                >
                  {loading ? "Saving…" : "Save Changes"}
                </button>
              </>
            )}
          </div>
        )}

      </div>{/* end cdgrn-content */}
    </div>
  );
};

export default CreateDirectGRN;

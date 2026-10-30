import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import axios from "axios";
import "./WeighmentDetail.css";
import ModuleNavbar from "../../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../../config";

const WEIGHMENT_API   = `${API_URL}/api/weighment`;
const GIN_API         = `${API_URL}/api/goods-inward-note`;
const PO_API          = `${API_URL}/api/purchase-order`;
const PARTY_API       = `${API_URL}/api/parties`;
const ITEM_MASTER_API = `${API_URL}/api`;

/* ─── helpers ──────────────────────────────────────────────────────────────── */
const blankItem = (sNo) => ({
  sNo,
  itemCode: "", itemName: "", uom: "",
  firstWeight: "", secondWeight: "", netWeight: "",
  remarks: "",
  _checked: false,
});

const hasMainWeight = (data) =>
  !!(data?.firstWeight || data?.secondWeight || data?.netWeight);

const hasAnyItemWeight = (rows) =>
  rows.some((r) => r.firstWeight || r.secondWeight || r.netWeight || r.remarks);

const makeItemsFromSavedData = (data) => {
  const rows =
    Array.isArray(data.items) && data.items.length > 0
      ? data.items.map((it, i) => ({
          sNo: it.sNo || i + 1,
          itemCode:     it.itemCode    || "",
          itemName:     it.itemName    || "",
          uom:          it.uom         || "",
          firstWeight:  it.firstWeight || "",
          secondWeight: it.secondWeight|| "",
          netWeight:    it.netWeight   || "",
          remarks:      it.remarks     || "",
          _checked: false,
        }))
      : Array.from({ length: 4 }, (_, i) => blankItem(i + 1));

  if (hasMainWeight(data) && !hasAnyItemWeight(rows)) {
    rows[0] = {
      ...rows[0],
      sNo: 1,
      firstWeight:  data.firstWeight  || "",
      secondWeight: data.secondWeight || "",
      netWeight:    data.netWeight    || "",
    };
  }

  return rows.map((row, idx) => ({ ...row, sNo: idx + 1 }));
};

/* ════════════════════════════════════════════════════════════════════════════ */
const WeighmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  /* If navigated from Inward/Outward create flow, start in edit mode immediately */
  const fromInwardOutward = !!location.state?.allowEdit && !!location.state?.fromInwardOutward;

  const [form,         setForm]         = useState(null);
  const [items,        setItems]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [insertCount,  setInsertCount]  = useState(1);
  const [activeRowIdx, setActiveRowIdx] = useState(null);
  /* editMode: always true on open; locked statuses are handled per-field via readOnly */
  const [editMode,     setEditMode]     = useState(true);

  /* itemsLocked: the Item Capture (Items table) section starts LOCKED.
     The user must explicitly tap "Unlock to Edit" before item rows become
     editable. This is independent of the header form's editMode. */
  const [itemsLocked,  setItemsLocked]  = useState(true);
  /* Combined flag used for every control inside the Items table */
  const itemsEditable = editMode && !itemsLocked;

  /* ── Item autocomplete ── */
  const [itemSuggestions,  setItemSuggestions]  = useState([]);
  const [activeSugRow,     setActiveSugRow]     = useState(null);
  const [activeSugField,   setActiveSugField]   = useState(null);

  /* \u2500\u2500 Transaction categories \u2500\u2500 */
  const [transactionCategories, setTransactionCategories] = useState([]);

  /* ── Parties — for Party Code / Party Name typeahead ── */
  const [parties, setParties] = useState([]);
  const [showPartySug, setShowPartySug] = useState(false);

  const itemsSectionRef = useRef(null);
  const rawDataRef      = useRef(null);   /* holds original API response for export */

  /* ── load record ── */
  useEffect(() => {
    const load = async () => {
      try {
        const res  = await axios.get(`${WEIGHMENT_API}/${id}`);
        const data = res.data?.data || res.data;

        if (!data) { alert("Record not found"); navigate(-1); return; }

        /* Keep original API data for export — form clears weights for capture UX */
        rawDataRef.current = data;

        setForm({
          ...data,
          firstWeight:   "",
          secondWeight:  "",
          netWeight:     "",
          currentWeight: "",
        });

        const loadedItems = makeItemsFromSavedData(data);
        const pendingIdx  = loadedItems.findIndex(
          (r) => r.firstWeight && !r.secondWeight
        );
        if (pendingIdx !== -1) {
          const pendingRow = loadedItems[pendingIdx];
          loadedItems[pendingIdx] = { ...pendingRow, _checked: true };
          setActiveRowIdx(pendingIdx);
          setForm((prev) => ({
            ...prev,
            firstWeight:   pendingRow.firstWeight,
            secondWeight:  "",
            netWeight:     "",
            currentWeight: "",
          }));
        }
        setItems(loadedItems);
      } catch (err) {
        console.error(err);
        alert("Failed to load weighment record");
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate]);

  /* ── Load transaction categories ── */
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

  /* ── Load parties ── */
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
    const q = `${form?.partyCode || ""} ${form?.partyName || ""}`.trim().toLowerCase();
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

  /* ─── form field change ─────────────────────────────────────────────────── */
  const handleChange = (e) => {
    if (!editMode) return;
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  /* ─── row-locked check ──────────────────────────────────────────────────── */
  const isRowLocked = (row) =>
    !!(row.firstWeight && row.secondWeight && row.netWeight);

  /* ─── checkbox: can only check if PREVIOUS row is complete (has netWeight) ── */
  const canCheckRow = (rowIdx) => {
    if (rowIdx === 0) return true;                        // first row always allowed
    const prev = items[rowIdx - 1];
    return !!(prev.netWeight);                            // previous row must have netWeight
  };

  /* ─── tick/untick a row ─────────────────────────────────────────────────── */
  const handleItemCheck = (rowIdx, checked) => {
    if (!itemsEditable) return;
    const row = items[rowIdx];
    if (checked && isRowLocked(row)) return;
    if (checked && !canCheckRow(rowIdx)) {
      alert(`Please complete row ${rowIdx} (capture Net Weight) before moving to the next row.`);
      return;
    }

    const inheritWeight = row?.secondWeight || row?.firstWeight || "";

    setItems((prev) =>
      prev.map((r, i) => ({ ...r, _checked: i === rowIdx ? checked : false }))
    );

    if (checked) {
      setActiveRowIdx(rowIdx);
      setItems((prev) => {
        const next = [...prev];
        next[rowIdx] = {
          ...next[rowIdx],
          _checked:    true,
          firstWeight: inheritWeight || next[rowIdx].firstWeight,
        };
        return next;
      });
      setForm((prev) => ({
        ...prev,
        firstWeight:   inheritWeight,
        secondWeight:  "",
        netWeight:     "",
        currentWeight: "",
      }));
    } else {
      setActiveRowIdx(null);
    }
  };

  /* ─── capture weight ────────────────────────────────────────────────────── */
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

      const newForm = {
        ...form,
        secondWeight:  String(weight),
        netWeight:     String(net),
        currentWeight: "",
      };
      const newItems = items.map((r, i) =>
        i === activeRowIdx
          ? { ...r, secondWeight: String(weight), netWeight: String(net), _checked: false }
          : r
      );

      setForm(newForm);
      setItems(newItems);
      setActiveRowIdx(null);
      setTimeout(() => {
        itemsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);

      // Net Weight is now determined — save it to the database right away
      // instead of waiting for a manual "Save & Update" click. The Export
      // to Conversion button only appears once status is actually "Saved"
      // in the DB, so this is what makes it show up automatically.
      autoSaveAfterNetWeight(newForm, newItems);
      return;
    }

    alert("First and Second Weight already recorded");
  };

  /* ─── auto-save right after Net Weight is captured ──────────────────────
     Silent on success (no alert, no navigation — just persists and syncs
     form.status so the Export button can appear). Surfaces an alert only
     if the save itself fails, since that's the one case the user needs to
     know about (they'd otherwise assume it saved when it didn't). ────── */
  const [autoSaving, setAutoSaving] = useState(false);
  const autoSaveAfterNetWeight = async (formSnapshot, itemsSnapshot) => {
    setAutoSaving(true);
    try {
      await persistWeighment({ form: formSnapshot, items: itemsSnapshot });
    } catch (err) {
      console.error("Auto-save on Net Weight capture failed:", err);
      alert(
        (err && err.message) ||
        'Net Weight was captured but could not be saved automatically. Please click "Save & Update".'
      );
    } finally {
      setAutoSaving(false);
    }
  };

  /* ─── row focus: auto-inherit previous secondWeight ─────────────────────── */
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

  /* ─── item master autocomplete ──────────────────────────────────────────── */
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
    setItems((prev) => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], itemCode: value, itemName: "", uom: "" };
      return next;
    });
    setActiveSugRow(rowIdx); setActiveSugField("itemCode");
    fetchItemSuggestions(value, "itemCode");
  };

  const handleItemNameChange = (rowIdx, value) => {
    setItems((prev) => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], itemName: value, itemCode: "", uom: "" };
      return next;
    });
    setActiveSugRow(rowIdx); setActiveSugField("itemName");
    fetchItemSuggestions(value, "itemName");
  };

  const selectItemSuggestion = (rowIdx, item) => {
    setItems((prev) => {
      const next = [...prev];
      next[rowIdx] = {
        ...next[rowIdx],
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
        next[rowIdx] = {
          ...next[rowIdx],
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
      const res  = await axios.get(`${ITEM_MASTER_API}/items/search`, {
        params: { itemName: itemName.trim(), status: "Active" },
      });
      const list  = res.data?.data || res.data || [];
      const found = Array.isArray(list)
        ? list.find((it) => it.itemName?.toLowerCase() === itemName.trim().toLowerCase()) || list[0]
        : null;
      if (!found) return;
      setItems((prev) => {
        const next = [...prev];
        next[rowIdx] = {
          ...next[rowIdx],
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

  /* ─── item field change (always editable) ───────────────────────────────── */
  const handleItemChange = (rowIdx, field, value) => {
    if (!itemsEditable) return;
    setItems((prev) => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], [field]: value };
      return next;
    });
  };

  /* ─── manual weight edit (only when Items section is unlocked) ─────────────
     Editing First/Second Weight recomputes Net Weight automatically.
     Editing Net Weight directly overrides the auto-computed value. ─────── */
  const handleWeightFieldChange = (rowIdx, field, value) => {
    if (!itemsEditable) return;
    setItems((prev) => {
      const next = [...prev];
      const row  = { ...next[rowIdx], [field]: value };

      if (field === "firstWeight" || field === "secondWeight") {
        const first  = parseFloat(field === "firstWeight"  ? value : row.firstWeight);
        const second = parseFloat(field === "secondWeight" ? value : row.secondWeight);
        row.netWeight = (!isNaN(first) && !isNaN(second))
          ? String(parseFloat(Math.abs(first - second).toFixed(2)))
          : "";
      }

      next[rowIdx] = row;
      return next;
    });
  };

  /* ─── delete checked rows ────────────────────────────────────────────────── */
  const handleDeleteChecked = () => {
    if (!itemsEditable) return;
    setItems((prev) =>
      prev.filter((r) => !r._checked).map((r, i) => ({ ...r, sNo: i + 1 }))
    );
    setActiveRowIdx(null);
  };

  /* ─── insert rows ────────────────────────────────────────────────────────── */
  const handleInsertRows = () => {
    if (!itemsEditable) return;
    const count = Math.max(1, Math.min(50, Number(insertCount) || 1));
    setItems((prev) => {
      const startSNo = prev.length + 1;
      return [...prev, ...Array.from({ length: count }, (_, i) => blankItem(startSNo + i))];
    });
  };

  const anyChecked = items.some((r) => r._checked);

  /* ─── Export to Item Conversion ─────────────────────────────────────────── */
  const [exportingConversion, setExportingConversion] = useState(false);
  const exportLockRef = useRef(false); // synchronous re-click guard, same reasoning as the PO double-submit fix

  /* Strict check: a row/header only counts once Net Weight itself is
     present — NOT just because firstWeight was captured. Using
     hasMainWeight/hasAnyItemWeight alone was too loose (they're true the
     moment only firstWeight exists), which let Export look available
     before the second weighing had actually happened. */
  const hasDeterminedNetWeight = (rows, mainForm) =>
    rows.some((r) => r.netWeight !== "" && r.netWeight != null) ||
    (mainForm?.netWeight !== "" && mainForm?.netWeight != null);

  const handleExportToConversion = () => {
    if (!form || exportLockRef.current) return;

    exportLockRef.current = true;
    setExportingConversion(true);
    try {
      const raw = rawDataRef.current || {};
      const rawNetWeight = raw.netWeight
        || items.reduce((sum, r) => sum + (parseFloat(r.netWeight) || 0), 0) || "";

      const exportItems = items
        .filter((r) => r.itemCode || r.itemName)
        .map((it, i) => ({
          sNo: i + 1,
          itemCode: it.itemCode || "",
          itemName: it.itemName || "",
          uom: it.uom || "MT",
          netWeight: it.netWeight || "",
          qty: it.netWeight || "",
        }));

      const wtData = {
        weighmentId: id,
        weighmentNo: raw.weighmentNo || form.weighmentNo || "",
        vehicleNo: raw.vehicleNo || form.vehicleNo || "",
        partyName: raw.partyName || form.partyName || raw.vendorName || "",
        partyCode: raw.partyCode || form.partyCode || "",
        poNo: raw.poCpoNo || form.poCpoNo || "",
        transactionCategory: raw.transactionCategory || form.transactionCategory || "",
        netWeight: String(rawNetWeight),
        items: exportItems,
      };

      navigate("/create-item-conversion", { state: { fromWeighment: wtData } });
    } finally {
      exportLockRef.current = false;
      setExportingConversion(false);
    }
  };

  /* ─── shared persistence logic ──────────────────────────────────────────
     Used by BOTH "Save & Update" and "Export to Conversion". Persists the
     current form + item weights to the database and returns the saved
     record on success, or throws on failure. It also keeps local
     form.status in sync with what was actually just saved (previously
     form.status was never updated after a save, so the Export button's
     "must be Saved" check could never pass without a full page reload).

     Accepts an optional { form, items } snapshot — needed when calling
     this right after setForm/setItems in the same synchronous handler
     (e.g. auto-save on Net Weight capture), since `form`/`items` from the
     component's closure won't reflect those updates until the next
     render. ──────────────────────────────────────────────────────────── */
  const persistWeighment = async (snapshot = {}) => {
    const formSrc  = snapshot.form  || form;
    const itemsSrc = snapshot.items || items;

    if (!formSrc.vehicleNo?.trim()) { alert("Vehicle Number is required"); return null; }

    const { currentWeight, ...mainForm } = formSrc;
    const cleanItems = itemsSrc
      .filter((r) => {
        const { sNo, _checked, ...rest } = r;
        return Object.values(rest).some((v) => v !== "");
      })
      .map(({ _checked, ...r }) => r);

    /* ── Preserve header-level weight fields ───────────────────────────────
       On load, form.firstWeight/secondWeight/netWeight are intentionally
       blanked out for the "capture" UX, and are only restored from the
       items grid when a row is still IN PROGRESS (first weight only, no
       second weight yet). Once a row is fully weighed (Saved), nothing
       repopulates these header fields — so without this fallback, saving
       again here (e.g. just to edit a remark) would $set them to "" and
       silently wipe the already-recorded weights from the database.
       Fall back to: a completed item row's weights, then whatever the
       record originally had when it was loaded — never blindly send "". */
    const original     = rawDataRef.current || {};
    const weighedItem  = cleanItems.find((r) => r.firstWeight && r.secondWeight) || {};
    mainForm.firstWeight  = mainForm.firstWeight  || weighedItem.firstWeight  || original.firstWeight  || "";
    mainForm.secondWeight = mainForm.secondWeight || weighedItem.secondWeight || original.secondWeight || "";
    mainForm.netWeight    = mainForm.netWeight    || weighedItem.netWeight    || original.netWeight    || "";

    /* ── Determine weighment status from captured weights ─────────────────
       WeighmentDetail also clears header firstWeight/secondWeight on load
       (for the capture UX). Weights live in items rows.
       Check items FIRST, then fall back to header fields.

       Draft = at least one row has firstWeight but not secondWeight
       Saved = at least one row has BOTH firstWeight AND secondWeight
    ──────────────────────────────────────────────────────────────────────── */
    const itemBothWeights = cleanItems.some((r) => r.firstWeight && r.secondWeight);
    const itemFirstOnly   = !itemBothWeights && cleanItems.some((r) => r.firstWeight && !r.secondWeight);

    const headerBoth  = !itemBothWeights && !!(mainForm.firstWeight && mainForm.secondWeight);
    const headerFirst = !headerBoth && !itemBothWeights && !itemFirstOnly
                        && !!(mainForm.firstWeight && !mainForm.secondWeight);

    const isSaved = itemBothWeights || headerBoth
                    /* also honour manual status selection */
                    || mainForm.status === "Saved";
    const isDraft = !isSaved && (itemFirstOnly || headerFirst
                    || mainForm.status === "Draft");

    // Determine new status
    let weighmentStatus = mainForm.status || "Open";
    if (isSaved) weighmentStatus = "Saved";
    else if (isDraft) weighmentStatus = "Draft";

    const payload = {
      ...mainForm,
      status: weighmentStatus,
      items:  cleanItems,
    };

    const res = await axios.put(`${WEIGHMENT_API}/${id}`, payload);

    if (!res.data.success) {
      throw new Error(res.data.message || "Update failed");
    }

    const savedWeighment = res.data.data;

    // Sync local state with what's now actually persisted, so subsequent
    // checks (like the Export button's enabled state) reflect reality
    // instead of the status the record had when the page first loaded.
    setForm((prev) => ({ ...prev, status: weighmentStatus }));
    rawDataRef.current = { ...(rawDataRef.current || {}), ...savedWeighment };

    const ginNo = savedWeighment?.inwardOutwardNoteNo || payload.inwardOutwardNoteNo;

    /* ── Step 4 — When 2nd weight added to a Draft weighment (→ Saved),
       update linked GIN → Vout.
       Step 3 — When 1st weight added (→ Draft), GIN → Convert, PO → Convert.
       General weighments (no ginNo) skip this entirely.
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
          const ginNewStatus = isSaved ? "Vout" : "Convert";

          if (linkedGIN.status !== ginNewStatus && linkedGIN.status !== "Closed") {
            await axios.put(`${GIN_API}/${linkedGIN._id}`, {
              ...linkedGIN,
              status: ginNewStatus,
            });
          }

          /* PO → Convert only when moving to Draft (1st weight) */
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

    return savedWeighment;
  };

  /* ─── save ───────────────────────────────────────────────────────────────── */
  const handleSave = async () => {
    if (!form.vehicleNo?.trim()) { alert("Vehicle Number is required"); return; }
    setSaving(true);
    try {
      const saved = await persistWeighment();
      if (saved) {
        alert("Weighment Updated Successfully");
        navigate("/weighment-search");
      }
    } catch (err) {
      console.error(err);
      alert(err.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  /* ══════════════════════════════════════════════════════════════════════════ */
  if (loading) {
    return (
      <div className="wd-page">
        <ModuleNavbar />
        <div className="wd-loading">Loading weighment record...</div>
      </div>
    );
  }

  if (!form) return null;

  const typeClass        = (form.transactionType || "").toLowerCase();
  const weightDisabled   = !!form.firstWeight && !!form.secondWeight;
  const weightButtonText = !form.firstWeight
    ? "Get Weight (→ 1st)"
    : !form.secondWeight
    ? "Get Weight (→ 2nd)"
    : "Completed";
  const weightHint = !form.firstWeight
    ? " — will set First Weight"
    : !form.secondWeight
    ? " — will set Second Weight"
    : " — completed";

  return (
    <div className="wd-page">
      <style>{`
        /* ── Status badge colours for system-driven statuses ── */
        .wd-status-badge.draft   { background: #e0f2fe; color: #0369a1; }
        .wd-status-badge.saved   { background: #d1fae5; color: #065f46; }
        .wd-status-badge.convert { background: #ede9fe; color: #6d28d9; }
        .wd-status-badge.open    { background: #dbeafe; color: #1d4ed8; }
        .wd-status-badge.closed  { background: #f1f5f9; color: #475569; }

        /* Locked row (complete weights): only greys out weight inputs while the
           Items section itself is locked. Once the section is unlocked via the
           "Unlock to Edit" button, weight inputs stay fully editable even on
           rows that already have all three weights captured. */
        .wd-row-locked { background: #f8fafc !important; }
        .wd-items-locked .wd-row-locked .wd-wt-input,
        .wd-items-locked .wd-row-locked .wd-net-input {
          background: #e2e8f0 !important;
          color: #94a3b8 !important;
          cursor: not-allowed !important;
          pointer-events: none;
        }
        .wd-row-locked .wd-item-input:not(.wd-wt-input):not(.wd-net-input) {
          background: #fff !important;
          color: #111827 !important;
          cursor: text !important;
          pointer-events: auto !important;
          opacity: 1 !important;
        }
        /* Lock icon */
        .wd-lock-icon { margin-left: 4px; font-size: 11px; }
        /* Always-editable note strip */
        .wd-items-always-note {
          font-size: 11px;
          color: #4f46e5;
          background: #eef2ff;
          border: 1px solid #c7d2fe;
          border-radius: 5px;
          padding: 5px 12px;
          margin-bottom: 8px;
        }
      `}</style>
      <ModuleNavbar />

      {/* ── PAGE HEADER — styled like InwardOutwardNote page ── */}
      <div className="gin-search-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="create-btn" style={{ background: "#2563eb" }} onClick={() => navigate(-1)}>← Back</button>
          <div>
            <h2 style={{ fontSize: 18, color: "#1e293b", fontWeight: 700, margin: 0 }}>Weighment Detail</h2>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#6366f1" }}>{form.weighmentNo || "-"}</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span className={`wd-type-badge ${typeClass}`}>{form.transactionType || "-"}</span>
          <span className={`wd-status-badge ${(form.status || "").toLowerCase()}`}>
            {form.status || "Open"}
          </span>
        </div>
      </div>

      {/* ── GIN REFERENCE (always read-only) ── */}
      <div className="wd-card">
        <div className="wd-section-title">Inward/Outward Note Reference</div>
        <div className="wd-ref-grid">
          {[
            ["Inward/Outward Note No",     form.inwardOutwardNoteNo, true],
            ["PO/CPO No",         form.poCpoNo],
            ["Challan Date",      form.challanDate],
            ["E-Way Date",        form.ewayDate],
          ].map(([label, value, highlight]) => (
            <div className="wd-ref-field" key={label}>
              <span className="wd-ref-label">{label}</span>
              <span className={`wd-ref-value${highlight ? " wd-ref-highlight" : ""}`}>
                {value || "-"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── WEIGHMENT INFORMATION ── */}
      <div className="wd-card">
        <div className="wd-section-title">Weighment Information</div>

        <div className="wd-form-grid">
          <div className="wd-field">
            <label>Weighment No</label>
            <input name="weighmentNo" value={form.weighmentNo || ""} onChange={handleChange}
              readOnly={!editMode} className={!editMode ? "wd-readonly" : ""} />
          </div>

          <div className="wd-field">
            <label>Transaction Category *</label>
            {editMode ? (
              <select name="transactionCategory" value={form.transactionCategory || ""} onChange={handleChange}>
                <option value="">Select</option>
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
            ) : (
              <input value={form.transactionCategory || "-"} readOnly className="wd-readonly" />
            )}
          </div>

          <div className="wd-field">
            <label>Status</label>
            {editMode ? (
              /* All statuses are manually selectable in edit mode.
                 System auto-sets Draft/Saved/Convert on weight capture,
                 but the user can override here if needed. */
              <select name="status" value={form.status || "Open"} onChange={handleChange}>
                <option value="Open">Open</option>
                <option value="Draft">Draft</option>
                <option value="Saved">Saved</option>
                <option value="Convert">Convert</option>
                <option value="Closed">Closed</option>
              </select>
            ) : (
              <input value={form.status || "Open"} readOnly className="wd-readonly" />
            )}
          </div>

          <div className="wd-field">
            <label>Transaction Type</label>
            <input value={form.transactionType || ""} readOnly className="wd-readonly" />
          </div>

          <div className="wd-field">
            <label>Inward/Outward Note No</label>
            <input name="inwardOutwardNoteNo" value={form.inwardOutwardNoteNo || ""}
              onChange={handleChange} readOnly={!editMode} className={!editMode ? "wd-readonly" : ""} />
          </div>

          <div className="wd-field">
            <label>Vehicle No *</label>
            <input name="vehicleNo" value={form.vehicleNo || ""}
              onChange={handleChange} readOnly={!editMode} className={!editMode ? "wd-readonly" : ""} />
          </div>

          <div className="wd-field">
            <label>Party Code</label>
            <input
              name="partyCode"
              value={form.partyCode || ""}
              readOnly
              className="wd-readonly"
              placeholder="Auto-filled"
              title="Party Code is auto-filled — set it via Party Name or the linked Inward/Outward record"
            />
          </div>

          <div className="wd-field" style={{ position: "relative" }}>
            <label>Party Name</label>
            <input name="partyName" value={form.partyName || ""}
              onChange={(e) => { handleChange(e); setShowPartySug(true); }}
              onFocus={() => setShowPartySug(true)}
              onBlur={() => setTimeout(() => setShowPartySug(false), 150)}
              readOnly={!editMode} className={!editMode ? "wd-readonly" : ""} autoComplete="off" />
            {editMode && showPartySug && partySuggestions.length > 0 && (
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

          <div className="wd-field">
            <label>Transporter Name</label>
            <input name="transporterName" value={form.transporterName || ""}
              onChange={handleChange} readOnly={!editMode} className={!editMode ? "wd-readonly" : ""} />
          </div>

          <div className="wd-field">
            <label>Site</label>
            <input name="site" value={form.site || ""}
              onChange={handleChange} readOnly={!editMode} className={!editMode ? "wd-readonly" : ""} />
          </div>

          {/* <div className="wd-field">
            <label>Weighment Date</label>
            <input type="date" name="weighmentDate" value={form.weighmentDate || ""}
              onChange={handleChange} readOnly={!editMode} className={!editMode ? "wd-readonly" : ""} />
          </div> */}

          <div className="wd-field">
            <label>Weighment In Date</label>
            <input type="date" name="weighmentInDate" value={form.weighmentInDate || ""}
              onChange={handleChange} readOnly={!editMode} className={!editMode ? "wd-readonly" : ""} />
          </div>

          <div className="wd-field">
            <label>Weighment In Time</label>
            <input type="time" name="weighmentInTime" value={form.weighmentInTime || ""}
              onChange={handleChange} readOnly={!editMode} className={!editMode ? "wd-readonly" : ""} />
          </div>

          <div className="wd-field">
            <label>Weighment Out Date</label>
            <input type="date" name="weighmentOutDate" value={form.weighmentOutDate || ""}
              onChange={handleChange} readOnly={!editMode} className={!editMode ? "wd-readonly" : ""} />
          </div>

          <div className="wd-field">
            <label>Weighment Out Time</label>
            <input type="time" name="weighmentOutTime" value={form.weighmentOutTime || ""}
              onChange={handleChange} readOnly={!editMode} className={!editMode ? "wd-readonly" : ""} />
          </div>

          <div className="wd-field">
            <label>Supplier Invoice No</label>
            <input name="supplierInvoiceNo" value={form.supplierInvoiceNo || ""}
              onChange={handleChange} readOnly={!editMode} className={!editMode ? "wd-readonly" : ""} />
          </div>

          <div className="wd-field">
            <label>Supplier Invoice Date</label>
            <input type="date" name="supplierInvoiceDate" value={form.supplierInvoiceDate || ""}
              onChange={handleChange} readOnly={!editMode} className={!editMode ? "wd-readonly" : ""} />
          </div>

          <div className="wd-field">
            <label>Total Dispatch Weight</label>
            <input name="totalDispatchWeight" value={form.totalDispatchWeight || ""}
              onChange={handleChange} readOnly={!editMode} className={!editMode ? "wd-readonly" : ""} />
          </div>

          <div className="wd-field">
            <label>Transit Date</label>
            <input type="date" name="transitDate" value={form.transitDate || ""}
              onChange={handleChange} readOnly={!editMode} className={!editMode ? "wd-readonly" : ""} />
          </div>
        </div>

        {/* Remarks */}
        <div className="wd-textarea-row">
          <div className="wd-field">
            <label>Remarks</label>
            <textarea rows="3" name="remarks" value={form.remarks || ""}
              onChange={handleChange} readOnly={!editMode}
              className={!editMode ? "wd-readonly" : ""} />
          </div>
        </div>

        {/* Bulk Weigh */}
        <div className="wd-checkbox-row">
          <label className="wd-checkbox-label">
            <input type="checkbox" name="bulkWeigh" checked={!!form.bulkWeigh}
              onChange={handleChange} disabled={!editMode} />
            Bulk Weigh
          </label>
        </div>
      </div>

      {/* ── WEIGHT CAPTURE — own card, always interactive (matches create page) ── */}
      <div className="wd-card">
        <div className="wd-section-title">⚖️ Weight Capture</div>

        <div className="wd-weight-strip">
          <div className="wd-weight-box">
            <label>First Weight</label>
            <input value={form.firstWeight || ""} readOnly
              className="wd-weight-yellow" placeholder="—" />
          </div>

          <div className="wd-weight-box">
            <label>Second Weight</label>
            <input value={form.secondWeight || ""} readOnly
              className="wd-weight-yellow" placeholder="—" />
          </div>

          <div className="wd-weight-box">
            <label>Net Weight</label>
            <input
              value={form.netWeight !== "" && form.netWeight != null
                ? parseFloat(parseFloat(form.netWeight).toFixed(2))
                : ""}
              readOnly className="wd-weight-green" placeholder="—" />
          </div>

          <div className="wd-weight-box wd-weight-get-box">
            <label>
              Weight (In MT)
              <span className="wd-wt-hint">{weightHint}</span>
            </label>
            <div className="wd-weight-action">
              <input
                type="number"
                step="0.001"
                name="currentWeight"
                value={form.currentWeight || ""}
                onChange={(e) => { if (!editMode) return; setForm((prev) => ({ ...prev, currentWeight: e.target.value })); }}
                placeholder={activeRowIdx === null ? "Tick a row first…" : "Enter value"}
                disabled={!editMode || weightDisabled || activeRowIdx === null}
              />
              <button
                type="button"
                onClick={getWeight}
                disabled={!editMode || weightDisabled || activeRowIdx === null}
              >
                {activeRowIdx === null ? "Tick a row first" : weightButtonText}
              </button>
            </div>
          </div>
        </div>

        {editMode && activeRowIdx === null && !weightDisabled && (
          <div className="wd-no-row-hint">
            ⚠️ Please tick a row in the Items table below before entering weight.
          </div>
        )}
        {activeRowIdx !== null && (
          <div className="wd-active-row-hint">
            ✏️ Row {activeRowIdx + 1} selected — enter weight above and click Get Weight
          </div>
        )}
      </div>

      {/* ── ITEMS TABLE — locked by default, unlock to edit ── */}
      <div className="wd-card" ref={itemsSectionRef}>
        <div className="wd-items-section">
          <div
            className="wd-items-always-note"
            style={itemsLocked
              ? { background: "#fef3c7", color: "#92400e", border: "1px solid #f59e0b" }
              : {}}
          >
            {itemsLocked
              ? "🔒 Item Capture is locked. Tap “Unlock to Edit” to modify items and weights."
              : "✏️ Item Capture unlocked — items and weights (First/Second/Net) are now editable. Lock again when done."}
          </div>
          <div className="wd-items-header">
            <span className="wd-items-title">📦 Items</span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {activeRowIdx !== null && (
                <span className="wd-active-badge">Row {activeRowIdx + 1} active</span>
              )}
              {anyChecked && (
                <button className="wd-del-rows-btn" onClick={handleDeleteChecked} disabled={!itemsEditable} style={!itemsEditable ? {opacity:0.4,cursor:"not-allowed"} : {}}>
                  🗑 Delete Selected
                </button>
              )}
              <button
                type="button"
                onClick={() => setItemsLocked((prev) => !prev)}
                disabled={!editMode}
                title={itemsLocked ? "Unlock the Items section to edit" : "Lock the Items section"}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  height: 32, padding: "0 12px",
                  background: itemsLocked ? "#2563eb" : "#6b7280",
                  color: "#fff", border: "none", borderRadius: 6,
                  fontSize: 12.5, fontWeight: 700,
                  cursor: !editMode ? "not-allowed" : "pointer",
                  opacity: !editMode ? 0.5 : 1,
                }}
              >
                {itemsLocked ? "🔓 Unlock to Edit" : "🔒 Lock"}
              </button>
            </div>
          </div>

          <div className={`wd-items-table-wrap ${itemsLocked ? "wd-items-locked" : ""}`}>
            <table className="wd-items-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}></th>
                  <th style={{ width: 44 }}>Sl No</th>
                  <th style={{ width: 110 }}>Item Code</th>
                  <th style={{ minWidth: 160 }}>Item Name</th>
                  <th style={{ width: 70 }}>UOM</th>
                  <th style={{ width: 120 }}>First Weight</th>
                  <th style={{ width: 120 }}>Second Weight</th>
                  <th style={{ width: 120 }}>Net Weight</th>
                  <th style={{ minWidth: 140 }}>Remarks</th>
                </tr>
              </thead>

              <tbody>
                {items.map((row, idx) => {
                  const isActive  = activeRowIdx === idx;
                  const hasFirst  = !!row.firstWeight;
                  const hasSecond = !!row.secondWeight;
                  const hasNet    = !!row.netWeight;
                  const locked    = isRowLocked(row);
                  /* Row is blocked if the previous row doesn't have netWeight yet */
                  const blocked   = idx > 0 && !items[idx - 1].netWeight;

                  return (
                    <tr
                      key={idx}
                      className={[
                        row._checked ? "wd-row-checked" : "",
                        isActive     ? "wd-row-active"  : "",
                        locked       ? "wd-row-locked"  : "",
                      ].filter(Boolean).join(" ")}
                      onFocus={() => !locked && handleRowFocus(idx)}
                    >
                      {/* Tick checkbox */}
                      <td className="wd-check-cell" style={blocked ? { opacity: 0.4 } : {}}>
                        <input
                          type="checkbox"
                          checked={!!row._checked}
                          onChange={(e) => handleItemCheck(idx, e.target.checked)}
                          disabled={!itemsEditable || locked || blocked}
                          title={
                            locked  ? "Row complete — cannot re-weigh" :
                            blocked ? `Complete row ${idx} first (Net Weight required)` :
                            "Tick to capture weight for this row"
                          }
                        />
                      </td>

                      <td className="wd-sno">
                        {row.sNo}
                        {locked && <span className="wd-lock-icon" title="Row weights complete">🔒</span>}
                        {blocked && !locked && (
                          <span style={{ marginLeft: 3, fontSize: 10, color: "#f59e0b" }} title="Tick previous row first to capture weight">⚠</span>
                        )}
                      </td>

                      {/* Item Code — with autocomplete */}
                      <td className="wd-item-code-cell">
                        <input
                          className="wd-item-input"
                          value={row.itemCode}
                          onChange={(e) => itemsEditable && handleItemCodeChange(idx, e.target.value)}
                          onBlur={() => itemsEditable && setTimeout(() => fetchItemDetailsByCode(idx, row.itemCode), 200)}
                          readOnly={!itemsEditable}
                          placeholder={!itemsEditable ? row.itemCode || '—' : 'Code'}
                        />
                        {activeSugRow === idx && activeSugField === "itemCode" && itemSuggestions.length > 0 && (
                          <ul className="wd-item-suggestions">
                            {itemSuggestions.map((s, si) => (
                              <li key={si} onMouseDown={() => selectItemSuggestion(idx, s)}>
                                <strong>{s.itemCode || s.code}</strong> — {s.itemName || s.name}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>

                      {/* Item Name — with autocomplete */}
                      <td className="wd-item-code-cell">
                        <input
                          className="wd-item-input"
                          value={row.itemName}
                          onChange={(e) => itemsEditable && handleItemNameChange(idx, e.target.value)}
                          onBlur={() => itemsEditable && setTimeout(() => fetchItemDetailsByName(idx, row.itemName), 200)}
                          readOnly={!itemsEditable}
                          placeholder={!itemsEditable ? row.itemName || '—' : 'Item name'}
                        />
                        {activeSugRow === idx && activeSugField === "itemName" && itemSuggestions.length > 0 && (
                          <ul className="wd-item-suggestions">
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
                        <input
                          className="wd-item-input wd-uom-input"
                          value={row.uom}
                          onChange={(e) => itemsEditable && handleItemChange(idx, "uom", e.target.value)}
                          readOnly={!itemsEditable}
                          placeholder="UOM"
                        />
                      </td>

                      {/* First Weight — auto-filled; editable once unlocked */}
                      <td>
                        <input
                          className={`wd-item-input wd-wt-input ${hasFirst ? "wd-wt-filled" : ""}`}
                          value={row.firstWeight}
                          onChange={(e) => handleWeightFieldChange(idx, "firstWeight", e.target.value)}
                          readOnly={!itemsEditable}
                          placeholder="← auto"
                          inputMode="decimal"
                        />
                      </td>

                      {/* Second Weight — auto-filled; editable once unlocked */}
                      <td>
                        <input
                          className={`wd-item-input wd-wt-input ${hasSecond ? "wd-wt-filled" : ""}`}
                          value={row.secondWeight}
                          onChange={(e) => handleWeightFieldChange(idx, "secondWeight", e.target.value)}
                          readOnly={!itemsEditable}
                          placeholder="—"
                          inputMode="decimal"
                        />
                      </td>

                      {/* Net Weight — auto-computed; editable once unlocked (manual override) */}
                      <td>
                        <input
                          className={`wd-item-input wd-net-input ${hasNet ? "wd-net-filled" : ""}`}
                          value={row.netWeight !== "" && row.netWeight != null
                            ? (itemsEditable ? row.netWeight : parseFloat(parseFloat(row.netWeight).toFixed(2)))
                            : ""}
                          onChange={(e) => handleWeightFieldChange(idx, "netWeight", e.target.value)}
                          readOnly={!itemsEditable}
                          placeholder="—"
                          inputMode="decimal"
                        />
                      </td>

                      {/* Remarks — always directly editable */}
                      <td>
                        <input
                          className="wd-item-input wd-rem-input"
                          value={row.remarks}
                          onChange={(e) => itemsEditable && handleItemChange(idx, "remarks", e.target.value)}
                          readOnly={!itemsEditable}
                          placeholder="Remarks"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Insert bar */}
          <div className="wd-insert-bar">
            <span className="wd-insert-label">Rows to add:</span>
            <input
              type="number"
              min="1"
              max="50"
              className="wd-insert-count"
              value={insertCount}
              onChange={(e) => setInsertCount(e.target.value)}
            />
            <button className="wd-insert-btn" onClick={handleInsertRows} disabled={!itemsEditable} style={!itemsEditable ? {opacity:0.4,cursor:"not-allowed"} : {}}>
              + Insert Row
            </button>
          </div>
        </div>
      </div>

      {/* ── ACTIONS ── */}
      <div className="wd-actions">
        <button className="wd-cancel-btn" onClick={() => navigate(-1)} disabled={saving || exportingConversion || autoSaving}>
          Cancel
        </button>

        {/* Export to Item Conversion — only rendered at all once BOTH:
            an actual determined Net Weight exists (not just firstWeight)
            AND the record's status is already "Saved" in the database.
            Status flips to "Saved" automatically right after Net Weight
            is captured (see autoSaveAfterNetWeight) — no manual Save click
            needed. Until both are true, the button doesn't appear at all. */}
        {(() => {
          const isSavedStatus  = (form.status || "").toLowerCase() === "saved";
          const netWeightReady = hasDeterminedNetWeight(items, form);
          const canExport      = isSavedStatus && netWeightReady;

          if (!canExport) return null;

          const btnDisabled = exportingConversion || saving || autoSaving;
          return (
            <button
              onClick={handleExportToConversion}
              disabled={btnDisabled}
              title="Export this weighment to Item Conversion"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                height: 38, padding: "0 16px",
                background: btnDisabled ? "#d1d5db" : "#7c3aed",
                color: btnDisabled ? "#9ca3af" : "#fff",
                border: btnDisabled ? "1.5px solid #e5e7eb" : "none",
                borderRadius: 7,
                fontSize: 13, fontWeight: 700,
                cursor: btnDisabled ? "not-allowed" : "pointer",
                boxShadow: btnDisabled ? "none" : "0 2px 6px rgba(124,58,237,0.25)",
                transition: "background 0.2s, transform 0.15s",
                whiteSpace: "nowrap",
                opacity: btnDisabled ? 0.65 : 1,
              }}
              onMouseEnter={(e) => { if (!btnDisabled) e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
            >
              {exportingConversion ? "Opening…" : "🔄 Export to Conversion"}
            </button>
          );
        })()}

        <button className="wd-save-btn" onClick={handleSave} disabled={saving || exportingConversion || autoSaving}>
          {saving ? "Saving..." : autoSaving ? "Saving Net Weight…" : "Save & Update"}
        </button>
      </div>
    </div>
  );
};
      
export default WeighmentDetail;
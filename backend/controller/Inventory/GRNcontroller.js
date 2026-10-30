exports.createGRN = async (req, res) => {
  try {
    const grn = await GRNModel.create(req.body);
    try {
      await appendRowToSheet("GRN", {
        "GRN No": grn.grnNo,
        "GRN Date": grn.grnDate,
        "PO No": grn.poNo,
        "Vehicle No": grn.vehicleNo,
        "Party Name": grn.partyName,
        "Party Code": grn.partyCode,
        "Item Code": grn.itemCode,
        "Item Name": grn.itemName,
        "Item Type": grn.itemType,
        "Base UOM": grn.baseUOM,
        "Base Qty": grn.baseQty,
        "Actual UOM": grn.actualUOM,
        "Actual Qty": grn.actualQty,
        "Rate": grn.rate,
        "Total Amount": grn.totalAmount,
        "Status": grn.status,
        "Remarks": grn.remarks,
      });
    } catch (e) { console.error("Sheet sync failed (GRN):", e.message); }
    res.status(201).json(grn);
  } catch (err) { res.status(500).json({ error: err.message }); }
};
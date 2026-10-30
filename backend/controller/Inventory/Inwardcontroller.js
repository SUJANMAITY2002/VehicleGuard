exports.createInward = async (req, res) => {
  try {
    const inward = await InwardModel.create(req.body);
    try {
      await appendRowToSheet("Inward", {
        "Inward No": inward.inwardNo,
        "Date": inward.date,
        "PO No": inward.poNo,
        "Vehicle No": inward.vehicleNo,
        "Party Name": inward.partyName,
        "Party Code": inward.partyCode,
        "Item Code": inward.itemCode,
        "Item Name": inward.itemName,
        "UOM": inward.uom,
        "Qty Received": inward.qtyReceived,
        "Gross Wt": inward.grossWt,
        "Tare Wt": inward.tareWt,
        "Net Wt": inward.netWt,
        "Remarks": inward.remarks,
      });
    } catch (e) { console.error("Sheet sync failed (Inward):", e.message); }
    res.status(201).json(inward);
  } catch (err) { res.status(500).json({ error: err.message }); }
};
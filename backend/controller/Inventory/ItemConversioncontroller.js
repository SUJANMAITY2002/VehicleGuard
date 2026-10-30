exports.createItemConversion = async (req, res) => {
  try {
    const ic = await ItemConversionModel.create(req.body);
    try {
      await appendRowToSheet("Item Conversion", {
        "IC No": ic.icNo,
        "Conversion Date": ic.conversionDate,
        "PO No": ic.poNo,
        "Vehicle No": ic.vehicleNo,
        "Party Name": ic.partyName,
        "Party Code": ic.partyCode,
        "Item Name": ic.itemName,
        "Item Code": ic.itemCode,
        "UOM": ic.uom,
        "CQty (Base Qty)": ic.baseQty,
        "RQty (Converted Qty)": ic.convertedQty,
        "Remarks": ic.remarks,
      });
    } catch (e) { console.error("Sheet sync failed (Item Conversion):", e.message); }
    res.status(201).json(ic);
  } catch (err) { res.status(500).json({ error: err.message }); }
};
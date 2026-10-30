const { appendRowToSheet } = require("../../utils/googleSheets");

exports.createPO = async (req, res) => {
  try {
    const po = await POModel.create(req.body);
    try {
      await appendRowToSheet("PO", {
        "PO No": po.poNo,
        "PO Date": po.poDate,
        "Party/Supplier Name": po.partyName,
        "Party Code": po.partyCode,
        "Item Code": po.itemCode,
        "Item Name": po.itemName,
        "UOM": po.uom,
        "Ordered Qty": po.orderedQty,
        "Rate": po.rate,
        "Amount": po.amount,
        "Delivery Date": po.deliveryDate,
        "Status": po.status,
        "Remarks": po.remarks,
      });
    } catch (e) { console.error("Sheet sync failed (PO):", e.message); }
    res.status(201).json(po);
  } catch (err) { res.status(500).json({ error: err.message }); }
};
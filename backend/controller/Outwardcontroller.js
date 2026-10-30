// exports.createOutward = async (req, res) => {
//   try {
//     const outward = await OutwardModel.create(req.body);
//     try {
//       await appendRowToSheet("Outward", {
//         "Outward No": outward.outwardNo,
//         "Date": outward.date,
//         "Vehicle No": outward.vehicleNo,
//         "Party Name": outward.partyName,
//         "Party Code": outward.partyCode,
//         "Item Code": outward.itemCode,
//         "Item Name": outward.itemName,
//         "UOM": outward.uom,
//         "Qty Dispatched": outward.qtyDispatched,
//         "Gross Wt": outward.grossWt,
//         "Tare Wt": outward.tareWt,
//         "Net Wt": outward.netWt,
//         "Remarks": outward.remarks,
//       });
//     } catch (e) { console.error("Sheet sync failed (Outward):", e.message); }
//     res.status(201).json(outward);
//   } catch (err) { res.status(500).json({ error: err.message }); }
// };
exports.createWeightment = async (req, res) => {
  try {
    const wt = await WeightmentModel.create(req.body);
    try {
      await appendRowToSheet("Weightment", {
        "Slip No": wt.slipNo,
        "Date": wt.date,
        "Vehicle No": wt.vehicleNo,
        "Party Name": wt.partyName,
        "Item Name": wt.itemName,
        "Gross Wt (kg)": wt.grossWt,
        "Tare Wt (kg)": wt.tareWt,
        "Net Wt (kg)": wt.netWt,
        "Weighed By": wt.weighedBy,
        "Remarks": wt.remarks,
      });
    } catch (e) { console.error("Sheet sync failed (Weightment):", e.message); }
    res.status(201).json(wt);
  } catch (err) { res.status(500).json({ error: err.message }); }
};
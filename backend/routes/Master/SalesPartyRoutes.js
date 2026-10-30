const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const SalesParty = require("../../models/Master/SalesParty");
const {
  syncRowsForDoc,
  deleteDocFromSheet,
} = require("../../utils/googleSheets");

/* -------------------------------------------------------------------------- */
/*                            GOOGLE SHEETS CONFIG                            */
/* -------------------------------------------------------------------------- */

const SALES_PARTY_TAB = "Sales Party Master";

const SALES_PARTY_HEADERS = [
  "DB ID",
  "Party Code",
  "Party Name",
  "Location",
  "City",
  "District",
  "State",
  "Pin Code",
  "Status",
];

function salesPartyToRows(party) {
  const p = party.toObject ? party.toObject() : party;

  return [[
    String(p._id),
    p.partyCode || "",
    p.partyName || "",
    p.location || "",
    p.city || "",
    p.district || "",
    p.state || "",
    p.pinCode || "",
    p.status || "",
  ]];
}

/* -------------------------------------------------------------------------- */
/*                               HELPER METHODS                               */
/* -------------------------------------------------------------------------- */

const firstValue = (...values) =>
  values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      value.toString().trim() !== ""
  ) || "";

const normalizeSalesPartyPayload = (body) => ({
  ...body,
  pinCode: firstValue(
    body.pinCode,
    body.pin,
    body.pincode,
    body["Pin Code"],
    body["PIN"],
    body["Pin"]
  ),
});

const buildSalesPartyDocument = (body) => {
  const payload = normalizeSalesPartyPayload(body);

  return {
    partyCode: payload.partyCode?.toString().trim() || "",
    partyName: payload.partyName?.toString().trim() || "",
    location: payload.location?.toString().trim() || "",
    city: payload.city?.toString().trim() || "",
    district: payload.district?.toString().trim() || "",
    state: payload.state?.toString().trim() || "",
    pinCode: payload.pinCode?.toString().trim() || "",
    status: payload.status?.toString().trim() || "Active",
  };
};

const normalizeSalesPartyResponse = (party) => {
  const data = party.toObject ? party.toObject() : party;

  return {
    ...data,
    pinCode: firstValue(
      data.pinCode,
      data.pin,
      data.pincode,
      data["Pin Code"],
      data["PIN"],
      data["Pin"]
    ),
  };
};

/* -------------------------------------------------------------------------- */
/*                               CREATE SALES PARTY                           */
/* -------------------------------------------------------------------------- */

router.post("/create-sales-party", async (req, res) => {
  try {
    const payload = buildSalesPartyDocument(req.body);

    if (!payload.partyCode || !payload.partyName) {
      return res.status(400).json({
        success: false,
        message: "Party Code and Party Name are required.",
      });
    }

    const salesParty = new SalesParty(payload);

    await salesParty.save();

    try {
      await syncRowsForDoc(
        SALES_PARTY_TAB,
        SALES_PARTY_HEADERS,
        salesParty._id,
        salesPartyToRows(salesParty)
      );
    } catch (sheetErr) {
      console.error(
        "Sheet sync failed (Sales Party create):",
        sheetErr.message
      );
    }

    res.status(201).json({
      success: true,
      message: "Sales Party Saved Successfully",
      data: normalizeSalesPartyResponse(salesParty),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/* -------------------------------------------------------------------------- */
/*                            BULK CREATE SALES PARTY                         */
/* -------------------------------------------------------------------------- */

router.post("/bulk-create-sales-parties", async (req, res) => {
  try {
    const { data } = req.body;

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No data provided.",
      });
    }

    const invalid = data.filter((row) => {
      const r = buildSalesPartyDocument(row);

      return (
        !r.partyCode.toString().trim() ||
        !r.partyName.toString().trim()
      );
    });

    if (invalid.length > 0) {
      return res.status(400).json({
        success: false,
        message: `${invalid.length} row(s) are missing Party Code or Party Name.`,
      });
    }

    const docs = data.map((row) => buildSalesPartyDocument(row));

    const result = await SalesParty.insertMany(docs, {
      ordered: false,
    });

    try {
      for (const doc of result) {
        await syncRowsForDoc(
          SALES_PARTY_TAB,
          SALES_PARTY_HEADERS,
          doc._id,
          salesPartyToRows(doc)
        );
      }
    } catch (sheetErr) {
      console.error(
        "Sheet sync failed (Sales Party bulk upload):",
        sheetErr.message
      );
    }

    res.status(201).json({
      success: true,
      message: "Bulk upload successful.",
      count: result.length,
    });
  } catch (error) {
    if (error.insertedDocs) {
      return res.status(207).json({
        success: true,
        message: `${error.insertedDocs.length} inserted, some rows failed.`,
        count: error.insertedDocs.length,
      });
    }

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}); /* -------------------------------------------------------------------------- */
/*                             GET ALL SALES PARTIES                          */
/* -------------------------------------------------------------------------- */

router.get("/sales-parties", async (req, res) => {
  try {
    const parties = await SalesParty.find().sort({ createdAt: -1 });

    res.status(200).json(
      parties.map(normalizeSalesPartyResponse)
    );
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/* -------------------------------------------------------------------------- */
/*                    GET SALES PARTY BY ID OR PARTY CODE                     */
/* -------------------------------------------------------------------------- */

router.get("/sales-party/:identifier", async (req, res) => {
  try {
    const { identifier } = req.params;

    const salesParty = mongoose.Types.ObjectId.isValid(identifier)
      ? await SalesParty.findById(identifier)
      : await SalesParty.findOne({ partyCode: identifier });

    if (!salesParty) {
      return res.status(404).json({
        success: false,
        message: "Sales Party not found",
      });
    }

    res.status(200).json(
      normalizeSalesPartyResponse(salesParty)
    );
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/* -------------------------------------------------------------------------- */
/*                              SEARCH SALES PARTY                            */
/* -------------------------------------------------------------------------- */

router.get("/sales-parties/search", async (req, res) => {
  try {
    const {
      partyCode,
      partyName,
      city,
      state,
      status,
    } = req.query;

    let query = {};

    if (partyCode)
      query.partyCode = {
        $regex: partyCode,
        $options: "i",
      };

    if (partyName)
      query.partyName = {
        $regex: partyName,
        $options: "i",
      };

    if (city)
      query.city = {
        $regex: city,
        $options: "i",
      };

    if (state)
      query.state = {
        $regex: state,
        $options: "i",
      };

    if (status)
      query.status = status;

    const data = await SalesParty.find(query);

    res.status(200).json(
      data.map(normalizeSalesPartyResponse)
    );
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/* -------------------------------------------------------------------------- */
/*                            UPDATE SALES PARTY                              */
/* -------------------------------------------------------------------------- */

router.put("/sales-party/:id", async (req, res) => {
  try {
    const payload = buildSalesPartyDocument(req.body);

    if (!payload.partyCode || !payload.partyName) {
      return res.status(400).json({
        success: false,
        message: "Party Code and Party Name are required.",
      });
    }

    const updated = await SalesParty.findByIdAndUpdate(
      req.params.id,
      payload,
      {
        returnDocument: "after",
        runValidators: true,
      }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Sales Party not found",
      });
    }

    try {
      await syncRowsForDoc(
        SALES_PARTY_TAB,
        SALES_PARTY_HEADERS,
        updated._id,
        salesPartyToRows(updated)
      );
    } catch (sheetErr) {
      console.error(
        "Sheet sync failed (Sales Party update):",
        sheetErr.message
      );
    }

    res.status(200).json({
      success: true,
      message: "Updated Successfully",
      data: normalizeSalesPartyResponse(updated),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});
/* -------------------------------------------------------------------------- */
/*                           DELETE SALES PARTY                               */
/* -------------------------------------------------------------------------- */

router.delete("/sales-party/:id", async (req, res) => {
  try {
    const deleted = await SalesParty.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Sales Party not found",
      });
    }

    try {
      await deleteDocFromSheet(
        SALES_PARTY_TAB,
        req.params.id
      );
    } catch (sheetErr) {
      console.error(
        "Sheet sync failed (Sales Party delete):",
        sheetErr.message
      );
    }

    res.status(200).json({
      success: true,
      message: "Deleted Successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/* -------------------------------------------------------------------------- */
/*                               MODULE EXPORT                                */
/* -------------------------------------------------------------------------- */

module.exports = router;
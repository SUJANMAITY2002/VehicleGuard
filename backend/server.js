const express  = require("express");
const mongoose = require("mongoose");
const cors     = require("cors");
const dotenv   = require("dotenv");
const path     = require("path");

dotenv.config();
const app = express();

/* MIDDLEWARE */
app.use(
  cors({
    origin: [
      "https://maasheetla.netlify.app",
      "https://maa-sheetla.vercel.app",
      "http://localhost:5173",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
console.log(process.env.FRONTEND_URL);

/* ── ROUTES ── */
const authRoutes                = require("./routes/authRoutes");
const transactionRoutes         = require("./routes/Master/transactionRoutes");
const documentSequenceRoutes    = require("./routes/Master/documentSequenceRoutes");
const goodsInwardNoteRoutes     = require("./routes/Inventory/goodsInwardNoteRoutes");
const weighmentRoutes           = require("./routes/Inventory/weighmentRoutes");
const Directgrnroutes           = require("./routes/Inventory/Directgrnroutes");
const Salesroutes               = require("./routes/Sales/Salesroutes");
const SaudaRoutes               = require("./routes/Sales/SaudaRoutes");
const DemandRoutes              = require("./routes/Sales/DemandRoutes");
const DispatchRoutes            = require("./routes/Sales/DispatchRoutes");
const VehicleOutwardRoutes      = require("./routes/Sales/VehicleOutwardRoutes");
const VehicleOutwardWeighmentRoutes = require("./routes/Sales/VehicleOutwardWeighmentRoutes");
const ProductionRequestRoutes   = require("./routes/Production/ProductionRequestRoutes");
const HeatRoutes                = require("./routes/Production/HeatRoutes");
const { generateDueProductionRequests } = require("./utils/productionRequestGenerator");
const PartyRoutes               = require("./routes/Master/PartyRoutes");
const ItemRoutes                = require("./routes/Master/ItemRoutes");
const UomRoutes                 = require("./routes/Master/UomRoutes");
const PartyTypeRoutes           = require("./routes/Master/PartyTypeRoutes");
const ItemCategoryRoutes        = require("./routes/Master/ItemCategoryRoutes");
const ItemClassRoutes           = require("./routes/Master/ItemClassRoutes");
const ItemGroupRoutes           = require("./routes/Master/ItemGroupRoutes");
const TaxDetailsRoutes          = require("./routes/Master/TaxDetailsRoutes");
const ItemTaxClassRoutes        = require("./routes/Master/ItemTaxClassRoutes");
const ProductionDetailsRoutes   = require("./routes/Master/ProductiondetailsRoutes");
const SchemeMasterRoutes        = require("./routes/Master/SchememasterRoutes");
const SiteMasterRoutes          = require("./routes/Master/SiteMasterRoutes");
const PurchaseOrderRoutes       = require("./routes/Procurement/PurchaseOrderRoutes");
const itemConversionRoutes      = require("./routes/Inventory/itemConversionRoutes");
const CCMProductionRoutes       = require("./routes/Production/CCMProductionRoutes");
const RollingProductionRoutes   = require("./routes/Production/RollingProductionRoutes");
const BundlingProductionRoutes  = require("./routes/Production/BundlingProductionRoutes");
const ProductionAnalyticsRoutes = require("./routes/Production/ProductionAnalyticsRoutes");
const PurchaseRequisitionRoutes = require("./routes/Procurement/PurchaseRequisitionRoutes");
const SalesPartyRoutes          = require("./routes/Master/SalesPartyRoutes");

// ── NEW masters ──────────────────────────────────────────────────
const ServiceMasterRoutes       = require("./routes/Master/ServiceMasterRoutes");
const ChargesMasterRoutes       = require("./routes/Master/ChargesMasterRoutes");
const SalesItemTypeRoutes       = require("./routes/Master/SalesItemTypeRoutes");
const ItemNameRoutes            = require("./routes/Master/ItemNameRoutes");
// ─────────────────────────────────────────────────────────────────

/* SPECIFIC prefixes BEFORE generic /api to avoid route conflicts */
app.use("/api/auth",       authRoutes);
app.use("/api/weighment",  weighmentRoutes);
app.use("/api/direct-grn", Directgrnroutes);
app.use("/api/sales",      Salesroutes);
app.use("/api",            SaudaRoutes);   // → /api/sauda, /api/sauda/:id, /api/sauda/next-sequence
app.use("/api",            DemandRoutes);  // → /api/demand, /api/demand/:id, /api/demand/source-saudas
app.use("/api",            DispatchRoutes); // → /api/dispatch, /api/dispatch/source-production-requests
app.use("/api",            VehicleOutwardRoutes); // → /api/vehicle-outward, /api/vehicle-outward/source-dispatches
app.use("/api",            VehicleOutwardWeighmentRoutes); // → /api/vehicle-outward-weighment/:vehicleOutwardId
app.use("/api",            ProductionRequestRoutes); // → /api/production-request
app.use("/api",            CCMProductionRoutes);
app.use("/api",            RollingProductionRoutes);
app.use("/api",            BundlingProductionRoutes);
app.use("/api",            ProductionAnalyticsRoutes);
app.use("/api",            HeatRoutes); // → /api/heats, /api/heats/next-heat-no, /api/heats/:id
app.use("/api",            SalesPartyRoutes); // → /api/sales-parties, /api/create-sales-party, etc.

/* GENERIC /api routes */
app.use("/api", transactionRoutes);
app.use("/api", documentSequenceRoutes);
app.use("/api", goodsInwardNoteRoutes);
app.use("/api", itemConversionRoutes);
app.use("/api", PartyRoutes);
app.use("/api", ItemRoutes);
app.use("/api", UomRoutes);
app.use("/api", PartyTypeRoutes);
app.use("/api", ItemCategoryRoutes);
app.use("/api", ItemClassRoutes);
app.use("/api", ItemGroupRoutes);
app.use("/api", TaxDetailsRoutes);
app.use("/api", ItemTaxClassRoutes);
app.use("/api", ProductionDetailsRoutes);
app.use("/api", SchemeMasterRoutes);
app.use("/api", SiteMasterRoutes);
app.use("/api", PurchaseOrderRoutes);
app.use("/api", PurchaseRequisitionRoutes);
// ── NEW ──
app.use("/api", ServiceMasterRoutes);
app.use("/api", ChargesMasterRoutes);
app.use("/api", SalesItemTypeRoutes);
app.use("/api", ItemNameRoutes);

/* TEST */
app.get("/", (req, res) => res.json({ message: "Server Running Successfully" }));

/* DB CONNECTION */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected Successfully");
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server Running On Port ${PORT}`));

    /* ── Auto-generate Production Requests from Demands due tomorrow ──
       Runs once at boot, then every 24h. Also callable manually via
       POST /api/demand/run-production-request-check for testing. ── */
    generateDueProductionRequests().catch((err) =>
      console.error("Initial production-request check failed:", err.message)
    );
    setInterval(() => {
      generateDueProductionRequests().catch((err) =>
        console.error("Scheduled production-request check failed:", err.message)
      );
    }, 24 * 60 * 60 * 1000);
  })
  .catch((err) => console.log("MongoDB Error:", err.message));
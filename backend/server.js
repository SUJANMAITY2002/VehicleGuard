const express  = require("express");
const mongoose = require("mongoose");
const cors     = require("cors");
const dotenv   = require("dotenv");

dotenv.config();

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());

// Active routes
app.use("/api/auth",       require("./routes/authRoutes"));
app.use("/api/gatepass",   require("./routes/gatePassRoutes"));
app.use("/api/itemmaster", require("./routes/ItemMasterRoutes"));

app.get("/", (req, res) => res.json({ message: "VehicleGuard API ✅" }));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected");
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error("❌ MongoDB Error:", err.message);
    process.exit(1);
  });
const express  = require("express");
const mongoose = require("mongoose");
const cors     = require("cors");
const dotenv   = require("dotenv");

dotenv.config();

const app = express();

/* ── Middleware ───────────────────────────────── */
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());

/* ── Routes ───────────────────────────────────── */
app.use("/api/auth",    require("./routes/authRoutes"));
app.use("/api/vehicle", require("./routes/vehicleRoutes"));

app.get("/", (req, res) => res.json({ message: "Vehicle Entry API ✅" }));

/* ── MongoDB + Start ──────────────────────────── */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected");
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("❌ MongoDB Error:", err.message);
    process.exit(1);
  });
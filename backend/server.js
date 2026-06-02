const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

/* MIDDLEWARE */
app.use(
  cors({
    origin: process.env.FROTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
app.use(express.json());

/* ROUTES */
const authRoutes             = require("./routes/authRoutes");
const transactionRoutes      = require("./routes/transactionRoutes");
const documentSequenceRoutes = require("./routes/documentSequenceRoutes");
const goodsInwardNoteRoutes  = require("./routes/goodsInwardNoteRoutes");
const weighmentRoutes        = require("./routes/weighmentRoutes");
const Directgrnroutes        = require("./routes/Directgrnroutes");
const salesRoutes            = require("./routes/salesRoutes");   // ← NEW

// Specific prefixes BEFORE generic /api to avoid route conflicts
app.use("/api/auth",        authRoutes);
app.use("/api/weighment",   weighmentRoutes);
app.use("/api/direct-grn",  Directgrnroutes);
app.use("/api/sales",       salesRoutes);   // ← NEW

// Generic /api routes last
app.use("/api", transactionRoutes);
app.use("/api", documentSequenceRoutes);
app.use("/api", goodsInwardNoteRoutes);

/* TEST */
app.get("/", (req, res) => {
  res.json({ message: "Server Running Successfully" });
});

/* DB CONNECTION */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected Successfully");
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server Running On Port ${PORT}`);
    });
  })
  .catch((error) => {
    console.log("MongoDB Error:", error.message);
  });
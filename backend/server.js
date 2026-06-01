const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

/* MIDDLEWARE */
app.use(cors());
app.use(express.json());

/* ROUTES */
const authRoutes             = require("./routes/authRoutes");
const transactionRoutes      = require("./routes/transactionRoutes");
const documentSequenceRoutes = require("./routes/documentSequenceRoutes");
const goodsInwardNoteRoutes  = require("./routes/goodsInwardNoteRoutes");
const weighmentRoutes        = require("./routes/weighmentRoutes");
const directGRNRoutes        = require("./routes/directGRNRoutes");

// Specific prefixes BEFORE generic /api to avoid route conflicts
app.use("/api/auth",        authRoutes);
app.use("/api/weighment",   weighmentRoutes);
app.use("/api/direct-grn",  directGRNRoutes);

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
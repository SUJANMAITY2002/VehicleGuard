const express  = require("express");
const mongoose = require("mongoose");
const cors     = require("cors");
const dotenv   = require("dotenv");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth",    require("./routes/authRoutes"));
app.use("/api/entry",   require("./routes/entryRoutes"));   // new vehicle entry page
app.use("/api/item",    require("./routes/itemRoutes"));     // new item entry page

app.get("/", (req, res) => {
  res.json({ message: "Vehicle Entry API" });
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.log("MongoDB Error:", err.message);
  });
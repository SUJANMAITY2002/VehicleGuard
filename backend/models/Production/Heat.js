const mongoose = require("mongoose");

/* ════════════════════════════════════════════
   HEAT  (Production → Heat)
   One document per furnace heat/melt cycle.
════════════════════════════════════════════ */
const heatSchema = new mongoose.Schema(
  {
    /* auto-generated — EX-HE<julianDay(3)><furnace><furnaceNo><seq(2)>
       e.g. EX-HE212F1101  → julianDay=212, furnace=F1, furnaceNo=1, seq=01 */
    heatNo: { type: String, required: true, unique: true, trim: true },

    heatDate:  { type: Date, required: true },   // calendar date the heat was created on
    julianDay: { type: Number, required: true }, // day-of-year used to build heatNo
    seqNo:     { type: Number, required: true }, // per-day auto-increment (resets daily), starts at 1

    furnace:   { type: String, required: true, enum: ["F1", "F2", "F3", "F4"] },
    furnaceNo: { type: String, required: true, enum: ["1", "2"] },

    startTime: { type: String, required: true }, // "HH:MM"
    endTime:   { type: String, required: true }, // "HH:MM"
    totalTime: { type: String },                 // computed, e.g. "1h 45m"

    currentConsume: { type: Number, default: 0 },
    weight:         { type: Number, default: 0 },

    /* Quality — chemistry percentages */
    quality: {
      c:  { type: Number, default: 0 },
      si: { type: Number, default: 0 },
      mn: { type: Number, default: 0 },
      s:  { type: Number, default: 0 },
      p:  { type: Number, default: 0 },
    },

    attachment: {
      fileName: { type: String },
      filePath: { type: String }, // served from /uploads/heat/<file>
    },

    remarks: { type: String, trim: true, default: "" },
    status:  { type: String, default: "Completed" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Heat", heatSchema);
const mongoose = require("mongoose");

const logbookSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  date: { type: Date, required: true },
  aircraft: { type: String, required: true },
  hours: { type: Number, required: true },
  remarks: String
});

module.exports = mongoose.model("Logbook", logbookSchema);

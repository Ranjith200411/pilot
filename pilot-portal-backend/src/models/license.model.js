// license.model.js
const mongoose = require("mongoose");

const licenseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  type: {
    type: String,
    enum: ["SPL", "PPL", "CPL", "AIPL"],
    required: true
  },

  issueDate: Date,
  expiryDate: Date,
  licenseNumber: String,
  remarks: String,

  // ✅ NEW
  documentUrl: String,
  documentName: String
});

module.exports = mongoose.model("License", licenseSchema);

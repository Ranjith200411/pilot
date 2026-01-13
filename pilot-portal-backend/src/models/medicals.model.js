const mongoose = require("mongoose");

const medicalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  classType: {
    type: String,
    enum: ["Class 1", "Class 2"],
    required: true
  },

  issueDate: Date,
  expiryDate: Date,

  // 🔑 NEW (optional)
  documentUrl: String,
  documentName: String,

  remarks: String,

  createdAt: {
    type: Date,
    default: Date.now
  }
});


module.exports = mongoose.model("Medical", medicalSchema);

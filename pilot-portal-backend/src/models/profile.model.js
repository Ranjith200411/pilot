const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    dob: { type: String },
    address: { type: String },
    licenseNumber: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Profile", profileSchema);

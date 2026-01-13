const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
  question: { type: String, required: true },
  keywords: [String],   // ["medical", "class1", "expiry"]
  answer: { type: String, required: true }
});

module.exports = mongoose.model("ChatKnowledge", chatSchema);

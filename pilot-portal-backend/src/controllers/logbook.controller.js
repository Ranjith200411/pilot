const Logbook = require("../models/logbook.model");

exports.createEntry = async (req, res) => {
  try {
    const entry = await Logbook.create({
      userId: req.user.userId,
      ...req.body
    });

    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getEntries = async (req, res) => {
  try {
    const entries = await Logbook.find({ userId: req.user.userId });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.updateEntry = async (req, res) => {
  try {
    const entry = await Logbook.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(entry);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.deleteEntry = async (req, res) => {
  try {
    await Logbook.findByIdAndDelete(req.params.id);
    res.json({ message: "Logbook entry deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

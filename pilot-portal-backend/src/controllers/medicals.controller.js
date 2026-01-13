const Medical = require("../models/medicals.model");

exports.createMedical = async (req, res) => {
  try {
    const existing = await Medical.findOne({
      userId: req.user.userId,
      classType: req.body.classType
    });

    if (existing) {
      return res.status(400).json({
        message: `${req.body.classType} medical already exists. Please renew instead.`
      });
    }

    const medical = await Medical.create({
      userId: req.user.userId,
      classType: req.body.classType,
      issueDate: req.body.issueDate,
      expiryDate: req.body.expiryDate,
      remarks: req.body.remarks,
      documentName: req.file?.originalname,
      documentUrl: req.file
        ? `/uploads/medicals/${req.file.filename}`
        : undefined
    });

    res.status(201).json(medical);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


exports.getMedicals = async (req, res) => {
  try {
    const medicals = await Medical.find({ userId: req.user.userId });
    res.json(medicals);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.updateMedical = async (req, res) => {
  try {
    const update = {
      issueDate: req.body.issueDate,
      expiryDate: req.body.expiryDate,
      remarks: req.body.remarks
    };

    if (req.file) {
      update.documentName = req.file.originalname;
      update.documentUrl = `/uploads/medicals/${req.file.filename}`;
    }

    const medical = await Medical.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    );

    res.json(medical);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


exports.deleteMedical = async (req, res) => {
  try {
    await Medical.findByIdAndDelete(req.params.id);
    res.json({ message: "Medical deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

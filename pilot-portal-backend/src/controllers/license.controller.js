const License = require("../models/license.model");

exports.createLicense = async (req, res) => {
  const existing = await License.findOne({
    userId: req.user.userId,
    type: req.body.type
  });

  if (existing) {
    return res.status(400).json({
      message: `${req.body.type} license already exists. Please renew instead.`
    });
  }

  try {
    const license = await License.create({
      userId: req.user.userId,
      ...req.body,

      documentUrl: req.file
        ? `${req.protocol}://${req.get("host")}/uploads/licenses/${req.file.filename}`
        : null,

      documentName: req.file?.originalname
    });

    res.status(201).json(license);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


exports.getLicenses = async (req, res) => {
  try {
    const licenses = await License.find({ userId: req.user.userId });
    res.json(licenses);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.updateLicense = async (req, res) => {
  try {
    const update = {
      ...req.body
    };

    if (req.file) {
      update.documentUrl = `${req.protocol}://${req.get("host")}/uploads/licenses/${req.file.filename}`;
      update.documentName = req.file.originalname;
    }

    const license = await License.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    );

    res.json(license);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


exports.deleteLicense = async (req, res) => {
  try {
    await License.findByIdAndDelete(req.params.id);
    res.json({ message: "License deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

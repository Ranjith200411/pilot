const User = require("../models/user.model");

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      { name, phone },
      { new: true }
    ).select("-password");

    res.json({ message: "Profile updated", updatedUser });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const User = require("../models/user.model");
const Logbook = require("../models/logbook.model");
const License = require("../models/license.model");
const mongoose = require("mongoose");

exports.getProfile = async (req, res) => {
  try {
    const [user, licenseCount, logbookAgg] = await Promise.all([
      User.findById(req.user.userId).select("-password"),
      License.countDocuments({ userId: req.user.userId }),
      Logbook.aggregate([
        { $match: { userId: userIdToObjectId(req.user.userId) } },
        {
          $group: {
            _id: null,
            logbookEntries: { $sum: 1 },
            flightHours: {
              $sum: {
                $cond: [
                  { $gt: ["$totalTime", 0] },
                  "$totalTime",
                  { $ifNull: ["$hours", 0] }
                ]
              }
            }
          }
        }
      ])
    ]);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const stats = logbookAgg[0] || { logbookEntries: 0, flightHours: 0 };

    res.json({
      ...user.toObject(),
      licenseCount,
      logbookEntries: stats.logbookEntries || 0,
      flightHours: Number((stats.flightHours || 0).toFixed(1))
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

function userIdToObjectId(id) {
  return new mongoose.Types.ObjectId(id);
}

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

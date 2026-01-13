const express = require("express");
const auth = require("../middleware/auth.middleware");
const upload = require("../middleware/license.middleware");

const {
  createLicense,
  getLicenses,
  updateLicense,
  deleteLicense
} = require("../controllers/license.controller");

const router = express.Router();

router.post(
  "/",
  auth,
  upload.single("document"), // ✅ THIS WAS MISSING
  createLicense
);

router.put(
  "/:id",
  auth,
  upload.single("document"), // ✅ THIS TOO
  updateLicense
);

router.get("/", auth, getLicenses);
router.delete("/:id", auth, deleteLicense);

module.exports = router;

module.exports = router;

const express = require("express");
const auth = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");

const {
  createMedical,
  getMedicals,
  updateMedical,
  deleteMedical
} = require("../controllers/medicals.controller");

const router = express.Router();

// GET medicals
router.get("/", auth, getMedicals);

// CREATE medical (with PDF upload)
router.post(
  "/",
  auth,
  upload.single("document"),
  createMedical
);

// UPDATE medical (with optional PDF upload)
router.put(
  "/:id",
  auth,
  upload.single("document"),
  updateMedical
);

// DELETE medical
router.delete("/:id", auth, deleteMedical);

module.exports = router;

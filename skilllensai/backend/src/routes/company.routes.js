const express = require("express");
const router = express.Router();
const companyController = require("../controllers/company.controller");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "../../uploads/company-docs");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const name = Date.now() + "-" + file.originalname.replace(/\s+/g, "-");
    cb(null, name);
  },
});

const upload = multer({ storage });

// Public: company registration with optional document
router.post("/register", upload.single("document"), companyController.register);

module.exports = router;

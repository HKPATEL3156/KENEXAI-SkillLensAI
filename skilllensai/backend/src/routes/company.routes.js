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

// Separate storage for job description PDFs
const jdUploadDir = path.join(__dirname, "../../uploads/job-jds");
if (!fs.existsSync(jdUploadDir)) fs.mkdirSync(jdUploadDir, { recursive: true });

const jdStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, jdUploadDir);
  },
  filename: function (req, file, cb) {
    const name = Date.now() + "-" + file.originalname.replace(/\s+/g, "-");
    cb(null, name);
  },
});

const jdUpload = multer({ storage: jdStorage });

// Public: company registration with optional document
router.post("/register", upload.single("document"), companyController.register);

// Public: company login
router.post("/login", companyController.login);

// Protected company dashboard routes
const dashCtrl = require("../controllers/companyDashboard.controller");
router.get("/dashboard/profile", dashCtrl.verifyCompany, dashCtrl.getProfile);
router.patch(
  "/dashboard/profile",
  dashCtrl.verifyCompany,
  dashCtrl.updateProfile,
);
router.get("/dashboard/stats", dashCtrl.verifyCompany, dashCtrl.getStats);
router.get(
  "/dashboard/candidates",
  dashCtrl.verifyCompany,
  dashCtrl.getCandidates,
);
router.get("/dashboard/jobs", dashCtrl.verifyCompany, dashCtrl.getJobs);
router.post(
  "/dashboard/jobs",
  dashCtrl.verifyCompany,
  jdUpload.single("jdFile"),
  dashCtrl.createJob,
);
router.get(
  "/dashboard/applications/:id",
  dashCtrl.verifyCompany,
  dashCtrl.getApplication,
);
router.patch("/dashboard/jobs/:id", dashCtrl.verifyCompany, dashCtrl.updateJob);
router.delete(
  "/dashboard/jobs/:id",
  dashCtrl.verifyCompany,
  dashCtrl.deleteJob,
);
router.get(
  "/dashboard/jobs/:id/applicants",
  dashCtrl.verifyCompany,
  dashCtrl.getJobApplicants,
);
router.post(
  "/dashboard/applications/:id/score",
  dashCtrl.verifyCompany,
  dashCtrl.scoreApplication,
);
router.post(
  "/dashboard/jobs/:id/scoreAll",
  dashCtrl.verifyCompany,
  dashCtrl.scoreAllApplications,
);
router.patch(
  "/dashboard/applications/:id",
  dashCtrl.verifyCompany,
  dashCtrl.updateApplication,
);

module.exports = router;

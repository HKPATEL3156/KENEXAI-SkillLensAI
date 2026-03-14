const express = require("express");
const router = express.Router();
const JobRole = require("../models/JobRole");
const Application = require("../models/Application");
const QuizAttempt = require("../models/QuizAttempt");
const Company = require("../models/Company");
const auth = require("../middleware/auth.middleware");
const { resumeUpload } = require("../utils/Upload");
const fs = require("fs");
const path = require("path");

// GET /api/jobs - public list of active jobs (all companies)
router.get("/", async (req, res, next) => {
  try {
    const { q = "", skill = "", companyId, location = "" } = req.query;
    const filter = { status: "active" };
    if (companyId) filter.companyId = companyId;
    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ];
    }
    if (skill) {
      filter.skills = { $in: [new RegExp(skill, "i")] };
    }

    // If a location filter is provided, resolve matching companies by address or name
    if (location) {
      const companyFilter = {
        $or: [
          { "address.city": { $regex: location, $options: "i" } },
          { "address.state": { $regex: location, $options: "i" } },
          { "address.country": { $regex: location, $options: "i" } },
          { companyName: { $regex: location, $options: "i" } },
        ],
      };
      const companies = await Company.find(companyFilter).select("_id").lean();
      const companyIds = companies.map((c) => c._id);
      if (companyIds.length === 0) return res.json({ jobs: [] });
      filter.companyId = { $in: companyIds };
    }

    const jobs = await JobRole.find(filter)
      .populate("companyId", "companyName address")
      .sort({ createdAt: -1 })
      .lean();
    const shaped = jobs.map((j) => ({
      ...j,
      companyName: j.companyId?.companyName || "Company",
      companyLocation:
        j.companyId?.address && j.companyId.address.city
          ? `${j.companyId.address.city}${j.companyId.address.state ? ", " + j.companyId.address.state : ""}`
          : "",
    }));
    res.json({ jobs: shaped });
  } catch (err) {
    next(err);
  }
});

// GET /api/jobs/:id - public job detail
router.get("/:id", async (req, res, next) => {
  try {
    const job = await JobRole.findOne({ _id: req.params.id, status: "active" })
      .populate("companyId", "companyName email")
      .lean();
    if (!job) return res.status(404).json({ message: "Job not found" });
    const applicantCount = await Application.countDocuments({
      jobRoleId: job._id,
    });
    res.json({
      job: {
        ...job,
        companyName: job.companyId?.companyName || "Company",
        applicants: applicantCount,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/jobs/:id/apply - student applies (auth required)
router.post(
  "/:id/apply",
  auth,
  resumeUpload.single("resume"),
  async (req, res, next) => {
    try {
      const job = await JobRole.findOne({
        _id: req.params.id,
        status: "active",
      });
      if (!job) return res.status(404).json({ message: "Job not found" });
      const existing = await Application.findOne({
        jobRoleId: job._id,
        userId: req.user.id,
      });
      if (existing) return res.status(400).json({ message: "Already applied" });

      const latestAttempt = await QuizAttempt.findOne({
        userId: req.user.id,
        status: "submitted",
      })
        .sort({ submittedAt: -1 })
        .lean();
      const quizScore =
        latestAttempt && latestAttempt.totalMarks > 0
          ? Math.round(
              (latestAttempt.obtainedMarks / latestAttempt.totalMarks) * 100,
            )
          : 0;

      // handle optional resume upload and cover letter
      let resumePath = undefined;
      let resumeText = "";
      if (req.file) {
        resumePath = path
          .join("/uploads/resumes", req.file.filename)
          .replace(/\\/g, "/");
        // attempt to extract text if PDF and pdf-parse is available
        try {
          const pdfParse = require("pdf-parse");
          if (req.file.mimetype === "application/pdf") {
            const buffer = fs.readFileSync(req.file.path);
            const parsed = await pdfParse(buffer);
            resumeText = parsed.text || "";
          }
        } catch (e) {
          // parsing optional; ignore errors
        }
      }

      const app = await Application.create({
        jobRoleId: job._id,
        userId: req.user.id,
        quizScore,
        quizAttemptId: latestAttempt?._id,
        resumePath,
        resumeText,
        coverLetter: req.body.coverLetter || "",
      });
      res
        .status(201)
        .json({ message: "Application submitted", application: app });
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;

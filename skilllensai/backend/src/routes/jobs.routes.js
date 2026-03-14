const express = require("express");
const router = express.Router();
const JobRole = require("../models/JobRole");
const Application = require("../models/Application");
const QuizAttempt = require("../models/QuizAttempt");
const Company = require("../models/Company");
const auth = require("../middleware/auth.middleware");

// GET /api/jobs - public list of active jobs (all companies)
router.get("/", async (req, res, next) => {
  try {
    const { q = "", skill = "", companyId } = req.query;
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
    const jobs = await JobRole.find(filter)
      .populate("companyId", "companyName")
      .sort({ createdAt: -1 })
      .lean();
    const shaped = jobs.map((j) => ({
      ...j,
      companyName: j.companyId?.companyName || "Company",
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
    const applicantCount = await Application.countDocuments({ jobRoleId: job._id });
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
router.post("/:id/apply", auth, async (req, res, next) => {
  try {
    const job = await JobRole.findOne({ _id: req.params.id, status: "active" });
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
        ? Math.round((latestAttempt.obtainedMarks / latestAttempt.totalMarks) * 100)
        : 0;

    const app = await Application.create({
      jobRoleId: job._id,
      userId: req.user.id,
      quizScore,
      quizAttemptId: latestAttempt?._id,
    });
    res.status(201).json({ message: "Application submitted", application: app });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

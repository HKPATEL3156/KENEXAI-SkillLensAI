const Company = require("../models/Company");
const User = require("../models/User");
const QuizAttempt = require("../models/QuizAttempt");
const JobRole = require("../models/JobRole");
const Application = require("../models/Application");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");

const JWT_SECRET = process.env.JWT_SECRET || "dev_admin_secret";

// Middleware: verify company JWT
exports.verifyCompany = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer "))
    return res.status(401).json({ message: "Missing token" });
  const token = auth.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== "company")
      return res.status(403).json({ message: "Forbidden" });
    req.company = payload;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// GET /api/company/dashboard/profile
exports.getProfile = async (req, res, next) => {
  try {
    const company = await Company.findById(req.company.companyId).select(
      "-password"
    );
    if (!company) return res.status(404).json({ message: "Not found" });
    res.json({ company });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/company/dashboard/profile
exports.updateProfile = async (req, res, next) => {
  try {
    const { companyName, contactName, contactPhone, address } = req.body;
    const updated = await Company.findByIdAndUpdate(
      req.company.companyId,
      { companyName, contactName, contactPhone, address },
      { new: true, runValidators: true }
    ).select("-password");
    res.json({ company: updated });
  } catch (err) {
    next(err);
  }
};

// GET /api/company/dashboard/stats
exports.getStats = async (req, res, next) => {
  try {
    const companyId = req.company.companyId;
    const companyJobs = await JobRole.find({ companyId, status: "active" }).select("_id minScore");
    const jobIds = companyJobs.map((j) => j._id);
    const minScoreMap = Object.fromEntries(companyJobs.map((j) => [String(j._id), j.minScore || 0]));

    const [totalCandidates, totalAttempts, topAttempts, applications, applicationCount] = await Promise.all([
      User.countDocuments(),
      QuizAttempt.countDocuments({ status: "submitted" }),
      QuizAttempt.find({ status: "submitted" })
        .sort({ obtainedMarks: -1 })
        .limit(10)
        .populate("userId", "fullName email"),
      jobIds.length > 0
        ? Application.find({ jobRoleId: { $in: jobIds } })
            .populate("userId", "fullName email")
            .populate("jobRoleId", "title minScore")
            .lean()
        : [],
      jobIds.length > 0 ? Application.countDocuments({ jobRoleId: { $in: jobIds } }) : 0,
    ]);

    const avgAgg = await QuizAttempt.aggregate([
      { $match: { status: "submitted" } },
      {
        $group: {
          _id: null,
          totalScore: { $sum: "$obtainedMarks" },
          totalMax: { $sum: "$totalMarks" },
        },
      },
    ]);

    const platformAvgScore =
      avgAgg.length && avgAgg[0].totalMax > 0
        ? Math.round((avgAgg[0].totalScore / avgAgg[0].totalMax) * 100)
        : 0;

    let totalApplicants = applicationCount;
    let matchedCount = 0;
    let avgQuizScore = platformAvgScore;
    const matchedMap = new Map();

    if (applications.length > 0) {
      const scores = [];
      for (const app of applications) {
        const score = app.quizScore ?? 0;
        if (score > 0) scores.push(score);
        const jid = app.jobRoleId?._id ? String(app.jobRoleId._id) : String(app.jobRoleId);
        const minScore = minScoreMap[jid] ?? 0;
        if (score >= minScore && app.userId) {
          const uid = String(app.userId._id || app.userId);
          if (!matchedMap.has(uid)) {
            matchedMap.set(uid, {
              id: app._id,
              name: app.userId?.fullName || app.userId?.email || "Unknown",
              email: app.userId?.email || "",
              scorePercent: score,
              quizName: app.jobRoleId?.title || "",
            });
          }
        }
      }
      matchedCount = matchedMap.size;
      avgQuizScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : platformAvgScore;
    }

    const topPerformers =
      jobIds.length === 0 || matchedMap.size === 0
        ? []
        : Array.from(matchedMap.values())
            .sort((a, b) => b.scorePercent - a.scorePercent)
            .slice(0, 10);

    const activeJobRoles = companyJobs.length;

    res.json({
      totalCandidates,
      totalAttempts,
      avgScore: jobIds.length > 0 && totalApplicants > 0 ? avgQuizScore : 0,
      topPerformers,
      activeJobRoles,
      totalApplicants,
      matchedCandidates: matchedCount,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/company/dashboard/jobs
exports.getJobs = async (req, res, next) => {
  try {
    const jobs = await JobRole.find({ companyId: req.company.companyId })
      .sort({ createdAt: -1 })
      .lean();
    const withCounts = await Promise.all(
      jobs.map(async (j) => {
        const applicantCount = await Application.countDocuments({ jobRoleId: j._id });
        const matched =
          j.minScore > 0
            ? await Application.countDocuments({
                jobRoleId: j._id,
                quizScore: { $gte: j.minScore },
              })
            : applicantCount;
        return { ...j, applicants: applicantCount, matched };
      })
    );
    res.json({ jobs: withCounts });
  } catch (err) {
    next(err);
  }
};

// POST /api/company/dashboard/jobs
// Expects multipart/form-data with:
// - title (string, required)
// - minExperienceYears (number, optional)
// - minScore (number, optional)
// - skills (comma-separated string or array)
// - jdFile (PDF, required) -> parsed into description
exports.createJob = async (req, res, next) => {
  try {
    const { title, minExperienceYears, skills, minScore } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Job title is required" });
    }

    if (!req.file) {
      return res
        .status(400)
        .json({ message: "Job description PDF (jdFile) is required" });
    }

    const filePath = req.file.path;
    let descriptionText = "";

    try {
      const dataBuffer = fs.readFileSync(filePath);
      const parsed = await pdfParse(dataBuffer);
      descriptionText = parsed.text || "";
    } catch (e) {
      // If parsing fails, still keep the job but with empty description
      descriptionText = "";
    }

    const relativePath = path
      .join("/uploads/job-jds", req.file.filename)
      .replace(/\\/g, "/");

    const job = await JobRole.create({
      companyId: req.company.companyId,
      title: title || "Untitled Role",
      minExperienceYears: Number(minExperienceYears) || 0,
      description: descriptionText,
      skills: Array.isArray(skills)
        ? skills
        : skills
          ? String(skills)
              .split(",")
              .map((s) => s.trim())
          : [],
      minScore: Number(minScore) || 0,
      jdFilePath: relativePath,
      status: "active",
    });
    res.status(201).json({ job });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/company/dashboard/jobs/:id
exports.updateJob = async (req, res, next) => {
  try {
    const job = await JobRole.findOne({
      _id: req.params.id,
      companyId: req.company.companyId,
    });
    if (!job) return res.status(404).json({ message: "Job not found" });
    const { title, minExperienceYears, skills, minScore, status } = req.body;
    if (title !== undefined) job.title = title;
    if (minExperienceYears !== undefined)
      job.minExperienceYears = Number(minExperienceYears) || 0;
    if (skills !== undefined)
      job.skills = Array.isArray(skills)
        ? skills
        : String(skills)
            .split(",")
            .map((s) => s.trim());
    if (minScore !== undefined) job.minScore = Number(minScore) || 0;
    if (status !== undefined && ["active", "closed"].includes(status))
      job.status = status;
    await job.save();
    res.json({ job });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/company/dashboard/jobs/:id
exports.deleteJob = async (req, res, next) => {
  try {
    const job = await JobRole.findOneAndDelete({
      _id: req.params.id,
      companyId: req.company.companyId,
    });
    if (!job) return res.status(404).json({ message: "Job not found" });
    await Application.deleteMany({ jobRoleId: job._id });
    res.json({ message: "Job deleted" });
  } catch (err) {
    next(err);
  }
};

// GET /api/company/dashboard/jobs/:id/applicants
exports.getJobApplicants = async (req, res, next) => {
  try {
    const job = await JobRole.findOne({
      _id: req.params.id,
      companyId: req.company.companyId,
    });
    if (!job) return res.status(404).json({ message: "Job not found" });
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const [applications, total] = await Promise.all([
      Application.find({ jobRoleId: job._id })
        .populate("userId", "fullName email username skills headline primaryLocation createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Application.countDocuments({ jobRoleId: job._id }),
    ]);
    const candidates = applications.map((a) => ({
      ...a.userId,
      _id: a.userId?._id,
      applicationId: a._id,
      quizScore: a.quizScore,
      applicationStatus: a.status,
    }));
    res.json({
      job: { _id: job._id, title: job.title, minScore: job.minScore },
      candidates,
      total,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/company/dashboard/candidates (supports jobId to filter by applicants)
exports.getCandidates = async (req, res, next) => {
  try {
    const { q = "", page = 1, limit = 20, jobId } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    if (jobId) {
      const job = await JobRole.findOne({
        _id: jobId,
        companyId: req.company.companyId,
      });
      if (!job) return res.status(404).json({ message: "Job not found" });
      const applications = await Application.find({ jobRoleId: job._id })
        .populate("userId", "fullName email username skills headline primaryLocation createdAt")
        .sort({ createdAt: -1 })
        .lean();
      const userFilter = q
        ? (u) =>
            !u ||
            (u.fullName && u.fullName.toLowerCase().includes(q.toLowerCase())) ||
            (u.email && u.email.toLowerCase().includes(q.toLowerCase())) ||
            (Array.isArray(u.skills) && u.skills.some((s) => String(s).toLowerCase().includes(q.toLowerCase())))
        : () => true;
      const mapped = applications
        .filter((a) => a.userId && userFilter(a.userId))
        .map((a) => ({
          ...a.userId,
          _id: a.userId._id,
          quizScore: a.quizScore,
          applicationStatus: a.status,
        }));
      const total = mapped.length;
      const candidates = mapped.slice(skip, skip + Number(limit));
      return res.json({ candidates, total, page: Number(page), limit: Number(limit), jobTitle: job.title });
    }

    const filter = q
      ? {
          $or: [
            { fullName: { $regex: q, $options: "i" } },
            { email: { $regex: q, $options: "i" } },
            { skills: { $elemMatch: { $regex: q, $options: "i" } } },
          ],
        }
      : {};

    const [candidates, total] = await Promise.all([
      User.find(filter)
        .select("fullName email username skills headline primaryLocation createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(filter),
    ]);

    res.json({ candidates, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
};

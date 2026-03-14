const Company = require("../models/Company");
const User = require("../models/User");
const QuizAttempt = require("../models/QuizAttempt");
const JobRole = require("../models/JobRole");
const Application = require("../models/Application");
const ParsedResume = require("../models/ParsedResume");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
let pdfParse;
try {
  pdfParse = require("pdf-parse");
} catch (e) {
  // If pdf-parse is not installed, avoid crashing the whole app.
  // JD parsing will be skipped and jobs will be created with empty description.
  pdfParse = null;
  console.warn("pdf-parse not available; JD PDF parsing is disabled.");
}

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
      "-password",
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
      { new: true, runValidators: true },
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
    const companyJobs = await JobRole.find({
      companyId,
      status: "active",
    }).select("_id minScore");
    const jobIds = companyJobs.map((j) => j._id);
    const minScoreMap = Object.fromEntries(
      companyJobs.map((j) => [String(j._id), j.minScore || 0]),
    );

    const [
      totalCandidates,
      totalAttempts,
      topAttempts,
      applications,
      applicationCount,
    ] = await Promise.all([
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
      jobIds.length > 0
        ? Application.countDocuments({ jobRoleId: { $in: jobIds } })
        : 0,
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
        const jid = app.jobRoleId?._id
          ? String(app.jobRoleId._id)
          : String(app.jobRoleId);
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
      avgQuizScore =
        scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : platformAvgScore;
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
        const applicantCount = await Application.countDocuments({
          jobRoleId: j._id,
        });
        const matched =
          j.minScore > 0
            ? await Application.countDocuments({
                jobRoleId: j._id,
                quizScore: { $gte: j.minScore },
              })
            : applicantCount;
        return { ...j, applicants: applicantCount, matched };
      }),
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
      if (pdfParse) {
        const dataBuffer = fs.readFileSync(filePath);
        const parsed = await pdfParse(dataBuffer);
        descriptionText = parsed.text || "";
      } else {
        // pdf-parse not present -> skip parsing
        descriptionText = "";
      }
    } catch (e) {
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
        .populate(
          "userId",
          "fullName email username skills headline primaryLocation createdAt",
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Application.countDocuments({ jobRoleId: job._id }),
    ]);
    const candidates = applications.map((a) => ({
      _id: a.userId?._id,
      applicationId: a._id,
      quizScore: a.quizScore,
      resumeScore: a.resumeScore || 0,
      academic: a.academic || {},
      consentConfirmed: !!a.consentConfirmed,
      resumePath: a.resumePath || a.userId?.resumeFilePath || "",
      coverLetter: a.coverLetter || "",
      applicationStatus: a.status,
      piiSynthesized: !!a.piiSynthesized,
      appliedAt: a.createdAt,
      // user profile fields (pick all useful ones)
      fullName: a.userId?.fullName || a.userId?.username || "",
      email: a.userId?.email || "",
      profileImage: a.userId?.profileImage || "",
      headline: a.userId?.headline || "",
      primaryLocation: a.userId?.primaryLocation || "",
      mobileNumber: a.userId?.mobileNumber || "",
      bio: a.userId?.bio || "",
      skills: a.userId?.skills || [],
      experience: a.userId?.experience || [],
      education: a.userId?.education || [],
      projects: a.userId?.projects || [],
      achievements: a.userId?.achievements || [],
      socialLinks: a.userId?.socialLinks || {},
      registrationDate: a.userId?.createdAt || a.userId?.registrationDate,
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
        .populate(
          "userId",
          "fullName email username skills headline primaryLocation createdAt",
        )
        .sort({ createdAt: -1 })
        .lean();
      const userFilter = q
        ? (u) =>
            !u ||
            (u.fullName &&
              u.fullName.toLowerCase().includes(q.toLowerCase())) ||
            (u.email && u.email.toLowerCase().includes(q.toLowerCase())) ||
            (Array.isArray(u.skills) &&
              u.skills.some((s) =>
                String(s).toLowerCase().includes(q.toLowerCase()),
              ))
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
      return res.json({
        candidates,
        total,
        page: Number(page),
        limit: Number(limit),
        jobTitle: job.title,
      });
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
        .select(
          "fullName email username skills headline primaryLocation createdAt",
        )
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

// POST /api/company/dashboard/applications/:id/score
// Triggers resume skill extraction via ml-service and computes a simple resumeScore
exports.scoreApplication = async (req, res, next) => {
  try {
    const appId = req.params.id;
    const application = await Application.findById(appId).populate("jobRoleId");
    if (!application)
      return res.status(404).json({ message: "Application not found" });

    // Verify company owns the job
    const job = await JobRole.findById(application.jobRoleId._id);
    if (!job || String(job.companyId) !== String(req.company.companyId))
      return res.status(403).json({ message: "Forbidden" });

    if (!application.resumePath)
      return res
        .status(400)
        .json({ message: "No resume uploaded for this application" });

    // Call ml-service /extract-skills
    const mlBase =
      process.env.ML_SERVICE_URL ||
      process.env.ML_BASE_URL ||
      "http://localhost:8000";
    const axios = require("axios");

    // ml-service expects a JSON with filepath relative to backend root
    const payload = { filepath: application.resumePath };
    let skills = [];
    try {
      const resp = await axios.post(`${mlBase}/extract-skills`, payload, {
        timeout: 20000,
      });
      skills = (resp.data && resp.data.skills) || [];
    } catch (e) {
      // if ml-service fails, return partial success
      console.warn("ml-service extract-skills failed:", e.message || e);
      return res
        .status(502)
        .json({ message: "ML service error", error: e.message });
    }

    // compute resumeScore: fraction of job skills present in resume
    const jobSkills = Array.isArray(job.skills)
      ? job.skills.map((s) => String(s).toLowerCase().trim())
      : [];
    const found = skills.map((s) => String(s).toLowerCase().trim());
    const matched = jobSkills.filter((s) => found.includes(s));
    let score = 0;
    if (jobSkills.length > 0)
      score = Math.round((matched.length / jobSkills.length) * 100);
    else
      score = Math.round(
        (found.length > 0 ? Math.min(found.length, 10) / 10 : 0) * 100,
      );

    application.resumeScore = score;
    // attach resumeText if ml-service returned (not in current API) - leave unchanged
    application.piiSynthesized = false;
    await application.save();

    res.json({
      applicationId: application._id,
      resumeScore: score,
      matchedSkills: matched,
      extractedSkills: skills,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/company/dashboard/jobs/:id/scoreAll
// Score all applications for a job (sequential, safe default)
exports.scoreAllApplications = async (req, res, next) => {
  try {
    const jobId = req.params.id;
    const job = await JobRole.findOne({
      _id: jobId,
      companyId: req.company.companyId,
    });
    if (!job) return res.status(404).json({ message: "Job not found" });

    const applications = await Application.find({
      jobRoleId: job._id,
    }).populate("jobRoleId");
    const mlBase =
      process.env.ML_SERVICE_URL ||
      process.env.ML_BASE_URL ||
      "http://localhost:8000";
    const axios = require("axios");

    const results = [];
    // Process sequentially to avoid overloading ml-service
    for (const app of applications) {
      if (!app.resumePath) {
        results.push({
          applicationId: app._id,
          status: "skipped",
          reason: "no_resume",
        });
        continue;
      }
      try {
        const payload = { filepath: app.resumePath };
        const resp = await axios.post(`${mlBase}/extract-skills`, payload, {
          timeout: 20000,
        });
        const skills = (resp.data && resp.data.skills) || [];

        const jobSkills = Array.isArray(job.skills)
          ? job.skills.map((s) => String(s).toLowerCase().trim())
          : [];
        const found = skills.map((s) => String(s).toLowerCase().trim());
        const matched = jobSkills.filter((s) => found.includes(s));
        let score = 0;
        if (jobSkills.length > 0)
          score = Math.round((matched.length / jobSkills.length) * 100);
        else
          score = Math.round(
            (found.length > 0 ? Math.min(found.length, 10) / 10 : 0) * 100,
          );

        app.resumeScore = score;
        app.piiSynthesized = false;
        await app.save();

        results.push({
          applicationId: app._id,
          status: "scored",
          resumeScore: score,
          matched: matched,
        });
      } catch (e) {
        results.push({
          applicationId: app._id,
          status: "error",
          reason: e.message || String(e),
        });
      }
    }

    const processed = results.length;
    const scored = results.filter((r) => r.status === "scored").length;
    res.json({ jobId: job._id, processed, scored, results });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/company/dashboard/applications/:id
// Update application status or add company notes
exports.updateApplication = async (req, res, next) => {
  try {
    const appId = req.params.id;
    const { status, notes } = req.body;
    const application = await Application.findById(appId).populate("jobRoleId");
    if (!application)
      return res.status(404).json({ message: "Application not found" });

    const job = await JobRole.findById(application.jobRoleId._id);
    if (!job || String(job.companyId) !== String(req.company.companyId))
      return res.status(403).json({ message: "Forbidden" });

    if (
      status &&
      ["applied", "shortlisted", "rejected", "selected"].includes(status)
    ) {
      application.status = status;
    }
    if (notes !== undefined) {
      application.companyNotes = notes;
    }
    await application.save();
    res.json({ application });
  } catch (err) {
    next(err);
  }
};

// GET /api/company/dashboard/applications/:id
// Return a single application populated with full user profile and job info
exports.getApplication = async (req, res, next) => {
  try {
    const appId = req.params.id;
    const application = await Application.findById(appId)
      .populate("userId")
      .populate("jobRoleId")
      .lean();
    if (!application)
      return res.status(404).json({ message: "Application not found" });

    const job = await JobRole.findById(application.jobRoleId._id).lean();
    if (!job || String(job.companyId) !== String(req.company.companyId))
      return res.status(403).json({ message: "Forbidden" });

    const user = application.userId || {};
    const result = {
      applicationId: application._id,
      status: application.status,
      quizScore: application.quizScore,
      resumeScore: application.resumeScore || 0,
      resumePath: application.resumePath || user.resumeFilePath || "",
      coverLetter: application.coverLetter || "",
      academic: application.academic || {},
      consentConfirmed: !!application.consentConfirmed,
      piiSynthesized: !!application.piiSynthesized,
      companyNotes: application.companyNotes || "",
      appliedAt: application.createdAt,
      job: {
        id: job._id,
        title: job.title,
        minScore: job.minScore,
        skills: job.skills || [],
        jdFilePath: job.jdFilePath || "",
      },
      user: {
        id: user._id,
        fullName: user.fullName || "",
        email: user.email || "",
        profileImage: user.profileImage || "",
        headline: user.headline || "",
        primaryLocation: user.primaryLocation || "",
        mobileNumber: user.mobileNumber || "",
        bio: user.bio || "",
        skills: user.skills || [],
        experience: user.experience || [],
        education: user.education || [],
        projects: user.projects || [],
        achievements: user.achievements || [],
        socialLinks: user.socialLinks || {},
        registrationDate: user.createdAt || user.registrationDate,
      },
    };

    res.json({ application: result });
  } catch (err) {
    next(err);
  }
};

// GET /api/company/dashboard/candidates/:candidateId
// Return a full aggregated candidate profile for the recruiter view.
// Combines User profile + latest QuizAttempt + most recent Application (if any).
exports.getCandidateProfile = async (req, res, next) => {
  try {
    const { candidateId } = req.params;

    // Fetch full user profile
    const user = await User.findById(candidateId).select("-password").lean();
    if (!user) return res.status(404).json({ message: "Candidate not found" });

    // Fetch the most recent submitted quiz attempt for this user
    const quizAttempt = await QuizAttempt.findOne({
      userId: candidateId,
      status: "submitted",
    })
      .sort({ createdAt: -1 })
      .lean();

    // Fetch the most recent application by this user across any of this company's jobs
    const companyJobIds = await JobRole.find({
      companyId: req.company.companyId,
    })
      .select("_id")
      .lean()
      .then((jobs) => jobs.map((j) => j._id));

    const application =
      companyJobIds.length > 0
        ? await Application.findOne({
            userId: candidateId,
            jobRoleId: { $in: companyJobIds },
          })
            .sort({ createdAt: -1 })
            .populate("jobRoleId", "title minScore skills")
            .lean()
        : null;

    // Quiz score: prefer application-level quizScore, else use attempt marks
    let quizScore = null;
    let quizDetails = null;
    if (application && application.quizScore != null) {
      quizScore = application.quizScore;
    } else if (quizAttempt) {
      quizScore =
        quizAttempt.totalMarks > 0
          ? Math.round((quizAttempt.obtainedMarks / quizAttempt.totalMarks) * 100)
          : 0;
    }
    if (quizAttempt) {
      quizDetails = {
        obtainedMarks: quizAttempt.obtainedMarks ?? null,
        totalMarks: quizAttempt.totalMarks ?? null,
        attemptedAt: quizAttempt.createdAt ?? null,
        status: quizAttempt.status ?? null,
      };
    }

    const resumePath =
      (application && application.resumePath) || user.resumeFilePath || null;
    const resumeUrl = resumePath
      ? `http://localhost:5000${resumePath.startsWith("/") ? "" : "/"}${resumePath}`
      : null;

    const profile = {
      candidate_id: user._id,
      name: user.fullName || user.username || null,
      email: user.email || null,
      phone: user.mobileNumber || null,
      location: user.primaryLocation || null,
      headline: user.headline || null,
      bio: user.bio || null,
      openToWork: user.openToWork ?? false,
      profileImage: user.profileImage || null,
      accountType: user.accountType || null,
      currentStatus: user.currentStatus || null,

      // Skills
      skills: user.skills || [],

      // Experience
      experience_years: user.experienceLevel ?? null,
      experience: user.experience || [],

      // Education
      education: user.education || [],

      // Projects
      projects: user.projects || [],

      // Achievements / Certifications
      certifications: user.achievements || [],

      // Social links
      socialLinks: user.socialLinks || {},

      // Activities
      activities: user.activities || [],

      // Quiz / assessment
      quiz_score: quizScore,
      quiz_details: quizDetails,

      // Job match (resume score from application)
      job_match_score: application ? application.resumeScore ?? null : null,
      coverLetter: application ? application.coverLetter || null : null,
      applicationStatus: application ? application.status || null : null,
      appliedJob: application
        ? {
            id: application.jobRoleId?._id || null,
            title: application.jobRoleId?.title || null,
            minScore: application.jobRoleId?.minScore ?? null,
          }
        : null,

      // Resume
      resume_text: application ? application.resumeText || null : null,
      resume_file_url: resumeUrl,

      // Meta
      registrationDate: user.createdAt || user.registrationDate || null,
    };

    res.json({ candidate: profile });
  } catch (err) {
    next(err);
  }
};

// POST /api/company/dashboard/resumes/screen
// Re-triggers parseAndSaveResume for all applicants of this company who have a resume.
exports.triggerResumeReparse = async (req, res, next) => {
  try {
    const companyId = req.company.companyId;
    const jobs = await JobRole.find({ companyId }).select("_id").lean();
    const jobIds = jobs.map((j) => j._id);
    if (jobIds.length === 0) return res.json({ message: "No jobs found", processed: 0 });

    const applications = await Application.find({ jobRoleId: { $in: jobIds } })
      .select("userId resumePath")
      .lean();

    const parseAndSaveResume = require("../utils/parseAndSaveResume");
    const backendRoot = path.join(__dirname, "../../");
    const seen = new Set();
    let processed = 0;

    for (const app of applications) {
      const uid = String(app.userId);
      if (seen.has(uid) || !app.resumePath) continue;
      seen.add(uid);
      const absolutePath = path.join(backendRoot, app.resumePath);
      parseAndSaveResume({
        userId: app.userId,
        relativePath: app.resumePath,
        absolutePath,
      }).catch(() => {});
      processed++;
    }

    res.json({ message: "Screening started", processed });
  } catch (err) {
    next(err);
  }
};

exports.getResumesForScreening = async (req, res, next) => {
  try {
    const companyId = req.company.companyId;

    // Get all job IDs for this company
    const jobs = await JobRole.find({ companyId }).select("_id title").lean();
    const jobIds = jobs.map((j) => j._id);

    if (jobIds.length === 0) {
      return res.json({ resumes: [] });
    }

    // Get all applications with resumes across company jobs
    const applications = await Application.find({
      jobRoleId: { $in: jobIds },
    })
      .populate("userId", "fullName username email resumeFilePath")
      .populate("jobRoleId", "title")
      .sort({ createdAt: -1 })
      .lean();

    // Deduplicate by userId, prefer application-level resumePath
    const seen = new Set();
    const resumes = [];
    for (const app of applications) {
      const uid = String(app.userId?._id);
      if (!uid || seen.has(uid)) continue;
      seen.add(uid);

      const resumePath = app.resumePath || app.userId?.resumeFilePath || null;
      const resumeUrl = resumePath
        ? `http://localhost:5000${resumePath.startsWith("/") ? "" : "/"}${resumePath}`
        : null;

      resumes.push({
        candidate_id: app.userId?._id,
        username: app.userId?.fullName || app.userId?.username || app.userId?.email || "Unknown",
        email: app.userId?.email || "",
        resume_file_url: resumeUrl,
        upload_date: app.createdAt,
        job_title: app.jobRoleId?.title || "",
      });
    }

    res.json({ resumes });
  } catch (err) {
    next(err);
  }
};

// POST /api/company/dashboard/screen-resumes/:jobId
// Score and rank ALL ParsedResume documents against the given job.
exports.screenResumes = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const job = await JobRole.findOne({
      _id: jobId,
      companyId: req.company.companyId,
    }).lean();
    if (!job) return res.status(404).json({ message: "Job not found" });

    const parsedResumes = await ParsedResume.find({}).lean();
    if (parsedResumes.length === 0) {
      return res.json({
        jobId: job._id,
        jobTitle: job.title,
        jobDescription: job.description || "",
        requiredSkills: job.skills || [],
        totalCandidates: 0,
        screened: 0,
        results: [],
      });
    }

    const scoreResume = require("../utils/scoreResume");
    const results = parsedResumes
      .map((pr) => scoreResume(pr, job))
      .sort((a, b) => b.scores.totalScore - a.scores.totalScore);

    res.json({
      jobId: job._id,
      jobTitle: job.title,
      jobDescription: job.description || "",
      requiredSkills: job.skills || [],
      totalCandidates: parsedResumes.length,
      screened: results.length,
      results,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/company/dashboard/parsed-resumes
// Returns all ParsedResume documents for candidates who applied to this company's jobs.
exports.getParsedResumes = async (req, res, next) => {
  try {
    const companyId = req.company.companyId;

    // Gather all userIds who applied to this company's jobs
    const jobs = await JobRole.find({ companyId }).select("_id").lean();
    const jobIds = jobs.map((j) => j._id);

    if (jobIds.length === 0) {
      return res.json({ parsedResumes: [] });
    }

    const applications = await Application.find({
      jobRoleId: { $in: jobIds },
    })
      .select("userId")
      .lean();

    const userIds = [...new Set(applications.map((a) => String(a.userId)))];

    if (userIds.length === 0) {
      return res.json({ parsedResumes: [] });
    }

    const parsed = await ParsedResume.find({ userId: { $in: userIds } })
      .sort({ parsed_at: -1 })
      .lean();

    const result = parsed.map((pr) => {
      const resumeUrl = pr.resume_file_path
        ? `http://localhost:5000${
            pr.resume_file_path.startsWith("/") ? "" : "/"
          }${pr.resume_file_path}`
        : null;
      return {
        candidate_id: pr.userId,
        name: pr.name || null,
        email: pr.email || null,
        phone: pr.phone || null,
        skills: pr.skills || [],
        experience_years: pr.experience_years ?? 0,
        education: pr.education || [],
        certifications: pr.certifications || [],
        job_role_predicted: pr.job_role_predicted || null,
        resume_file_url: resumeUrl,
        parsed_at: pr.parsed_at,
      };
    });

    res.json({ parsedResumes: result });
  } catch (err) {
    next(err);
  }
};

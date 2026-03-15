/**
 * chat.routes.js
 *
 * POST /api/chat/candidate  — candidate career assistant (auth required)
 * POST /api/chat/company    — recruiter assistant (company auth required)
 *
 * Both routes:
 *   1. Authenticate the caller
 *   2. Fetch relevant context from MongoDB
 *   3. Forward to the ML service POST /chat (Gemini RAG)
 *   4. Return { reply }
 */

const express = require("express");
const router = express.Router();
const axios = require("axios");
const auth = require("../middleware/auth.middleware");
const dashCtrl = require("../controllers/companyDashboard.controller");

const User = require("../models/User");
const ParsedResume = require("../models/ParsedResume");
const JobRole = require("../models/JobRole");
const Application = require("../models/Application");
const Company = require("../models/Company");

const ML_BASE = process.env.ML_SERVICE_URL || process.env.ML_BASE_URL || "http://localhost:8000";
const ML_CHAT_TIMEOUT_MS = Number(process.env.ML_CHAT_TIMEOUT_MS || 90000);
const ML_CHAT_RETRIES = Number(process.env.ML_CHAT_RETRIES || 1);

async function callMlChat(payload) {
  let lastError;
  for (let attempt = 0; attempt <= ML_CHAT_RETRIES; attempt++) {
    try {
      return await axios.post(`${ML_BASE}/chat`, payload, { timeout: ML_CHAT_TIMEOUT_MS });
    } catch (err) {
      lastError = err;
      const isTimeout = err?.code === "ECONNABORTED" || String(err?.message || "").toLowerCase().includes("timeout");
      if (!isTimeout || attempt === ML_CHAT_RETRIES) break;
    }
  }
  throw lastError;
}

// ─── Candidate Chat ─────────────────────────────────────────────────────────
// POST /api/chat/candidate
router.post("/candidate", auth, async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Message is required." });
    }

    const userId = req.user.id;

    // 1. Fetch user profile
    const user = await User.findById(userId)
      .select("fullName email headline skills experience education achievements mobileNumber primaryLocation experienceLevel resumeFilePath resumePath")
      .lean();

    // 2. Fetch parsed resume (may not exist yet)
    const parsedResume = await ParsedResume.findOne({ userId })
      .select("skills experience_years experience education certifications job_role_predicted resume_text")
      .lean();

    // 3. Fetch active jobs (top 15 to stay within token budget)
    const jobs = await JobRole.find({ status: "active" })
      .select("title companyName skills minExperienceYears description")
      .limit(15)
      .lean();

    // Build context (cap resume_text to 1500 chars)
    const context = {
      profile: {
        name: user?.fullName || user?.email || "Candidate",
        email: user?.email,
        headline: user?.headline,
        location: user?.primaryLocation,
        skills: user?.skills || [],
        experience_years: user?.experienceLevel || 0,
        experience: (user?.experience || []).slice(0, 5),
        education: (user?.education || []).slice(0, 3),
        certifications: (user?.achievements || []).map((a) => a.title).filter(Boolean),
      },
      parsed_resume: parsedResume
        ? {
            skills: parsedResume.skills || [],
            experience_years: parsedResume.experience_years || 0,
            experience: (parsedResume.experience || []).slice(0, 5),
            education: (parsedResume.education || []).slice(0, 3),
            certifications: parsedResume.certifications || [],
            job_role_predicted: parsedResume.job_role_predicted,
            resume_text: (parsedResume.resume_text || "").slice(0, 1500),
          }
        : null,
      available_jobs: jobs.map((j) => ({
        title: j.title,
        company: j.companyName,
        skills: j.skills || [],
        min_experience: j.minExperienceYears || 0,
        description: (j.description || "").slice(0, 200),
      })),
    };

    // 4. Call ML /chat
    const mlRes = await callMlChat({ message: message.trim(), role: "candidate", context });

    // If ML service returned an error, surface it to the client
    if (!mlRes.data.reply && mlRes.data.error) {
      const errText = mlRes.data.error || "";
      if (errText.startsWith("DAILY_QUOTA_EXHAUSTED") || errText.includes("429") || errText.toLowerCase().includes("quota") || errText.toLowerCase().includes("rate") || errText.toLowerCase().includes("exhausted")) {
        return res.status(429).json({ message: "The AI is busy right now. Please wait a moment and try again." });
      }
      return res.status(502).json({ message: `AI error: ${errText}` });
    }

    return res.json({ reply: mlRes.data.reply || "I couldn't generate a response. Please try again." });
  } catch (err) {
    const isTimeout = err?.code === "ECONNABORTED" || String(err?.message || "").toLowerCase().includes("timeout");
    if (isTimeout) {
      return res.status(504).json({ message: "AI response is taking longer than expected. Please try again." });
    }
    if (err.response?.data) {
      return res.status(502).json({ message: "AI service error.", detail: err.response.data });
    }
    next(err);
  }
});

// ─── Recruiter / Company Chat ─────────────────────────────────────────────────
// POST /api/chat/company
router.post("/company", dashCtrl.verifyCompany, async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Message is required." });
    }

    const companyId = req.company.companyId;

    // 1. Fetch company info
    const company = await Company.findById(companyId).select("companyName industry").lean();

    // 2. Fetch this company's active jobs
    const jobs = await JobRole.find({ companyId, status: "active" })
      .select("title skills minExperienceYears description")
      .lean();

    // 3. Fetch userIds who applied to this company's jobs
    const jobIds = jobs.map((j) => j._id);
    const applications = await Application.find({ jobRoleId: { $in: jobIds } })
      .select("userId")
      .lean();
    const userIds = [...new Set(applications.map((a) => String(a.userId)))];

    // 4. Fetch parsed resumes (top 10 to stay within token budget)
    const parsedResumes = await ParsedResume.find({ userId: { $in: userIds } })
      .select("userId name email phone skills experience_years education certifications job_role_predicted")
      .limit(10)
      .lean();

    const context = {
      company_name: company?.companyName || "Your Company",
      industry: company?.industry || "",
      active_jobs: jobs.map((j) => ({
        title: j.title,
        skills: j.skills || [],
        min_experience: j.minExperienceYears || 0,
        description: (j.description || "").slice(0, 200),
      })),
      candidates: parsedResumes.map((pr) => ({
        name: pr.name || "Unknown",
        email: pr.email,
        skills: pr.skills || [],
        experience_years: pr.experience_years || 0,
        education: (pr.education || []).slice(0, 2),
        certifications: pr.certifications || [],
        predicted_role: pr.job_role_predicted,
      })),
    };

    // 5. Call ML /chat
    const mlRes = await callMlChat({ message: message.trim(), role: "recruiter", context });

    // If ML service returned an error, surface it to the client
    if (!mlRes.data.reply && mlRes.data.error) {
      const errText = mlRes.data.error || "";
      if (errText.startsWith("DAILY_QUOTA_EXHAUSTED") || errText.includes("429") || errText.toLowerCase().includes("quota") || errText.toLowerCase().includes("rate") || errText.toLowerCase().includes("exhausted")) {
        return res.status(429).json({ message: "The AI is busy right now. Please wait a moment and try again." });
      }
      return res.status(502).json({ message: `AI error: ${errText}` });
    }

    return res.json({ reply: mlRes.data.reply || "I couldn't generate a response. Please try again." });
  } catch (err) {
    const isTimeout = err?.code === "ECONNABORTED" || String(err?.message || "").toLowerCase().includes("timeout");
    if (isTimeout) {
      return res.status(504).json({ message: "AI response is taking longer than expected. Please try again." });
    }
    if (err.response?.data) {
      return res.status(502).json({ message: "AI service error.", detail: err.response.data });
    }
    next(err);
  }
});

module.exports = router;

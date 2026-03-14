/**
 * parseAndSaveResume.js
 *
 * Shared ETL utility: given a resume file path + userId (+ optional applicationId),
 * this function:
 *   1. Reads the PDF and extracts raw text (via pdf-parse)
 *   2. Calls the ML service /extract-skills to get structured skill list
 *   3. Calls the ML service /predict-role to get the predicted job role
 *   4. Upserts a ParsedResume document in MongoDB
 *
 * This is deliberately NON-BLOCKING — it catches all errors internally and
 * logs warnings so that the caller's HTTP response is never delayed or failed.
 *
 * Usage:
 *   parseAndSaveResume({ userId, relativePath, absolutePath, applicationId })
 *     .catch(() => {});  // fire-and-forget
 */

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const ParsedResume = require("../models/ParsedResume");
const User = require("../models/User");

const ML_BASE = process.env.ML_SERVICE_URL || process.env.ML_BASE_URL || "http://localhost:8000";

/**
 * @param {Object} opts
 * @param {string|ObjectId} opts.userId        - The user who owns the resume
 * @param {string}          opts.relativePath  - Web-relative path e.g. /uploads/resumes/abc.pdf
 * @param {string}          opts.absolutePath  - Absolute filesystem path to the PDF
 * @param {string|ObjectId} [opts.applicationId] - Optional linked application
 */
async function parseAndSaveResume({ userId, relativePath, absolutePath, applicationId = null }) {
  let resumeText = "";
  let skills = [];
  let predictedRole = null;

  // ── Step 1: Extract raw text from PDF ──────────────────────────────────────
  try {
    // pdf-parse is already installed in the backend
    const pdfParse = require("pdf-parse");
    if (fs.existsSync(absolutePath)) {
      const buffer = fs.readFileSync(absolutePath);
      const parsed = await pdfParse(buffer);
      resumeText = parsed.text || "";
    }
  } catch (e) {
    console.warn("[parseAndSaveResume] PDF text extraction failed:", e.message);
  }

  // ── Step 2: Call ML service to extract skills ──────────────────────────────
  try {
    const mlRes = await axios.post(
      `${ML_BASE}/extract-skills`,
      { filepath: relativePath },
      { timeout: 30000 },
    );
    skills = Array.isArray(mlRes.data?.skills) ? mlRes.data.skills : [];
  } catch (e) {
    console.warn("[parseAndSaveResume] ML /extract-skills failed:", e.message);
  }

  // ── Step 3: Fetch user profile to fill identity + experience fields ─────────
  let name = null;
  let email = null;
  let phone = null;
  let experienceYears = 0;
  let experience = [];
  let education = [];
  let certifications = [];

  try {
    const user = await User.findById(userId)
      .select("fullName username email mobileNumber experienceLevel experience education achievements")
      .lean();

    if (user) {
      name = user.fullName || user.username || null;
      email = user.email || null;
      phone = user.mobileNumber || null;
      experienceYears = user.experienceLevel || 0;

      // Map experience array to simplified schema
      if (Array.isArray(user.experience)) {
        experience = user.experience.map((ex) => ({
          company: ex.company || "",
          role: ex.role || "",
          duration: ex.startDate
            ? `${new Date(ex.startDate).getFullYear()} – ${ex.currentlyWorking ? "Present" : ex.endDate ? new Date(ex.endDate).getFullYear() : ""}`
            : "",
        }));
      }

      // Map education array
      if (Array.isArray(user.education)) {
        education = user.education.map((ed) => ({
          degree: ed.level || "",
          institution: ed.institution || "",
          year: ed.endYear || null,
          cgpa: ed.cgpa || null,
        }));
      }

      // Map achievements to certifications
      if (Array.isArray(user.achievements)) {
        certifications = user.achievements
          .map((a) => a.title)
          .filter(Boolean);
      }
    }
  } catch (e) {
    console.warn("[parseAndSaveResume] User lookup failed:", e.message);
  }

  // ── Step 4: Call ML service to predict job role ────────────────────────────
  if (skills.length > 0) {
    try {
      // Derive a qualification string from education
      const qualification =
        education.length > 0 ? (education[0].degree || "Bachelor") : "Bachelor";

      const roleRes = await axios.post(
        `${ML_BASE}/predict-role`,
        {
          skills,
          qualification,
          experience_years: experienceYears,
        },
        { timeout: 20000 },
      );
      predictedRole = roleRes.data?.role || null;
    } catch (e) {
      console.warn("[parseAndSaveResume] ML /predict-role failed:", e.message);
    }
  }

  // ── Step 5: Upsert ParsedResume document ───────────────────────────────────
  try {
    await ParsedResume.findOneAndUpdate(
      { userId },
      {
        $set: {
          userId,
          applicationId: applicationId || null,
          name,
          email,
          phone,
          skills,
          experience_years: experienceYears,
          experience,
          education,
          certifications,
          resume_text: resumeText,
          resume_file_path: relativePath,
          job_role_predicted: predictedRole,
          parsed_at: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    console.log(`[parseAndSaveResume] Saved ParsedResume for userId=${userId}`);
  } catch (e) {
    console.error("[parseAndSaveResume] DB upsert failed:", e.message);
  }
}

module.exports = parseAndSaveResume;

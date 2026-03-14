const axios = require("axios"); // for ml api call

const express = require("express"); // import express
const router = express.Router(); // create router
const Career = require("../models/Career"); // import career model
const Activity = require("../models/Activity"); // import activity model
const User = require("../models/User");
const QuizAttempt = require("../models/QuizAttempt");
const auth = require("../middleware/auth.middleware"); // auth middleware
const { resumeUpload } = require("../utils/Upload"); // multer config
const path = require("path"); // path module
const fs = require("fs"); // file system

// all routes require auth
router.use(auth);

// -----------------------------
// GET current user career data
// -----------------------------
router.get("/me", async (req, res) => {
  try {
    // Prefer Career document, but fallback to User profile data if not present
    const data = await Career.findOne({ userId: req.user.id });
    if (data) return res.json(data);
    const user = await User.findById(req.user.id).select(
      "skills experience education preferredRole expectedSalary fullName email mobileNumber",
    );
    if (!user)
      return res.status(404).json({ message: "No career/profile found" });
    return res.json({
      userId: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.mobileNumber,
      education: user.education || [],
      experience: user.experience || [],
      skills: user.skills || [],
      resumeUrl: user.resumeFilePath || undefined,
      careerGoal: user.careerGoal || undefined,
      preferredRole: user.preferredRole || undefined,
      expectedSalary: user.expectedSalary || undefined,
    });
  } catch (err) {
    res.status(500).json({
      message: "Error fetching career data",
      error: err.message,
    });
  }
});

// -----------------------------
// CREATE or UPDATE career data
// -----------------------------
router.post("/me", async (req, res) => {
  try {
    const update = { ...req.body, userId: req.user.id };

    // Save into Career collection
    const data = await Career.findOneAndUpdate(
      { userId: req.user.id },
      update,
      { returnDocument: "after", upsert: true, setDefaultsOnInsert: true },
    );

    // Also synchronize important fields into User profile so both views stay consistent
    const userUpdates = {};
    if (Array.isArray(req.body.skills)) userUpdates.skills = req.body.skills;
    if (Array.isArray(req.body.experience))
      userUpdates.experience = req.body.experience;
    if (Array.isArray(req.body.education))
      userUpdates.education = req.body.education;
    if (req.body.preferredRole !== undefined)
      userUpdates.preferredRole = req.body.preferredRole;
    if (req.body.expectedSalary !== undefined)
      userUpdates.expectedSalary = req.body.expectedSalary;

    if (Object.keys(userUpdates).length) {
      await User.findByIdAndUpdate(req.user.id, { $set: userUpdates });
      // log activity for profile sync
      await Activity.create({
        userId: req.user.id,
        type: "career_sync",
        message: "Career updated and synced to profile",
      }).catch(() => {});
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({
      message: "Error saving career data",
      error: err.message,
    });
  }
});

// multer single file
const pdfUpload = resumeUpload.single("file");

// -----------------------------
// UPLOAD RESUME (with ML integration and robust error handling)
// -----------------------------
router.post("/upload-resume", (req, res, next) => {
  pdfUpload(req, res, async function (err) {
    if (err) {
      return res.status(400).json({ error: err.message || "Upload error" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    if (req.file.mimetype !== "application/pdf") {
      return res.status(400).json({ error: "Only PDF files allowed" });
    }
    try {
      // store a web-accessible relative path
      const resumeUrl = `/uploads/resumes/${req.file.filename}`;
      // call ml service - use filesystem path so the ML service can access the file
      let extractedSkills = [];
      try {
        const fsPath = req.file.path.replace(/\\/g, "/");
        const mlResponse = await axios.post(
          "http://localhost:8000/extract-skills",
          { filepath: fsPath },
        );
        extractedSkills = mlResponse.data.skills || [];
      } catch (mlError) {
        return res
          .status(502)
          .json({ error: "ML service error", details: mlError.message });
      }
      // save resume + skills as a new snapshot and overwrite user's main skill list
      const data = await Career.findOneAndUpdate(
        { userId: req.user.id },
        {
          $set: { resumeUrl, extractedSkills },
          $push: { skillSnapshots: { skills: extractedSkills, resumeUrl } },
        },
        { returnDocument: "after", upsert: true, setDefaultsOnInsert: true },
      );

      // Overwrite the User.skills with extractedSkills (trimmed + unique). If no skills, clear.
      try {
        const cleaned = Array.isArray(extractedSkills)
          ? Array.from(
              new Set(
                extractedSkills.map((s) => String(s).trim()).filter(Boolean),
              ),
            )
          : [];
        await User.findByIdAndUpdate(req.user.id, {
          $set: { skills: cleaned, resumeFilePath: resumeUrl },
        });
      } catch (e) {
        console.error("Failed to update user skills:", e.message || e);
      }
      // log activity
      await Activity.create({
        userId: req.user.id,
        type: "resume_upload",
        message: "Resume uploaded and skills extracted",
      });
      // also sync resume path to user profile (only the path)
      try {
        await User.findByIdAndUpdate(req.user.id, {
          $set: { resumeFilePath: resumeUrl },
        });
      } catch (e) {}
      res.json({
        message: "Resume uploaded successfully",
        resumeUrl: data.resumeUrl,
        skills: extractedSkills,
        skillSnapshot:
          data.skillSnapshots &&
          data.skillSnapshots[data.skillSnapshots.length - 1],
      });
    } catch (err) {
      next(err);
    }
  });
});

// -----------------------------
// UPLOAD RESULT
// -----------------------------
router.post("/upload-result", (req, res) => {
  pdfUpload(req, res, async function (err) {
    if (err) {
      return res.status(400).json({
        message: err.message || "Upload error",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "No file uploaded",
      });
    }

    if (req.file.mimetype !== "application/pdf") {
      return res.status(400).json({
        message: "Only PDF files allowed",
      });
    }

    try {
      const resultUrl = req.file.path.replace(/\\/g, "/");

      const data = await Career.findOneAndUpdate(
        { userId: req.user.id },
        { resultUrl },
        { returnDocument: "after", upsert: true, setDefaultsOnInsert: true },
      );

      // log activity
      await Activity.create({
        userId: req.user.id,
        type: "result_upload",
        message: "Result uploaded",
      });
      // also sync resultUrl into user.education[0] if possible (best-effort)
      try {
        const user = await User.findById(req.user.id);
        if (
          user &&
          Array.isArray(user.education) &&
          user.education.length > 0
        ) {
          // attach to first education entry when career result uploaded (best-effort)
          user.education[0].resultFilePath = `/uploads/resumes/${req.file.filename}`;
          await user.save();
        }
      } catch (e) {}

      res.json({
        message: "Result uploaded successfully",
        resultUrl: data.resultUrl,
      });
    } catch (err) {
      res.status(500).json({
        message: "Error saving result",
        error: err.message,
      });
    }
  });
});

// -----------------------------
// DOWNLOAD RESUME
// -----------------------------
router.get("/download-resume", async (req, res) => {
  try {
    const data = await Career.findOne({ userId: req.user.id }, "resumeUrl");

    if (!data || !data.resumeUrl) {
      return res.status(404).json({
        message: "No resume found for the user",
      });
    }

    const filePath = path.join(__dirname, "../../", data.resumeUrl);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        message: "Resume file not found",
      });
    }

    res.download(filePath, path.basename(filePath));
  } catch (err) {
    res.status(500).json({
      message: "Error downloading resume",
      error: err.message,
    });
  }
});

// -----------------------------
// DOWNLOAD RESULT
// -----------------------------
router.get("/download-result", async (req, res) => {
  try {
    const data = await Career.findOne({ userId: req.user.id }, "resultUrl");

    if (!data || !data.resultUrl) {
      return res.status(404).json({
        message: "No result found for the user",
      });
    }

    const filePath = path.join(__dirname, "../../", data.resultUrl);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        message: "Result file not found",
      });
    }

    res.download(filePath, path.basename(filePath));
  } catch (err) {
    res.status(500).json({
      message: "Error downloading result",
      error: err.message,
    });
  }
});

// -----------------------------
// GET EXTRACTED SKILLS
// -----------------------------
router.get("/skills", async (req, res) => {
  try {
    const data = await Career.findOne(
      { userId: req.user.id },
      "extractedSkills",
    );

    if (!data) {
      return res.status(404).json({
        message: "Career profile not found",
      });
    }

    res.json({
      skills: data.extractedSkills || [],
    });
  } catch (err) {
    res.status(500).json({
      message: "Error fetching skills",
      error: err.message,
    });
  }
});

// -----------------------------
// SAVE SELECTED SKILLS
// -----------------------------
router.post("/select-skills", async (req, res) => {
  try {
    const { selectedSkills } = req.body;

    const data = await Career.findOneAndUpdate(
      { userId: req.user.id },
      { selectedSkills },
      { returnDocument: "after" },
    );

    res.json({
      message: "Selected skills saved",
      selectedSkills: data.selectedSkills,
    });
  } catch (err) {
    res.status(500).json({
      message: "Error saving selected skills",
      error: err.message,
    });
  }
});

// -----------------------------
// PREDICT ROLE FROM LATEST QUIZ ATTEMPT
// -----------------------------
router.get("/predict-from-quiz", async (req, res) => {
  try {
    // find latest submitted attempt for this user
    const attempt = await QuizAttempt.findOne({
      userId: req.user.id,
      status: "submitted",
    })
      .sort({ submittedAt: -1, createdAt: -1 })
      .lean();

    if (!attempt) {
      return res
        .status(404)
        .json({ message: "No submitted quiz attempt found" });
    }

    const summary = attempt.answersSummary || {};

    // Try to compute per-skill aggregates by joining answersSummary.answers with attempt.questionSet
    let skillsPayload = [];
    try {
      const answers = Array.isArray(summary.answers) ? summary.answers : [];
      const qset = Array.isArray(attempt.questionSet)
        ? attempt.questionSet
        : [];
      if (answers.length && qset.length) {
        const map = {}; // skill -> {obt, max}
        for (const a of answers) {
          const qid = a.questionId ?? a.question ?? a.qid ?? a.questionId;
          // locate question in the stored questionSet
          let q = qset.find(
            (qq) => String(qq.id ?? qq.questionId ?? qq.qid) === String(qid),
          );
          if (!q) {
            const idx = parseInt(String(qid), 10);
            if (!Number.isNaN(idx) && qset[idx - 1]) q = qset[idx - 1];
          }
          if (!q) continue;
          const sk =
            q.skill ||
            q.skillName ||
            q.tag ||
            (Array.isArray(q.skills) ? q.skills[0] : null);
          if (!sk) continue;
          const obt =
            Number(a.obtainedMarks ?? a.obtained ?? a.score ?? 0) || 0;
          const max = Number(q.max ?? q.marks ?? q.mark ?? q.weight ?? 4) || 4;
          map[sk] = map[sk] || { obt: 0, max: 0 };
          map[sk].obt += obt;
          map[sk].max += max;
        }
        const arr = Object.entries(map).map(([s, v]) => [
          s,
          v.max > 0 ? (v.obt / v.max) * 100 : 0,
        ]);
        arr.sort((a, b) => b[1] - a[1]);
        skillsPayload = arr.filter(([s, sc]) => sc >= 60).map(([s]) => s);
        if (!skillsPayload.length)
          skillsPayload = arr.slice(0, 5).map(([s]) => s);
      }
    } catch (e) {
      // ignore and fall back to legacy heuristics below
    }

    // legacy fallback heuristics
    if (!skillsPayload.length) {
      if (
        summary.perSkillScores &&
        typeof summary.perSkillScores === "object"
      ) {
        const arr = Object.entries(summary.perSkillScores).map(([s, v]) => [
          s,
          Number(v) || 0,
        ]);
        arr.sort((a, b) => b[1] - a[1]);
        const topVal = arr.length ? arr[0][1] : 0;
        const chosen = arr
          .filter(([s, sc]) => sc >= Math.max(0, topVal * 0.6))
          .map(([s]) => s);
        skillsPayload = chosen.length
          ? chosen
          : arr.slice(0, 5).map(([s]) => s);
      } else if (
        Array.isArray(summary.questionSkills) &&
        summary.questionSkills.length
      ) {
        const map = {};
        for (const q of summary.questionSkills) {
          const sk = q.skill || q.skillName || q.tag;
          if (!sk) continue;
          map[sk] = map[sk] || { obt: 0, max: 0 };
          map[sk].obt += Number(q.obtained ?? q.score ?? 0);
          map[sk].max += Number(q.max ?? q.total ?? q.weight ?? 1);
        }
        const arr = Object.entries(map).map(([s, v]) => [
          s,
          v.max > 0 ? (v.obt / v.max) * 100 : 0,
        ]);
        arr.sort((a, b) => b[1] - a[1]);
        skillsPayload = arr.filter(([s, sc]) => sc >= 60).map(([s]) => s);
        if (!skillsPayload.length)
          skillsPayload = arr.slice(0, 5).map(([s]) => s);
      } else if (
        Array.isArray(summary.perQuestion) &&
        summary.perQuestion.length
      ) {
        const map = {};
        for (const q of summary.perQuestion) {
          const sk = q.skill || q.skills || q.tag;
          if (!sk) continue;
          map[sk] = map[sk] || { obt: 0, max: 0 };
          map[sk].obt += Number(q.obtained ?? q.score ?? 0);
          map[sk].max += Number(q.max ?? q.total ?? q.weight ?? 1);
        }
        const arr = Object.entries(map).map(([s, v]) => [
          s,
          v.max > 0 ? (v.obt / v.max) * 100 : 0,
        ]);
        arr.sort((a, b) => b[1] - a[1]);
        skillsPayload = arr.filter(([s, sc]) => sc >= 60).map(([s]) => s);
        if (!skillsPayload.length)
          skillsPayload = arr.slice(0, 5).map(([s]) => s);
      }
    }

    // final fallback to attempt.skills or Career/User skills
    if (!skillsPayload.length) {
      if (Array.isArray(attempt.skills) && attempt.skills.length) {
        skillsPayload = attempt.skills.slice(0, 5);
      } else {
        const career = await Career.findOne({ userId: req.user.id }).lean();
        if (
          career &&
          Array.isArray(career.extractedSkills) &&
          career.extractedSkills.length
        )
          skillsPayload = career.extractedSkills.slice(0, 5);
        else {
          const user = await User.findById(req.user.id).lean();
          if (user && Array.isArray(user.skills) && user.skills.length)
            skillsPayload = user.skills.slice(0, 5);
        }
      }
    }

    // get qualification and experience
    const careerDoc = await Career.findOne({ userId: req.user.id });
    const userDoc = await User.findById(req.user.id);

    const qualificationObj =
      careerDoc && careerDoc.education && careerDoc.education.length
        ? careerDoc.education[0]
        : userDoc &&
            Array.isArray(userDoc.education) &&
            userDoc.education.length
          ? userDoc.education[0]
          : null;

    const qualification = qualificationObj
      ? qualificationObj.level || qualificationObj.institution || ""
      : "";
    const experienceYears =
      careerDoc && careerDoc.experience && careerDoc.experience.length
        ? careerDoc.experience[0].years || careerDoc.experience[0].duration || 0
        : userDoc && userDoc.experience && userDoc.experience.length
          ? userDoc.experience[0].years || 0
          : 0;

    // call ML service
    let mlResp = null;
    try {
      mlResp = await axios.post(
        "http://localhost:8000/predict-role",
        {
          skills: skillsPayload,
          qualification,
          experience_years: Number(experienceYears) || 0,
        },
        { timeout: 12000 },
      );
    } catch (err) {
      return res
        .status(502)
        .json({ error: "ML service error", details: err.message });
    }

    return res.json({
      prediction: mlResp.data,
      usedSkills: skillsPayload,
      attemptId: attempt._id,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Error predicting from quiz", error: err.message });
  }
});

module.exports = router;

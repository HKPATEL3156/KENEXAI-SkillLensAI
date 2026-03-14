const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    jobRoleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobRole",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["applied", "shortlisted", "rejected", "selected"],
      default: "applied",
    },
    quizScore: { type: Number },
    quizAttemptId: { type: mongoose.Schema.Types.ObjectId, ref: "QuizAttempt" },
    // optional resume file path (relative web path)
    resumePath: { type: String },
    // extracted resume text (if parsed)
    resumeText: { type: String, default: "" },
    // optional cover letter provided during apply
    coverLetter: { type: String, default: "" },
    // Resume screening score from ML service (0-100)
    resumeScore: { type: Number, default: 0 },
    // Applicant academic information (CGPA / percentage / marks etc.)
    academic: {
      degree: { type: String },
      institution: { type: String },
      cgpa: { type: Number },
      percentage: { type: Number },
      yearOfPassing: { type: Number },
    },
    // Applicant-provided confirmation checkbox (e.g., confirm fields are correct)
    consentConfirmed: { type: Boolean, default: false },
    // Flag indicating whether missing PII was synthesized to complete the profile
    piiSynthesized: { type: Boolean, default: false },
    // Optional notes added by company reviewers
    companyNotes: { type: String, default: "" },
  },
  { timestamps: true },
);

// One application per user per job
applicationSchema.index({ jobRoleId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("Application", applicationSchema);

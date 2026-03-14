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
      enum: ["applied", "shortlisted", "rejected"],
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
  },
  { timestamps: true },
);

// One application per user per job
applicationSchema.index({ jobRoleId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("Application", applicationSchema);

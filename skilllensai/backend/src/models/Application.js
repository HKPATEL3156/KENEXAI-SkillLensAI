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
  },
  { timestamps: true }
);

// One application per user per job
applicationSchema.index({ jobRoleId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("Application", applicationSchema);

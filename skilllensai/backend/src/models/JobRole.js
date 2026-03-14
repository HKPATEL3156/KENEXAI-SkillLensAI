const mongoose = require("mongoose");

const jobRoleSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    // minimum total experience in years expected for this role
    minExperienceYears: { type: Number, default: 0 },
    // raw text extracted from the uploaded JD PDF
    description: { type: String, default: "" },
    skills: { type: [String], default: [] },
    minScore: { type: Number, default: 0 },
    // stored path for the uploaded JD PDF (web-accessible relative path)
    jdFilePath: { type: String },
    status: {
      type: String,
      enum: ["active", "closed"],
      default: "active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("JobRole", jobRoleSchema);

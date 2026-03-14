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
    // employment type: full-time, part-time, internship, contract, other
    employmentType: {
      type: String,
      enum: ["full-time", "part-time", "internship", "contract", "other"],
      default: "full-time",
    },
    // raw text extracted from the uploaded JD PDF
    description: { type: String, default: "" },
    // canonical list of required skills
    skills: { type: [String], default: [] },
    // minimum quiz / screening score percent expected
    minScore: { type: Number, default: 0 },
    // stored path for the uploaded JD PDF (web-accessible relative path)
    jdFilePath: { type: String },
    // primary location for the job (city, state, country string)
    location: { type: String, default: "" },
    // optional additional metadata for scoring or tags
    meta: { type: Object, default: {} },
    status: {
      type: String,
      enum: ["active", "closed"],
      default: "active",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("JobRole", jobRoleSchema);

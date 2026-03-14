const mongoose = require("mongoose");

const experienceEntrySchema = new mongoose.Schema(
  {
    company: { type: String, default: "" },
    role: { type: String, default: "" },
    duration: { type: String, default: "" },
  },
  { _id: false },
);

const educationEntrySchema = new mongoose.Schema(
  {
    degree: { type: String, default: "" },
    institution: { type: String, default: "" },
    year: { type: Number },
    cgpa: { type: Number },
  },
  { _id: false },
);

const parsedResumeSchema = new mongoose.Schema(
  {
    // Owner of this parsed resume
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Linked application (optional — present when uploaded during job apply)
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      default: null,
    },

    // Extracted identity fields
    name: { type: String, default: null },
    email: { type: String, default: null },
    phone: { type: String, default: null },

    // Extracted technical profile
    skills: { type: [String], default: [] },
    experience_years: { type: Number, default: 0 },
    experience: { type: [experienceEntrySchema], default: [] },
    education: { type: [educationEntrySchema], default: [] },
    certifications: { type: [String], default: [] },

    // Raw resume text (full PDF text dump)
    resume_text: { type: String, default: "" },

    // Web-accessible relative path (/uploads/resumes/...)
    resume_file_path: { type: String, default: null },

    // ML prediction output
    job_role_predicted: { type: String, default: null },

    // When this document was created/updated by the parser
    parsed_at: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// Upsert-safe index: one ParsedResume per user (overwrite on re-upload)
parsedResumeSchema.index({ userId: 1 }, { unique: true });

module.exports = mongoose.model("ParsedResume", parsedResumeSchema);

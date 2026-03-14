const mongoose = require("mongoose");

const careerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    fullName: { type: String },
    email: { type: String },
    phone: { type: String },
    education: [
      {
        institution: String,
        degree: String,
        fieldOfStudy: String,
        startYear: String,
        endYear: String,
      },
    ],
    experience: [
      {
        company: String,
        role: String,
        duration: String,
        description: String,
      },
    ],
    skills: [String],
    projects: [
      {
        title: String,
        description: String,
        technologies: [String],
        link: String,
      },
    ],
    resumeUrl: { type: String },
    resultUrl: { type: String },
    careerGoal: { type: String },
    achievements: [String],
    extractedSkills: {
      type: [String],
      default: [],
    },
    selectedSkills: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Career", careerSchema);

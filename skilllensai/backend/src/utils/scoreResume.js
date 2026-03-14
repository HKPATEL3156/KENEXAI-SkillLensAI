/**
 * scoreResume.js
 * Pure in-memory scoring — no DB calls, no async.
 * Job field mapping (actual JobRole schema):
 *   requiredSkills → job.skills
 *   minExperience  → job.minExperienceYears
 */

function scoreResume(parsedResume, job) {
  const candidateSkills = (parsedResume.skills || []).map((s) =>
    String(s).toLowerCase().trim(),
  );
  const requiredSkills = (job.skills || []).map((s) =>
    String(s).toLowerCase().trim(),
  );
  const minExperience = Number(job.minExperienceYears) || 0;
  const experienceYears = Number(parsedResume.experience_years) || 0;
  const predictedRole = String(parsedResume.job_role_predicted || "").toLowerCase();
  const jobTitle = String(job.title || "").toLowerCase();
  const education = parsedResume.education || [];

  // A. Skill Match — 50 pts
  let matchedSkills = [];
  let missingSkills = [];
  let skillScore;
  if (requiredSkills.length === 0) {
    skillScore = 50;
  } else {
    matchedSkills = requiredSkills.filter((s) => candidateSkills.includes(s));
    missingSkills = requiredSkills.filter((s) => !candidateSkills.includes(s));
    skillScore = Math.min((matchedSkills.length / requiredSkills.length) * 50, 50);
  }

  // B. Experience — 20 pts
  let experienceScore;
  if (minExperience === 0) {
    experienceScore = 20;
  } else if (experienceYears >= minExperience) {
    experienceScore = 20;
  } else {
    experienceScore = (experienceYears / minExperience) * 20;
  }

  // C. Role Prediction Match — 20 pts
  const roleScore =
    predictedRole && jobTitle && jobTitle.includes(predictedRole) ? 20 :
    predictedRole && jobTitle && predictedRole.includes(jobTitle) ? 20 : 0;

  // D. Education — 10 pts
  const educationScore = education.length > 0 ? 10 : 0;

  const totalScore =
    Math.round((skillScore + experienceScore + roleScore + educationScore) * 10) / 10;
  const percentage = totalScore; // already out of 100

  let fitLabel;
  if (totalScore >= 80) fitLabel = "Excellent Fit";
  else if (totalScore >= 60) fitLabel = "Good Fit";
  else if (totalScore >= 40) fitLabel = "Moderate Fit";
  else fitLabel = "Low Fit";

  return {
    userId: parsedResume.userId,
    name: parsedResume.name || null,
    email: parsedResume.email || null,
    phone: parsedResume.phone || null,
    skills: parsedResume.skills || [],
    matchedSkills,
    missingSkills,
    experience_years: experienceYears,
    education,
    certifications: parsedResume.certifications || [],
    job_role_predicted: parsedResume.job_role_predicted || null,
    resume_file_path: parsedResume.resume_file_path || null,
    parsed_at: parsedResume.parsed_at || null,
    scores: {
      skillScore: Math.round(skillScore * 10) / 10,
      experienceScore: Math.round(experienceScore * 10) / 10,
      roleScore,
      educationScore,
      totalScore,
      percentage: Math.round(percentage * 10) / 10,
    },
    fitLabel,
  };
}

module.exports = scoreResume;

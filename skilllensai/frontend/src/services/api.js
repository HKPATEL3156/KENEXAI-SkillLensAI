import axios from "axios";

const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Profile APIs
export const getProfile = () => api.get("/profile/me");
export const patchProfile = (data) => api.patch("/profile", data);
export const uploadProfilePhoto = (file) => {
  const formData = new FormData();
  formData.append("profileImage", file);
  return api.post("/profile/photo", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
export const uploadResume = (file) => {
  const formData = new FormData();
  formData.append("resume", file);
  return api.post("/profile/resume", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const uploadEducationResult = (file, educationIndex) => {
  const formData = new FormData();
  formData.append("file", file);
  if (educationIndex !== undefined && educationIndex !== null)
    formData.append("educationIndex", String(educationIndex));
  return api.post("/profile/education/result", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// Career (legacy) APIs kept for compatibility
export const getCareer = () => api.get("/career/me");
export const updateCareer = (data) => api.post("/career/me", data);
export const uploadCareerResume = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post("/career/upload-resume", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
export const uploadResult = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post("/career/upload-result", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
export const downloadCareerResume = () =>
  api.get("/career/download-resume", { responseType: "blob" });
export const downloadResult = () =>
  api.get("/career/download-result", { responseType: "blob" });

// Backwards-compatible aliases used by some pages
export const downloadResume = () =>
  api.get("/career/download-resume", { responseType: "blob" });

// Quiz endpoints
export const getQuestions = (attemptId) =>
  api.get(`/quiz/questions${attemptId ? `?attemptId=${attemptId}` : ""}`);
export const startQuiz = (data) => api.post("/quiz/start", data);
export const submitQuiz = (data) => api.post("/quiz/submit", data);
export const saveQuizCheckpoint = (data) => api.post("/quiz/save", data);
export const getQuizAttempts = () => api.get("/quiz/attempts");
export const generateQuiz = (data) => api.post("/quiz/generate", data);
export const getGenerateStatus = (jobId) =>
  api.get(`/quiz/generate/status?jobId=${jobId}`);
export const getGenerateLogs = (jobId) =>
  api.get(`/quiz/generate/logs?jobId=${jobId}`);
export const getPaperStatus = () => api.get("/quiz/paper-status");

export const changePassword = (data) => api.post("/auth/change-password", data);
export const deleteAccount = () => api.delete("/auth/delete-account");

// Company dashboard APIs
const companyApi = axios.create({ baseURL: "/api" });
companyApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("companyToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
export const companyLogin = (data) => companyApi.post("/company/login", data);
export const getCompanyProfile = () =>
  companyApi.get("/company/dashboard/profile");
export const updateCompanyProfile = (data) =>
  companyApi.patch("/company/dashboard/profile", data);
export const getCompanyStats = () => companyApi.get("/company/dashboard/stats");
export const getCompanyCandidates = (params) =>
  companyApi.get("/company/dashboard/candidates", { params });
export const getCompanyJobs = () => companyApi.get("/company/dashboard/jobs");
export const createCompanyJob = (data) => {
  const form = new FormData();
  Object.entries(data || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      form.append(key, value);
    }
  });
  return companyApi.post("/company/dashboard/jobs", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
export const updateCompanyJob = (id, data) =>
  companyApi.patch(`/company/dashboard/jobs/${id}`, data);
export const deleteCompanyJob = (id) =>
  companyApi.delete(`/company/dashboard/jobs/${id}`);

// Student: apply to job
export const applyToJob = (jobId) => api.post(`/jobs/${jobId}/apply`);

// Apply with optional resume file and cover letter
export const applyToJobWithResume = (jobId, file, coverLetter) => {
  const form = new FormData();
  if (file) form.append("resume", file);
  if (coverLetter) form.append("coverLetter", coverLetter);
  return api.post(`/jobs/${jobId}/apply`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export default api;

const multer = require("multer");
const path = require("path");
const fs = require("fs");

const resumeStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, "../../uploads/resumes");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    // Use user id if available, else timestamp
    const userId = req.user ? req.user._id || req.user.id : "anon";
    cb(null, userId + "_" + Date.now() + ext);
  },
});

const resumeFileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF and DOCX files allowed"), false);
  }
};

const resumeUpload = multer({
  storage: resumeStorage,
  fileFilter: resumeFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Profile image storage (photos)
const profileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, "../../uploads/profile-photos");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const userId = req.user ? req.user._id || req.user.id : "anon";
    cb(null, userId + "_" + Date.now() + ext);
  },
});

const profileFileFilter = (req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith("image/")) cb(null, true);
  else cb(new Error("Only image files are allowed for profile photo"), false);
};

const profileUpload = multer({
  storage: profileStorage,
  fileFilter: profileFileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

// Education result storage (PDF or image)
const educationResultStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, "../../uploads/education-results");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const userId = req.user ? req.user._id || req.user.id : "anon";
    cb(null, userId + "_edu_" + Date.now() + ext);
  },
});

const educationResultFileFilter = (req, file, cb) => {
  const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else
    cb(
      new Error("Only PDF or image files allowed for education result"),
      false,
    );
};

const educationResultUpload = multer({
  storage: educationResultStorage,
  fileFilter: educationResultFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

module.exports = {
  resumeUpload,
  profileUpload,
  educationResultUpload,
};

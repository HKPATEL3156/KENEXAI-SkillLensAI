const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

// Load env variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Ensure uploads directories exist
const resumesDir = path.join(__dirname, "uploads/resumes");
const profilePhotosDir = path.join(__dirname, "uploads/profile-photos");
const companyDocsDir = path.join(__dirname, "uploads/company-docs");
if (!fs.existsSync(resumesDir)) fs.mkdirSync(resumesDir, { recursive: true });
if (!fs.existsSync(profilePhotosDir))
  fs.mkdirSync(profilePhotosDir, { recursive: true });
if (!fs.existsSync(companyDocsDir))
  fs.mkdirSync(companyDocsDir, { recursive: true });

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Import routes
const careerRoutes = require("./src/routes/careerRoutes");
const authRoutes = require("./src/routes/auth.routes");
const profileRoutes = require("./src/routes/profile.routes");
const activityRoutes = require("./src/routes/activity.routes");
const quizRoutes = require("./src/routes/quizRoutes");
const companyRoutes = require("./src/routes/company.routes");
const adminRoutes = require("./src/routes/admin.routes");

// Use routes
app.use("/api/career", careerRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/admin", adminRoutes);

// Centralized error handler
const errorHandler = require("./src/middleware/errorHandler");
app.use(errorHandler);

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected successfully...");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

// Start server
const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});

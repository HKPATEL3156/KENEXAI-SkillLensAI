const Company = require("../models/Company");
const User = require("../models/User");
const QuizAttempt = require("../models/QuizAttempt");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "dev_admin_secret";

// Middleware: verify company JWT
exports.verifyCompany = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer "))
    return res.status(401).json({ message: "Missing token" });
  const token = auth.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== "company")
      return res.status(403).json({ message: "Forbidden" });
    req.company = payload;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// GET /api/company/dashboard/profile
exports.getProfile = async (req, res, next) => {
  try {
    const company = await Company.findById(req.company.companyId).select(
      "-password"
    );
    if (!company) return res.status(404).json({ message: "Not found" });
    res.json({ company });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/company/dashboard/profile
exports.updateProfile = async (req, res, next) => {
  try {
    const { companyName, contactName, contactPhone, address } = req.body;
    const updated = await Company.findByIdAndUpdate(
      req.company.companyId,
      { companyName, contactName, contactPhone, address },
      { new: true, runValidators: true }
    ).select("-password");
    res.json({ company: updated });
  } catch (err) {
    next(err);
  }
};

// GET /api/company/dashboard/stats
exports.getStats = async (req, res, next) => {
  try {
    const [totalCandidates, totalAttempts, topAttempts] = await Promise.all([
      User.countDocuments(),
      QuizAttempt.countDocuments({ status: "submitted" }),
      QuizAttempt.find({ status: "submitted" })
        .sort({ obtainedMarks: -1 })
        .limit(5)
        .populate("userId", "fullName email"),
    ]);

    const avgAgg = await QuizAttempt.aggregate([
      { $match: { status: "submitted" } },
      {
        $group: {
          _id: null,
          totalScore: { $sum: "$obtainedMarks" },
          totalMax: { $sum: "$totalMarks" },
        },
      },
    ]);

    const avgScore =
      avgAgg.length && avgAgg[0].totalMax > 0
        ? Math.round((avgAgg[0].totalScore / avgAgg[0].totalMax) * 100)
        : 0;

    const topPerformers = topAttempts.map((a) => ({
      id: a._id,
      name: a.userId?.fullName || a.userId?.email || "Unknown",
      email: a.userId?.email || "",
      scorePercent:
        a.totalMarks > 0
          ? Math.round((a.obtainedMarks / a.totalMarks) * 100)
          : 0,
      quizName: a.quizName || "",
    }));

    res.json({ totalCandidates, totalAttempts, avgScore, topPerformers });
  } catch (err) {
    next(err);
  }
};

// GET /api/company/dashboard/candidates
exports.getCandidates = async (req, res, next) => {
  try {
    const { q = "", page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter = q
      ? {
          $or: [
            { fullName: { $regex: q, $options: "i" } },
            { email: { $regex: q, $options: "i" } },
            { skills: { $elemMatch: { $regex: q, $options: "i" } } },
          ],
        }
      : {};

    const [candidates, total] = await Promise.all([
      User.find(filter)
        .select("fullName email username skills headline primaryLocation createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(filter),
    ]);

    res.json({ candidates, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
};

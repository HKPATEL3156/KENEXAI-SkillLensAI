const jwt = require("jsonwebtoken");
const Company = require("../models/Company");
const User = require("../models/User");
const Admin = require("../models/Admin");
const QuizAttempt = require("../models/QuizAttempt");
const bcrypt = require("bcryptjs");

const JWT_SECRET = process.env.JWT_SECRET || "dev_admin_secret";

// Login: try DB admin first, then fallback to env-fixed admin
exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // TEMP DEBUG LOGS - remove in production
    console.log("[ADMIN LOGIN] attempt", { username });
    console.log(
      "[ADMIN LOGIN] ENV ADMIN_USERNAME, ADMIN_EMAIL:",
      process.env.ADMIN_USERNAME,
      process.env.ADMIN_EMAIL,
    );

    // 1) DB lookup (allow username OR email in the login field)
    const admin = await Admin.findOne({
      $or: [{ username }, { email: username }],
    }).select("+password email username");
    if (admin) {
      console.log("[ADMIN LOGIN] found admin in DB", {
        id: admin._id,
        email: admin.email,
      });
      const match = await bcrypt.compare(password, admin.password);
      console.log("[ADMIN LOGIN] password match:", match);
      if (match) {
        const token = jwt.sign(
          { role: "admin", id: admin._id, email: admin.email },
          JWT_SECRET,
          { expiresIn: "8h" },
        );
        return res.json({ token, email: admin.email });
      }
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 2) Fallback to env fixed admin (accept either env username OR env email in login field)
    const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "Admin";
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@0258";
    const ADMIN_EMAIL =
      process.env.ADMIN_EMAIL || "admin.skilllensai@gmail.com";

    console.log("[ADMIN LOGIN] env fallback check", {
      ADMIN_USERNAME,
      ADMIN_EMAIL,
    });
    if (
      (username === ADMIN_USERNAME || username === ADMIN_EMAIL) &&
      password === ADMIN_PASSWORD
    ) {
      console.log("[ADMIN LOGIN] env fallback success");
      const token = jwt.sign(
        { role: "admin", email: ADMIN_EMAIL },
        JWT_SECRET,
        { expiresIn: "8h" },
      );
      return res.json({ token, email: ADMIN_EMAIL });
    }
    console.log("[ADMIN LOGIN] auth failed for", username);

    return res.status(401).json({ message: "Invalid credentials" });
  } catch (err) {
    next(err);
  }
};

exports.register = async (req, res, next) => {
  try {
    // Allow register if no admin exists OR when caller supplies a valid setup key + force flag
    const existing = await Admin.countDocuments();
    const force = req.body.force === true || req.body.force === "true";
    const setupKey = req.body.setupKey || req.headers["x-setup-key"];
    const ADMIN_SETUP_KEY = process.env.ADMIN_SETUP_KEY || "";

    if (
      existing > 0 &&
      !(force && ADMIN_SETUP_KEY && setupKey === ADMIN_SETUP_KEY)
    ) {
      return res.status(403).json({
        message:
          "Admin already exists. To force create provide setupKey and force=true.",
      });
    }

    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ message: "Missing fields" });

    const hashed = await bcrypt.hash(password, 10);
    // If forcing and admins exist, remove existing admins first (replace) to ensure single admin
    if (
      force &&
      ADMIN_SETUP_KEY &&
      setupKey === ADMIN_SETUP_KEY &&
      existing > 0
    ) {
      await Admin.deleteMany({});
    }

    const admin = await Admin.create({ username, email, password: hashed });
    res.status(201).json({
      message: "Admin created",
      admin: { username: admin.username, email: admin.email },
    });
  } catch (err) {
    next(err);
  }
};

exports.verifyAdmin = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer "))
    return res.status(401).json({ message: "Missing token" });
  const token = auth.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== "admin")
      return res.status(403).json({ message: "Forbidden" });
    req.admin = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find()
      .select("email fullName username createdAt")
      .sort({ createdAt: -1 });
    res.json({ data: users });
  } catch (err) {
    next(err);
  }
};

exports.getCompanyRequests = async (req, res, next) => {
  try {
    const list = await Company.find().sort({ createdAt: -1 });
    res.json({ data: list });
  } catch (err) {
    next(err);
  }
};

exports.approveCompany = async (req, res, next) => {
  try {
    const id = req.params.id;
    const comp = await Company.findByIdAndUpdate(
      id,
      { status: "approved", allowedToRecruit: true },
      { new: true },
    );
    if (!comp) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Approved", company: comp });
  } catch (err) {
    next(err);
  }
};

exports.rejectCompany = async (req, res, next) => {
  try {
    const id = req.params.id;
    const comp = await Company.findByIdAndUpdate(
      id,
      { status: "rejected", allowedToRecruit: false },
      { new: true },
    );
    if (!comp) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Rejected", company: comp });
  } catch (err) {
    next(err);
  }
};

exports.getSummary = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalCompanies,
      pendingCompanies,
      approvedCompanies,
      quizAgg,
      topAttempts,
      scoreBuckets,
      skillAgg,
    ] = await Promise.all([
      User.countDocuments(),
      Company.countDocuments(),
      Company.countDocuments({ status: "pending" }),
      Company.countDocuments({ status: "approved" }),
      QuizAttempt.aggregate([
        { $match: { status: "submitted" } },
        {
          $group: {
            _id: null,
            totalScore: { $sum: "$obtainedMarks" },
            totalMax: { $sum: "$totalMarks" },
            count: { $sum: 1 },
          },
        },
      ]),
      QuizAttempt.find({ status: "submitted" })
        .sort({ obtainedMarks: -1 })
        .limit(5)
        .populate("userId", "fullName email"),
      QuizAttempt.aggregate([
        { $match: { status: "submitted", totalMarks: { $gt: 0 } } },
        {
          $project: {
            percent: {
              $multiply: [{ $divide: ["$obtainedMarks", "$totalMarks"] }, 100],
            },
          },
        },
        {
          $bucket: {
            groupBy: "$percent",
            boundaries: [0, 60, 75, 90, 101],
            default: "other",
            output: { count: { $sum: 1 } },
          },
        },
      ]),
      QuizAttempt.aggregate([
        { $match: { status: "submitted" } },
        { $unwind: "$skills" },
        {
          $group: {
            _id: "$skills",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
    ]);

    let averageScorePercent = 0;
    let totalQuizAttempts = 0;
    if (quizAgg && quizAgg.length > 0) {
      const { totalScore, totalMax, count } = quizAgg[0];
      totalQuizAttempts = count;
      if (totalMax > 0) {
        averageScorePercent = Math.round((totalScore / totalMax) * 100);
      }
    }

    const topPerformers = topAttempts.map((a) => {
      const percent =
        a.totalMarks > 0
          ? Math.round((a.obtainedMarks / a.totalMarks) * 100)
          : 0;
      return {
        id: a._id,
        userId: a.userId?._id,
        name: a.userId?.fullName || a.userId?.email || "Unknown",
        email: a.userId?.email,
        quizName: a.quizName,
        scorePercent: percent,
      };
    });

    const scoreDistribution = {
      "0_60": 0,
      "60_75": 0,
      "75_90": 0,
      "90_100": 0,
    };
    scoreBuckets.forEach((b) => {
      const key =
        b._id < 60
          ? "0_60"
          : b._id < 75
          ? "60_75"
          : b._id < 90
          ? "75_90"
          : "90_100";
      scoreDistribution[key] += b.count;
    });

    const topSkills = skillAgg.map((s) => ({
      name: s._id,
      count: s.count,
    }));

    res.json({
      totals: {
        users: totalUsers,
        companies: totalCompanies,
        pendingCompanies,
        approvedCompanies,
      },
      quiz: {
        totalAttempts: totalQuizAttempts,
        averageScorePercent,
        topPerformers,
        scoreDistribution,
        topSkills,
      },
    });
  } catch (err) {
    next(err);
  }
};

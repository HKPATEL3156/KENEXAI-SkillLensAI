const Company = require("../models/Company");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.register = async (req, res, next) => {
  try {
    const {
      companyName,
      address,
      country,
      email,
      password,
      contactName,
      contactPhone,
    } = req.body;
    if (!companyName || !email || !password)
      return res.status(400).json({ message: "Missing required fields" });

    const existing = await Company.findOne({ email });
    if (existing)
      return res.status(400).json({ message: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);
    let addr = {};
    try {
      addr = address ? JSON.parse(address) : {};
    } catch (e) {
      addr = { raw: address || "" };
    }

    const docPath = req.file
      ? `/uploads/company-docs/${req.file.filename}`
      : undefined;

    const company = await Company.create({
      companyName,
      contactName,
      contactPhone,
      email,
      password: hashed,
      address: { ...addr, country },
      documentPath: docPath,
      status: "pending",
    });

    res.status(201).json({ message: "Company request submitted", company });
  } catch (err) {
    next(err);
  }
};

exports.listRequests = async (req, res, next) => {
  try {
    const list = await Company.find().sort({ createdAt: -1 });
    res.json({ data: list });
  } catch (err) {
    next(err);
  }
};

exports.approve = async (req, res, next) => {
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

exports.reject = async (req, res, next) => {
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

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res
        .status(400)
        .json({ message: "Email and password are required" });

    const company = await Company.findOne({ email }).select(
      "+password status allowedToRecruit",
    );
    if (!company) return res.status(404).json({ message: "Company not found" });

    if (company.status !== "approved" || !company.allowedToRecruit) {
      return res.status(403).json({
        message: "Company is not approved to login yet",
      });
    }

    const match = await bcrypt.compare(password, company.password);
    if (!match) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!process.env.JWT_SECRET) {
      return res
        .status(500)
        .json({ message: "Server authentication misconfigured" });
    }

    const token = jwt.sign(
      {
        role: "company",
        companyId: company._id,
        email: company.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" },
    );

    res.json({
      token,
      company: {
        id: company._id,
        companyName: company.companyName,
        email: company.email,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res
        .status(400)
        .json({ message: "Email and password are required" });

    const company = await Company.findOne({ email }).select(
      "+password status allowedToRecruit",
    );
    if (!company) return res.status(404).json({ message: "Company not found" });

    if (company.status !== "approved" || !company.allowedToRecruit) {
      return res.status(403).json({
        message: "Company is not approved to login yet",
      });
    }

    const match = await bcrypt.compare(password, company.password);
    if (!match) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!process.env.JWT_SECRET) {
      return res
        .status(500)
        .json({ message: "Server authentication misconfigured" });
    }

    const token = jwt.sign(
      {
        role: "company",
        companyId: company._id,
        email: company.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" },
    );

    res.json({
      token,
      company: {
        id: company._id,
        companyName: company.companyName,
        email: company.email,
      },
    });
  } catch (err) {
    next(err);
  }
};

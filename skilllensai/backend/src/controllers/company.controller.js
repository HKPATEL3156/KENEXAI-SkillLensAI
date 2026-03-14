const Company = require("../models/Company");
const bcrypt = require("bcryptjs");

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

const mongoose = require("mongoose");

const companySchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true },
    contactName: { type: String },
    contactPhone: { type: String },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, select: false },
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },
    documentPath: { type: String },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    allowedToRecruit: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Company", companySchema);

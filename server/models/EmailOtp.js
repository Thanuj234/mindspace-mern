const mongoose = require("mongoose");

const emailOtpSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true, unique: true },
  otpHash: { type: String, required: true, select: false },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, expires: 0 },
}, { versionKey: false });

module.exports = mongoose.model("EmailOtp", emailOtpSchema);

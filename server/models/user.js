const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    interests: {
      type: [String],
      default: [],
    },
    bio: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    location: {
      type: String,
      default: "",
      trim: true,
      maxlength: 120,
    },
    profilePhoto: {
      type: String,
      default: "",
    },
    isProfilePublic: {
      type: Boolean,
      default: false,
    },
    privateGoals: {
      type: [String],
      default: [],
    },
    yearlyReflection: {
      type: String,
      default: "",
      maxlength: 3000,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);

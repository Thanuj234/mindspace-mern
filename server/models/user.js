const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    // New registrations use username; optional keeps existing Atlas users valid.
    username: {
      type: String,
      trim: true,
      lowercase: true,
      minlength: 4,
      maxlength: 30,
      match: /^[a-z0-9_.]{4,30}$/,
      unique: true,
      sparse: true,
    },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    interests: { type: [String], default: [] },
    // Preserve the Follow/Unfollow social graph already used by MindSpace.
    following: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], default: [] },
    followers: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], default: [] },
    bio: { type: String, default: "", trim: true, maxlength: 500 },
    location: { type: String, default: "", trim: true, maxlength: 120 },
    profilePhoto: { type: String, default: "" },
    isProfilePublic: { type: Boolean, default: false },
    privateGoals: { type: [String], default: [] },
    yearlyReflection: { type: String, default: "", maxlength: 3000 },
    bookmarks: [
  {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Blog",
  },
],
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);

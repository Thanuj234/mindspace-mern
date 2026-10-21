const mongoose = require("mongoose");

const mediaSchema = new mongoose.Schema({
  url: { type: String, required: true },
  publicId: { type: String, default: "" },
  resourceType: { type: String, enum: ["image", "video"], default: "image" },
  originalName: { type: String, default: "" },
  format: { type: String, default: "" },
  bytes: { type: Number, default: 0 }
}, { _id: false });

const blogSchema = new mongoose.Schema({
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 150 },
  summary: { type: String, trim: true, maxlength: 300, default: "" },
  content: { type: String, required: true, maxlength: 100000 },
  category: { type: String, default: "General" },
  tags: { type: [String], default: [] },
  coverImage: { type: mediaSchema, default: null },
  media: { type: [mediaSchema], default: [] },
  status: { type: String, enum: ["draft", "published"], default: "draft" }
}, { timestamps: true });

module.exports = mongoose.model("Blog", blogSchema);

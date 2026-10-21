const mongoose = require("mongoose");

const journalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 150 },
  content: { type: String, required: true, maxlength: 20000 },
  mood: { type: String, default: "neutral" },
  tags: { type: [String], default: [] },
  isFavorite: { type: Boolean, default: false, index: true },
  images: [{ publicId: { type: String, required: true }, format: String, originalName: String }],
  attachments: [{ name: { type: String, required: true }, storagePath: { type: String, required: true }, mimeType: { type: String, required: true }, size: { type: Number, required: true } }],
}, { timestamps: true });

module.exports = mongoose.model("Journal", journalSchema);

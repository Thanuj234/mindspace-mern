const mongoose = require("mongoose");

const collaborationRequestSchema = new mongoose.Schema({
  blogId: { type: mongoose.Schema.Types.ObjectId, ref: "Blog", required: true, index: true },
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  toUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  message: { type: String, trim: true, maxlength: 500, default: "" },
  status: { type: String, enum: ["pending", "accepted", "declined", "cancelled"], default: "pending", index: true }
}, { timestamps: true });

collaborationRequestSchema.index({ blogId: 1, fromUser: 1, toUser: 1, status: 1 });
module.exports = mongoose.model("CollaborationRequest", collaborationRequestSchema);






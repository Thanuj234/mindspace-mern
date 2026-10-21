const mongoose = require("mongoose");
const Blog = require("../models/Blog");
const User = require("../models/user");
const CollaborationRequest = require("../models/CollaborationRequest");

const validId = (value) => mongoose.Types.ObjectId.isValid(value);

exports.sendRequest = async (req, res) => {
  try {
    const { blogId, message = "" } = req.body;
    if (!blogId || !validId(blogId)) return res.status(400).json({ message: "Choose a valid story." });
    if (typeof message !== "string" || message.length > 500) return res.status(400).json({ message: "Message must be 500 characters or fewer." });

    const blog = await Blog.findOne({ _id: blogId, status: "published" });
    if (!blog) return res.status(404).json({ message: "Published story not found." });

    const recipientId = String(blog.authorId);
    const senderId = String(req.user._id);
    if (recipientId === senderId) return res.status(400).json({ message: "You cannot request collaboration on your own story." });

    const recipient = await User.findById(recipientId).select("_id");
    if (!recipient) return res.status(404).json({ message: "Story author was not found." });

    const existing = await CollaborationRequest.findOne({
      blogId: blog._id, fromUser: req.user._id, toUser: recipient._id,
      status: { $in: ["pending", "accepted"] }
    });
    if (existing) return res.status(409).json({
      message: existing.status === "accepted" ? "You are already a collaborator on this story." : "You already have a pending request for this story."
    });

    const request = await CollaborationRequest.create({
      blogId: blog._id, fromUser: req.user._id, toUser: recipient._id, message: message.trim()
    });
    const populated = await CollaborationRequest.findById(request._id)
      .populate("blogId", "title category status")
      .populate("fromUser", "name email")
      .populate("toUser", "name email");
    res.status(201).json(populated);
  } catch (error) {
    console.error("Send collaboration request failed:", error.message);
    res.status(500).json({ message: "Could not send collaboration request." });
  }
};

exports.getIncomingRequests = async (req, res) => {
  try {
    const requests = await CollaborationRequest.find({ toUser: req.user._id })
      .populate("blogId", "title category status").populate("fromUser", "name email")
      .populate("toUser", "name email").sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    console.error("Load incoming collaboration requests failed:", error.message);
    res.status(500).json({ message: "Could not load requests to you." });
  }
};

exports.getSentRequests = async (req, res) => {
  try {
    const requests = await CollaborationRequest.find({ fromUser: req.user._id })
      .populate("blogId", "title category status").populate("fromUser", "name email")
      .populate("toUser", "name email").sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    console.error("Load sent collaboration requests failed:", error.message);
    res.status(500).json({ message: "Could not load requests you sent." });
  }
};

exports.respondToRequest = async (req, res) => {
  try {
    const { action } = req.body;
    if (!["accept", "decline"].includes(action)) return res.status(400).json({ message: "Choose accept or decline." });
    const request = await CollaborationRequest.findOne({
      _id: req.params.id, toUser: req.user._id, status: "pending"
    });
    if (!request) return res.status(404).json({ message: "Pending request not found." });
    request.status = action === "accept" ? "accepted" : "declined";
    await request.save();
    const populated = await CollaborationRequest.findById(request._id)
      .populate("blogId", "title category status").populate("fromUser", "name email")
      .populate("toUser", "name email");
    res.json(populated);
  } catch (error) {
    console.error("Respond to collaboration request failed:", error.message);
    res.status(500).json({ message: "Could not update collaboration request." });
  }
};

exports.cancelRequest = async (req, res) => {
  try {
    const request = await CollaborationRequest.findOne({
      _id: req.params.id, fromUser: req.user._id, status: "pending"
    });
    if (!request) return res.status(404).json({ message: "Pending request not found." });
    request.status = "cancelled";
    await request.save();
    res.json({ message: "Collaboration request cancelled." });
  } catch (error) {
    console.error("Cancel collaboration request failed:", error.message);
    res.status(500).json({ message: "Could not cancel collaboration request." });
  }
};
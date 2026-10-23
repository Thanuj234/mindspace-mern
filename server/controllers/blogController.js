const mongoose = require("mongoose");
const Blog = require("../models/Blog");

// Public feed: only published blogs.
exports.getPublishedBlogs = async (req, res) => {
  try {
    const { category, search } = req.query;
    const filter = { status: "published" };

    if (category) filter.category = category;
    if (search) {
      const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { title: { $regex: safeSearch, $options: "i" } },
        { content: { $regex: safeSearch, $options: "i" } },
        { summary: { $regex: safeSearch, $options: "i" } },
        { tags: { $regex: safeSearch, $options: "i" } },
      ];
    }

    const blogs = await Blog.find(filter)
      .select("title summary content coverImage media category tags authorId createdAt updatedAt")
      .populate("authorId", "name")
      .sort({ createdAt: -1 });

    res.json(blogs);
  } catch (error) {
    console.error("Could not load blogs:", error.message);
    res.status(500).json({ message: "Could not load blogs" });
  }
};

// Authenticated feed: published stories written by people the current user follows.
exports.getFollowingBlogs = async (req, res) => {
  try {
    const User = require("../models/user");
    const user = await User.findById(req.user._id).select("following");
    const followingIds = user?.following || [];
    if (!followingIds.length) return res.json([]);

    const filter = { status: "published", authorId: { $in: followingIds } };
    const { category, search } = req.query;
    if (category) filter.category = category;
    if (search) {
      const safeSearch = String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { title: { $regex: safeSearch, $options: "i" } },
        { content: { $regex: safeSearch, $options: "i" } },
        { summary: { $regex: safeSearch, $options: "i" } },
        { tags: { $regex: safeSearch, $options: "i" } },
      ];
    }

    const blogs = await Blog.find(filter)
      .select("title summary content coverImage media category tags authorId createdAt updatedAt")
      .populate("authorId", "name profilePhoto")
      .sort({ createdAt: -1 });
    return res.json(blogs);
  } catch (error) {
    console.error("Could not load following feed:", error.message);
    return res.status(500).json({ message: "Could not load your following feed" });
  }
};

exports.getPublishedBlogById = async (req, res) => {
  try {
    const blog = await Blog.findOne({
      _id: req.params.id,
      status: "published",
    }).populate("authorId", "name profilePhoto bio location interests isProfilePublic");

    if (!blog) {
      return res.status(404).json({
        message: "This story could not be found or is no longer published.",
      });
    }

    const result = blog.toObject();

    // Respect the author's profile visibility setting.
    if (result.authorId && !result.authorId.isProfilePublic) {
      result.authorId = {
        _id: result.authorId._id,
        name: result.authorId.name || "MindSpace Community",
      };
    } else if (result.authorId) {
      // Remove the internal visibility flag from the response.
      delete result.authorId.isProfilePublic;
    }

    return res.json(result);
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({
        message: "This story could not be found or is no longer published.",
      });
    }

    console.error("getPublishedBlogById error:", error);
    return res.status(500).json({
      message: "Could not load this story.",
    });
  }
};

// Public single-story endpoint. Drafts are never returned here.
exports.getPublishedBlogById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Story not found" });
    }

    const blog = await Blog.findOne({ _id: req.params.id, status: "published" })
      .select("title summary content coverImage media category tags authorId likes comments createdAt updatedAt")
      .populate("authorId", "name profilePhoto bio location interests isProfilePublic")
      .populate("comments.authorId", "name profilePhoto");

    if (!blog) return res.status(404).json({ message: "Story not found or no longer published" });
    const result = blog.toObject();
    result.likesCount = Array.isArray(result.likes) ? result.likes.length : 0;
    result.commentsCount = Array.isArray(result.comments) ? result.comments.length : 0;
    // Don't expose the full list of user IDs who liked this story.
    delete result.likes;
    // Remove profile visibility flags from comment payloads; profile endpoint enforces privacy.
    (result.comments || []).forEach((comment) => {
      if (comment.authorId && typeof comment.authorId === "object") {
        delete comment.authorId.isProfilePublic;
      }
    });
    res.json(result);
  } catch (error) {
    console.error("Could not load story:", error.message);
    res.status(500).json({ message: "Could not load story" });
  }
};

exports.createBlog = async (req, res) => {
  try {
    const { title, summary, content, category, tags, status, coverImage, media } = req.body;
    if (!title?.trim() || !content?.trim()) {
      return res.status(400).json({ message: "Title and content are required" });
    }
    if (status !== undefined && !["draft", "published"].includes(status)) {
      return res.status(400).json({ message: "Invalid blog status" });
    }

    const blog = await Blog.create({
      authorId: req.user._id,
      title: title.trim(),
      summary: typeof summary === "string" ? summary.trim() : "",
      content: content.trim(),
      category: typeof category === "string" && category.trim() ? category.trim() : "General",
      tags: Array.isArray(tags) ? tags.filter((tag) => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean) : [],
      coverImage: coverImage && typeof coverImage === "object" ? coverImage : null,
      media: Array.isArray(media) ? media.filter((item) => item && typeof item.url === "string") : [],
      status: status === "published" ? "published" : "draft",
    });

    res.status(201).json(blog);
  } catch (error) {
    console.error("Could not create blog:", error.message);
    res.status(500).json({ message: "Could not create blog" });
  }
};

exports.updateBlog = async (req, res) => {
  try {
    const blog = await Blog.findOne({ _id: req.params.id, authorId: req.user._id });
    if (!blog) return res.status(404).json({ message: "Blog not found" });

    const { title, summary, content, category, tags, status, coverImage, media } = req.body;

    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) return res.status(400).json({ message: "Title is required" });
      blog.title = title.trim();
    }
    if (summary !== undefined) blog.summary = typeof summary === "string" ? summary.trim() : "";
    if (content !== undefined) {
      if (typeof content !== "string" || !content.trim()) return res.status(400).json({ message: "Content is required" });
      blog.content = content;
    }
    if (category !== undefined) blog.category = category;
    if (tags !== undefined) blog.tags = Array.isArray(tags) ? tags.filter((tag) => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean) : [];
    if (coverImage !== undefined) blog.coverImage = coverImage && typeof coverImage === "object" ? coverImage : null;
    if (media !== undefined) blog.media = Array.isArray(media) ? media.filter((item) => item && typeof item.url === "string") : [];
    if (status !== undefined) {
      if (!["draft", "published"].includes(status)) return res.status(400).json({ message: "Invalid blog status" });
      blog.status = status;
    }

    await blog.save();
    res.json(blog);
  } catch (error) {
    console.error("Could not update blog:", error.message);
    res.status(500).json({ message: "Could not update blog" });
  }
};

exports.deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findOneAndDelete({ _id: req.params.id, authorId: req.user._id });
    if (!blog) return res.status(404).json({ message: "Blog not found" });
    res.json({ message: "Blog deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Could not delete blog" });
  }
};

exports.getMyBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find({ authorId: req.user._id })
      .populate("comments.authorId", "name profilePhoto isProfilePublic")
      .sort({ updatedAt: -1 })
      .lean();
    if (!blogs.length) return res.json([]);

    const blogIds = blogs.map((blog) => blog._id);
    const User = require("../models/user");
    // Count bookmarks across all users without exposing who saved a story.
    const saveCounts = await User.aggregate([
      { $match: { bookmarks: { $in: blogIds } } },
      { $unwind: "$bookmarks" },
      { $match: { bookmarks: { $in: blogIds } } },
      { $group: { _id: "$bookmarks", count: { $sum: 1 } } },
    ]);
    const savesByStory = new Map(saveCounts.map((item) => [String(item._id), item.count]));

    const result = blogs.map((blog) => ({
      ...blog,
      likesCount: Array.isArray(blog.likes) ? blog.likes.length : 0,
      commentsCount: Array.isArray(blog.comments) ? blog.comments.length : 0,
      savesCount: savesByStory.get(String(blog._id)) || 0,
    }));
    return res.json(result);
  } catch (error) {
    console.error("Could not load your blogs:", error.message);
    return res.status(500).json({ message: "Could not load your blogs" });
  }
};


// Return whether the authenticated user liked/bookmarked a published story.
exports.getStorySocialStatus = async (req, res) => {
  try {
    const [blog, user] = await Promise.all([
      Blog.findOne({ _id: req.params.id, status: "published" }).select("likes comments"),
      require("../models/user").findById(req.user._id).select("bookmarks"),
    ]);
    if (!blog) return res.status(404).json({ message: "Story not found" });
    const liked = (blog.likes || []).some((id) => String(id) === String(req.user._id));
    const userBookmarks = user?.bookmarks || [];
    const bookmarked = userBookmarks.some((id) => String(id) === String(req.params.id));
    return res.json({ liked, bookmarked, likesCount: (blog.likes || []).length, commentsCount: (blog.comments || []).length });
  } catch (error) {
    console.error("Could not load story social status:", error.message);
    return res.status(500).json({ message: "Could not load story interactions" });
  }
};

// Toggle the current user's like. $addToSet prevents duplicate likes.
exports.toggleStoryLike = async (req, res) => {
  try {
    const blog = await Blog.findOne({ _id: req.params.id, status: "published" });
    if (!blog) return res.status(404).json({ message: "Story not found" });
    const alreadyLiked = (blog.likes || []).some((id) => String(id) === String(req.user._id));
    if (alreadyLiked) {
      await Blog.updateOne({ _id: blog._id }, { $pull: { likes: req.user._id } });
    } else {
      await Blog.updateOne({ _id: blog._id }, { $addToSet: { likes: req.user._id } });
    }
    const updated = await Blog.findById(blog._id).select("likes");
    return res.json({ liked: !alreadyLiked, likesCount: updated.likes.length });
  } catch (error) {
    console.error("Could not update story like:", error.message);
    return res.status(500).json({ message: "Could not update like" });
  }
};

exports.addStoryComment = async (req, res) => {
  try {
    const text = typeof req.body.text === "string" ? req.body.text.trim() : "";
    if (!text) return res.status(400).json({ message: "Comment cannot be empty" });
    if (text.length > 1000) return res.status(400).json({ message: "Comment must be 1000 characters or fewer" });
    const blog = await Blog.findOne({ _id: req.params.id, status: "published" });
    if (!blog) return res.status(404).json({ message: "Story not found" });
    blog.comments.push({ authorId: req.user._id, text });
    await blog.save();
    const savedComment = blog.comments[blog.comments.length - 1];
    await blog.populate("comments.authorId", "name profilePhoto");
    const comment = blog.comments.id(savedComment._id);
    return res.status(201).json({ comment, commentsCount: blog.comments.length });
  } catch (error) {
    console.error("Could not add comment:", error.message);
    return res.status(500).json({ message: "Could not add comment" });
  }
};

exports.deleteStoryComment = async (req, res) => {
  try {
    const blog = await Blog.findOne({ _id: req.params.id, status: "published" });
    if (!blog) return res.status(404).json({ message: "Story not found" });
    const comment = blog.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    if (String(comment.authorId) !== String(req.user._id)) {
      return res.status(403).json({ message: "You can delete only your own comments" });
    }
    comment.deleteOne();
    await blog.save();
    return res.json({ message: "Comment deleted", commentsCount: blog.comments.length });
  } catch (error) {
    console.error("Could not delete comment:", error.message);
    return res.status(500).json({ message: "Could not delete comment" });
  }
};

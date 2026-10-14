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
        { content: { $regex: safeSearch, $options: "i" } }
      ];
    }

    const blogs = await Blog.find(filter)
      .select("title content category tags authorId createdAt")
      .populate("authorId", "name")
      .sort({ createdAt: -1 });

    res.json(blogs);
  } catch (error) {
    res.status(500).json({ message: "Could not load blogs" });
  }
};

// Create a draft or publish a blog.
exports.createBlog = async (req, res) => {
  try {
    const { title, content, category, tags, status } = req.body;

    if (!title?.trim() || !content?.trim()) {
      return res.status(400).json({
        message: "Title and content are required"
      });
    }

    const blog = await Blog.create({
      authorId: req.user._id,
      title: title.trim(),
      content: content.trim(),
      category,
      tags,
      status: status === "published" ? "published" : "draft"
    });

    res.status(201).json(blog);
  } catch (error) {
    res.status(500).json({ message: "Could not create blog" });
  }
};

// Only the author can update their blog.
exports.updateBlog = async (req, res) => {
  try {
    const blog = await Blog.findOne({
      _id: req.params.id,
      authorId: req.user._id
    });

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    const { title, content, category, tags, status } = req.body;

    if (title !== undefined) blog.title = title;
    if (content !== undefined) blog.content = content;
    if (category !== undefined) blog.category = category;
    if (tags !== undefined) blog.tags = tags;

    if (status !== undefined) {
      if (!["draft", "published"].includes(status)) {
        return res.status(400).json({ message: "Invalid blog status" });
      }
      blog.status = status;
    }

    await blog.save();
    res.json(blog);
  } catch (error) {
    res.status(500).json({ message: "Could not update blog" });
  }
};

exports.deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findOneAndDelete({
      _id: req.params.id,
      authorId: req.user._id
    });

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    res.json({ message: "Blog deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Could not delete blog" });
  }
};

// A user can view their own drafts and published posts.
exports.getMyBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find({
      authorId: req.user._id
    }).sort({ updatedAt: -1 });

    res.json(blogs);
  } catch (error) {
    res.status(500).json({ message: "Could not load your blogs" });
  }
};
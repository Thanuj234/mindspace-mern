
const mongoose = require("mongoose");
const Blog = require("../models/Blog");

// Public feed: only published blogs.
exports.getPublishedBlogs = async (req, res) => {
  try {
    const { category, search } = req.query;
    const filter = { status: "published" };

    if (category) {
      filter.category = category;
    }

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
      .select(
        "title summary content coverImage media category tags authorId createdAt updatedAt"
      )
      .populate("authorId", "name")
      .sort({ createdAt: -1 });

    return res.json(blogs);
  } catch (error) {
    console.error("Could not load blogs:", error.message);
    return res.status(500).json({
      message: "Could not load blogs",
    });
  }
};

// Public single-story endpoint.
// Only published stories are returned.
exports.getPublishedBlogById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({
        message: "This story could not be found or is no longer published.",
      });
    }

    const blog = await Blog.findOne({
      _id: req.params.id,
      status: "published",
    }).populate(
      "authorId",
      "name profilePhoto bio location interests isProfilePublic"
    );

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
      // Do not expose the internal visibility flag.
      delete result.authorId.isProfilePublic;
    }

    return res.json(result);
  } catch (error) {
    console.error("getPublishedBlogById error:", error);

    return res.status(500).json({
      message: "Could not load this story.",
    });
  }
};

// Create a blog.
exports.createBlog = async (req, res) => {
  try {
    const {
      title,
      summary,
      content,
      category,
      tags,
      status,
      coverImage,
      media,
    } = req.body;

    if (!title?.trim() || !content?.trim()) {
      return res.status(400).json({
        message: "Title and content are required",
      });
    }

    if (
      status !== undefined &&
      !["draft", "published"].includes(status)
    ) {
      return res.status(400).json({
        message: "Invalid blog status",
      });
    }

    const blog = await Blog.create({
      authorId: req.user._id,
      title: title.trim(),
      summary:
        typeof summary === "string" ? summary.trim() : "",
      content: content.trim(),
      category:
        typeof category === "string" && category.trim()
          ? category.trim()
          : "General",
      tags: Array.isArray(tags)
        ? tags
            .filter((tag) => typeof tag === "string")
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [],
      coverImage:
        coverImage && typeof coverImage === "object"
          ? coverImage
          : null,
      media: Array.isArray(media)
        ? media.filter(
            (item) => item && typeof item.url === "string"
          )
        : [],
      status: status === "published" ? "published" : "draft",
    });

    return res.status(201).json(blog);
  } catch (error) {
    console.error("Could not create blog:", error.message);

    return res.status(500).json({
      message: "Could not create blog",
    });
  }
};

// Update a blog owned by the logged-in user.
exports.updateBlog = async (req, res) => {
  try {
    const blog = await Blog.findOne({
      _id: req.params.id,
      authorId: req.user._id,
    });

    if (!blog) {
      return res.status(404).json({
        message: "Blog not found",
      });
    }

    const {
      title,
      summary,
      content,
      category,
      tags,
      status,
      coverImage,
      media,
    } = req.body;

    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        return res.status(400).json({
          message: "Title is required",
        });
      }

      blog.title = title.trim();
    }

    if (summary !== undefined) {
      blog.summary =
        typeof summary === "string" ? summary.trim() : "";
    }

    if (content !== undefined) {
      if (typeof content !== "string" || !content.trim()) {
        return res.status(400).json({
          message: "Content is required",
        });
      }

      blog.content = content;
    }

    if (category !== undefined) {
      blog.category = category;
    }

    if (tags !== undefined) {
      blog.tags = Array.isArray(tags)
        ? tags
            .filter((tag) => typeof tag === "string")
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [];
    }

    if (coverImage !== undefined) {
      blog.coverImage =
        coverImage && typeof coverImage === "object"
          ? coverImage
          : null;
    }

    if (media !== undefined) {
      blog.media = Array.isArray(media)
        ? media.filter(
            (item) => item && typeof item.url === "string"
          )
        : [];
    }

    if (status !== undefined) {
      if (!["draft", "published"].includes(status)) {
        return res.status(400).json({
          message: "Invalid blog status",
        });
      }

      blog.status = status;
    }

    await blog.save();

    return res.json(blog);
  } catch (error) {
    console.error("Could not update blog:", error.message);

    return res.status(500).json({
      message: "Could not update blog",
    });
  }
};

// Delete a blog owned by the logged-in user.
exports.deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findOneAndDelete({
      _id: req.params.id,
      authorId: req.user._id,
    });

    if (!blog) {
      return res.status(404).json({
        message: "Blog not found",
      });
    }

    return res.json({
      message: "Blog deleted successfully",
    });
  } catch (error) {
    console.error("Could not delete blog:", error.message);

    return res.status(500).json({
      message: "Could not delete blog",
    });
  }
};

// Get all blogs belonging to the logged-in user.
exports.getMyBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find({
      authorId: req.user._id,
    }).sort({ updatedAt: -1 });

    return res.json(blogs);
  } catch (error) {
    console.error("Could not load your blogs:", error.message);

    return res.status(500).json({
      message: "Could not load your blogs",
    });
  }
};

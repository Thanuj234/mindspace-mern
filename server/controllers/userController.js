const mongoose = require("mongoose");
const User = require("../models/user");


exports.getPublicProfile = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Profile not found" });
    }
    const profile = await User.findById(req.params.id)
      .select("name bio location profilePhoto interests isProfilePublic followers following")
      .lean();
    if (!profile) return res.status(404).json({ message: "Profile not found" });
    if (!profile.isProfilePublic) {
      return res.status(403).json({ private: true, message: "This account is private" });
    }
    const Blog = require("../models/Blog");
    const stories = await Blog.find({ authorId: profile._id, status: "published" })
      .select("title summary category coverImage createdAt likes comments")
      .sort({ createdAt: -1 })
      .lean();
    const storyIds = stories.map((story) => story._id);
    const saveCounts = storyIds.length ? await User.aggregate([
      { $match: { bookmarks: { $in: storyIds } } },
      { $unwind: "$bookmarks" },
      { $match: { bookmarks: { $in: storyIds } } },
      { $group: { _id: "$bookmarks", count: { $sum: 1 } } },
    ]) : [];
    const savesByStory = new Map(saveCounts.map((item) => [String(item._id), item.count]));
    const publishedStories = stories.map((story) => ({
      _id: story._id, title: story.title, summary: story.summary, category: story.category,
      coverImage: story.coverImage, createdAt: story.createdAt,
      likesCount: (story.likes || []).length, commentsCount: (story.comments || []).length,
      savesCount: savesByStory.get(String(story._id)) || 0,
    }));
    return res.json({
      profile: {
        _id: profile._id, name: profile.name, bio: profile.bio, location: profile.location,
        profilePhoto: profile.profilePhoto, interests: profile.interests || [],
        followersCount: (profile.followers || []).length, followingCount: (profile.following || []).length,
      },
      stories: publishedStories,
    });
  } catch (error) {
    console.error("Could not load public profile:", error.message);
    return res.status(500).json({ message: "Could not load this profile" });
  }
};

exports.getMyStats = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("followers following");
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({
      followersCount: Array.isArray(user.followers) ? user.followers.length : 0,
      followingCount: Array.isArray(user.following) ? user.following.length : 0,
    });
  } catch (error) {
    console.error("Could not load profile stats:", error.message);
    return res.status(500).json({ message: "Could not load profile stats" });
  }
};

exports.getFollowing = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("following");
    return res.json({ following: (user?.following || []).map((id) => String(id)) });
  } catch (error) {
    console.error("Could not load following list:", error.message);
    return res.status(500).json({ message: "Could not load your following list" });
  }
};

exports.followUser = async (req, res) => {
  try {
    const targetId = req.params.id;
    if (!mongoose.isValidObjectId(targetId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    if (String(req.user._id) === String(targetId)) {
      return res.status(400).json({ message: "You cannot follow yourself" });
    }

    const target = await User.findById(targetId).select("_id");
    if (!target) return res.status(404).json({ message: "User not found" });

    await User.findByIdAndUpdate(req.user._id, { $addToSet: { following: target._id } });
    await User.findByIdAndUpdate(target._id, { $addToSet: { followers: req.user._id } });
    return res.json({ message: "User followed", following: true, userId: String(target._id) });
  } catch (error) {
    console.error("Could not follow user:", error.message);
    return res.status(500).json({ message: "Could not follow this user" });
  }
};

exports.unfollowUser = async (req, res) => {
  try {
    const targetId = req.params.id;
    if (!mongoose.isValidObjectId(targetId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    if (String(req.user._id) === String(targetId)) {
      return res.status(400).json({ message: "You cannot unfollow yourself" });
    }

    await User.findByIdAndUpdate(req.user._id, { $pull: { following: targetId } });
    await User.findByIdAndUpdate(targetId, { $pull: { followers: req.user._id } });
    return res.json({ message: "User unfollowed", following: false, userId: targetId });
  } catch (error) {
    console.error("Could not unfollow user:", error.message);
    return res.status(500).json({ message: "Could not unfollow this user" });
  }
};


exports.getBookmarks = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("bookmarks")
      .populate({
        path: "bookmarks",
        match: { status: "published" },
        select: "title summary content coverImage media category tags authorId createdAt updatedAt",
        populate: { path: "authorId", select: "name profilePhoto" },
      });
    return res.json({ bookmarks: (user?.bookmarks || []).filter(Boolean) });
  } catch (error) {
    console.error("Could not load bookmarks:", error.message);
    return res.status(500).json({ message: "Could not load saved stories" });
  }
};

exports.addBookmark = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid story ID" });
    const Blog = require("../models/Blog");
    const blog = await Blog.findOne({ _id: req.params.id, status: "published" }).select("_id");
    if (!blog) return res.status(404).json({ message: "Published story not found" });
    await User.findByIdAndUpdate(req.user._id, { $addToSet: { bookmarks: blog._id } });
    return res.json({ bookmarked: true, storyId: String(blog._id) });
  } catch (error) {
    console.error("Could not bookmark story:", error.message);
    return res.status(500).json({ message: "Could not save this story" });
  }
};

exports.removeBookmark = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid story ID" });
    await User.findByIdAndUpdate(req.user._id, { $pull: { bookmarks: req.params.id } });
    return res.json({ bookmarked: false, storyId: req.params.id });
  } catch (error) {
    console.error("Could not remove bookmark:", error.message);
    return res.status(500).json({ message: "Could not remove saved story" });
  }
};

const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { getPublicProfile, getMyStats, getFollowing, followUser, unfollowUser, getBookmarks, addBookmark, removeBookmark } = require("../controllers/userController");

const router = express.Router();
router.get("/:id/profile", getPublicProfile);
router.use(authMiddleware);
router.get("/me/stats", getMyStats);
router.get("/following", getFollowing);
router.get("/bookmarks", getBookmarks);
router.post("/bookmarks/:id", addBookmark);
router.delete("/bookmarks/:id", removeBookmark);
router.post("/:id/follow", followUser);
router.delete("/:id/follow", unfollowUser);

module.exports = router;

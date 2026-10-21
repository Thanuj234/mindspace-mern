const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  sendRequest, getIncomingRequests, getSentRequests, respondToRequest, cancelRequest
} = require("../controllers/collaborationController");

router.use(authMiddleware);
router.get("/incoming", getIncomingRequests);
router.get("/sent", getSentRequests);
router.post("/", sendRequest);
router.patch("/:id/respond", respondToRequest);
router.patch("/:id/cancel", cancelRequest);
module.exports = router;

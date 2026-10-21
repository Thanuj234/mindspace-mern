
const Journal = require("../models/Journal");
const cloudinary = require("../config/cloudinary");
const supabase = require("../config/supabase");

const BUCKET = "journal-attachments";

// Return an authenticated Cloudinary URL only if this
// journal belongs to the logged-in user.
exports.getJournalImageUrl = async (req, res) => {
  try {
    const journal = await Journal.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!journal) {
      return res.status(404).json({ message: "Journal not found." });
    }

    const image = journal.images.id(req.params.imageId);

    if (!image) {
      return res.status(404).json({ message: "Image not found." });
    }

    const imageUrl = cloudinary.url(image.publicId, {
      secure: true,
      type: "authenticated",
      sign_url: true,
      resource_type: "image",
      format: image.format || undefined,
    });

    return res.json({ imageUrl });
  } catch (error) {
    console.error("Image access failed:", error.message);
    return res.status(500).json({
      message: "Could not retrieve the image.",
    });
  }
};

// Create a short-lived signed URL for a private document.
exports.getJournalAttachmentUrl = async (req, res) => {
  try {
    const journal = await Journal.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!journal) {
      return res.status(404).json({ message: "Journal not found." });
    }

    const attachment = journal.attachments.id(req.params.attachmentId);

    if (!attachment) {
      return res.status(404).json({
        message: "Attachment not found.",
      });
    }

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(attachment.storagePath, 60);

    if (error) throw error;

    return res.json({
      downloadUrl: data.signedUrl,
      expiresIn: 60,
    });
  } catch (error) {
    console.error("Attachment access failed:", error.message);
    return res.status(500).json({
      message: "Could not retrieve the document.",
    });
  }
};

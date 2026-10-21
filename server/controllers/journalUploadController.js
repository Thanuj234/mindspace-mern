
const crypto = require("crypto");
const path = require("path");
const { Readable } = require("stream");

const Journal = require("../models/Journal");
const cloudinary = require("../config/cloudinary");
const supabase = require("../config/supabase");

const BUCKET = "journal-attachments";

const imageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const documentTypes = new Set([
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function uploadToCloudinary(buffer, userId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `mindspace/journals/${userId}`,
        resource_type: "image",
        type: "authenticated",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    Readable.from(buffer).pipe(stream);
  });
}

exports.uploadJournalImage = async (req, res) => {
  let uploadedImage;

  try {
    if (!req.file || !imageTypes.has(req.file.mimetype)) {
      return res.status(400).json({
        message: "Choose a JPEG, PNG, or WebP image.",
      });
    }

    const journal = await Journal.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!journal) {
      return res.status(404).json({ message: "Journal not found." });
    }

    if (journal.images.length >= 10) {
      return res.status(400).json({
        message: "A journal can contain up to 10 images.",
      });
    }

    uploadedImage = await uploadToCloudinary(
      req.file.buffer,
      req.user._id.toString()
    );

    journal.images.push({
      publicId: uploadedImage.public_id,
      format: uploadedImage.format,
      originalName: path.basename(req.file.originalname),
    });

    await journal.save();

    return res.status(201).json({
      message: "Image uploaded successfully.",
      image: journal.images[journal.images.length - 1],
    });
  } catch (error) {
    if (uploadedImage?.public_id) {
      try {
        await cloudinary.uploader.destroy(uploadedImage.public_id, {
          resource_type: "image",
          type: "authenticated",
        });
      } catch (cleanupError) {
        console.error("Image cleanup failed:", cleanupError.message);
      }
    }

    console.error("Journal image upload failed:", error.message);
    return res.status(500).json({
      message: "Could not upload the image.",
    });
  }
};

exports.uploadJournalAttachment = async (req, res) => {
  let storagePath;

  try {
    if (!req.file || !documentTypes.has(req.file.mimetype)) {
      return res.status(400).json({
        message: "Choose a PDF, TXT, DOC, or DOCX document.",
      });
    }

    const journal = await Journal.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!journal) {
      return res.status(404).json({ message: "Journal not found." });
    }

    if (journal.attachments.length >= 10) {
      return res.status(400).json({
        message: "A journal can contain up to 10 attachments.",
      });
    }

    const safeName = path
      .basename(req.file.originalname)
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(-100);

    storagePath = `${req.user._id}/${req.params.id}/${crypto.randomUUID()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    journal.attachments.push({
      name: path.basename(req.file.originalname).slice(0, 200),
      storagePath,
      mimeType: req.file.mimetype,
      size: req.file.size,
    });

    await journal.save();

    return res.status(201).json({
      message: "Document uploaded successfully.",
      attachment: journal.attachments[journal.attachments.length - 1],
    });
  } catch (error) {
    if (storagePath) {
      try {
        await supabase.storage.from(BUCKET).remove([storagePath]);
      } catch (cleanupError) {
        console.error("Document cleanup failed:", cleanupError.message);
      }
    }

    console.error("Journal attachment upload failed:", error.message);
    return res.status(500).json({
      message: "Could not upload the document.",
    });
  }
};


const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.uploadBlogMedia = async (req, res) => {
  try {
    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      return res.status(503).json({
        message: "Cloudinary is not configured on the server.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "Choose a file to upload.",
      });
    }

    const isVideo = req.file.mimetype.startsWith("video/");
    const isImage = req.file.mimetype.startsWith("image/");
    const isProfilePhoto = req.body.kind === "profile";

    if (!isImage && !isVideo) {
      return res.status(400).json({
        message: "Only image and video files are supported.",
      });
    }

    if (isProfilePhoto && !isImage) {
      return res.status(400).json({
        message: "Profile photos must be image files.",
      });
    }

    if (req.body.kind === "cover" && !isImage) {
      return res.status(400).json({
        message: "Cover images must be image files.",
      });
    }

    const maxBytes = isVideo
      ? 50 * 1024 * 1024
      : 8 * 1024 * 1024;

    if (req.file.size > maxBytes) {
      return res.status(413).json({
        message: isVideo
          ? "Videos must be 50 MB or smaller."
          : "Images must be 8 MB or smaller.",
      });
    }

    const resourceType = isVideo ? "video" : "image";
    const folder = isProfilePhoto
      ? "mindspace/profiles"
      : "mindspace/blogs";

    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: resourceType,
          use_filename: false,
          unique_filename: true,
        },
        (error, result) =>
          error ? reject(error) : resolve(result)
      );

      stream.end(req.file.buffer);
    });

    return res.status(201).json({
      file: {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        resourceType,
        originalName: req.file.originalname,
        format: uploadResult.format || "",
        bytes: uploadResult.bytes || req.file.size,
      },
    });
  } catch (error) {
    console.error("Media upload failed:", error.message);

    return res.status(500).json({
      message: "Could not upload media. Check Cloudinary configuration.",
    });
  }
};

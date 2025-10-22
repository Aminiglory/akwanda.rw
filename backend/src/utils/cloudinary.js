const cloudinary = require('cloudinary').v2;

// Configure via environment variables
// Required: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
// Optional: CLOUDINARY_UPLOAD_FOLDER
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

function uploadBuffer(buffer, filename, folder) {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: folder || process.env.CLOUDINARY_UPLOAD_FOLDER || 'akwanda',
      resource_type: 'image',
      filename_override: filename,
      use_filename: true,
      unique_filename: true,
      overwrite: false,
    };

    const stream = cloudinary.uploader.upload_stream(uploadOptions, (err, result) => {
      if (err) return reject(err);
      return resolve(result);
    });

    stream.end(buffer);
  });
}

module.exports = { cloudinary, uploadBuffer };

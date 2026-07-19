const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { Readable } = require('stream');

let useFallback = false;
if (!process.env.CLOUDINARY_CLOUD_NAME || 
    !process.env.CLOUDINARY_API_KEY || 
    !process.env.CLOUDINARY_API_SECRET || 
    process.env.CLOUDINARY_CLOUD_NAME.includes('your_cloudinary')) {
  console.warn("WARNING: Cloudinary credentials missing or using placeholders! Running on local mock fallback mode.");
  useFallback = true;
} else {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

const storage = multer.memoryStorage();
const upload = multer({ storage });

const uploadToCloudinary = (fileBuffer, fileName) => {
  return new Promise((resolve, reject) => {
    if (useFallback) {
      // Mock upload url returning placeholder image
      return resolve({
        secure_url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
        public_id: "mock_id_" + Date.now()
      });
    }
    
    const uploadStream = cloudinary.uploader.upload_stream(
      { resource_type: 'auto', public_id: fileName },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    Readable.from(fileBuffer).pipe(uploadStream);
  });
};

module.exports = { upload, uploadToCloudinary };

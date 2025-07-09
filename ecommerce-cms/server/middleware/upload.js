const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Store in uploads folder
  },
  filename: function (req, file, cb) {
    // Generate unique filename: timestamp + original name
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter to only allow images
const fileFilter = (req, file, cb) => {
  // Check if file is an image
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5 // Maximum 5 files
  }
});

// Middleware for single image upload
const uploadSingle = upload.single('image');

// Middleware for multiple images upload
const uploadMultiple = upload.array('images', 5); // Max 5 images

// Custom middleware wrapper to handle multer errors
const handleMulterUpload = (req, res, next) => {
  uploadMultiple(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          msg: 'File too large',
          error: 'File size must be less than 5MB'
        });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          msg: 'Too many files',
          error: 'Maximum 5 files allowed'
        });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          success: false,
          msg: 'Unexpected field',
          error: 'Unexpected file field'
        });
      }
      return res.status(400).json({
        success: false,
        msg: 'File upload error',
        error: err.message
      });
    }
    
    if (err && err.message === 'Only image files are allowed!') {
      return res.status(400).json({
        success: false,
        msg: 'Invalid file type',
        error: 'Only image files are allowed'
      });
    }
    
    if (err) {
      return res.status(500).json({
        success: false,
        msg: 'Upload error',
        error: err.message
      });
    }
    
    next();
  });
};

// Error handler for multer (legacy - keeping for compatibility)
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        msg: 'File too large',
        error: 'File size must be less than 5MB'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        msg: 'Too many files',
        error: 'Maximum 5 files allowed'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        msg: 'Unexpected field',
        error: 'Unexpected file field'
      });
    }
  }
  
  if (err.message === 'Only image files are allowed!') {
    return res.status(400).json({
      success: false,
      msg: 'Invalid file type',
      error: 'Only image files are allowed'
    });
  }
  
  next(err);
};

module.exports = {
  uploadSingle,
  uploadMultiple,
  handleUploadError,
  handleMulterUpload
};

import multer from "multer";
import path from "path";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const filetypes = /mp4|mov|avi|webm/;
  const extname = path.extname(file.originalname).toLowerCase();
  const mimetype = file.mimetype;

  // Check if it's a video file
  if (filetypes.test(extname)) {
    if (filetypes.test(mimetype)) {
      return cb(null, true);
    } else {
      return cb(new Error("Invalid video file type!"));
    }
  }
  
  // If it's not a video, check if it's an image (any image type)
  if (mimetype.startsWith('image/')) {
    return cb(null, true);
  }

  // If neither image nor allowed video
  cb(new Error("Only image files and video files (mp4, mov, avi, webm) are allowed!"));
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
});

export default upload;
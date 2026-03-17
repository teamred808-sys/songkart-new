import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Configure Multer for local storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determine the bucket directory from the URL parameter
    const bucket = req.params['bucket'] as string;
    
    // Default to the frontend public/uploads directory if we're running locally,
    // otherwise use the user's public_html directory on Hostinger
    // We'll map the bucket to specific folders
    const isProd = process.env.NODE_ENV === 'production';
    const baseUploadDir = isProd 
      ? path.join(__dirname, '../../../../public_html/assets/uploads') 
      : path.join(__dirname, '../../../public/uploads');

    const uploadPath = path.join(baseUploadDir, bucket || 'misc');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename preserving original extension
    const reqPath = req.body.path as string;
    
    if (reqPath) {
      // If path is provided (e.g. userId/timestamp-filename.ext)
      // Make sure the user directory exists
      const parts = reqPath.split('/');
      if (parts.length > 1) {
        const userDir = parts.slice(0, -1).join('/');
        const destDir = (req as any).multerDestination || path.join(__dirname, '../../../public/uploads/misc');
        const fullUserDir = path.join(destDir, userDir);
        
        if (!fs.existsSync(fullUserDir)) {
          fs.mkdirSync(fullUserDir, { recursive: true });
        }
      }
      cb(null, reqPath);
    } else {
      // Fallback filename
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
  }
});

// Create custom multer instance that saves the destination path for the filename function
const upload = multer({ 
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  }
});

// Middleware to save destination path before multer processes it
const saveDestination = (req: Request, res: Response, next: Function) => {
  const bucket = req.params['bucket'] as string;
  const isProd = process.env.NODE_ENV === 'production';
  const baseUploadDir = isProd 
    ? path.join(__dirname, '../../../../public_html/assets/uploads') 
    : path.join(__dirname, '../../../public/uploads');
  
  (req as any).multerDestination = path.join(baseUploadDir, bucket || 'misc');
  next();
};

// Route for file upload
router.post('/:bucket/upload', authenticate, saveDestination, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file provided' });
      return;
    }

    const bucket = req.params['bucket'] as string;
    const customPath = req.body.path;
    
    // Get the base URL from env or request
    const baseUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
    
    // Construct the public URL where the file can be accessed
    // In production, assets are served from the root domain /assets/...
    // Locally, they are served from /uploads/...
    const isProd = process.env.NODE_ENV === 'production';
    const relativePath = customPath || req.file.filename;
    
    const publicUrl = isProd 
      ? `${baseUrl}/assets/uploads/${bucket}/${relativePath}`
      : `/uploads/${bucket}/${relativePath}`; // Local frontend URL path

    res.json({ 
      success: true, 
      path: relativePath,
      public_url: publicUrl 
    });
  } catch (error: any) {
    console.error('File upload error:', error);
    res.status(500).json({ error: error.message || 'Internal server error during upload' });
  }
});

export default router;

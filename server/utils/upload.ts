/**
 * Upload Handler - Server-side file upload to Cloudinary
 * 
 * Used for avatar uploads, book covers, etc.
 */

import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import cloudinary from "cloudinary";
import type { Request } from "express";

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "dhhxv1whp";
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || "469463介673548149叉";
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || "xxxxxxxxxxxxxxxxx";
const ALLOWED_IMAGE_FORMATS = ["jpg", "jpeg", "png", "gif", "webp", "svg"];

function normalizeCloudinaryFolder(folder?: unknown): string {
  const raw = Array.isArray(folder) ? folder[0] : folder;
  const value = typeof raw === "string" ? raw.trim() : "";
  const segments = value
    .split("/")
    .map((segment) => segment.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, ""))
    .filter(Boolean);

  return segments.join("/") || "general";
}

function getRequestedFolder(req: Request, fallback: string): string {
  const folder = req.body?.folder ?? req.query?.folder ?? fallback;
  return normalizeCloudinaryFolder(folder);
}

// Configure Cloudinary
cloudinary.v2.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

/**
 * Create a Cloudinary storage instance for multer
 */
function createCloudinaryStorage(folder: string) {
  return new CloudinaryStorage({
    cloudinary: cloudinary.v2,
    params: (req) => ({
      folder: getRequestedFolder(req, folder),
      allowed_formats: ALLOWED_IMAGE_FORMATS,
      transformation: [{ width: 500, height: 500, crop: "limit" }],
    }),
  });
}

// Pre-configured upload handlers for different folders
export const uploadAvatar = multer({ 
  storage: createCloudinaryStorage("avatars"),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

export const uploadBookCover = multer({ 
  storage: createCloudinaryStorage("book-covers"),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

export const uploadGeneral = multer({ 
  storage: createCloudinaryStorage("general"),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

// Default export for backward compatibility
const uploadHandler = uploadGeneral;
export default uploadHandler;

/**
 * Upload file directly to Cloudinary (alternative method)
 */
export async function uploadToCloudinary(
  file: Buffer,
  folder: string,
  options?: {
    width?: number;
    height?: number;
    crop?: string;
  }
): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.v2.uploader.upload_stream(
      {
        folder: `adonai-grace/${folder}`,
        width: options?.width,
        height: options?.height,
        crop: options?.crop || "limit",
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        }
      }
    );
    
    uploadStream.end(file);
  });
}

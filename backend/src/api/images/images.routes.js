import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { GoogleGenAI } from "@google/genai";

import db from "../../../db/db.config.js";
import { rateLimit } from "../../middleware/rate-limit.js";

const router = express.Router();

// Image generation is expensive: limit per IP address
const imageLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: "Image limit reached. Please try again later.",
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Set UPLOADS_DIR to a persistent disk/volume when deploying
export const UPLOADS_DIR = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.resolve(__dirname, "../../../uploads");

export const IMAGES_DIR = path.join(UPLOADS_DIR, "images");

const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";

const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const EXTENSIONS = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

// List generated images
router.get("/", async (req, res, next) => {
  try {
    const [images] = await db.execute(
      `SELECT * FROM generated_images
       ORDER BY created_at DESC, id DESC LIMIT 100`,
    );

    res.json({
      success: true,
      images: images.map((image) => ({
        ...image,
        url: `/uploads/images/${image.file_name}`,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// Generate an image
router.post("/generate", imageLimiter, async (req, res, next) => {
  try {
    const prompt = typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";

    if (!prompt) {
      return res
        .status(400)
        .json({ success: false, message: "Describe the image you want." });
    }

    let response;

    try {
      response = await gemini.models.generateContent({
        model: IMAGE_MODEL,
        contents: prompt.slice(0, 2000),
        config: { responseModalities: ["TEXT", "IMAGE"] },
      });
    } catch (error) {
      console.error(" IMAGE ERROR:", error?.message || error);

      return res.status(502).json({
        success: false,
        message:
          "Image generation failed. Check GEMINI_IMAGE_MODEL and your API quota.",
      });
    }

    const parts = response?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((part) => part.inlineData?.data);

    if (!imagePart) {
      return res.status(422).json({
        success: false,
        message:
          "The model did not return an image. Try a different description.",
      });
    }

    const mimeType = imagePart.inlineData.mimeType || "image/png";
    const extension = EXTENSIONS[mimeType] || "png";
    const fileName = `${crypto.randomUUID()}.${extension}`;

    await fs.mkdir(IMAGES_DIR, { recursive: true });
    await fs.writeFile(
      path.join(IMAGES_DIR, fileName),
      Buffer.from(imagePart.inlineData.data, "base64"),
    );

    const [result] = await db.execute(
      `INSERT INTO generated_images (prompt, file_name, mime_type)
       VALUES (?, ?, ?)`,
      [prompt, fileName, mimeType],
    );

    const [rows] = await db.execute(
      `SELECT * FROM generated_images WHERE id = ?`,
      [result.insertId],
    );

    res.status(201).json({
      success: true,
      image: { ...rows[0], url: `/uploads/images/${fileName}` },
    });
  } catch (error) {
    next(error);
  }
});

// Delete an image
router.delete("/:id", async (req, res, next) => {
  try {
    const [rows] = await db.execute(
      `SELECT * FROM generated_images WHERE id = ?`,
      [req.params.id],
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Image not found." });
    }

    await db.execute(`DELETE FROM generated_images WHERE id = ?`, [
      req.params.id,
    ]);

    // file_name always comes from our own database
    await fs
      .unlink(path.join(IMAGES_DIR, path.basename(rows[0].file_name)))
      .catch(() => {});

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;

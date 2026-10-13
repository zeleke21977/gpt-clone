import express from "express";
import db from "../../../db/db.config.js";

const router = express.Router();

const clean = (value, max) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

// List projects (with chat counts)
router.get("/", async (req, res, next) => {
  try {
    const [projects] = await db.execute(
      `SELECT p.*,
              (SELECT COUNT(*) FROM chat_sessions s
               WHERE s.project_id = p.id AND s.is_archived = FALSE) AS chat_count
       FROM projects p
       ORDER BY p.updated_at DESC`,
    );

    res.json({ success: true, projects });
  } catch (error) {
    next(error);
  }
});

// Create project
router.post("/", async (req, res, next) => {
  try {
    const name = clean(req.body?.name, 255);

    if (!name) {
      return res
        .status(400)
        .json({ success: false, message: "Project name is required." });
    }

    const description = clean(req.body?.description, 500);
    const instructions = clean(req.body?.instructions, 8000);

    const [result] = await db.execute(
      `INSERT INTO projects (name, description, instructions)
       VALUES (?, ?, ?)`,
      [name, description, instructions || null],
    );

    const [rows] = await db.execute(
      `SELECT * FROM projects WHERE id = ?`,
      [result.insertId],
    );

    res.status(201).json({ success: true, project: { ...rows[0], chat_count: 0 } });
  } catch (error) {
    next(error);
  }
});

// Update project
router.patch("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existing] = await db.execute(
      `SELECT * FROM projects WHERE id = ?`,
      [id],
    );

    if (existing.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Project not found." });
    }

    const current = existing[0];

    const name =
      req.body?.name !== undefined ? clean(req.body.name, 255) : current.name;

    if (!name) {
      return res
        .status(400)
        .json({ success: false, message: "Project name is required." });
    }

    const description =
      req.body?.description !== undefined
        ? clean(req.body.description, 500)
        : current.description;

    const instructions =
      req.body?.instructions !== undefined
        ? clean(req.body.instructions, 8000) || null
        : current.instructions;

    await db.execute(
      `UPDATE projects SET name = ?, description = ?, instructions = ?
       WHERE id = ?`,
      [name, description, instructions, id],
    );

    const [rows] = await db.execute(
      `SELECT p.*,
              (SELECT COUNT(*) FROM chat_sessions s
               WHERE s.project_id = p.id AND s.is_archived = FALSE) AS chat_count
       FROM projects p WHERE p.id = ?`,
      [id],
    );

    res.json({ success: true, project: rows[0] });
  } catch (error) {
    next(error);
  }
});

// Delete project (its chats are deleted too)
router.delete("/:id", async (req, res, next) => {
  try {
    const [result] = await db.execute(
      `DELETE FROM projects WHERE id = ?`,
      [req.params.id],
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Project not found." });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;

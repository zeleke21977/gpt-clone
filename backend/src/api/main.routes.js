import express from "express";
import chatRouter from "./chat/chat.routes.js";
import projectsRouter from "./projects/projects.routes.js";
import imagesRouter from "./images/images.routes.js";
import { rateLimit } from "../middleware/rate-limit.js";

const mainRouter = express.Router();

// Sending messages costs money (Gemini): limit per IP address
mainRouter.post(
  "/chat/sessions/:sessionId/messages",
  rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: "You are sending messages too fast. Please wait a moment.",
  }),
);

mainRouter.use("/chat", chatRouter);
mainRouter.use("/projects", projectsRouter);
mainRouter.use("/images", imagesRouter);

export default mainRouter;

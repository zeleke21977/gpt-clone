export const errorHandler = (err, req, res, next) => {
  console.error("❌", req.method, req.originalUrl, "-", err?.message || err);

  // Errors from express itself (bad JSON, body too large...)
  if (err?.status >= 400 && err?.status < 500) {
    return res.status(err.status).json({
      success: false,
      message:
        err.type === "entity.parse.failed"
          ? "Invalid request body."
          : "Bad request.",
    });
  }

  const notFound = /not found/i.test(err?.message || "");

  return res.status(notFound ? 404 : 500).json({
    success: false,
    message: notFound ? err.message : "Something went wrong, try again later",
  });
};

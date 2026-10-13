// Small in-memory rate limiter (fine for a single server instance)

export const rateLimit = ({
  windowMs,
  max,
  message = "Too many requests, please slow down.",
  key = (req) => req.ip,
}) => {
  const hits = new Map();

  // Clean old entries so memory does not grow
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) {
      if (v.resetAt <= now) hits.delete(k);
    }
  }, windowMs).unref();

  return (req, res, next) => {
    const now = Date.now();
    const id = key(req);
    let entry = hits.get(id);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(id, entry);
    }

    entry.count += 1;

    if (entry.count > max) {
      res.set("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({ success: false, message });
    }

    next();
  };
};

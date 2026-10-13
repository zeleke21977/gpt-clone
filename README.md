# GPT Clone

React + Express + MySQL chat app (Gemini) with chats, search, images, apps,
deep research, Codex and projects. There is no login: anyone who can open the
site can use it (see "Security notes").

## Run locally

```bash
# 1. backend
cd backend
cp .env.example .env        # fill in db_* and GEMINI_API_KEY
npm install
npm run dev                 # http://localhost:3130

# 2. frontend (second terminal)
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

Create an empty MySQL database (name = `db_database` in `.env`).
All tables are created and upgraded automatically when the backend starts.
Open http://localhost:5173 and start chatting.

## Deploy option A - Docker (recommended, one command)

Works on any VPS (DigitalOcean, Hetzner, AWS Lightsail...).

```bash
cp .env.example .env        # set DB_PASSWORD and GEMINI_API_KEY
docker compose up -d --build
```

The site runs on port 3130 (backend + built frontend + MySQL together).
Chats are stored in the `db_data` volume and images in the `uploads` volume,
so they survive restarts and rebuilds.

Put HTTPS in front of it (required for real use). Easiest is Caddy:

```
chat.yourdomain.com {
    reverse_proxy localhost:3130
}
```

## Deploy option B - Railway / Render / Fly.io

Use **one service** built from the `Dockerfile` in this folder:

1. Create a MySQL database (Railway has one built in; on Render use an external
   MySQL such as Aiven or Railway - Render's own database is Postgres only).
2. Create a web service from this repo (Dockerfile build).
3. Set these environment variables:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `GEMINI_API_KEY` | your key |
| `GEMINI_MODEL` | e.g. `gemini-2.5-flash` |
| `db_host`, `db_port`, `db_user`, `db_password`, `db_database` | from your MySQL |
| `db_ssl` | `true` if the database requires SSL |
| `UPLOADS_DIR` | `/data/uploads` |

4. **Attach a persistent disk/volume mounted at `/data`.** Without it, generated
   images disappear every time the service restarts.
5. Health check path: `/health`.

Serverless hosts (Vercel/Netlify functions) are not suitable for the backend
because it stores image files on disk.

### Frontend on a different host (optional)

If you host the frontend separately (Vercel/Netlify), build it with
`VITE_API_URL=https://your-backend-url` and set the backend variable
`CLIENT_URL=https://your-frontend-url` so CORS allows it.

## Pre-launch checklist

- [ ] Strong database password
- [ ] HTTPS enabled
- [ ] Gemini key kept only in environment variables (never committed)
- [ ] Persistent storage for `/data/uploads` and the database
- [ ] Decided who may reach the site (see below)
- [ ] Open the site, send a message, generate an image

## Security notes

- **There is no login.** Everyone who can open the URL shares the same chats,
  projects and images, and can spend your Gemini quota. For a public deployment
  put the site behind something that restricts access (basic auth in Caddy or
  nginx, Cloudflare Access, a VPN, or an IP allow-list).
- Messages (20/min) and images (20/hour) are rate limited per IP address.
- The rate limiter is in memory, which is right for a single server instance.
- If you upgrade a database that had accounts, the old `users` table and
  `user_id` columns are simply ignored. All existing chats become visible.

# Tharun Farm Fresh Dairy — Full-Stack Deployment Guide

A full-stack dairy e-commerce app built with **Vanilla JS + HTML/CSS** (frontend) and **Flask + MongoDB** (backend), ready for production deployment on **Vercel** (frontend) and **Render** (backend).

---

## 📁 Project Structure

```
fsdecommerce/
├── frontend/               ← Deploy to Vercel
│   ├── index.html          (dairy e-commerce UI)
│   ├── style.css           (natural/organic theme)
│   ├── script.js           (catalog, auth, cart logic)
│   └── vercel.json         (Vercel static config)
├── backend/                ← Deploy to Render
│   ├── app.py              (Flask REST API)
│   ├── requirements.txt    (Python dependencies)
│   ├── render.yaml         (Render deploy config)
│   ├── .env.example        (environment variables template)
│   └── .gitignore
└── README.md               (this file)
```

---

## 🚀 Step 1 — MongoDB Atlas Setup

1. Go to [https://cloud.mongodb.com](https://cloud.mongodb.com) and create a free account.
2. Create a new **free cluster** (M0 tier).
3. Under **Database Access**, create a user with a strong password.
4. Under **Network Access**, add `0.0.0.0/0` to allow connections from Render.
5. Click **Connect → Drivers** and copy the connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/warpline?retryWrites=true&w=majority
   ```
6. Save this — you'll need it as `MONGO_URI` in Step 2.

---

## 🖥️ Step 2 — Deploy Backend to Render

1. Push your project to GitHub (make sure `backend/` folder is included).
2. Go to [https://render.com](https://render.com) and click **New → Web Service**.
3. Connect your GitHub repository.
4. Configure the service:
   - **Root Directory**: `backend`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app --bind 0.0.0.0:$PORT`
5. Under **Environment Variables**, add:

   | Key            | Value                                      |
   |----------------|--------------------------------------------|
   | `MONGO_URI`    | Your MongoDB Atlas connection string       |
   | `JWT_SECRET`   | A long random string (run `openssl rand -hex 32`) |
   | `FRONTEND_URL` | Your Vercel URL (add this after Step 3)    |

6. Click **Deploy**. Wait for the build to complete.
7. Note your Render URL (e.g. `https://tharun-farm-fresh-api.onrender.com`).

---

## 🌐 Step 3 — Deploy Frontend to Vercel

1. Go to [https://vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New → Project** and import your repository.
3. Configure the project:
   - **Root Directory**: `frontend`
   - Framework Preset: **Other** (static site)
4. Click **Deploy**. Vercel will detect `vercel.json` automatically.
5. Note your Vercel URL (e.g. `https://tharun-farm-fresh.vercel.app`).

---

## 🔗 Step 4 — Connect Frontend ↔ Backend

### Update API_BASE in frontend

Open `frontend/script.js` and update **line 6** with your actual Render URL:

```js
// Change this:
const API_BASE = 'https://your-app-name.onrender.com/api';

// To your actual Render URL:
const API_BASE = 'https://tharun-farm-fresh-api.onrender.com/api';
```

Push the change and Vercel will auto-redeploy.

### Update CORS on backend (Render)

In your Render dashboard → Environment Variables, update:

```
FRONTEND_URL = https://tharun-farm-fresh.vercel.app
```

Render will restart the service automatically.

---

## 📡 API Endpoints

| Method | Endpoint         | Auth Required | Description                    |
|--------|------------------|---------------|--------------------------------|
| GET    | `/`              | No            | API health check               |
| GET    | `/api/health`    | No            | Returns `{"status": "ok"}`     |
| GET    | `/api/themes`    | No            | Returns the full dairy catalog |
| POST   | `/api/signup`    | No            | Register a new user (returns JWT) |
| POST   | `/api/login`     | No            | Login and get JWT token        |
| POST   | `/api/orders`    | Yes (Bearer)  | Place a new order              |
| GET    | `/api/orders`    | Yes (Bearer)  | Fetch user's order history     |

### Example: Signup request

```bash
curl -X POST https://your-app.onrender.com/api/signup \
  -H "Content-Type: application/json" \
  -d '{"name": "Tharun Kumar", "email": "tharun@example.com", "password": "secret123"}'
```

---

## 💻 Local Development

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
cp .env.example .env         # Fill in your MONGO_URI and JWT_SECRET
python app.py
# Runs at http://localhost:5000
```

### Frontend

Open `frontend/index.html` in a browser, or use Live Server (VS Code extension).

> **Note:** For local dev, temporarily change `API_BASE` in `frontend/script.js` back to `http://localhost:5000/api`.

---

## 🔒 Security Checklist Before Going Live

- [ ] `JWT_SECRET` is a long random string (≥ 32 chars), never committed to Git
- [ ] `MONGO_URI` contains a non-admin MongoDB user with limited permissions
- [ ] `.env` is listed in `.gitignore` and never pushed to GitHub
- [ ] `FRONTEND_URL` on Render is set to your actual Vercel domain (not `*`)
- [ ] MongoDB Atlas IP whitelist is set appropriately for production

---

## 📦 Tech Stack

| Layer    | Technology              |
|----------|-------------------------|
| Frontend | HTML5, CSS3, Vanilla JS |
| Backend  | Python 3.11, Flask 3.x  |
| Database | MongoDB Atlas (free M0) |
| Auth     | JWT (PyJWT)             |
| Hosting  | Vercel + Render         |

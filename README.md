# MockAI — AI Mock Interview Platform 🚀

MockAI is a full-stack MERN application engineered to help developers prepare, practice, and excel in technical interviews. It features realistic interview simulations (text-based and camera/microphone audio-visual modes), dynamic Gemini-powered question generation, real-time follow-up questioning, rubric-based answer evaluations, and candidate performance analytics over time.

---

## 🛠 Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS, Lucide Icons, React Router v7, React Hot Toast, Axios
- **Backend:** Node.js, Express.js 5, MongoDB, Mongoose 9, JWT Stateless Authentication, Bcryptjs
- **AI Integration:** Google Gemini API (`@google/generative-ai` SDK)
- **Security:** Sliding-window rate limiters, strict CORS origin filtering, payload caps (100kb), X-Powered-By cloaking, and production error masking

---

## 📁 Repository Structure

```text
├── backend/                  # Express REST API & Database Models
│   ├── server.js             # HTTP server entrypoint & MongoDB lifecycle manager
│   ├── src/
│   │   ├── app.js            # Express application setup & middleware stack
│   │   ├── config/           # Database connection configuration (db.js)
│   │   ├── controllers/      # Auth & Interview route controllers
│   │   ├── middleware/       # JWT auth, validation, rate limiting, and error handling
│   │   ├── models/           # Mongoose schemas (User, Interview)
│   │   ├── routes/           # REST endpoints (/api/auth, /api/interviews)
│   │   ├── services/         # Gemini AI inference service (aiService.js)
│   │   └── utils/            # JWT token signing & verification utilities
│   ├── test_phase9_step1.js  # Automated security & input validation test suite
│   ├── test_phase9_step3.js  # Automated end-to-end interview workflow test suite
│   └── package.json          # Backend dependencies & runtime scripts
├── client/                   # Vite React Single Page Application (SPA)
│   ├── src/
│   │   ├── components/       # Reusable layout and UI components (Navbar, Footer, Modals)
│   │   ├── context/          # React contexts (AuthContext, MediaContext)
│   │   ├── pages/            # View pages (Login, Signup, Dashboard, Setup, Session, Report, Analytics)
│   │   └── services/         # Axios API client & endpoint bindings (api.js, authService.js, interviewService.js)
│   ├── vite.config.js        # Vite bundler & build configuration
│   └── package.json          # Frontend dependencies & build scripts
└── README.md                 # Project documentation & deployment guide
```

---

## 📋 Required Software & Services

Before deploying or running MockAI locally, ensure you have the following installed and configured:

1. **Node.js:** v18.0.0 or higher (v20+ LTS recommended)
2. **MongoDB:** A running MongoDB instance:
   - **Local:** MongoDB Community Server (v6.0+) running on `mongodb://localhost:27017`
   - **Cloud (Production):** MongoDB Atlas M0/M10+ cluster with network access configured
3. **Google AI Studio Account:** An active API key with access to Gemini models (`gemini-3.5-flash-lite` or `gemini-2.5-flash`) from [Google AI Studio](https://aistudio.google.com/).

---

## ⚙️ Environment Configuration

Environment variables must be configured separately for the backend and client. Template files with placeholder values are provided as `.env.example`.

> [!CAUTION]
> Never commit actual `.env` files, JWT secrets, database connection strings, or API keys to version control. Both `.gitignore` files are pre-configured to exclude all `.env` files.

### 1. Backend Configuration (`backend/.env`)

Copy `backend/.env.example` to `backend/.env` and update the placeholders:

```bash
cp backend/.env.example backend/.env
```

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `PORT` | Port the Express server listens on | `5000` |
| `MONGODB_URI` | MongoDB connection URI (local or Atlas) | `mongodb://localhost:27017/Mock-project` |
| `CLIENT_URL` | Allowed frontend origin(s) for CORS. Supports comma-separated domains and strips trailing slashes | `http://localhost:5173` |
| `NODE_ENV` | Runtime environment (`development` or `production`) | `production` |
| `JWT_SECRET` | Cryptographically random secret string for JWT signing (64+ chars) | Generate via `node -e "console.log(crypto.randomBytes(32).toString('hex'))"` |
| `JWT_EXPIRES_IN` | Token duration before expiration | `7d` |
| `GEMINI_API_KEY` | Official Google Gemini API key | `<your_gemini_api_key_here>` (from Google AI Studio) |

| `GEMINI_MODEL` | Gemini model name for question generation & evaluations | `gemini-3.5-flash-lite` |

### 2. Frontend Configuration (`client/.env`)

Copy `client/.env.example` to `client/.env`:

```bash
cp client/.env.example client/.env
```

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Full base URL for backend API requests | `http://localhost:5000/api` (Local) / `https://api.yourdomain.com/api` (Production) |

---

## 🚀 Local Development Setup

### 1. Install Dependencies

Install required packages for both backend and client:

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 2. Start the Backend API Server

```bash
cd backend
npm run dev
```

The backend server starts on port `5000` (or `process.env.PORT`) with:
- Health check: `http://localhost:5000/api/health`
- Auth endpoints: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`
- Interview endpoints: `/api/interviews`

### 3. Start the Frontend Development Server

In a separate terminal window:

```bash
cd client
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 🧪 Automated Testing & Validation

The project includes built-in test suites covering security controls, input validation, and full end-to-end interview lifecycles.

```bash
# Run the complete end-to-end interview lifecycle test suite
cd backend
npm test

# Run the security, rate limiting, and input validation test suite
npm run test:security
```

### Frontend Linting & Build Verification

```bash
cd client
npm run lint    # Verifies code standards via Oxlint
npm run build   # Compiles production bundle with Vite
```

---

## 📦 Production Deployment Guide

### Backend Production Deployment (e.g., Render, Railway, AWS EC2, DigitalOcean)

1. **Set Environment Variables:** Set all required variables (`NODE_ENV=production`, `PORT`, `MONGODB_URI`, `CLIENT_URL`, `JWT_SECRET`, `GEMINI_API_KEY`, `GEMINI_MODEL`) in your hosting platform dashboard.
2. **Build Command:** No compilation step is required for the backend (standard Node.js ES modules).
3. **Start Command:**
   ```bash
   node server.js
   ```
   *(or `npm start`)*
4. **Health Check Verification:** Configure the container health check to poll `GET /api/health`, which verifies both HTTP responsiveness and MongoDB database connectivity (`readyState: 1`).

### Frontend Production Deployment (e.g., Vercel, Netlify, Cloudflare Pages, S3/CloudFront)

1. **Set Environment Variable:** Configure `VITE_API_BASE_URL` to point to your live backend domain:
   ```env
   VITE_API_BASE_URL=https://api.yourdomain.com/api
   ```
2. **Build Command:**
   ```bash
   npm run build
   ```
3. **Publish Directory:** `dist`
4. **SPA Rewrite Rule:** Ensure all routes route to `/index.html` for client-side routing (e.g. `_redirects` file with `/* /index.html 200` on Netlify or `routes: [{ "handle": "filesystem" }, { "src": "/.*", "dest": "/index.html" }]` on Vercel).

---

## 🔒 Security Best Practices Implemented

- **Password Security:** Passwords are hashed using bcrypt with salt factor 10. Passwords and password hashes are never returned in queries or API responses.
- **Stateless Authorization:** Authenticated routes require signed JWT tokens passed via the `Authorization: Bearer <token>` header.
- **Resource Ownership:** All interview and report queries strictly enforce `{ user: req.userId }`, preventing candidates from accessing or modifying another candidate's session.
- **Rate Limiting:** Sliding-window in-memory rate limiters protect authentication routes (brute-force defense), AI endpoints (quota exhaustion defense), and general endpoints.
- **Production Error Masking:** Stack traces and internal server error details are suppressed in `production` mode (`NODE_ENV=production`).

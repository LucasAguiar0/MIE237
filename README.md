# MIE237 — AI Image Perception Experiment

A production-ready full-stack web application for a controlled statistics experiment evaluating participants' ability to distinguish AI-generated from non-AI images.

---

## Architecture Overview

```
MIE237_project/
├── backend/                   # Node.js + Express REST API
│   ├── src/
│   │   ├── app.js             # Express entry point
│   │   ├── config/
│   │   │   ├── database.js    # PostgreSQL pool
│   │   │   └── initDb.js      # Schema + seed script
│   │   ├── middleware/
│   │   │   └── auth.js        # Admin session guard
│   │   ├── routes/
│   │   │   ├── experiment.js  # Public experiment endpoints
│   │   │   └── admin.js       # Protected admin endpoints
│   │   └── controllers/
│   │       ├── experimentController.js
│   │       └── adminController.js
│   └── uploads/               # Uploaded images (served statically)
└── frontend/                  # React (Vite) SPA
    └── src/
        ├── App.jsx
        ├── context/
        │   └── ExperimentContext.jsx
        ├── pages/
        │   ├── LandingPage.jsx
        │   ├── ConsentPage.jsx
        │   ├── SetupPage.jsx
        │   ├── ExperimentPage.jsx
        │   ├── CompletionPage.jsx
        │   ├── AdminLogin.jsx
        │   └── AdminDashboard.jsx
        └── components/
            └── CheatSheet.jsx
```

---

## Database Schema

```sql
-- Admin accounts
admins (id, username, password_hash, created_at)

-- Uploaded images
images (id, name, category [People|Landscape], is_ai [0|1], file_path, created_at)

-- Participant sessions
users (id, name, category_selected, cheat_sheet_used [0|1], completed, timestamp)

-- Per-image responses (one row per classification)
responses (id, user_id, image_id, participant_classification [0|1],
           correct [0|1 XNOR], reaction_time [ms], timestamp)

-- Cheat sheet content
cheatsheet (id, content, updated_at)
```

### XNOR Correct Logic
| Is_AI | Classification | Correct |
|-------|---------------|---------|
| 0     | 0             | 1       |
| 1     | 1             | 1       |
| 0     | 1             | 0       |
| 1     | 0             | 0       |

---

## API Endpoints

### Public (Participant)
| Method | Path                        | Description                          |
|--------|-----------------------------|--------------------------------------|
| POST   | `/api/start-session`        | Create participant session            |
| GET    | `/api/images?category=`     | Get randomized images for category   |
| POST   | `/api/submit-response`      | Record one classification + RT       |
| POST   | `/api/complete-experiment`  | Mark session as complete             |
| GET    | `/api/cheatsheet`           | Fetch cheat sheet content            |

### Admin (session-protected)
| Method | Path                           | Description                    |
|--------|-------------------------------|--------------------------------|
| POST   | `/api/admin/login`             | Authenticate supervisor        |
| POST   | `/api/admin/logout`            | End session                    |
| POST   | `/api/admin/change-password`   | Update admin password          |
| POST   | `/api/admin/upload-image`      | Upload image with metadata     |
| GET    | `/api/admin/images`            | List all images                |
| DELETE | `/api/admin/image/:id`         | Delete image                   |
| GET    | `/api/admin/cheatsheet`        | Get cheat sheet                |
| PUT    | `/api/admin/cheatsheet`        | Update cheat sheet             |
| GET    | `/api/admin/results`           | All participants summary        |
| GET    | `/api/admin/results/:userId`   | Per-participant detail          |
| GET    | `/api/admin/aggregated-stats`  | Stats per condition            |
| GET    | `/api/admin/export/:userId`    | Export participant CSV         |
| GET    | `/api/admin/export-all`        | Export all results CSV         |

---

## CSV Export Schema

Each row represents one image classification:

| Column                     | Type    | Notes                         |
|----------------------------|---------|-------------------------------|
| Participant Name           | string  |                               |
| Image Category             | string  | People / Landscape            |
| Image ID                   | string  | Set by supervisor on upload   |
| Is_AI                      | 0 or 1  | Set by supervisor on upload   |
| Participant Classification  | 0 or 1  | 1=AI, 0=Not AI                |
| Correct                    | 0 or 1  | XNOR of Is_AI vs Classification|
| Cheat Sheet Used           | 0 or 1  |                               |
| Reaction Time (ms)         | integer | ms from image display to click|
| Timestamp                  | ISO8601 |                               |

---

## Setup & Deployment

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm

### 1. Database Setup

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE mie237_experiment;"
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env — set DB credentials, SESSION_SECRET, ADMIN_PASSWORD

# Initialize database (creates tables + default admin)
npm run init-db

# Start dev server
npm run dev
# Production: npm start
```

The backend runs on `http://localhost:5000`.

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server (proxies /api to localhost:5000)
npm run dev
# Production build: npm run build
```

The frontend runs on `http://localhost:5173`.

### 4. First Login

Default admin credentials are set from your `.env`:
- Username: value of `ADMIN_USERNAME` (default: `supervisor`)
- Password: value of `ADMIN_PASSWORD` (default: `changeme123`)

**Change the password immediately** via the Settings tab.

### 5. Production Deployment

For production:
1. Set `NODE_ENV=production` in backend `.env`
2. Build the frontend: `cd frontend && npm run build`
3. Serve `frontend/dist` via nginx or have Express serve the static files
4. Use a process manager: `pm2 start src/app.js`
5. Use a reverse proxy (nginx) in front of Express
6. Set a strong `SESSION_SECRET`

---

## Experimental Design

### Independent Variables
- **IV1**: Image Category — People vs. Landscape
- **IV2**: Cheat Sheet — Used vs. Not Used

### 2×2 Conditions
1. People × No Cheat Sheet
2. People × Cheat Sheet
3. Landscape × No Cheat Sheet
4. Landscape × Cheat Sheet

### Participant Flow
1. Landing page → "Start Experiment"
2. Consent form + name entry
3. Select category + cheat sheet option
4. Classify ALL images in category (random order, one at a time)
5. Completion screen (no accuracy shown)

### Image Requirements
- Upload via Supervisor Dashboard
- Assign name, category (People/Landscape), and Is_AI (0/1)
- Recommended: 20 AI + 20 real per category = 40 images/category

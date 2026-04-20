# WFCTS - Teacher Workload Fairness Tracking & Substitution System

WFCTS is a full-stack academic workload management system designed to track teacher class-wise subject hours, substitution credits, tasks, industry sessions, and departmental fairness scores.

## Features

- **Role-Based Access Control**: TEACHER, ADMIN, HOD roles with scoped permissions
- **Credit & Substitution Ledger**: Automated tracking of substitute classes with chain-settlement calculation
- **Timetable-Based Suggestions**: Automatic identification of available teachers based on timetable overlaps
- **Fairness Dashboard**: Visual workload distribution across the department
- **Responsive UI**: Bento-grid design optimized for desktop and mobile

## Tech Stack

- **Frontend**: React 19, Vite 7, Tailwind CSS — hosted on Vercel
- **Backend**: Node.js 22, Express 5, Mongoose 9, JWT Auth — containerised via Docker, hosted on AWS EC2
- **Database**: MongoDB Atlas
- **CI/CD**: GitHub Actions → Amazon ECR → EC2

## Project Structure

```
wfcts/
├── backend/                  # Express API server
│   ├── src/                  # models, routes, controllers, utils, middleware
│   ├── scripts/              # seeding and utility scripts
│   ├── .env.example          # required environment variables
│   └── server.js             # entry point
├── frontend/                 # React + Vite application
│   ├── src/                  # pages, components, context, utils
│   ├── vercel.json           # Vercel SPA routing + API proxy
│   └── vite.config.js        # Vite config with local dev proxy
└── docker-compose.yml        # local dev (backend container only)
```

## Local Development

Frontend runs on the Vite dev server. Backend runs in Docker (same image as production).

### 1. Backend (Docker)

```bash
cd wfcts

# copy and fill in your env vars
cp backend/.env.example backend/.env

# start the backend container
docker compose up
# backend available at http://localhost:3000
```

### 2. Frontend (Vite dev server)

```bash
cd wfcts/frontend
npm install
npm run dev
# opens at http://localhost:5173
# /api requests are proxied to localhost:3000 automatically
```

### Seed Accounts

```
Teacher : teacher@wfcts.edu / teacher123
Admin   : admin@wfcts.edu   / admin123
HOD     : hod@wfcts.edu     / hod123
```

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for the full CI/CD setup.

## License

ISC

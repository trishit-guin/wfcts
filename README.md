# WFCTS - Teacher Workload Fairness Tracking & Substitution System

WFCTS is a full-stack academic workload management system designed to track teacher class-wise subject hours, substitution credits, tasks, industry sessions, and departmental fairness scores.

## 🚀 Features

- **Role-Based Access Control**:
  - **TEACHER**: Log work entries, track substitution credits, view personal tasks, and manage weekly timetable slots.
  - **ADMIN/HOD**: Oversee departmental workload, assign tasks to teachers, and monitor workload fairness metrics.
- **Credit & Substitution Ledger**: Automated tracking of substitute classes with chain-settlement calculation.
- **Timetable-Based Suggestions**: Automatic identification of available teachers based on departmental timetable overlaps.
- **Fairness Dashboard**: Visual representation of workload distribution across the department.
- **Responsive UI**: Modern editorial-style bento-grid design optimized for both desktop and mobile devices.

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite 7, Tailwind CSS, Context API.
- **Backend**: Node.js 22, Express 5, Mongoose 9, JWT Auth.
- **Database**: MongoDB (Atlas recommended for production).

## 📂 Project Structure

```
wfcts/
├── backend/            # Express API server
│   ├── src/            # Source code (models, routes, utils, middleware)
│   ├── scripts/        # Seeding and utility scripts
│   └── server.js       # Entry point
└── frontend/           # React + Vite application
    ├── src/            # Source code (pages, components, context, utils)
    ├── public/         # Static assets
    └── vite.config.js  # Vite configuration
```

## ⚙️ Local Setup

### 1. Prerequisites
- Node.js (v22 or higher)
- MongoDB (Local or Atlas)

### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd wfcts/backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   Create a `.env` file in the `backend/` directory and add:
   ```env
   MONGODB_URI=your_mongodb_uri
   PORT=3000
   CLIENT_URL=http://localhost:5173
   JWT_SECRET=your_jwt_secret
   ```
4. Seed the database (Optional):
   ```bash
   npm run seed:all:10
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```

### 3. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd wfcts/frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## 📝 Seed Accounts
The default seeding script provides the following accounts:
- **Teacher**: `teacher@wfcts.edu` / `teacher123`
- **Admin**: `admin@wfcts.edu` / `admin123`
- **HOD**: `hod@wfcts.edu` / `hod123`

## 📄 License
This project is licensed under the ISC License.

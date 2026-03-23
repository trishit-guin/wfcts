# WFCTS Project Context

Last updated: 2026-03-23 (backend + MongoDB + JWT sync)
Workspace root: D:/inhouse/wfcts

## Project Snapshot
WFCTS is now a full-stack React + Vite + Express application focused on teacher workload, class-wise subject-hour tracking, give/take credits, tasks, industry sessions, and fairness monitoring.

Workspace folders:
- backend/
- frontend/

Current implementation status:
- frontend is connected to a real backend
- backend persists application data in MongoDB
- authentication uses JWT
- signup is available for TEACHER accounts
- initial seed data is inserted when the database is empty

## Stack and Tooling
Frontend:
- React 19
- Vite 7
- react-router-dom
- Tailwind CSS via @tailwindcss/vite
- ESLint 9
- Context API for app state and API-backed global data

Backend:
- Node.js 22
- Express 5
- Mongoose 9
- jsonwebtoken
- Node `crypto.scryptSync` for password hashing

Frontend scripts:
- npm run dev
- npm run build
- npm run lint
- npm run preview

Backend scripts:
- npm start
- npm run dev

Dev server setting:
- allowed host: monte-nonlevulose-leticia.ngrok-free.dev
- Vite proxy forwards `/api` to `http://localhost:5000`

## Backend Runtime and API
Backend entry:
- backend/server.js

MongoDB:
- default URI: `mongodb://127.0.0.1:27017/wfcts`
- configurable via `backend/.env` using `backend/.env.example`

Public API routes:
- GET `/api/health`
- POST `/api/auth/signup`
- POST `/api/auth/login`
- GET `/api/auth/me`

Protected data API routes:
- GET `/api/data/bootstrap`
- GET `/api/data/teachers`
- POST `/api/data/work-entries`
- POST `/api/data/substitute-entries`
- POST `/api/data/tasks`
- PATCH `/api/data/tasks/:taskId/complete`
- POST `/api/data/industry-sessions`

Seed behavior:
- backend seeds users, work entries, substitute entries, tasks, and industry sessions if the database has no users

## App Wiring
- frontend/src/main.jsx: AuthProvider wraps App
- frontend/src/App.jsx: WFCTSProvider wraps BrowserRouter and routes
- frontend/src/components/ProtectedRoute.jsx: waits for auth restore and applies role guard
- frontend/src/utils/api.js: central frontend API request helper

## Auth and Role Model
Source:
- frontend/src/context/AuthContext.jsx
- backend/src/routes/auth.js
- backend/src/utils/token.js

Roles:
- TEACHER
- ADMIN
- HOD

Authentication model:
- login is backend-driven, not inferred from email text anymore
- session token is a JWT signed with HS256
- JWT is stored in localStorage under `wfcts_token`
- user object is stored in localStorage under `wfcts_user`
- app restores session on refresh via `/api/auth/me`

Signup behavior:
- public signup creates TEACHER accounts only
- ADMIN and HOD accounts are still seeded/managed separately

Password handling:
- passwords are stored as scrypt hashes, not plain text

Role home routes:
- TEACHER -> /dashboard
- ADMIN -> /admin/dashboard
- HOD -> /hod/dashboard

Current seeded login accounts:
- teacher@wfcts.edu / teacher123
- admin@wfcts.edu / admin123
- hod@wfcts.edu / hod123

## Route Map (Current)
Public:
- /login
- /signup

Authenticated:
- / (redirects by role)

Teacher-only:
- /dashboard
- /work-entry
- /credits
- /tasks
- /industry-sessions

Admin-only:
- /admin/dashboard

HOD-only:
- /hod/dashboard

Admin + HOD:
- /assign-task
- /fairness

All authenticated roles:
- /subject-hours
- /profile

Fallback:
- * -> /

## Role-Aware Navigation
Source: frontend/src/components/BottomNav.jsx

Teacher tabs:
- Dashboard
- Tasks
- Sessions
- Log Work
- Credits
- Profile

Admin tabs:
- Dashboard
- Assign
- Fairness
- Profile

HOD tabs:
- Dashboard
- Assign
- Fairness
- Profile

Layout behavior:
- frontend/src/components/Layout.jsx always renders bottom navigation
- top-right floating profile button is removed

## MongoDB Data Model
Key collections/models:
- User
- WorkEntry
- SubstituteEntry
- Task
- IndustrySession

User fields:
- name
- email
- passwordHash
- department
- role

WorkEntry fields:
- teacherId
- subject
- className
- hours
- workType
- date

SubstituteEntry fields:
- teacherId
- coveredFor
- date
- status
- direction

Task fields:
- title
- description
- assignedBy
- assignTo
- deadline
- status

IndustrySession fields:
- teacherId
- title
- speaker
- date
- proofUploaded
- proofName

## WFCTSContext Data Model
Source: frontend/src/context/WFCTSContext.jsx

State slices:
- substituteEntries
- workEntries
- tasks
- teacherDirectory
- industrySessions
- isLoading
- error

Current action functions:
- addSubstituteEntry(entry)
- addWorkEntry(entry)
- addTask(task)
- markTaskComplete(taskId)
- addIndustrySession(session)
- refreshData()

Behavior details:
- data is loaded from `/api/data/bootstrap`
- TEACHER users receive their own work entries, substitute entries, tasks, and industry sessions
- ADMIN/HOD users receive full department-wide data for dashboard/fairness/subject-hours views
- addTask always creates `Pending` status on the backend
- substitute entries support direction values:
  - CREDIT (you covered for others)
  - SUBSTITUTION (others covered for you)
- work entries include className for class/division level tracking
- WFCTSContext is API-backed and persists through MongoDB instead of in-memory only

## Credit Management Logic
Current implementation is ledger-based, not optimization-based.

Credit ledger rules:
- each substitute record is one ledger entry
- `direction = CREDIT` means you covered for someone else
- `direction = SUBSTITUTION` means someone else covered for you
- `status = Pending` means not settled
- `status = Repaid` means settled/repaid

Current page calculations:
- Credits page net balance = `count(CREDIT) - count(SUBSTITUTION)`
- pending counts come from entries with `status = Pending`
- credits earned on dashboard/profile come from entries with `status = Repaid`
- fairness dashboard workload score = `lectures + substitutions + completedTasks`

Note:
- the current credit model is entry-count based, not hour-weighted

## Implemented Pages and Current Behavior

1. Login
- file: frontend/src/pages/Login.jsx
- real backend login with redirect by role
- shows seeded sample accounts
- links to Signup page

2. Signup
- file: frontend/src/pages/Signup.jsx
- same visual structure as Login page
- creates TEACHER account through backend
- auto-signs user in after successful signup

3. Teacher Dashboard
- file: frontend/src/pages/Dashboard.jsx
- workload summary, credits and obligations cards
- uses real workEntries and substituteEntries from backend
- subjects-taught cards are now derived from actual work entry data for the logged-in teacher

4. Work Entry
- file: frontend/src/pages/WorkEntry.jsx
- teacher logs subject, className, hours, work type
- entries are saved through backend to MongoDB
- shows recent entries list from persisted data

5. Credits (Combined Give/Take)
- file: frontend/src/pages/Credits.jsx
- consolidated ledger page for both flows:
  - CREDITS: you covered for others
  - SUBSTITUTIONS: others covered for you
- route remains /credits
- currently reads persisted substitute-entry data

6. Profile
- file: frontend/src/pages/Profile.jsx
- accessible to TEACHER, ADMIN, HOD
- shows live profile header from authenticated user data
- contribution summary is derived from persisted work entries, tasks, substitute entries, and industry sessions
- includes logout button

7. Tasks
- file: frontend/src/pages/Tasks.jsx
- teacher-assigned tasks list
- card fields: title, assigned by, deadline, status
- mark complete action calls backend and persists

8. Assign Task
- file: frontend/src/pages/AssignTask.jsx
- ADMIN and HOD page
- form fields: title, description, assign to, deadline
- uses live teacherDirectory from backend instead of mock teacher list

9. Industry Sessions
- file: frontend/src/pages/IndustrySessions.jsx
- teacher tracks expert sessions
- sessions are persisted to backend
- proof upload remains filename-only metadata, not actual file storage

10. Subject Hours
- file: frontend/src/pages/SubjectHours.jsx
- class/division-level subject-hour tracking
- groups by teacherId + subject + className
- TEACHER view: subject -> class progress cards
- ADMIN/HOD view: teacher -> subject -> class hierarchy
- progress color coding:
  - red <50%
  - yellow 50-80%
  - green >80%

11. Workload Fairness Dashboard
- file: frontend/src/pages/WorkloadFairnessDashboard.jsx
- ADMIN and HOD page
- data source: workEntries, substituteEntries, tasks, teacherDirectory
- workload formula:
  - workloadScore = lectures + substitutions + completedTasks
- sorting:
  - teachers sorted descending by workload score
- UI includes:
  - teacher name
  - workload score
  - breakdown (lectures, substitutions, tasks)
  - color-coded status
  - div-based horizontal bar visualization

12. Admin Dashboard
- file: frontend/src/pages/AdminDashboard.jsx
- enhanced summary screen with live widgets:
  - total teachers
  - total tasks assigned
  - pending tasks
  - total substitutions
- quick insights:
  - most active teacher
  - least active teacher
- mini fairness preview:
  - top 3 overloaded teachers

13. HOD Dashboard
- file: frontend/src/pages/HodDashboard.jsx
- enhanced summary screen with same widget/insight/fairness blocks as Admin dashboard

## Current UX and Design Conventions
- Mobile-first layout
- Card-heavy visual structure
- Consistent page headers with subtitle text
- Bottom fixed nav with active pill, bold label, and indicator dot
- No external chart library currently used
- Signup page intentionally mirrors the Login page styling

## Important Constraints
- Industry proof upload is still metadata-only (filename captured, no file storage)
- Subject-hours required values are still defined in a frontend map, not stored in backend yet
- Public signup only creates TEACHER accounts
- Credit ledger is still entry-count based rather than hour-weighted
- Backend seeds demo data only when DB is empty
- Date display uses shared readable formatting utility, but stored values remain raw ISO-like date strings from API serialization

## Key Files for Multi-Agent Handoff
Routing and access:
- frontend/src/App.jsx
- frontend/src/components/ProtectedRoute.jsx
- frontend/src/components/Layout.jsx
- frontend/src/components/BottomNav.jsx

Context and auth:
- frontend/src/context/AuthContext.jsx
- frontend/src/context/WFCTSContext.jsx
- frontend/src/utils/api.js

Backend runtime and auth:
- backend/server.js
- backend/src/routes/auth.js
- backend/src/routes/data.js
- backend/src/utils/token.js
- backend/src/utils/seed.js
- backend/src/config/db.js

Backend models:
- backend/src/models/User.js
- backend/src/models/WorkEntry.js
- backend/src/models/SubstituteEntry.js
- backend/src/models/Task.js
- backend/src/models/IndustrySession.js

Pages:
- frontend/src/pages/Login.jsx
- frontend/src/pages/Signup.jsx
- frontend/src/pages/Dashboard.jsx
- frontend/src/pages/WorkEntry.jsx
- frontend/src/pages/Credits.jsx
- frontend/src/pages/Profile.jsx
- frontend/src/pages/Tasks.jsx
- frontend/src/pages/AssignTask.jsx
- frontend/src/pages/IndustrySessions.jsx
- frontend/src/pages/SubjectHours.jsx
- frontend/src/pages/WorkloadFairnessDashboard.jsx
- frontend/src/pages/AdminDashboard.jsx
- frontend/src/pages/HodDashboard.jsx

Utilities:
- frontend/src/utils/formatDate.js
- frontend/src/utils/subjectHours.js

Runtime and setup:
- frontend/src/main.jsx
- frontend/package.json
- frontend/vite.config.js
- backend/package.json
- backend/.env.example

## Recommended Next Work Items
1. Add edit/delete flows and matching backend endpoints for work entries, substitute entries, tasks, and industry sessions.
2. Move subject-hour required-hours configuration from frontend constant map into backend/MongoDB.
3. Add file storage for industry-session proof uploads instead of filename-only metadata.
4. Add automated tests for auth, role guards, API routes, and key page flows.
5. Improve the credit system from entry-count based logic to an hours-weighted or settlement-aware model.

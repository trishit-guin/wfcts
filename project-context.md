# WFCTS Project Context

Last updated: 2026-04-06 (linked substitutions + chain settlement + timetable availability)
Workspace root: D:/WFCTS

## Project Snapshot
WFCTS is a full-stack React + Vite + Express application for teacher workload management, class-wise subject-hour tracking, substitution credits, tasks, industry sessions, fairness monitoring, and timetable-based substitute suggestion.

Workspace folders:
- backend/
- frontend/

Current implementation status:
- frontend is API-backed and role-aware
- backend persists data in MongoDB via Mongoose
- authentication is JWT-based with session restore
- signup is public for TEACHER role
- seed data initializes when database has no users
- linked substitution entries are supported
- chain settlement recommendations are computed server-side
- recurring weekly timetable slots are supported
- free-teacher suggestions are automatic from timetable overlap rules

## Stack and Tooling
Frontend:
- React 19
- Vite 7
- react-router-dom
- Tailwind CSS via @tailwindcss/vite
- ESLint 9
- Context API for API-backed global state

Backend:
- Node.js 22
- Express 5
- Mongoose 9
- jsonwebtoken
- Node crypto.scryptSync for password hashing

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
- Vite proxy forwards /api to http://localhost:5000

## Backend Runtime and API
Backend entry:
- backend/server.js

MongoDB:
- default URI: mongodb://127.0.0.1:27017/wfcts
- configurable via backend/.env using backend/.env.example

Public API routes:
- GET /api/health
- POST /api/auth/signup
- POST /api/auth/login
- GET /api/auth/me

Protected data API routes:
- GET /api/data/bootstrap
- GET /api/data/teachers
- POST /api/data/work-entries
- POST /api/data/substitute-entries
- GET /api/data/substitute-settlements
- GET /api/data/timetable-slots
- POST /api/data/timetable-slots
- PATCH /api/data/timetable-slots/:slotId
- DELETE /api/data/timetable-slots/:slotId
- GET /api/data/available-teachers
- POST /api/data/tasks
- PATCH /api/data/tasks/:taskId/complete
- POST /api/data/industry-sessions

Seed behavior:
- backend seeds users, work entries, substitute entries, timetable slots, tasks, and industry sessions when DB has no users

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
- login is backend-driven
- session token is JWT (HS256)
- JWT key in localStorage: wfcts_token
- user object key in localStorage: wfcts_user
- app restores session using /api/auth/me

Signup behavior:
- public signup creates TEACHER accounts only
- ADMIN and HOD are seeded/managed separately

Password handling:
- passwords stored as scrypt hashes

Role home routes:
- TEACHER -> /dashboard
- ADMIN -> /admin/dashboard
- HOD -> /hod/dashboard

Current seeded login accounts:
- teacher@wfcts.edu / teacher123
- neha@wfcts.edu / teacher123
- arjun@wfcts.edu / teacher123
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
- /timetable
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
- Slots
- Profile

Admin tabs:
- Dashboard
- Assign
- Fairness
- Slots
- Profile

HOD tabs:
- Dashboard
- Assign
- Fairness
- Slots
- Profile

Layout behavior:
- frontend/src/components/Layout.jsx always renders bottom navigation
- top-right floating profile button is removed

## MongoDB Data Model
Key collections/models:
- User
- WorkEntry
- SubstituteEntry
- TeacherTimetable
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
- description
- date

SubstituteEntry fields:
- teacherId
- coveredFor
- counterpartTeacherId
- date
- status
- direction
- pairingKey

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

TeacherTimetable fields:
- teacherId
- dayOfWeek (0 to 6)
- startTime (HH:MM)
- endTime (HH:MM)
- subject
- className
- location

Timetable note:
- there is no active/inactive flag anymore
- if a slot exists, it is always considered active

## WFCTSContext Data Model
Source: frontend/src/context/WFCTSContext.jsx

State slices:
- substituteEntries
- workEntries
- tasks
- teacherDirectory
- industrySessions
- timetableSlots
- availableTeachers
- settlementPlan
- isLoading
- error

Current action functions:
- addSubstituteEntry(entry)
- addWorkEntry(entry)
- addTask(task)
- markTaskComplete(taskId)
- addIndustrySession(session)
- addTimetableSlot(slot)
- updateTimetableSlot(slotId, updates)
- deleteTimetableSlot(slotId)
- refreshTimetableSlots(filters)
- fetchAvailableTeachers(query)
- refreshData()
- refreshSettlementPlan()

Behavior details:
- data is loaded from /api/data/bootstrap
- TEACHER users receive own records for work/substitute/tasks/industry/timetable
- ADMIN/HOD users receive broader records for monitoring and management pages
- substitute entries support direction values CREDIT and SUBSTITUTION
- linked substitutions can create mirrored counterpart entries
- settlement plan is fetched from /api/data/substitute-settlements
- available teacher suggestions are fetched from /api/data/available-teachers

## Credit and Settlement Logic
The credit ledger is entry-based and supports linked counterpart tracking.

Ledger rules:
- each substitute record is one ledger entry
- direction = CREDIT means teacher covered for someone else
- direction = SUBSTITUTION means someone else covered for teacher
- status = Pending means unsettled
- status = Repaid means settled

Linked-entry behavior:
- when counterpartTeacherId is provided, backend creates mirrored pair entries
- mirrored entries share pairingKey

Settlement behavior:
- server computes chain settlements from all pending linked CREDIT entries
- computation runs on the full graph, then results are filtered for viewer role
- this enables transitive resolution like A -> B -> C resulting in C settling with A

Current page calculations:
- Credits page net balance = count(CREDIT) - count(SUBSTITUTION)
- pending counts come from status = Pending
- settlement cards show balances and recommended settle actions
- fairness workload formulas count substitutions from CREDIT-side records to avoid double counting mirrored entries

Note:
- credit model is still count-based, not hour-weighted

## Timetable and Free-Teacher Suggestion Logic
Timetable model:
- recurring weekly slots by dayOfWeek and time range

Permissions:
- TEACHER can create/update/delete only own timetable slots
- ADMIN/HOD can manage timetable slots for all teachers

Availability endpoint behavior (/api/data/available-teachers):
- requires dayOfWeek, startTime, endTime
- candidate pool is teachers from same department
- excludes teacher specified by excludeTeacherId (or current teacher by default)
- excludes teachers with overlapping timetable slots
- returns free teachers sorted by name

Overlap rule:
- overlap when requestedStart < slotEnd and slotStart < requestedEnd

Credits page integration:
- linked entry form includes date + startTime + endTime
- available teacher suggestions auto-refresh for selected slot
- clicking a suggested teacher pre-fills counterpart selection

## Implemented Pages and Current Behavior
1. Login (frontend/src/pages/Login.jsx)
- backend login with role redirect
- sample account hints

2. Signup (frontend/src/pages/Signup.jsx)
- creates TEACHER account and signs in

3. Dashboard (frontend/src/pages/Dashboard.jsx)
- teacher workload cards and quick actions
- substitution metrics use CREDIT-side records

4. Work Entry (frontend/src/pages/WorkEntry.jsx)
- logs subject/class/hours/work type/description and persists

5. Credits (frontend/src/pages/Credits.jsx)
- ledger view for credits/substitutions
- linked entry creation by counterpart teacher
- time-window based free-teacher suggestions
- chain settlement panel

6. Profile (frontend/src/pages/Profile.jsx)
- role-visible profile and contribution summary

7. Tasks (frontend/src/pages/Tasks.jsx)
- list and complete teacher tasks

8. Assign Task (frontend/src/pages/AssignTask.jsx)
- ADMIN/HOD assignment flow using live teacher directory

9. Industry Sessions (frontend/src/pages/IndustrySessions.jsx)
- tracks sessions (proof metadata only)

10. Subject Hours (frontend/src/pages/SubjectHours.jsx)
- class/division progress by teacher/subject/class

11. Workload Fairness Dashboard (frontend/src/pages/WorkloadFairnessDashboard.jsx)
- ADMIN/HOD teacher workload score with component breakdown

12. Admin Dashboard (frontend/src/pages/AdminDashboard.jsx)
- high-level widgets and top-overloaded preview

13. HOD Dashboard (frontend/src/pages/HodDashboard.jsx)
- department-level widgets and overload preview

14. Timetable (frontend/src/pages/Timetable.jsx)
- add/edit/delete weekly slots
- teacher self-management and admin/HOD cross-teacher management

## Current UX and Design Conventions
- mobile-first card-driven layout
- consistent page headers and subtitle text
- bottom fixed nav with active indicator
- no external chart library
- timetable and credits forms use in-page validation messaging

## Important Constraints
- industry proof upload is metadata-only (no file storage yet)
- subject-hours required values are still frontend-map based
- public signup only creates TEACHER accounts
- credit ledger is count-based rather than hour-weighted
- timetable is recurring weekly only (no date-specific overrides yet)
- if slot exists, system treats it as active always
- seed runs only when DB has no users

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
- backend/src/models/TeacherTimetable.js
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
- frontend/src/pages/Timetable.jsx

Utilities:
- frontend/src/utils/api.js
- frontend/src/utils/formatDate.js
- frontend/src/utils/subjectHours.js

Runtime and setup:
- frontend/src/main.jsx
- frontend/package.json
- frontend/vite.config.js
- backend/package.json
- backend/.env.example

## Recommended Next Work Items
1. Add edit/delete endpoints for work entries, substitute entries, tasks, and industry sessions.
2. Move subject-hour required-hour config from frontend constants to backend/MongoDB.
3. Add file storage for industry-session proof uploads.
4. Add automated tests for auth, role guards, timetable overlap validation, and settlement correctness.
5. Add date-specific timetable override support (holidays/exams) on top of weekly slots.
6. Consider hour-weighted settlement instead of entry-count settlement.

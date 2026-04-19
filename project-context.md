# WFCTS Project Context

Last updated: 2026-04-19 (Timetable Upload OCR + Weekly Progress + Export System + Cron Scheduler)
Workspace root: wfcts/

## Project Snapshot
WFCTS is a full-stack React + Vite + Express application for teacher workload management, class-wise subject-hour tracking, substitution credits, tasks, industry sessions, fairness monitoring, and timetable-based substitute suggestion.

Workspace folders:
- backend/
- frontend/

Current implementation status:
- frontend is API-backed and role-aware
- frontend UI has been redesigned across auth, teacher, admin, and HOD surfaces
- backend persists data in MongoDB via Mongoose
- authentication is JWT-based with session restore
- signup is public for TEACHER role
- seed data initializes when database has no users
- linked substitution entries are supported
- chain settlement recommendations are computed server-side
- recurring weekly timetable slots are supported
- free-teacher suggestions are automatic from timetable overlap rules
- Work Scheduling Engine with Calendar UI is implemented (CalendarEvent model, week/month view, fairness weights, delegation, substitution linkage, auto WorkEntry on completion)
- Timetable Upload: OCR (tesseract.js + pdf-parse) → rule-based parser → editable slot preview → 16-week CalendarEvent bulk creation
- Weekly Progress: 40h target (20h teaching + 20h other), on-demand compute, history snapshots, arc progress UI
- Export System: XLSX/CSV monthly export with Content-Disposition binary response
- Cron scheduler: Monday 00:05 auto-snapshot all teacher progress for the previous ISO week
- Admin/HOD dashboards: quick-action tiles for timetable upload + slot management
- Teacher dashboard: weekly progress widget with live teaching/other hour bars

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
- GET /api/data/managers
- POST /api/data/work-entries
- POST /api/data/substitute-entries
- GET /api/data/substitute-settlements
- GET /api/data/timetable-slots
- POST /api/data/timetable-slots
- PATCH /api/data/timetable-slots/:slotId
- DELETE /api/data/timetable-slots/:slotId
- POST /api/data/timetable-slots/check-conflict
- PATCH /api/data/timetable-slots/:id/assign (assigns teacher + creates 16-week CalendarEvents)
- GET /api/data/available-teachers
- POST /api/data/tasks
- PATCH /api/data/tasks/:taskId/complete
- POST /api/data/industry-sessions
- GET /api/data/calendar-events (supports ?startDate, ?endDate, ?teacherId)
- POST /api/data/calendar-events
- PATCH /api/data/calendar-events/:id
- PATCH /api/data/calendar-events/:id/approve (ADMIN/HOD only)
- PATCH /api/data/calendar-events/:id/reject (ADMIN/HOD only)
- PATCH /api/data/calendar-events/:id/complete (auto-creates WorkEntry, duplicate-guarded)
- PATCH /api/data/calendar-events/:id/substitute (auto-creates SubstituteEntry pair + new CalendarEvent)
- PATCH /api/data/calendar-events/:id/cancel
- GET /api/data/weekly-progress?weekId= (on-demand compute for authenticated user)
- GET /api/data/weekly-progress/history?limit= (last N WeeklySnapshots)
- POST /api/data/weekly-progress/snapshot (upsert WeeklySnapshot)
- POST /api/data/timetable-upload (file upload → OCR → parse → return parsedSlots)
- GET /api/data/timetable-upload/:id
- PATCH /api/data/timetable-upload/:id (update parsedSlots)
- POST /api/data/timetable-upload/:id/save (create slots + 16-week CalendarEvents)
- GET /api/data/export/monthly?year=&month=&teacherId=&format=xlsx|csv (binary download)

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
- /calendar (with Export button → XLSX download)
- /profile

Teacher-only (added 2026-04-19):
- /weekly-progress

Admin + HOD (added 2026-04-19):
- /timetable-upload

Fallback:
- * -> /

## Role-Aware Navigation
Source: frontend/src/components/BottomNav.jsx

Teacher tabs:
- Dashboard
- Tasks
- Calendar
- Progress (→ /weekly-progress)
- Credits

Admin tabs:
- Dashboard
- Assign
- Calendar
- Upload (→ /timetable-upload)
- Fairness

HOD tabs:
- Dashboard
- Assign
- Calendar
- Upload (→ /timetable-upload)
- Fairness

Layout behavior:
- frontend/src/components/Layout.jsx renders a glass sticky header with top-right profile access
- mobile uses a pill-shaped bottom navigation
- xl screens use a left-side desktop rail instead of the mobile nav
- profile is accessed from the header avatar/chip, not a bottom-nav tab

## MongoDB Data Model
Key collections/models:
- User
- WorkEntry (added: source, calendarEventId)
- SubstituteEntry
- TeacherTimetable (added: eventType, assignedBy)
- Task
- IndustrySession
- CalendarEvent (with FAIRNESS_WEIGHTS, EVENT_WORK_TYPE_MAP)
- WeeklySnapshot (userId+weekId unique index, 40h breakdown)
- TimetableUpload (OCR pipeline state, parsedSlots)

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

CalendarEvent fields:
- title, description
- date (Date), startTime (HH:MM), endTime (HH:MM)
- eventType: LECTURE | LAB | ADMIN | EXTRA_DUTY | MEETING | SUBSTITUTE_COVER
- fairnessWeight: stored at creation (1.0 / 1.2 / 0.8 / 1.5 / 0.5 / 2.0)
- assignedTo (ref User) – who does the work
- createdBy (ref User) – who scheduled it
- onBehalfOf (ref User) – set when teacher delegates for manager
- status: SCHEDULED | PENDING_APPROVAL | COMPLETED | CANCELLED | SUBSTITUTED
- subject, className, location
- linkedWorkEntryId – auto-created when marked COMPLETED
- linkedSubstituteEntryId – auto-created when substituted
- originalEventId – set on sub-cover events pointing back to original
- linkedTaskId – optional task linkage

CalendarEvent engine rules:
- Teacher creating for themselves → status=SCHEDULED
- Teacher creating for a manager → status=PENDING_APPROVAL (manager must approve)
- Manager creating for anyone → status=SCHEDULED
- COMPLETED action → auto-creates WorkEntry (hours from time diff, workType mapped from eventType)
- SUBSTITUTE action → auto-creates paired SubstituteEntry (CREDIT for sub, SUBSTITUTION for original) + new CalendarEvent(SUBSTITUTE_COVER) for substitute teacher; feeds settlement engine automatically

Fairness weight mapping:
- LECTURE: 1.0, LAB: 1.2, ADMIN: 0.8, EXTRA_DUTY: 1.5, MEETING: 0.5, SUBSTITUTE_COVER: 2.0

WorkType mapping from CalendarEvent → WorkEntry:
- LECTURE→Lecture, LAB→Lab, ADMIN→Admin, EXTRA_DUTY→Extra Duty, MEETING→Admin, SUBSTITUTE_COVER→Lecture

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
- calendarEvents
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
- fetchCalendarEvents(params) – params: startDate, endDate, teacherId
- addCalendarEvent(payload)
- updateCalendarEvent(id, payload)
- approveCalendarEvent(id)
- rejectCalendarEvent(id)
- completeCalendarEvent(id) – also updates workEntries slice
- substituteCalendarEvent(id, substituteTeacherId) – also updates substituteEntries + refreshes settlement
- cancelCalendarEvent(id)
- fetchWeeklyProgress(weekId?) – sets weeklyProgress state
- fetchWeeklyProgressHistory(limit) – sets weeklyProgressHistory state
- snapshotWeeklyProgress(weekId?) – upserts WeeklySnapshot
- refreshData()
- refreshSettlementPlan()

State slices added (2026-04-19):
- weeklyProgress: current week progress object (null if not yet fetched)
- weeklyProgressHistory: array of WeeklySnapshot records

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
- redesigned centered auth card
- sample account hints shown inside auth page

2. Signup (frontend/src/pages/Signup.jsx)
- creates TEACHER account and signs in
- uses same centered auth-card style as login

3. Dashboard (frontend/src/pages/Dashboard.jsx)
- redesigned editorial teacher dashboard with quick actions, workload metrics, recent logs, and schedule panel
- substitution metrics use CREDIT-side records

4. Work Entry (frontend/src/pages/WorkEntry.jsx)
- redesigned two-column logging surface with weekly progress and recent entries
- logs subject/class/hours/work type/description/date and persists

5. Credits (frontend/src/pages/Credits.jsx)
- redesigned credits ledger and settlement UI
- ledger view for credits/substitutions
- linked entry creation by counterpart teacher
- time-window based free-teacher suggestions
- chain settlement panel

6. Profile (frontend/src/pages/Profile.jsx)
- redesigned profile hero, account detail cards, editable account form, and live contribution summary

7. Tasks (frontend/src/pages/Tasks.jsx)
- redesigned task queue with pending/completed views and large task cards

8. Assign Task (frontend/src/pages/AssignTask.jsx)
- redesigned ADMIN/HOD assignment composer and live task queue using teacher directory

9. Industry Sessions (frontend/src/pages/IndustrySessions.jsx)
- tracks sessions (proof metadata only)

10. Subject Hours (frontend/src/pages/SubjectHours.jsx)
- class/division progress by teacher/subject/class

11. Workload Fairness Dashboard (frontend/src/pages/WorkloadFairnessDashboard.jsx)
- redesigned ADMIN/HOD workload score board with component breakdown

12. Admin Dashboard (frontend/src/pages/AdminDashboard.jsx)
- redesigned manager overview using shared analytics/dashboard layout

13. HOD Dashboard (frontend/src/pages/HodDashboard.jsx)
- redesigned department overview using shared analytics/dashboard layout

14. Timetable (frontend/src/pages/Timetable.jsx)
- redesigned timetable with day tabs, inline add-slot action, and richer slot cards
- teacher self-management and admin/HOD cross-teacher management

15. Calendar / Work Scheduling Engine (frontend/src/pages/Calendar.jsx)
- week grid (07:00-21:00, 64px/hr, current-time indicator)
- mini month calendar sidebar with event-dot indicators
- timetable slots rendered as read-only grey overlays
- event types: LECTURE, LAB, ADMIN, EXTRA_DUTY, MEETING, SUBSTITUTE_COVER
- fairness weight shown per event (0.5×–2.0×)
- create/edit modal with delegation toggle (teacher schedules for manager)
- delegation creates PENDING_APPROVAL event; manager approves/rejects from drawer
- complete action auto-creates WorkEntry and links it
- substitute action auto-creates SubstituteEntry pair + new SUBSTITUTE_COVER CalendarEvent; feeds settlement engine
- event detail drawer with approve/reject/complete/sub/cancel actions
- role-aware visibility: teachers see own events, managers see all

## Current UX and Design Conventions
- light-mode branded system aligned to DESIGN.md
- Manrope headlines and Inter body/label typography
- mobile-first card-driven layout with editorial/bento-style sections
- glass sticky header with top-right profile chip
- pill-shaped mobile bottom nav and xl desktop side rail
- auth pages use a centered single-card layout
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
- frontend/src/components/AuthShell.jsx
- frontend/src/components/ManagerDashboardView.jsx

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
- backend/src/models/CalendarEvent.js (exports CalendarEvent, FAIRNESS_WEIGHTS, EVENT_WORK_TYPE_MAP)

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
- frontend/src/pages/Calendar.jsx

Utilities:
- frontend/src/utils/api.js
- frontend/src/utils/formatDate.js
- frontend/src/utils/subjectHours.js
- frontend/src/utils/workloadScore.js

Runtime and setup:
- frontend/src/main.jsx
- frontend/package.json
- frontend/vite.config.js
- backend/package.json
- backend/.env.example

## New Utilities (added 2026-04-19)
- backend/src/utils/ocrParser.js — tesseract.js (images) + pdf-parse (PDFs) → raw text
- backend/src/utils/timetableParser.js — rule-based parser: list format, grid format, fallback scan
- backend/src/utils/weeklyProgress.js — computeWeekProgress, getISOWeekId, getWeekBounds, createTimetableCalendarEvents

## New Models (added 2026-04-19)
- backend/src/models/WeeklySnapshot.js — 40h weekly compliance snapshots
- backend/src/models/TimetableUpload.js — OCR upload pipeline state

## New Pages (added 2026-04-19)
- frontend/src/pages/TimetableUpload.jsx — 3-step: dropzone upload → editable slot grid → save (16-week schedule)
- frontend/src/pages/WeeklyProgress.jsx — arc progress indicators, current week + 16-week history

## Cron Scheduler (added 2026-04-19)
- backend/server.js schedules node-cron '5 0 * * 1' (Monday 00:05)
- Iterates all TEACHER users, upserts WeeklySnapshot for previous ISO week

## Key Design Rules (2026-04-19)
- Weekly target: 20h teaching + 20h other = 40h total
- Teaching hours = completed LECTURE + LAB + SUBSTITUTE_COVER events (skip SUBSTITUTED status)
- 16-week projection: timetable upload/assign creates CalendarEvents from today forward
- Export: xlsx binary with Content-Disposition; frontend triggers browser download via URL.createObjectURL
- Tailwind v4: canonical syntax text-(--wfcts-primary), NOT text-[var(--wfcts-primary)]

## Recommended Next Work Items
1. Add edit/delete endpoints for work entries, substitute entries, tasks, and industry sessions.
2. Move subject-hour required-hour config from frontend constants to backend/MongoDB.
3. Add file storage for industry-session proof uploads.
4. Add automated tests for auth, role guards, timetable overlap validation, and settlement correctness.
5. Add date-specific timetable override support (holidays/exams) on top of weekly slots.
6. Consider hour-weighted settlement instead of entry-count settlement.
7. Add iCal (.ics) export for CalendarEvents.
8. Add CalendarEvent seeding to the seed script for demo data.
9. Teacher dashboard: show upcoming CalendarEvents (this week) in the schedule panel.
10. TimetableUpload: support bulk teacher assignment (assign all unassigned to one teacher).

# WFCTS — Workload Fairness & Credit Tracking System

A full-stack academic staff management platform for engineering colleges. Tracks teacher substitutions, class-hour allocations, weekly workload, calendar events, and fairness scores across a department — with automated settlement recommendations and real-time substitute availability.

---

## System Features

### Substitution & Credit Ledger
- Teachers log substitutions in two directions: **"I covered someone"** (earns a credit) or **"I need a sub"** (records a debt)
- Every linked substitution creates a **mirrored pair** of records — one CREDIT entry for the coverer, one SUBSTITUTION entry for the covered teacher — tied by a shared `pairingKey`
- **Net balance** is derived globally: each CREDIT adds +1, each SUBSTITUTION adds −1
- **Same-department enforcement** — substitutions are blocked if both teachers are not in the same department
- Optional slot metadata (`startTime`, `endTime`, `className`, `subject`) stored on each entry for traceability

### Smart Substitute Suggestions
- The system finds available teachers by checking timetable overlaps for the requested slot time
- Available teachers are then **ranked in three tiers**:
  - **Tier 0** — teachers with a negative balance (they owe a substitution); highest priority
  - **Tier 1** — balanced teachers (credits = debts); sorted by total timetable workload (fewest slots first)
  - **Tier 2** — teachers with a positive balance (they have credits); lowest priority
- **Class-match boost** — teachers who already teach the same class/division as the slot being covered are surfaced first within their tier, preventing hour-count bleeding across classes
- The "Right Now" hero card on the Substitutions page auto-detects the teacher's current or upcoming timetable slot and pre-fills the request form

### Chain Settlement Engine
- A greedy two-pointer algorithm computes the minimum number of transactions needed to settle all outstanding balances across the department
- The engine runs on-demand and shows which teacher should cover whom to clear all debts in the fewest steps

### Teaching Hours Allocation & Completion
- Admins/HODs assign a **required hours target** per teacher per subject per class per academic year
- Completion is computed from `CalendarEvent` records: hours from `COMPLETED` events count as taught; hours from `SUBSTITUTED` events count as lost
- Each allocation shows: hours taught, hours lost to subs, shortfall, completion percentage, and an **at-risk flag** (triggered when substitute losses exceed 15% of required hours)

### Weekly Timetable
- Teachers maintain a **recurring weekly slot schedule** — day of week, start/end time, subject, class, location
- Timetable slots are used by the substitute suggestion engine for availability checking
- The page shows the currently **active slot** (live now), the **next upcoming slot** for today, or the next session across any day — all computed from real clock time
- Admin/HOD can upload timetables in bulk via a CSV/Excel upload flow with conflict detection

### Calendar (Weekly View)
- Full interactive week grid with 7-column layout, scrollable from 07:00 to 21:00
- Timetable slots are overlaid as clickable ghost blocks — clicking one opens the Schedule Event modal pre-filled with that slot's subject, class, time, and the exact date of that column
- Adding a slot manually or uploading a timetable automatically generates CalendarEvents for **16 weeks ahead** — no manual scheduling required
- **IT dept class picker**: Class/Section field is replaced by smart dropdowns everywhere (Timetable, Calendar, Timetable Upload, Substitutions) — Lab → Batch (E–N) + Division (9/10/11); Lecture → Year (SE/TE) + Division (9/10/11); implemented as shared `ClassPicker` component
- Event types: Lecture, Lab, Admin, Extra Duty, Meeting, Substitute Cover — each with a fairness weight multiplier
- Teachers can schedule events for themselves; managers can schedule on behalf of any teacher
- Events go through an **approval workflow**: teachers submit → manager approves/rejects
- Actions available per event: Mark Complete, Request Substitute, Cancel, Edit
- Substituting an event triggers the ranked substitute suggestion engine (same dept, tier ranking, class-match boost)
- Substituting an event automatically creates a SubstituteEntry pair and updates the credit ledger
- Export to Excel for a given month

### Workload Fairness Dashboard
- Visual comparison of workload across all teachers in the department
- Fairness score = sum of (event duration × event-type weight multiplier)
- Highlights teachers who are significantly above or below the department average

### Academic Calendar
- Admins register college-wide events: holidays, exams, breaks, institutional events
- Events appear as banners above day columns in the calendar view
- Date-range events (e.g. exam weeks) span multiple days

### Task Management
- Admins/HODs assign tasks to teachers with a deadline and priority
- Teachers mark tasks complete from the Tasks page or via a linked calendar event
- Tasks can be linked to calendar events at creation time

### Industry Sessions
- Teachers log industry engagement sessions (guest lectures, visits, collaborations)
- Visible to managers for workload and compliance reporting

### Weekly Progress Snapshots
- Tracks hours completed per week against targets
- Snapshots can be taken manually and stored for historical comparison
- Progress history chart shows trend over the last 12 weeks

### Role-Based Access Control

| Feature | Teacher | HOD | Admin |
|---|---|---|---|
| View own calendar & timetable | ✓ | ✓ | ✓ |
| Schedule calendar events | ✓ | ✓ | ✓ |
| Approve/reject events | — | ✓ | ✓ |
| View all teachers' calendars | — | ✓ | ✓ |
| Assign tasks | — | ✓ | ✓ |
| Manage timetable slots | own | all | all |
| Set teaching hour allocations | — | ✓ | ✓ |
| Manage academic calendar | — | — | ✓ |
| Upload timetables | ✓ | ✓ | ✓ |
| Export reports | ✓ | ✓ | ✓ |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 7, Tailwind CSS v4 |
| Backend | Node.js 22, Express 5, Mongoose 9 |
| Database | MongoDB Atlas |
| Auth | JWT (Bearer tokens), bcrypt |
| Hosting | Frontend → Vercel; Backend → AWS EC2 (Docker) |
| CI/CD | GitHub Actions → Amazon ECR → EC2 rolling deploy |

---

## Project Structure

```
wfcts/
├── backend/
│   ├── src/
│   │   ├── controllers/        # Business logic per domain
│   │   │   ├── calendarEventController.js
│   │   │   ├── substituteController.js
│   │   │   ├── teachingAllocationController.js
│   │   │   ├── miscController.js     # Includes substitute suggestions
│   │   │   └── ...
│   │   ├── models/             # Mongoose schemas
│   │   │   ├── User.js
│   │   │   ├── TeacherTimetable.js
│   │   │   ├── CalendarEvent.js
│   │   │   ├── SubstituteEntry.js
│   │   │   ├── TeachingAllocation.js
│   │   │   └── ...
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   └── data.js         # All /api/data/* routes
│   │   ├── middleware/
│   │   │   ├── auth.js         # requireAuth, requireRoles
│   │   │   └── upload.js       # Multer config
│   │   └── utils/
│   │       ├── substituteSettlement.js  # Settlement engine + ranking
│   │       └── routeHelpers.js
│   ├── scripts/                # Seed scripts
│   ├── .env.example
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── pages/              # One file per route
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   └── WFCTSContext.jsx  # Global state + API actions
│   │   └── utils/
│   │       ├── api.js          # All fetch wrappers
│   │       └── formatDate.js
│   ├── vercel.json             # SPA routing + /api proxy
│   └── vite.config.js
└── docker-compose.yml
```

---

## API Overview

All data routes are under `/api/data/` and require a valid JWT Bearer token.

| Method | Path | Description |
|---|---|---|
| GET | `/data/bootstrap` | Initial load: entries, slots, tasks, directory |
| GET | `/data/substitute-suggestions` | Ranked available substitutes for a slot |
| GET | `/data/substitute-settlements` | Chain settlement plan |
| POST | `/data/substitute-entries` | Log a substitution (creates mirrored pair) |
| GET/POST | `/data/teaching-allocations` | Manage hour allocations |
| GET | `/data/hours-completion` | Allocation vs actual taught hours |
| GET/POST/PATCH | `/data/calendar-events` | CRUD calendar events |
| PATCH | `/data/calendar-events/:id/approve` | Manager approval |
| PATCH | `/data/calendar-events/:id/substitute` | Substitute an event |
| GET/POST/PATCH/DELETE | `/data/timetable-slots` | Manage recurring slots |
| POST | `/data/timetable-upload` | Bulk timetable import |
| GET | `/data/weekly-progress` | Current week progress |
| GET | `/data/export/monthly` | Excel export for a month |
| GET | `/data/academic-calendar` | College-wide events |
| GET | `/data/calendar/user/:userId` | View another teacher's calendar (admin/HOD) |

---

## Local Development

### 1. Backend (Docker)

```bash
cd wfcts
cp backend/.env.example backend/.env
# fill in MONGO_URI, JWT_SECRET
docker compose up
# API available at http://localhost:3000
```

### 2. Frontend (Vite dev server)

```bash
cd wfcts/frontend
npm install
npm run dev
# http://localhost:5173 — /api requests proxy to localhost:3000
```

### Seed Accounts

```
Teacher : teacher@wfcts.edu / teacher123
Admin   : admin@wfcts.edu   / admin123
HOD     : hod@wfcts.edu     / hod123
```

---

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for the full CI/CD setup (GitHub Actions → ECR → EC2).

## License

ISC

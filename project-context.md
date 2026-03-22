# WFCTS Project Context

Last updated: 2026-03-22 (latest sync)
Workspace root: D:/WFCTS

## Project Snapshot
WFCTS is a frontend-first React + Vite application focused on teacher workload, class-wise subject-hour tracking, give/take credits, tasks, industry sessions, and fairness monitoring.

Workspace folders:
- backend/
- frontend/

Current implementation is in frontend. Backend integration is not yet wired.

## Stack and Tooling
- React 19
- Vite 7
- react-router-dom
- Tailwind CSS via @tailwindcss/vite
- ESLint 9
- Context API for app state

Frontend scripts:
- npm run dev
- npm run build
- npm run lint
- npm run preview

Dev server setting:
- allowed host: monte-nonlevulose-leticia.ngrok-free.dev

## App Wiring
- frontend/src/main.jsx: AuthProvider wraps App
- frontend/src/App.jsx: WFCTSProvider wraps BrowserRouter and routes
- frontend/src/components/ProtectedRoute.jsx: authentication + role guard

## Auth and Role Model
Source: frontend/src/context/AuthContext.jsx

Roles:
- TEACHER
- ADMIN
- HOD

Role resolution on login by email text:
- contains admin -> ADMIN
- contains hod -> HOD
- otherwise -> TEACHER

Persistence:
- localStorage key wfcts_user
- localStorage key wfcts_token

Role home routes:
- TEACHER -> /dashboard
- ADMIN -> /admin/dashboard
- HOD -> /hod/dashboard

## Route Map (Current)
Public:
- /login

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

## WFCTSContext Data Model
Source: frontend/src/context/WFCTSContext.jsx

State slices:
- substituteEntries
- workEntries
- tasks
- teacherDirectory

Current teacher directory mock:
- u1: Prof. Sharma
- u4: Prof. Neha
- u5: Prof. Arjun

Current action functions:
- addSubstituteEntry(entry)
- addWorkEntry(entry)
- addTask(task)
- markTaskComplete(taskId)

Behavior details:
- addTask always creates status Pending
- addWorkEntry and addSubstituteEntry default teacherId to u1 if missing
- substituteEntries supports direction values:
  - CREDIT (you covered for others)
  - SUBSTITUTION (others covered for you)
- workEntries include className for class/division level tracking
- WFCTSContext is in-memory only and resets on refresh

## Implemented Pages and Current Behavior

1. Login
- file: frontend/src/pages/Login.jsx
- role-aware login and redirect
- uses AuthContext login/logout flow

2. Teacher Dashboard
- file: frontend/src/pages/Dashboard.jsx
- workload summary, credits and obligations cards
- uses workEntries and substituteEntries
- includes Subjects Taught hours-tracking block (moved from Profile)

3. Work Entry
- file: frontend/src/pages/WorkEntry.jsx
- teacher logs subject, className, hours, work type
- entries saved to workEntries
- shows recent entries list

4. Credits (Combined Give/Take)
- file: frontend/src/pages/Credits.jsx
- consolidated ledger page for both flows:
  - CREDITS: you covered for others
  - SUBSTITUTIONS: others covered for you
- route remains /credits
- /substitutions route and Substitutions page removed

5. Profile
- file: frontend/src/pages/Profile.jsx
- accessible to TEACHER, ADMIN, HOD
- shows profile header and contribution summary
- includes logout button
- does not include Subjects Taught section anymore

6. Tasks
- file: frontend/src/pages/Tasks.jsx
- teacher-assigned tasks list
- card fields: title, assigned by, deadline, status
- status color: pending yellow, completed green
- mark complete action available

7. Assign Task
- file: frontend/src/pages/AssignTask.jsx
- ADMIN and HOD page
- form fields: title, description, assign to, deadline
- uses mock teachers list and addTask action

8. Industry Sessions
- file: frontend/src/pages/IndustrySessions.jsx
- teacher tracks expert sessions
- fields shown: title, speaker, date, proof uploaded
- add session flow includes UI-only proof upload

9. Subject Hours
- file: frontend/src/pages/SubjectHours.jsx
- class/division-level subject-hour tracking
- groups by teacherId + subject + className
- TEACHER view: subject -> class progress cards
- ADMIN/HOD view: teacher -> subject -> class hierarchy
- progress color coding:
  - red <50%
  - yellow 50-80%
  - green >80%

10. Workload Fairness Dashboard
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
  - color-coded status:
    - red = high
    - yellow = medium
    - green = low
  - div-based horizontal bar visualization

11. Admin Dashboard
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
- wrapped in same shared layout as other role pages

12. HOD Dashboard
- file: frontend/src/pages/HodDashboard.jsx
- enhanced summary screen with same widget/insight/fairness blocks as Admin dashboard
- wrapped in same shared layout as other role pages

## Current UX and Design Conventions
- Mobile-first layout
- Card-heavy visual structure
- Consistent page headers with subtitle text
- Bottom fixed nav with active pill, bold label, and indicator dot
- No external chart library currently used

## Important Constraints
- No backend API integration yet
- No persistence for WFCTSContext state slices
- Industry proof upload is UI-only (filename captured, no storage)
- Subject-hours required values are predefined in SubjectHours page map (mock)
- Date display has shared readable formatting utility, but raw ISO is still stored in state

## Key Files for Multi-Agent Handoff
Routing and access:
- frontend/src/App.jsx
- frontend/src/components/ProtectedRoute.jsx
- frontend/src/components/Layout.jsx
- frontend/src/components/BottomNav.jsx

Context and auth:
- frontend/src/context/AuthContext.jsx
- frontend/src/context/WFCTSContext.jsx

Pages:
- frontend/src/pages/Login.jsx
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

Runtime and setup:
- frontend/src/main.jsx
- frontend/package.json
- frontend/vite.config.js

## Recommended Next Work Items
1. Persist WFCTSContext data to localStorage or backend.
2. Replace mock auth and role inference with real auth.
3. Convert static dashboard subject plans to derived or backend data.
4. Add consistent date formatting utility across pages.
5. Add route-guard and role-nav tests.

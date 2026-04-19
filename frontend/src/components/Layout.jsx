import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import BottomNav from './BottomNav'

function pageMeta(pathname, role) {
  const teacherPages = {
    '/dashboard': { eyebrow: 'Academic Staff Portal', title: 'Dashboard' },
    '/tasks': { eyebrow: 'Workflow Management', title: 'Tasks' },
    '/work-entry': { eyebrow: 'Record Activity', title: 'Log Work' },
    '/credits': { eyebrow: 'Credit Ledger', title: 'Credits' },
    '/timetable': { eyebrow: 'Academic Staff Portal', title: 'Timetable' },
    '/calendar': { eyebrow: 'Work Scheduling Engine', title: 'Calendar' },
    '/weekly-progress': { eyebrow: 'Workload Compliance', title: 'Weekly Progress' },
    '/profile': { eyebrow: 'Account Settings', title: 'Profile' },
    '/industry-sessions': { eyebrow: 'Professional Outreach', title: 'Sessions' },
    '/subject-hours': { eyebrow: 'Academic Planning', title: 'Subject Hours' },
  }

  const managerPages = {
    '/admin/dashboard': { eyebrow: 'Administrator Console', title: 'Dashboard' },
    '/hod/dashboard': { eyebrow: 'Department Oversight', title: 'Dashboard' },
    '/assign-task': { eyebrow: 'Workflow Management', title: 'Assign Task' },
    '/fairness': { eyebrow: 'Workload Insights', title: 'Fairness' },
    '/academic-calendar': { eyebrow: 'Institution-wide', title: 'Academic Calendar' },
    '/timetable-upload': { eyebrow: 'OCR Import', title: 'Upload Timetable' },
  }

  if (role === 'ADMIN' || role === 'HOD') {
    return managerPages[pathname] || teacherPages[pathname] || { eyebrow: 'WFCTS', title: 'Workspace' }
  }

  return teacherPages[pathname] || { eyebrow: 'WFCTS', title: 'Workspace' }
}

function userInitials(name) {
  if (!name) return 'WF'
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function Layout({ children }) {
  const location = useLocation()
  const { user } = useAuth()
  const meta = pageMeta(location.pathname, user?.role)

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 border-b border-white/60 wfcts-glass">
        <div className="mx-auto flex w-full max-w-[90rem] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8 xl:pl-32">
          <div className="flex min-w-0 items-center gap-4">
            <div className="min-w-0">
              <p className="font-label text-[0.62rem] font-bold uppercase tracking-[0.28em] text-[var(--wfcts-muted)]">
                {meta.eyebrow}
              </p>
              <div className="flex items-center gap-3">
                <Link to="/" className="flex items-center gap-2">
                  <img src="/logo.svg" alt="WFCTS Logo" className="h-8 w-8" />
                  <span className="font-headline text-lg font-extrabold tracking-[-0.04em] text-[var(--wfcts-primary)] sm:text-xl">
                    WFCTS
                  </span>
                </Link>
                <span className="hidden text-sm font-medium text-slate-400 sm:inline">/</span>
                <span className="hidden truncate text-sm font-semibold text-slate-600 sm:inline">{meta.title}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden rounded-full bg-[var(--wfcts-secondary)]/10 px-4 py-2 text-right md:block">
              <p className="font-label text-[0.62rem] font-bold uppercase tracking-[0.22em] text-[var(--wfcts-secondary)]/80">
                {user?.role || 'User'}
              </p>
              <p className="text-sm font-semibold text-slate-700">{user?.department || 'WFCTS'}</p>
            </div>
            <Link
              to="/profile"
              className="flex items-center gap-3 rounded-full border border-white/70 bg-white/80 px-2 py-2 shadow-sm shadow-slate-200/60 transition-transform hover:-translate-y-0.5"
            >
              <div className="hidden text-right sm:block">
                <p className="max-w-[12rem] truncate text-sm font-semibold text-slate-800">{user?.name || 'Faculty Member'}</p>
                <p className="text-xs text-[var(--wfcts-muted)]">View profile</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[var(--wfcts-primary)] to-[var(--wfcts-secondary)] text-sm font-bold text-white shadow-lg shadow-[var(--wfcts-primary)]/20">
                {user?.profileImage ? (
                  <img src={user.profileImage} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                  userInitials(user?.name)
                )}
              </div>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex-1 w-full max-w-[90rem] px-4 pb-32 pt-6 sm:px-6 lg:px-8 xl:pl-32">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}

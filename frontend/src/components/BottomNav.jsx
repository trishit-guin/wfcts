import { NavLink, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function getInitials(name) {
  if (!name) return 'WF'
  return name.split(' ').map((word) => word[0]).slice(0, 2).join('').toUpperCase()
}

function SymbolIcon({ name, active = false, className = '' }) {
  return (
    <span
      className={`material-symbols-outlined text-[1.4rem] leading-none ${className}`}
      style={{ fontVariationSettings: `'FILL' ${active ? 1 : 0}, 'wght' ${active ? 700 : 500}, 'GRAD' 0, 'opsz' 24` }}
      aria-hidden="true"
    >
      {name}
    </span>
  )
}

const teacherNavItems = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: 'dashboard',
  },
  {
    to: '/tasks',
    label: 'Tasks',
    icon: 'assignment_turned_in',
  },
  {
    to: '/work-entry',
    label: 'Log Work',
    icon: 'add_circle',
  },
  {
    to: '/credits',
    label: 'Credits',
    icon: 'payments',
  },
  {
    to: '/timetable',
    label: 'Slots',
    icon: 'calendar_view_week',
  },
]

const adminNavItems = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard' },
  {
    to: '/assign-task',
    label: 'Assign',
    icon: 'task_alt',
  },
  {
    to: '/fairness',
    label: 'Fairness',
    icon: 'balance',
  },
  {
    to: '/timetable',
    label: 'Slots',
    icon: 'calendar_view_week',
  },
]
const hodNavItems = [
  { to: '/hod/dashboard', label: 'Dashboard', icon: 'dashboard' },
  {
    to: '/assign-task',
    label: 'Assign',
    icon: 'task_alt',
  },
  {
    to: '/fairness',
    label: 'Fairness',
    icon: 'balance',
  },
  {
    to: '/timetable',
    label: 'Slots',
    icon: 'calendar_view_week',
  },
]

function NavItem({ item, mobile = false }) {
  return (
    <NavLink
      key={item.to}
      to={item.to}
      className={({ isActive }) => {
        if (mobile) {
          return `flex min-w-0 flex-1 flex-col items-center justify-center rounded-[1.35rem] px-2 py-2 text-center transition-all duration-200 ${
            isActive
              ? 'bg-[var(--wfcts-primary)]/12 text-[var(--wfcts-primary)] shadow-sm shadow-[var(--wfcts-primary)]/10'
              : 'text-slate-400 hover:text-[var(--wfcts-primary)]'
          }`
        }

        return `group flex h-14 w-14 items-center justify-center rounded-[1.15rem] transition-all duration-200 ${
          isActive
            ? 'bg-[var(--wfcts-primary)]/12 text-[var(--wfcts-primary)] shadow-lg shadow-[var(--wfcts-primary)]/10'
            : 'text-slate-400 hover:bg-slate-100 hover:text-[var(--wfcts-primary)]'
        }`
      }}
    >
      {({ isActive }) => (
        <>
          <div className="flex items-center justify-center">
            <SymbolIcon name={item.icon} active={isActive} />
          </div>
          {mobile ? (
            <span className="mt-1 text-[0.54rem] font-semibold uppercase tracking-[0.1em] leading-tight">{item.label}</span>
          ) : (
            <span className="sr-only">{item.label}</span>
          )}
        </>
      )}
    </NavLink>
  )
}

export default function BottomNav() {
  const { user } = useAuth()

  const role = user?.role
  const navItems =
    role === 'ADMIN' ? adminNavItems
    : role === 'HOD'  ? hodNavItems
    : teacherNavItems

  return (
    <>
      <aside className="fixed left-6 top-1/2 z-50 hidden -translate-y-1/2 xl:flex">
        <div className="flex flex-col items-center gap-5 rounded-[2rem] border border-white/70 bg-white/85 px-3 py-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <Link to="/" className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-[1.3rem] bg-[var(--wfcts-primary)] shadow-lg shadow-[var(--wfcts-primary)]/20">
            <img src="/logo.svg" alt="WFCTS" className="h-full w-full p-2.5" />
          </Link>
          <div className="flex flex-col gap-3">
            {navItems.map((item) => (
              <NavItem key={item.to} item={item} />
            ))}
          </div>
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `mt-2 flex h-14 w-14 items-center justify-center rounded-[1.15rem] transition-all duration-200 ${
                isActive
                  ? 'bg-[var(--wfcts-secondary)]/16 text-[var(--wfcts-secondary)] shadow-lg shadow-[var(--wfcts-secondary)]/10'
                  : 'text-slate-500 hover:bg-slate-100'
              }`
            }
          >
            {({ isActive }) => (
              <div className={`flex h-9 w-9 items-center justify-center overflow-hidden rounded-full text-[0.7rem] font-bold shadow-sm transition-transform active:scale-95 ${
                isActive
                  ? 'bg-[var(--wfcts-secondary)] text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}>
                {user?.profileImage ? (
                  <img src={user.profileImage} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                  getInitials(user?.name)
                )}
              </div>
            )}
          </NavLink>
        </div>
      </aside>

      <nav className="fixed bottom-4 left-0 right-0 z-50 xl:hidden">
        <div className="mx-auto max-w-3xl px-4">
          <div className="flex items-center justify-around gap-1 rounded-[2rem] border border-white/70 bg-[rgba(248,250,252,0.94)] px-3 py-3 shadow-[0_16px_36px_rgba(15,23,42,0.10)] backdrop-blur-xl">
            {navItems.map((item) => (
              <NavItem key={item.to} item={item} mobile />
            ))}
          </div>
        </div>
      </nav>
    </>
  )
}

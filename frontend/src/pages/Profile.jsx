import { useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useWFCTS } from '../context/WFCTSContext'

function userInitials(name) {
  if (!name) return 'WF'
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function StatCard({ label, value, tone }) {
  const tones = {
    primary: 'bg-[var(--wfcts-primary)]/8 text-[var(--wfcts-primary)]',
    secondary: 'bg-[var(--wfcts-secondary)]/12 text-[var(--wfcts-secondary)]',
    tertiary: 'bg-orange-100 text-[#7c2d12]',
    neutral: 'bg-slate-100 text-slate-700',
  }

  return (
    <div className="wfcts-card p-5">
      <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${tones[tone]}`}>
        <span className="material-symbols-outlined text-[1.2rem]">
          {label === 'Lectures Taken' ? 'menu_book' :
            label === 'Hours Logged' ? 'schedule' :
            label === 'Credits Earned' ? 'payments' :
            label === 'Tasks Completed' ? 'assignment_turned_in' :
            label === 'Pending Tasks' ? 'assignment_late' :
            'groups'}
        </span>
      </div>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--wfcts-muted)]">{label}</p>
      <p className="font-headline mt-2 text-3xl font-extrabold tracking-[-0.05em] text-[var(--wfcts-primary)]">{value}</p>
    </div>
  )
}

export default function Profile() {
  const { user, logout, updateProfile } = useAuth()
  const { workEntries, substituteEntries, tasks, industrySessions } = useWFCTS()
  const [showEdit, setShowEdit] = useState(false)
  const [form, setForm] = useState({
    name: user?.name || '',
    department: user?.department || '',
    currentPassword: '',
    newPassword: '',
  })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function resetForm() {
    setForm({
      name: user?.name || '',
      department: user?.department || '',
      currentPassword: '',
      newPassword: '',
    })
  }

  function onChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (error) setError('')
    if (message) setMessage('')
  }

  async function onSubmit(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!form.name.trim() || !form.department.trim()) {
      setError('Name and department are required.')
      return
    }

    if (form.newPassword && !form.currentPassword) {
      setError('Current password is required to set a new password.')
      return
    }

    setIsSubmitting(true)

    try {
      await updateProfile({
        name: form.name.trim(),
        department: form.department.trim(),
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      })
      setForm((prev) => ({ ...prev, currentPassword: '', newPassword: '' }))
      setShowEdit(false)
      setMessage('Profile updated successfully.')
    } catch (submitError) {
      setError(submitError.message || 'Unable to update profile.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const summary = useMemo(() => {
    const userEntries = workEntries.filter((entry) => entry.teacherId === user?.id)
    const totalHours = userEntries.reduce((sum, entry) => sum + Number(entry.hours || 0), 0)
    const lecturesTaken = userEntries.filter((entry) => entry.workType === 'Lecture').length
    const userSubstitutes = substituteEntries.filter((entry) => entry.teacherId === user?.id)
    const substitutionsCovered = userSubstitutes.filter(
      (entry) => (entry.direction || 'CREDIT') === 'CREDIT',
    )
    const completedTasks = tasks.filter(
      (task) => task.assignTo === user?.id && task.status === 'Completed',
    ).length
    const pendingTasks = tasks.filter(
      (task) => task.assignTo === user?.id && task.status === 'Pending',
    ).length
    const sessionsCount = industrySessions.filter((session) => session.teacherId === user?.id).length

    return {
      totalHours,
      lecturesTaken,
      substitutesCovered: substitutionsCovered.length,
      creditsEarned: substitutionsCovered.filter((entry) => entry.status === 'Repaid').length,
      tasksCompleted: completedTasks,
      pendingTasks,
      industrySessions: sessionsCount,
    }
  }, [workEntries, substituteEntries, tasks, industrySessions, user?.id])

  return (
    <div className="space-y-8 animate-float-in">
      <section>
        <p className="font-label text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[var(--wfcts-muted)]">
          Account Settings
        </p>
        <h2 className="font-headline mt-2 text-4xl font-extrabold tracking-[-0.06em] text-[var(--wfcts-primary)] sm:text-5xl">
          Profile
        </h2>
        <p className="mt-3 text-sm text-[var(--wfcts-muted)] sm:text-base">
          Manage your account details and review your contribution summary from the live system.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[var(--wfcts-primary)] to-[#284bb0] p-8 text-white shadow-[0_24px_60px_rgba(30,58,138,0.22)]">
            <div className="absolute right-[-12%] top-[-16%] h-48 w-48 rounded-full bg-white/8 blur-3xl" />
            <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-5">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/15 text-2xl font-bold shadow-lg shadow-black/10">
                  {userInitials(user?.name)}
                </div>
                <div>
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-blue-100">
                    {user?.role || 'User'}
                  </p>
                  <h3 className="font-headline mt-2 text-3xl font-extrabold tracking-[-0.05em] text-white">
                    {user?.name || 'Faculty Member'}
                  </h3>
                  <p className="mt-2 text-sm text-blue-100">
                    {user?.department || 'WFCTS'} • {user?.email || 'No email'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEdit((prev) => !prev)
                    resetForm()
                    setError('')
                    setMessage('')
                  }}
                  className="rounded-full bg-white px-5 py-3 text-sm font-bold text-[var(--wfcts-primary)] shadow-sm"
                >
                  {showEdit ? 'Close Edit' : 'Edit Profile'}
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur-sm"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>

          <div className="wfcts-card p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-label text-[0.66rem] font-bold uppercase tracking-[0.2em] text-[var(--wfcts-muted)]">
                  Account Details
                </p>
                <h3 className="font-headline text-2xl font-bold text-[var(--wfcts-primary)]">Identity Snapshot</h3>
              </div>
              {message && (
                <span className="rounded-full bg-[var(--wfcts-secondary)]/12 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--wfcts-secondary)]">
                  Saved
                </span>
              )}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="wfcts-card-muted p-4">
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[var(--wfcts-muted)]">Department</p>
                <p className="mt-2 text-sm font-semibold text-slate-800">{user?.department || 'N/A'}</p>
              </div>
              <div className="wfcts-card-muted p-4">
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[var(--wfcts-muted)]">Role</p>
                <p className="mt-2 text-sm font-semibold text-slate-800">{user?.role || 'N/A'}</p>
              </div>
              <div className="wfcts-card-muted p-4 sm:col-span-2">
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[var(--wfcts-muted)]">Email</p>
                <p className="mt-2 break-all text-sm font-semibold text-slate-800">{user?.email || 'N/A'}</p>
              </div>
            </div>
          </div>

          {showEdit && (
            <form onSubmit={onSubmit} className="wfcts-card p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-label text-[0.66rem] font-bold uppercase tracking-[0.2em] text-[var(--wfcts-muted)]">
                    Edit Account
                  </p>
                  <h3 className="font-headline text-2xl font-bold text-[var(--wfcts-primary)]">Update Profile</h3>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Full Name</span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) => onChange('name', event.target.value)}
                    placeholder="Full name"
                    className="w-full rounded-[1rem] border border-slate-200 bg-[var(--wfcts-surface-muted)] px-4 py-3 text-sm outline-none transition focus:border-[var(--wfcts-primary)]/20 focus:bg-white focus:ring-2 focus:ring-[var(--wfcts-primary)]/10"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Department</span>
                  <input
                    type="text"
                    value={form.department}
                    onChange={(event) => onChange('department', event.target.value)}
                    placeholder="Department"
                    className="w-full rounded-[1rem] border border-slate-200 bg-[var(--wfcts-surface-muted)] px-4 py-3 text-sm outline-none transition focus:border-[var(--wfcts-primary)]/20 focus:bg-white focus:ring-2 focus:ring-[var(--wfcts-primary)]/10"
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-semibold text-slate-700">Current Password</span>
                  <input
                    type="password"
                    value={form.currentPassword}
                    onChange={(event) => onChange('currentPassword', event.target.value)}
                    placeholder="Required only if you want to change the password"
                    className="w-full rounded-[1rem] border border-slate-200 bg-[var(--wfcts-surface-muted)] px-4 py-3 text-sm outline-none transition focus:border-[var(--wfcts-primary)]/20 focus:bg-white focus:ring-2 focus:ring-[var(--wfcts-primary)]/10"
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-semibold text-slate-700">New Password</span>
                  <input
                    type="password"
                    value={form.newPassword}
                    onChange={(event) => onChange('newPassword', event.target.value)}
                    placeholder="Leave blank if you do not want to change it"
                    className="w-full rounded-[1rem] border border-slate-200 bg-[var(--wfcts-surface-muted)] px-4 py-3 text-sm outline-none transition focus:border-[var(--wfcts-primary)]/20 focus:bg-white focus:ring-2 focus:ring-[var(--wfcts-primary)]/10"
                  />
                </label>
              </div>

              {message && <p className="mt-4 text-sm text-[var(--wfcts-secondary)]">{message}</p>}
              {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-full bg-gradient-to-br from-[var(--wfcts-primary)] to-[#284bb0] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[var(--wfcts-primary)]/18 transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEdit(false)
                    resetForm()
                    setError('')
                  }}
                  className="rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        <aside className="space-y-5 lg:col-span-4">
          <div className="wfcts-card p-6">
            <p className="text-[0.66rem] font-bold uppercase tracking-[0.2em] text-[var(--wfcts-muted)]">Activity Snapshot</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="wfcts-card-muted p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--wfcts-muted)]">Hours Logged</p>
                <p className="font-headline mt-2 text-3xl font-extrabold text-[var(--wfcts-primary)]">{summary.totalHours}</p>
              </div>
              <div className="wfcts-card-muted p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--wfcts-muted)]">Pending Tasks</p>
                <p className="font-headline mt-2 text-3xl font-extrabold text-[#7c2d12]">{summary.pendingTasks}</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-800">
              Your profile reflects live data from logged work entries, credits, tasks, and industry sessions.
            </p>
          </div>

          <div className="wfcts-card p-6">
            <p className="text-[0.66rem] font-bold uppercase tracking-[0.2em] text-[var(--wfcts-muted)]">Security Note</p>
            <p className="mt-3 text-sm leading-relaxed text-slate-800">
              Password changes require your current password, while name and department updates sync directly to your active session.
            </p>
          </div>
        </aside>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4 px-1">
          <h3 className="font-headline text-xl font-bold text-[var(--wfcts-primary)]">Contribution Summary</h3>
          <span className="text-xs font-semibold text-[var(--wfcts-muted)]">Live totals</span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard label="Hours Logged" value={summary.totalHours} tone="primary" />
          <StatCard label="Lectures Taken" value={summary.lecturesTaken} tone="secondary" />
          <StatCard label="Credits Earned" value={summary.creditsEarned} tone="secondary" />
          <StatCard label="Tasks Completed" value={summary.tasksCompleted} tone="tertiary" />
          <StatCard label="Pending Tasks" value={summary.pendingTasks} tone="tertiary" />
          <StatCard label="Industry Sessions" value={summary.industrySessions} tone="neutral" />
        </div>
      </section>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useWFCTS } from '../context/WFCTSContext'

function StatCard({ label, value, accent }) {
  return (
    <div className={`rounded-2xl border p-4 flex flex-col gap-1 ${accent}`}>
      <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-2xl sm:text-3xl font-bold leading-none">{value}</p>
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
    const userLectures = workEntries.filter(
      (entry) => entry.teacherId === user?.id && entry.workType === 'Lecture',
    ).length
    const userSubstitutes = substituteEntries.filter((entry) => entry.teacherId === user?.id)
    const substitutionsCovered = userSubstitutes.filter(
      (entry) => (entry.direction || 'CREDIT') === 'CREDIT',
    )
    const completedTasks = tasks.filter(
      (task) => task.assignTo === user?.id && task.status === 'Completed',
    ).length
    const sessionsCount = industrySessions.filter((session) => session.teacherId === user?.id).length

    return {
      lecturesTaken: userLectures,
      substitutesCovered: substitutionsCovered.length,
      creditsEarned: substitutionsCovered.filter((entry) => entry.status === 'Repaid').length,
      tasksCompleted: completedTasks,
      industrySessions: sessionsCount,
    }
  }, [workEntries, substituteEntries, tasks, industrySessions, user?.id])

  return (
    <div className="flex flex-col min-h-full">
      <div className="bg-white px-5 pt-10 pb-6 shadow-sm">
        <p className="text-xs font-semibold text-emerald-500 uppercase tracking-widest mb-1">WFCTS</p>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Personal profile and contribution summary</p>
      </div>

      <div className="px-5 pt-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h2 className="text-base sm:text-lg font-bold text-gray-900">{user?.name}</h2>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <div className="bg-gray-50 rounded-xl px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wide text-gray-400">Department</p>
              <p className="text-xs sm:text-sm font-semibold text-gray-700 mt-0.5">{user?.department || 'N/A'}</p>
            </div>
            <div className="bg-gray-50 rounded-xl px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wide text-gray-400">Role</p>
              <p className="text-xs sm:text-sm font-semibold text-gray-700 mt-0.5">{user?.role}</p>
            </div>
            <div className="bg-gray-50 rounded-xl px-3 py-2.5 col-span-2">
              <p className="text-[10px] uppercase tracking-wide text-gray-400">Email</p>
              <p className="text-xs sm:text-sm font-semibold text-gray-700 mt-0.5 break-all">{user?.email || 'N/A'}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowEdit((prev) => !prev)
              setForm({
                name: user?.name || '',
                department: user?.department || '',
                currentPassword: '',
                newPassword: '',
              })
              setError('')
            }}
            className="mt-3 w-full rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-semibold py-2.5"
          >
            {showEdit ? 'Close Edit' : 'Edit Profile'}
          </button>

          {showEdit && (
            <form onSubmit={onSubmit} className="mt-3 border border-gray-100 rounded-xl p-3 space-y-2.5">
              <input
                type="text"
                value={form.name}
                onChange={(event) => onChange('name', event.target.value)}
                placeholder="Full name"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <input
                type="text"
                value={form.department}
                onChange={(event) => onChange('department', event.target.value)}
                placeholder="Department"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <input
                type="password"
                value={form.currentPassword}
                onChange={(event) => onChange('currentPassword', event.target.value)}
                placeholder="Current password (required only to change password)"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <input
                type="password"
                value={form.newPassword}
                onChange={(event) => onChange('newPassword', event.target.value)}
                placeholder="New password (optional)"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />

              {message && <p className="text-xs text-emerald-600">{message}</p>}
              {error && <p className="text-xs text-red-500">{error}</p>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white text-sm font-semibold py-2"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="px-5 pt-5">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Contribution Summary</h2>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Lectures Taken" value={summary.lecturesTaken} accent="bg-blue-50 border-blue-100 text-blue-600" />
          <StatCard label="Substitutes Covered" value={summary.substitutesCovered} accent="bg-indigo-50 border-indigo-100 text-indigo-600" />
          <StatCard label="Credits Earned" value={summary.creditsEarned} accent="bg-emerald-50 border-emerald-100 text-emerald-600" />
          <StatCard label="Tasks Completed" value={summary.tasksCompleted} accent="bg-amber-50 border-amber-100 text-amber-600" />
          <div className="col-span-2">
            <StatCard label="Industry Sessions" value={summary.industrySessions} accent="bg-purple-50 border-purple-100 text-purple-600" />
          </div>
        </div>
      </div>

      <div className="px-5 pt-5 pb-6">
        <button
          type="button"
          onClick={logout}
          className="w-full bg-gray-900 hover:bg-gray-800 active:bg-gray-700 text-white rounded-2xl py-3.5 text-sm font-semibold transition-colors"
        >
          Logout
        </button>
      </div>
    </div>
  )
}

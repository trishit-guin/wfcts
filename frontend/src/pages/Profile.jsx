import { useMemo } from 'react'
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
  const { user, logout } = useAuth()
  const { workEntries, substituteEntries, tasks, industrySessions } = useWFCTS()

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

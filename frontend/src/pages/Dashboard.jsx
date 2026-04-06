import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useWFCTS } from '../context/WFCTSContext'
import { getRequiredHours } from '../utils/subjectHours'

function workloadLevel(totalHours) {
  if (totalHours < 20) return { label: 'Low', color: 'bg-blue-100 text-blue-600' }
  if (totalHours <= 40) return { label: 'Normal', color: 'bg-emerald-100 text-emerald-700' }
  return { label: 'High', color: 'bg-red-100 text-red-600' }
}

function StatCard({ label, value, sub, color }) {
  const colors = {
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-600',
    blue: 'bg-blue-50 border-blue-100 text-blue-600',
    amber: 'bg-amber-50 border-amber-100 text-amber-600',
  }

  return (
    <div className={`rounded-2xl border p-4 flex flex-col gap-1 ${colors[color]}`}>
      <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wide opacity-70">{label}</span>
      <span className="text-3xl sm:text-4xl font-bold leading-none">{value}</span>
      {sub && <span className="text-[10px] sm:text-xs opacity-60 mt-1">{sub}</span>}
    </div>
  )
}

function SubjectCard({ item }) {
  const remaining = Math.max(item.requiredHours - item.completedHours, 0)
  const progress = Math.min(Math.round((item.completedHours / item.requiredHours) * 100), 100)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm sm:text-base font-bold text-gray-900">{item.name}</p>
          <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">{item.section}</p>
        </div>
        <span className="text-[10px] sm:text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full shrink-0">
          {progress}%
        </span>
      </div>

      <div className="mt-3 w-full h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${progress}%` }} />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="bg-gray-50 rounded-xl px-2.5 py-2">
          <p className="text-[10px] uppercase tracking-wide text-gray-400">Required</p>
          <p className="text-xs sm:text-sm font-bold text-gray-800 mt-0.5">{item.requiredHours}h</p>
        </div>
        <div className="bg-gray-50 rounded-xl px-2.5 py-2">
          <p className="text-[10px] uppercase tracking-wide text-gray-400">Completed</p>
          <p className="text-xs sm:text-sm font-bold text-blue-600 mt-0.5">{item.completedHours}h</p>
        </div>
        <div className="bg-gray-50 rounded-xl px-2.5 py-2">
          <p className="text-[10px] uppercase tracking-wide text-gray-400">Remaining</p>
          <p className="text-xs sm:text-sm font-bold text-amber-600 mt-0.5">{remaining}h</p>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { workEntries, substituteEntries } = useWFCTS()

  const teacherEntries = useMemo(
    () => workEntries.filter((entry) => entry.teacherId === user?.id),
    [workEntries, user?.id],
  )

  const teacherCredits = useMemo(
    () => substituteEntries.filter(
      (entry) => entry.teacherId === user?.id && (entry.direction || 'CREDIT') === 'CREDIT',
    ),
    [substituteEntries, user?.id],
  )

  const subjectPlans = useMemo(() => {
    const grouped = new Map()

    for (const entry of teacherEntries) {
      const key = `${entry.subject}|${entry.className}`
      if (!grouped.has(key)) {
        grouped.set(key, {
          id: key,
          name: entry.subject,
          section: entry.className,
          requiredHours: getRequiredHours(entry.subject, entry.className),
          completedHours: 0,
        })
      }

      grouped.get(key).completedHours += Number(entry.hours) || 0
    }

    return Array.from(grouped.values())
      .sort((a, b) => b.completedHours - a.completedHours)
      .slice(0, 4)
  }, [teacherEntries])

  const totalHours = teacherEntries.reduce((acc, entry) => acc + Number(entry.hours || 0), 0)
  const pendingObligations = teacherCredits.filter((entry) => entry.status === 'Pending').length
  const creditsEarned = teacherCredits.filter((entry) => entry.status === 'Repaid').length
  const workload = workloadLevel(totalHours)

  return (
    <div className="flex flex-col min-h-full">
      <div className="bg-white px-5 pt-10 pb-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-500 uppercase tracking-widest mb-1">WFCTS</p>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{user?.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs sm:text-sm text-gray-400">{user?.department}</p>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${workload.color}`}>
                {workload.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 pt-6 grid grid-cols-2 gap-3">
        <StatCard label="Hours Logged" value={totalHours} sub="This semester" color="blue" />
        <StatCard label="Credits Earned" value={creditsEarned} sub="Repaid substitutions" color="emerald" />
        <div className="col-span-2">
          <StatCard label="Pending Obligations" value={pendingObligations} sub="Lectures you are owed back" color="amber" />
        </div>
      </div>

      <div className="px-5 pt-6">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Quick Actions</h2>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => navigate('/credits')}
            className="flex items-center gap-3 bg-white rounded-xl px-4 py-3.5 shadow-sm border border-gray-100 text-left hover:shadow-md transition-shadow"
          >
            <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">View Credit Balance</p>
              <p className="text-xs text-gray-400">See who owes you and who you owe</p>
            </div>
          </button>
          <button
            onClick={() => navigate('/credits')}
            className="flex items-center gap-3 bg-white rounded-xl px-4 py-3.5 shadow-sm border border-gray-100 text-left hover:shadow-md transition-shadow"
          >
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Give and Take Ledger</p>
              <p className="text-xs text-gray-400">Track who covered for whom</p>
            </div>
          </button>
        </div>
      </div>

      <div className="px-5 pt-6">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Subjects Taught</h2>
        {subjectPlans.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-6 text-center">
            <p className="text-sm font-semibold text-gray-700">No teaching hours logged yet</p>
            <p className="text-xs text-gray-400 mt-1">Log work entries to see live subject progress here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {subjectPlans.map((item) => (
              <SubjectCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

      <div className="flex-1" />

      <div className="px-5 pb-4 pt-6">
        <button
          onClick={() => navigate('/work-entry')}
          className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold rounded-2xl py-4 text-base shadow-lg shadow-emerald-200 transition-all duration-150 flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Log Work
        </button>
      </div>
    </div>
  )
}

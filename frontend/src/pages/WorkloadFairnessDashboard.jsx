import { useMemo } from 'react'
import { useWFCTS } from '../context/WFCTSContext'

function statusForScore(score) {
  if (score >= 8) {
    return {
      label: 'High',
      badge: 'bg-red-100 text-red-700',
      bar: 'bg-red-500',
    }
  }
  if (score >= 4) {
    return {
      label: 'Medium',
      badge: 'bg-amber-100 text-amber-700',
      bar: 'bg-amber-500',
    }
  }
  return {
    label: 'Low',
    badge: 'bg-emerald-100 text-emerald-700',
    bar: 'bg-emerald-500',
  }
}

export default function WorkloadFairnessDashboard() {
  const { workEntries, substituteEntries, tasks, teacherDirectory } = useWFCTS()

  const teacherScores = useMemo(() => {
    const rows = teacherDirectory.map((teacher) => {
      const lectures = workEntries.filter(
        (entry) => (entry.teacherId || 'u1') === teacher.id && entry.workType === 'Lecture',
      ).length

      const substitutions = substituteEntries.filter(
        (entry) => (entry.teacherId || 'u1') === teacher.id,
      ).length

      const completedTasks = tasks.filter(
        (task) => task.assignTo === teacher.id && task.status === 'Completed',
      ).length

      const workloadScore = lectures + substitutions + completedTasks

      return {
        id: teacher.id,
        name: teacher.name,
        lectures,
        substitutions,
        completedTasks,
        workloadScore,
      }
    })

    return rows.sort((a, b) => b.workloadScore - a.workloadScore)
  }, [teacherDirectory, workEntries, substituteEntries, tasks])

  const maxScore = Math.max(...teacherScores.map((item) => item.workloadScore), 1)

  return (
    <div className="flex flex-col min-h-full">
      <div className="bg-white px-5 pt-10 pb-6 shadow-sm">
        <p className="text-xs font-semibold text-emerald-500 uppercase tracking-widest mb-1">WFCTS</p>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Workload Fairness</h1>
        <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Teacher workload score by activity contribution</p>
      </div>

      <div className="px-5 pt-5 pb-4 flex flex-col gap-3">
        {teacherScores.map((teacher) => {
          const status = statusForScore(teacher.workloadScore)
          const widthPct = Math.max((teacher.workloadScore / maxScore) * 100, teacher.workloadScore > 0 ? 12 : 0)

          return (
            <div key={teacher.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm sm:text-base font-bold text-gray-900">{teacher.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Workload Score: {teacher.workloadScore}</p>
                </div>
                <span className={`text-[10px] sm:text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${status.badge}`}>
                  {status.label}
                </span>
              </div>

              <div className="mt-3 h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
                <div className={`h-full rounded-full ${status.bar}`} style={{ width: `${widthPct}%` }} />
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="bg-gray-50 rounded-xl px-2.5 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">Lectures</p>
                  <p className="text-xs sm:text-sm font-bold text-blue-600 mt-0.5">{teacher.lectures}</p>
                </div>
                <div className="bg-gray-50 rounded-xl px-2.5 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">Substitutions</p>
                  <p className="text-xs sm:text-sm font-bold text-indigo-600 mt-0.5">{teacher.substitutions}</p>
                </div>
                <div className="bg-gray-50 rounded-xl px-2.5 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">Tasks</p>
                  <p className="text-xs sm:text-sm font-bold text-emerald-600 mt-0.5">{teacher.completedTasks}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

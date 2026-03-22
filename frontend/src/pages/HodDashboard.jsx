import { useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { useWFCTS } from '../context/WFCTSContext'

function buildTeacherScores(teacherDirectory, workEntries, substituteEntries, tasks) {
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

    return {
      id: teacher.id,
      name: teacher.name,
      workloadScore: lectures + substitutions + completedTasks,
    }
  })

  return rows.sort((a, b) => b.workloadScore - a.workloadScore)
}

export default function HodDashboard() {
  const { user } = useAuth()
  const { teacherDirectory, tasks, substituteEntries, workEntries } = useWFCTS()

  const stats = useMemo(() => {
    const teacherScores = buildTeacherScores(teacherDirectory, workEntries, substituteEntries, tasks)
    const totalTeachers = teacherDirectory.length
    const totalTasksAssigned = tasks.length
    const pendingTasks = tasks.filter((task) => task.status === 'Pending').length
    const totalSubstitutions = substituteEntries.length
    const mostActiveTeacher = teacherScores[0]
    const leastActiveTeacher = teacherScores[teacherScores.length - 1]
    const topOverloaded = teacherScores.slice(0, 3)

    return {
      totalTeachers,
      totalTasksAssigned,
      pendingTasks,
      totalSubstitutions,
      mostActiveTeacher,
      leastActiveTeacher,
      topOverloaded,
    }
  }, [teacherDirectory, tasks, substituteEntries, workEntries])

  const widgets = [
    { label: 'Total Teachers', value: stats.totalTeachers },
    { label: 'Total Tasks Assigned', value: stats.totalTasksAssigned },
    { label: 'Pending Tasks', value: stats.pendingTasks },
    { label: 'Total Substitutions', value: stats.totalSubstitutions },
  ]

  return (
    <div className="flex flex-col min-h-full">
      <div className="bg-white px-5 pt-10 pb-6 shadow-sm">
        <p className="text-xs font-semibold text-emerald-500 uppercase tracking-widest mb-1">WFCTS — HOD</p>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{user?.name}</h1>
        <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Department workload snapshot</p>
      </div>

      <div className="px-5 pt-6 grid grid-cols-2 gap-3">
        {widgets.map((item) => (
          <div key={item.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">{item.label}</p>
            <p className="text-2xl sm:text-3xl font-bold text-emerald-600 mt-1">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="px-5 pt-5 pb-6 flex flex-col gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">Most Active Teacher</p>
          <p className="text-sm sm:text-base font-bold text-gray-900 mt-1">{stats.mostActiveTeacher?.name || 'N/A'}</p>
          <p className="text-xs text-gray-400 mt-0.5">Score: {stats.mostActiveTeacher?.workloadScore ?? 0}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">Least Active Teacher</p>
          <p className="text-sm sm:text-base font-bold text-gray-900 mt-1">{stats.leastActiveTeacher?.name || 'N/A'}</p>
          <p className="text-xs text-gray-400 mt-0.5">Score: {stats.leastActiveTeacher?.workloadScore ?? 0}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide mb-2">Top 3 Overloaded Teachers</p>
          <div className="flex flex-col gap-2">
            {stats.topOverloaded.map((teacher, index) => (
              <div key={teacher.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                <p className="text-sm font-semibold text-gray-700">{index + 1}. {teacher.name}</p>
                <span className="text-xs font-bold text-red-600">{teacher.workloadScore}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

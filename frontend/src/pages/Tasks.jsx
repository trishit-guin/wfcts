import { useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useWFCTS } from '../context/WFCTSContext'
import { formatDate } from '../utils/formatDate'

function statusClasses(status) {
  return status === 'Completed'
    ? 'bg-emerald-100 text-emerald-700'
    : 'bg-amber-100 text-amber-700'
}

export default function Tasks() {
  const { user } = useAuth()
  const { tasks, markTaskComplete } = useWFCTS()
  const [busyTaskId, setBusyTaskId] = useState('')
  const [error, setError] = useState('')

  const teacherTasks = useMemo(
    () => tasks.filter((task) => task.assignTo === user?.id),
    [tasks, user?.id],
  )

  async function handleComplete(taskId) {
    setBusyTaskId(taskId)
    setError('')

    try {
      await markTaskComplete(taskId)
    } catch (err) {
      setError(err.message || 'Unable to complete the task.')
    } finally {
      setBusyTaskId('')
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="bg-white px-5 pt-10 pb-6 shadow-sm">
        <p className="text-xs font-semibold text-emerald-500 uppercase tracking-widest mb-1">WFCTS</p>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Tasks</h1>
        <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Assigned to you</p>
      </div>

      <div className="px-5 pt-5 pb-4 flex flex-col gap-3">
        {error && <p className="text-xs text-red-500">{error}</p>}

        {teacherTasks.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-6 text-center">
            <p className="text-sm font-semibold text-gray-700">No tasks assigned</p>
            <p className="text-xs text-gray-400 mt-1">New tasks will appear here.</p>
          </div>
        )}

        {teacherTasks.map((task) => (
          <div key={task.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm sm:text-base font-bold text-gray-900">{task.title}</h3>
              <span className={`text-[10px] sm:text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${statusClasses(task.status)}`}>
                {task.status}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-wide text-gray-400">Assigned By</p>
                <p className="text-xs sm:text-sm font-semibold text-gray-700 mt-0.5">{task.assignedBy}</p>
              </div>
              <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-wide text-gray-400">Deadline</p>
                <p className="text-xs sm:text-sm font-semibold text-gray-700 mt-0.5">{formatDate(task.deadline)}</p>
              </div>
            </div>

            {task.status !== 'Completed' && (
              <button
                type="button"
                onClick={() => handleComplete(task.id)}
                disabled={busyTaskId === task.id}
                className="mt-3 w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 text-white text-sm font-semibold py-2.5 transition-colors"
              >
                {busyTaskId === task.id ? 'Updating...' : 'Mark Complete'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

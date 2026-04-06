import { useEffect, useState } from 'react'
import { useWFCTS } from '../context/WFCTSContext'
import { formatDate } from '../utils/formatDate'

export default function AssignTask() {
  const { addTask, updateTask, cancelTask, teacherDirectory, tasks } = useWFCTS()

  const [form, setForm] = useState({
    title: '',
    description: '',
    assignTo: '',
    deadline: '',
  })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState('')
  const [busyTaskId, setBusyTaskId] = useState('')

  useEffect(() => {
    if (!form.assignTo && teacherDirectory.length > 0) {
      setForm((prev) => ({ ...prev, assignTo: teacherDirectory[0].id }))
    }
  }, [teacherDirectory, form.assignTo])

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }))
    if (message) setMessage('')
    if (error) setError('')
  }

  async function onSubmit(e) {
    e.preventDefault()
    if (!form.title || !form.description || !form.assignTo || !form.deadline) {
      setError('Please fill in all task fields.')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const payload = {
        title: form.title,
        description: form.description,
        assignTo: form.assignTo,
        deadline: form.deadline,
      }

      if (editingTaskId) {
        await updateTask(editingTaskId, payload)
      } else {
        await addTask(payload)
      }

      setForm({
        title: '',
        description: '',
        assignTo: teacherDirectory[0]?.id || '',
        deadline: '',
      })
      setEditingTaskId('')
      setMessage(editingTaskId ? 'Task updated successfully.' : 'Task assigned successfully.')
    } catch (err) {
      setError(err.message || 'Unable to assign task.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function startEdit(task) {
    setForm({
      title: task.title || '',
      description: task.description || '',
      assignTo: task.assignTo || '',
      deadline: task.deadline || '',
    })
    setEditingTaskId(task.id)
    setMessage('')
    setError('')
  }

  function cancelEdit() {
    setEditingTaskId('')
    setForm({
      title: '',
      description: '',
      assignTo: teacherDirectory[0]?.id || '',
      deadline: '',
    })
    setMessage('')
    setError('')
  }

  async function handleCancelTask(taskId) {
    const confirmed = window.confirm('Cancel this task?')
    if (!confirmed) return

    setBusyTaskId(taskId)
    setError('')

    try {
      await cancelTask(taskId)
      if (editingTaskId === taskId) {
        cancelEdit()
      }
      setMessage('Task cancelled successfully.')
    } catch (err) {
      setError(err.message || 'Unable to cancel task.')
    } finally {
      setBusyTaskId('')
    }
  }

  const teacherNameById = new Map(teacherDirectory.map((teacher) => [teacher.id, teacher.name]))

  return (
    <div className="flex flex-col min-h-full">
      <div className="bg-white px-5 pt-10 pb-6 shadow-sm">
        <p className="text-xs font-semibold text-emerald-500 uppercase tracking-widest mb-1">WFCTS</p>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Assign Task</h1>
        <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Create and assign tasks to teachers</p>
      </div>

      <div className="px-5 pt-5 pb-6">
        <form onSubmit={onSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <div>
            <label className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Task Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
              placeholder="Enter task title"
            />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Description</label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-200"
              placeholder="Enter task description"
            />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Assign To</label>
            <select
              value={form.assignTo}
              onChange={(e) => updateField('assignTo', e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              {teacherDirectory.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Deadline</label>
            <input
              type="date"
              value={form.deadline}
              onChange={(e) => updateField('deadline', e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || teacherDirectory.length === 0}
            className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 text-white text-sm font-semibold py-2.5 transition-colors"
          >
            {isSubmitting ? 'Submitting...' : editingTaskId ? 'Update Task' : 'Submit'}
          </button>

          {editingTaskId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="w-full rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold py-2.5 transition-colors"
            >
              Cancel Edit
            </button>
          )}

          {message && <p className="text-xs text-emerald-700 font-medium">{message}</p>}
          {error && <p className="text-xs text-red-500">{error}</p>}
        </form>

        <div className="mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Assigned Tasks</h2>
          {tasks.length === 0 ? (
            <p className="text-sm text-gray-500">No tasks available.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {tasks.map((task) => (
                <div key={task.id} className="rounded-xl border border-gray-100 px-3 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{task.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {teacherNameById.get(task.assignTo) || task.assignTo} | {formatDate(task.deadline)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{task.description}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEdit(task)}
                        className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md"
                      >
                        Edit
                      </button>
                      {task.status !== 'Cancelled' && (
                        <button
                          type="button"
                          disabled={busyTaskId === task.id}
                          onClick={() => handleCancelTask(task.id)}
                          className="text-[11px] font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-md disabled:opacity-70"
                        >
                          {busyTaskId === task.id ? 'Cancelling...' : 'Cancel'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

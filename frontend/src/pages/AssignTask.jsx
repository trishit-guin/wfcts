import { useEffect, useState } from 'react'
import { useWFCTS } from '../context/WFCTSContext'

export default function AssignTask() {
  const { addTask, teacherDirectory } = useWFCTS()

  const [form, setForm] = useState({
    title: '',
    description: '',
    assignTo: '',
    deadline: '',
  })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

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
      await addTask({
        title: form.title,
        description: form.description,
        assignTo: form.assignTo,
        deadline: form.deadline,
      })

      setForm({
        title: '',
        description: '',
        assignTo: teacherDirectory[0]?.id || '',
        deadline: '',
      })
      setMessage('Task assigned successfully.')
    } catch (err) {
      setError(err.message || 'Unable to assign task.')
    } finally {
      setIsSubmitting(false)
    }
  }

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
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>

          {message && <p className="text-xs text-emerald-700 font-medium">{message}</p>}
          {error && <p className="text-xs text-red-500">{error}</p>}
        </form>
      </div>
    </div>
  )
}

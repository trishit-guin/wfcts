import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useWFCTS } from '../context/WFCTSContext'

const mockTeachers = [
  { id: 'u1', name: 'Prof. Sharma' },
  { id: 'u4', name: 'Prof. Neha' },
  { id: 'u5', name: 'Prof. Arjun' },
]

export default function AssignTask() {
  const { user } = useAuth()
  const { addTask } = useWFCTS()

  const [form, setForm] = useState({
    title: '',
    description: '',
    assignTo: mockTeachers[0].id,
    deadline: '',
  })
  const [message, setMessage] = useState('')

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function onSubmit(e) {
    e.preventDefault()
    if (!form.title || !form.description || !form.assignTo || !form.deadline) return

    addTask({
      title: form.title,
      description: form.description,
      assignTo: form.assignTo,
      deadline: form.deadline,
      assignedBy: user?.name || user?.role || 'System',
    })

    setForm({
      title: '',
      description: '',
      assignTo: mockTeachers[0].id,
      deadline: '',
    })
    setMessage('Task assigned successfully.')
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
              {mockTeachers.map((teacher) => (
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
            className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-2.5 transition-colors"
          >
            Submit
          </button>

          {message && <p className="text-xs text-emerald-700 font-medium">{message}</p>}
        </form>
      </div>
    </div>
  )
}

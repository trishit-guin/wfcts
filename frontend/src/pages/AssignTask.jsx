import { useEffect, useState } from 'react'
import { useWFCTS } from '../context/WFCTSContext'
import { formatDate } from '../utils/formatDate'

function statusClasses(status) {
  if (status === 'Completed') return 'bg-[var(--wfcts-secondary)]/12 text-[var(--wfcts-secondary)]'
  if (status === 'Cancelled') return 'bg-slate-200 text-slate-600'
  return 'bg-orange-100 text-[#7c2d12]'
}

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

  async function onSubmit(event) {
    event.preventDefault()
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
  const pendingTasks = tasks.filter((task) => task.status === 'Pending')
  const cancelledTasks = tasks.filter((task) => task.status === 'Cancelled')

  return (
    <div className="space-y-8 animate-float-in">
      <section>
        <p className="font-label text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[var(--wfcts-muted)]">
          Workflow Management
        </p>
        <h2 className="font-headline mt-2 text-4xl font-extrabold tracking-[-0.06em] text-[var(--wfcts-primary)] sm:text-5xl">
          Assign Task
        </h2>
        <p className="mt-3 text-sm text-[var(--wfcts-muted)] sm:text-base">
          Create, adjust, and track faculty task assignments from one connected control surface.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <section className="space-y-6 lg:col-span-8">
          <form onSubmit={onSubmit} className="wfcts-card p-8 space-y-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-label text-[0.66rem] font-bold uppercase tracking-[0.2em] text-[var(--wfcts-muted)]">
                  Task Composer
                </p>
                <h3 className="font-headline text-2xl font-bold text-[var(--wfcts-primary)]">
                  {editingTaskId ? 'Update Assignment' : 'Create Assignment'}
                </h3>
              </div>
              <span className="rounded-full bg-[var(--wfcts-primary)]/8 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--wfcts-primary)]">
                {teacherDirectory.length} teachers
              </span>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-semibold text-slate-700">Task Title</span>
                <input
                  type="text"
                  value={form.title}
                  onChange={(event) => updateField('title', event.target.value)}
                  className="w-full rounded-[1rem] border border-slate-200 bg-[var(--wfcts-surface-muted)] px-4 py-3 text-sm outline-none transition focus:border-[var(--wfcts-primary)]/20 focus:bg-white focus:ring-2 focus:ring-[var(--wfcts-primary)]/10"
                  placeholder="Enter task title"
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-semibold text-slate-700">Description</span>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(event) => updateField('description', event.target.value)}
                  className="w-full resize-none rounded-[1rem] border border-slate-200 bg-[var(--wfcts-surface-muted)] px-4 py-3 text-sm outline-none transition focus:border-[var(--wfcts-primary)]/20 focus:bg-white focus:ring-2 focus:ring-[var(--wfcts-primary)]/10"
                  placeholder="Enter task description"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Assign To</span>
                <select
                  value={form.assignTo}
                  onChange={(event) => updateField('assignTo', event.target.value)}
                  className="w-full rounded-[1rem] border border-slate-200 bg-[var(--wfcts-surface-muted)] px-4 py-3 text-sm outline-none transition focus:border-[var(--wfcts-primary)]/20 focus:bg-white focus:ring-2 focus:ring-[var(--wfcts-primary)]/10"
                >
                  {teacherDirectory.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Deadline</span>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(event) => updateField('deadline', event.target.value)}
                  className="w-full rounded-[1rem] border border-slate-200 bg-[var(--wfcts-surface-muted)] px-4 py-3 text-sm outline-none transition focus:border-[var(--wfcts-primary)]/20 focus:bg-white focus:ring-2 focus:ring-[var(--wfcts-primary)]/10"
                />
              </label>
            </div>

            {message && <p className="text-sm text-[var(--wfcts-secondary)]">{message}</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isSubmitting || teacherDirectory.length === 0}
                className="rounded-full bg-gradient-to-br from-[var(--wfcts-primary)] to-[#284bb0] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[var(--wfcts-primary)]/18 transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? 'Submitting...' : editingTaskId ? 'Update Task' : 'Assign Task'}
              </button>

              {editingTaskId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </section>

        <aside className="space-y-5 lg:col-span-4">
          <div className="wfcts-card p-5">
            <p className="text-[0.66rem] font-bold uppercase tracking-[0.2em] text-[var(--wfcts-muted)]">Queue Snapshot</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="wfcts-card-muted p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--wfcts-muted)]">Pending</p>
                <p className="font-headline mt-2 text-3xl font-extrabold text-[var(--wfcts-primary)]">{pendingTasks.length}</p>
              </div>
              <div className="wfcts-card-muted p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--wfcts-muted)]">Cancelled</p>
                <p className="font-headline mt-2 text-3xl font-extrabold text-[#7c2d12]">{cancelledTasks.length}</p>
              </div>
            </div>
          </div>

          <div className="wfcts-card p-5">
            <p className="text-[0.66rem] font-bold uppercase tracking-[0.2em] text-[var(--wfcts-muted)]">Workflow Hint</p>
            <p className="mt-3 text-sm leading-relaxed text-slate-800">
              Assign tight deadlines only when needed. The fairness board uses completed tasks as part of each teacher&apos;s workload score.
            </p>
          </div>
        </aside>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4 px-1">
          <h3 className="font-headline text-xl font-bold text-[var(--wfcts-primary)]">Assigned Tasks</h3>
          <span className="text-xs font-semibold text-[var(--wfcts-muted)]">{tasks.length} total</span>
        </div>

        {tasks.length === 0 ? (
          <div className="wfcts-card p-8 text-center">
            <p className="font-semibold text-slate-800">No tasks available</p>
            <p className="mt-2 text-sm text-[var(--wfcts-muted)]">Create your first task assignment to populate the queue.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {tasks.map((task) => (
              <div key={task.id} className="wfcts-card p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h4 className="font-headline text-xl font-bold text-[var(--wfcts-primary)]">{task.title}</h4>
                      <span className={`rounded-full px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.16em] ${statusClasses(task.status)}`}>
                        {task.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--wfcts-muted)]">{task.description}</p>
                    <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold text-slate-600">
                      <span>Assigned to: {teacherNameById.get(task.assignTo) || task.assignTo}</span>
                      <span>Deadline: {formatDate(task.deadline)}</span>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(task)}
                      className="rounded-full bg-[var(--wfcts-primary)]/8 px-4 py-2 text-xs font-semibold text-[var(--wfcts-primary)]"
                    >
                      Edit
                    </button>
                    {task.status !== 'Cancelled' && (
                      <button
                        type="button"
                        disabled={busyTaskId === task.id}
                        onClick={() => handleCancelTask(task.id)}
                        className="rounded-full bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 disabled:opacity-70"
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
      </section>
    </div>
  )
}

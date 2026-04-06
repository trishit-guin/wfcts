import { useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useWFCTS } from '../context/WFCTSContext'
import { formatDate } from '../utils/formatDate'

function taskBadge(task) {
  if (task.status === 'Completed') {
    return { label: 'Completed', className: 'bg-[var(--wfcts-secondary)]/12 text-[var(--wfcts-secondary)]' }
  }

  if (task.status === 'Cancelled') {
    return { label: 'Cancelled', className: 'bg-slate-200 text-slate-600' }
  }

  const targetDate = task.deadline ? new Date(task.deadline) : null
  if (targetDate && !Number.isNaN(targetDate.getTime())) {
    const diffMs = targetDate.getTime() - Date.now()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays <= 2) {
      return { label: 'High Priority', className: 'bg-orange-100 text-[#7c2d12]' }
    }

    if (diffDays <= 7) {
      return { label: 'Due Soon', className: 'bg-[var(--wfcts-primary)]/10 text-[var(--wfcts-primary)]' }
    }
  }

  return { label: 'Routine', className: 'bg-slate-100 text-slate-600' }
}

export default function Tasks() {
  const { user } = useAuth()
  const { tasks, markTaskComplete } = useWFCTS()
  const [activeTab, setActiveTab] = useState('Pending')
  const [busyTaskId, setBusyTaskId] = useState('')
  const [error, setError] = useState('')

  const teacherTasks = useMemo(
    () => tasks
      .filter((task) => task.assignTo === user?.id)
      .sort((a, b) => (a.deadline || '').localeCompare(b.deadline || '')),
    [tasks, user?.id],
  )

  const pendingTasks = teacherTasks.filter((task) => task.status === 'Pending')
  const completedTasks = teacherTasks.filter((task) => task.status !== 'Pending')
  const visibleTasks = activeTab === 'Pending' ? pendingTasks : completedTasks

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
    <div className="space-y-8 animate-float-in">
      <section className="max-w-3xl">
        <p className="font-label text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[var(--wfcts-muted)]">
          Workflow Management
        </p>
        <h2 className="font-headline mt-2 text-4xl font-extrabold tracking-[-0.06em] text-[var(--wfcts-primary)] sm:text-5xl">
          Tasks
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[var(--wfcts-muted)] sm:text-base">
          Manage your assigned academic and administrative work in one connected queue.
        </p>
      </section>

      <section className="flex flex-wrap items-center gap-3">
        <div className="flex w-fit rounded-[1rem] bg-[var(--wfcts-surface-muted)] p-1.5">
          {['Pending', 'Completed'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-[0.8rem] px-6 py-2.5 text-sm font-semibold transition-all ${
                activeTab === tab
                  ? 'bg-white text-[var(--wfcts-primary)] shadow-sm'
                  : 'text-[var(--wfcts-muted)] hover:bg-white/60'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-[var(--wfcts-muted)] shadow-sm">
          {activeTab === 'Pending' ? pendingTasks.length : completedTasks.length} task{(activeTab === 'Pending' ? pendingTasks.length : completedTasks.length) === 1 ? '' : 's'}
        </div>
      </section>

      {error && (
        <div className="rounded-[1.2rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="grid gap-4">
        {visibleTasks.length === 0 ? (
          <div className="wfcts-card p-8 text-center">
            <p className="font-semibold text-slate-800">
              {activeTab === 'Pending' ? 'No pending tasks assigned' : 'No completed tasks yet'}
            </p>
            <p className="mt-2 text-sm text-[var(--wfcts-muted)]">
              {activeTab === 'Pending'
                ? 'New tasks will appear here as soon as they are assigned to you.'
                : 'Completed and cancelled tasks will collect here for reference.'}
            </p>
          </div>
        ) : (
          visibleTasks.map((task) => {
            const badge = taskBadge(task)
            const isPending = task.status === 'Pending'

            return (
              <div
                key={task.id}
                className="wfcts-card flex flex-col gap-6 p-6 transition-all duration-300 hover:shadow-[0_24px_60px_rgba(30,58,138,0.08)] md:flex-row md:items-start"
              >
                <div className="relative mt-1 flex-shrink-0">
                  <button
                    type="button"
                    disabled={!isPending || busyTaskId === task.id}
                    onClick={() => handleComplete(task.id)}
                    className={`flex h-8 w-8 items-center justify-center rounded-xl border-2 transition-colors ${
                      isPending
                        ? 'border-slate-300 hover:border-[var(--wfcts-secondary)]'
                        : 'border-[var(--wfcts-secondary)] bg-[var(--wfcts-secondary)] text-white'
                    } ${busyTaskId === task.id ? 'opacity-60' : ''}`}
                    aria-label={isPending ? 'Mark task complete' : 'Task completed'}
                  >
                    {!isPending && (
                      <span
                        className="material-symbols-outlined text-lg"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        check
                      </span>
                    )}
                  </button>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="font-headline text-2xl font-bold tracking-[-0.04em] text-[var(--wfcts-primary)]">
                        {task.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-[var(--wfcts-muted)]">
                        Assigned through the WFCTS workflow for review, execution, and confirmation.
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.16em] ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-1">
                      <p className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-[var(--wfcts-muted)]">Deadline</p>
                      <div className="flex items-center gap-2 text-sm font-semibold text-[var(--wfcts-primary)]">
                        <span className="material-symbols-outlined text-base">calendar_month</span>
                        <span>{formatDate(task.deadline)}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-[var(--wfcts-muted)]">Assigned By</p>
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--wfcts-primary)]/10 text-[0.62rem] font-bold text-[var(--wfcts-primary)]">
                          {(task.assignedBy || 'WF').slice(0, 2).toUpperCase()}
                        </span>
                        <span>{task.assignedBy || 'WFCTS'}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-[var(--wfcts-muted)]">Status</p>
                      <p className="text-sm font-semibold text-slate-800">{task.status}</p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-[var(--wfcts-muted)]">Queue</p>
                      <p className="text-sm font-semibold text-slate-800">{activeTab}</p>
                    </div>
                  </div>

                  {isPending && (
                    <button
                      type="button"
                      onClick={() => handleComplete(task.id)}
                      disabled={busyTaskId === task.id}
                      className="mt-6 rounded-full bg-gradient-to-br from-[var(--wfcts-primary)] to-[#284bb0] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[var(--wfcts-primary)]/15 transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {busyTaskId === task.id ? 'Updating...' : 'Mark Complete'}
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </section>
    </div>
  )
}

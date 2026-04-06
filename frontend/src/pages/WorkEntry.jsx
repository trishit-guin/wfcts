import { useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useWFCTS } from '../context/WFCTSContext'
import { formatDate } from '../utils/formatDate'

const subjects = [
  'Data Structures',
  'Algorithms',
  'Operating Systems',
  'Database Management',
  'Computer Networks',
  'Software Engineering',
  'Machine Learning',
  'Mathematics I',
  'Mathematics II',
  'Physics',
]

const classes = ['FY-A', 'FY-B', 'SY-A', 'SY-B', 'TY-A', 'TY-B']
const workTypes = ['Lecture', 'Lab', 'Admin', 'Extra Duty']

function defaultForm() {
  return {
    date: new Date().toISOString().slice(0, 10),
    subject: '',
    className: '',
    hours: '',
    workType: '',
    description: '',
  }
}

function Toast({ message }) {
  return (
    <div className="animate-fade-in fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-[1.2rem] bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-2xl">
      <span
        className="material-symbols-outlined text-[var(--wfcts-secondary)]"
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        check_circle
      </span>
      {message}
    </div>
  )
}

export default function WorkEntry() {
  const { user } = useAuth()
  const { addWorkEntry, updateWorkEntry, workEntries, isLoading } = useWFCTS()
  const [form, setForm] = useState(defaultForm)
  const [editingEntryId, setEditingEntryId] = useState('')
  const [toast, setToast] = useState(false)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const teacherEntries = useMemo(
    () => workEntries
      .filter((entry) => entry.teacherId === user?.id)
      .sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    [workEntries, user?.id],
  )

  const thisWeekHours = useMemo(() => {
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - 6)
    weekStart.setHours(0, 0, 0, 0)

    return teacherEntries.reduce((sum, entry) => {
      const entryDate = new Date(entry.date)
      if (Number.isNaN(entryDate.getTime()) || entryDate < weekStart) return sum
      return sum + Number(entry.hours || 0)
    }, 0)
  }, [teacherEntries])

  const totalLoggedHours = teacherEntries.reduce((sum, entry) => sum + Number(entry.hours || 0), 0)
  const weeklyTarget = 20
  const weeklyProgress = Math.min(Math.round((thisWeekHours / weeklyTarget) * 100), 100)
  const todayLabel = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date())

  function validate() {
    const nextErrors = {}
    if (!form.date) nextErrors.date = 'Please choose a date.'
    if (!form.subject) nextErrors.subject = 'Please select a subject.'
    if (!form.className) nextErrors.className = 'Please select a class/division.'
    if (!form.hours || Number(form.hours) <= 0) nextErrors.hours = 'Enter valid hours.'
    if (!form.workType) nextErrors.workType = 'Please select a work type.'
    if (!form.description.trim()) nextErrors.description = 'Please add a description.'
    return nextErrors
  }

  function handleChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: undefined }))
    if (submitError) setSubmitError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const nextErrors = validate()
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }

    setIsSubmitting(true)
    setSubmitError('')

    try {
      const payload = {
        ...form,
        hours: Number(form.hours),
      }

      if (editingEntryId) {
        await updateWorkEntry(editingEntryId, payload)
      } else {
        await addWorkEntry(payload)
      }

      setToast(true)
      setForm(defaultForm())
      setEditingEntryId('')
      setTimeout(() => setToast(false), 3000)
    } catch (err) {
      setSubmitError(err.message || 'Unable to save work entry.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function startEdit(entry) {
    setForm({
      date: entry.date || new Date().toISOString().slice(0, 10),
      subject: entry.subject || '',
      className: entry.className || '',
      hours: String(entry.hours || ''),
      workType: entry.workType || '',
      description: entry.description || '',
    })
    setEditingEntryId(entry.id)
    setErrors({})
    setSubmitError('')
  }

  function cancelEdit() {
    setEditingEntryId('')
    setForm(defaultForm())
    setErrors({})
    setSubmitError('')
  }

  return (
    <div className="space-y-8 animate-float-in">
      <section>
        <p className="font-label text-sm font-semibold uppercase tracking-[0.22em] text-[var(--wfcts-secondary)]">
          Record Activity
        </p>
        <h2 className="font-headline mt-2 text-4xl font-extrabold tracking-[-0.06em] text-[var(--wfcts-primary)] sm:text-5xl">
          Log Work
        </h2>
        <div className="mt-4 flex items-center gap-2 text-sm text-[var(--wfcts-muted)]">
          <span className="material-symbols-outlined text-base">calendar_today</span>
          <span>{todayLabel}</span>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <section className="space-y-6 lg:col-span-8">
          <div className="wfcts-card p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="ml-1 text-sm font-semibold text-[var(--wfcts-primary)]/85">Date</span>
                  <input
                    type="date"
                    name="date"
                    value={form.date}
                    onChange={handleChange}
                    className={`w-full rounded-[1rem] border px-4 py-3 text-sm outline-none transition ${
                      errors.date
                        ? 'border-red-300 bg-red-50'
                        : 'border-slate-200 bg-[var(--wfcts-surface-muted)] focus:border-[var(--wfcts-primary)]/20 focus:bg-white focus:ring-2 focus:ring-[var(--wfcts-primary)]/10'
                    }`}
                  />
                  {errors.date && <p className="text-xs text-red-600">{errors.date}</p>}
                </label>

                <label className="space-y-2">
                  <span className="ml-1 text-sm font-semibold text-[var(--wfcts-primary)]/85">Work Type</span>
                  <select
                    name="workType"
                    value={form.workType}
                    onChange={handleChange}
                    className={`w-full rounded-[1rem] border px-4 py-3 text-sm outline-none transition ${
                      errors.workType
                        ? 'border-red-300 bg-red-50'
                        : 'border-slate-200 bg-[var(--wfcts-surface-muted)] focus:border-[var(--wfcts-primary)]/20 focus:bg-white focus:ring-2 focus:ring-[var(--wfcts-primary)]/10'
                    }`}
                  >
                    <option value="">Select work type</option>
                    {workTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  {errors.workType && <p className="text-xs text-red-600">{errors.workType}</p>}
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="ml-1 text-sm font-semibold text-[var(--wfcts-primary)]/85">Subject</span>
                  <select
                    name="subject"
                    value={form.subject}
                    onChange={handleChange}
                    className={`w-full rounded-[1rem] border px-4 py-3 text-sm outline-none transition ${
                      errors.subject
                        ? 'border-red-300 bg-red-50'
                        : 'border-slate-200 bg-[var(--wfcts-surface-muted)] focus:border-[var(--wfcts-primary)]/20 focus:bg-white focus:ring-2 focus:ring-[var(--wfcts-primary)]/10'
                    }`}
                  >
                    <option value="">Select a subject</option>
                    {subjects.map((subject) => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                  {errors.subject && <p className="text-xs text-red-600">{errors.subject}</p>}
                </label>

                <label className="space-y-2">
                  <span className="ml-1 text-sm font-semibold text-[var(--wfcts-primary)]/85">Class / Section</span>
                  <select
                    name="className"
                    value={form.className}
                    onChange={handleChange}
                    className={`w-full rounded-[1rem] border px-4 py-3 text-sm outline-none transition ${
                      errors.className
                        ? 'border-red-300 bg-red-50'
                        : 'border-slate-200 bg-[var(--wfcts-surface-muted)] focus:border-[var(--wfcts-primary)]/20 focus:bg-white focus:ring-2 focus:ring-[var(--wfcts-primary)]/10'
                    }`}
                  >
                    <option value="">Select class/division</option>
                    {classes.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                  {errors.className && <p className="text-xs text-red-600">{errors.className}</p>}
                </label>

                <label className="space-y-2">
                  <span className="ml-1 text-sm font-semibold text-[var(--wfcts-primary)]/85">Hours</span>
                  <input
                    type="number"
                    name="hours"
                    min="0.5"
                    max="12"
                    step="0.5"
                    value={form.hours}
                    onChange={handleChange}
                    placeholder="e.g. 1.5"
                    className={`w-full rounded-[1rem] border px-4 py-3 text-sm outline-none transition ${
                      errors.hours
                        ? 'border-red-300 bg-red-50'
                        : 'border-slate-200 bg-[var(--wfcts-surface-muted)] focus:border-[var(--wfcts-primary)]/20 focus:bg-white focus:ring-2 focus:ring-[var(--wfcts-primary)]/10'
                    }`}
                  />
                  {errors.hours && <p className="text-xs text-red-600">{errors.hours}</p>}
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="ml-1 text-sm font-semibold text-[var(--wfcts-primary)]/85">Description</span>
                  <textarea
                    name="description"
                    rows={4}
                    maxLength={500}
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Briefly describe the topics covered or activities performed..."
                    className={`w-full resize-none rounded-[1rem] border px-4 py-3 text-sm outline-none transition ${
                      errors.description
                        ? 'border-red-300 bg-red-50'
                        : 'border-slate-200 bg-[var(--wfcts-surface-muted)] focus:border-[var(--wfcts-primary)]/20 focus:bg-white focus:ring-2 focus:ring-[var(--wfcts-primary)]/10'
                    }`}
                  />
                  <div className="flex items-center justify-between">
                    {errors.description ? (
                      <p className="text-xs text-red-600">{errors.description}</p>
                    ) : (
                      <span />
                    )}
                    <p className="text-xs text-[var(--wfcts-muted)]">{form.description.length}/500</p>
                  </div>
                </label>
              </div>

              {submitError && (
                <div className="rounded-[1rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {submitError}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-3 rounded-full bg-gradient-to-br from-[var(--wfcts-primary)] to-[#284bb0] px-6 py-4 text-sm font-bold text-white shadow-lg shadow-[var(--wfcts-primary)]/20 transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <span>{isSubmitting ? 'Submitting...' : editingEntryId ? 'Update Entry' : 'Submit Work Entry'}</span>
                  <span className="material-symbols-outlined text-base">send</span>
                </button>

                {editingEntryId && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="mt-3 w-full rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>
          </div>
        </section>

        <aside className="space-y-6 lg:col-span-4">
          <div className="relative overflow-hidden rounded-[1.8rem] bg-[var(--wfcts-primary)] p-6 text-white shadow-[0_24px_60px_rgba(30,58,138,0.22)]">
            <div className="absolute right-0 top-0 p-4 opacity-10">
              <span className="material-symbols-outlined text-6xl">payments</span>
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-200">Weekly Hours</p>
            <h3 className="font-headline mt-2 text-5xl font-extrabold tracking-[-0.05em]">{thisWeekHours}</h3>
            <div className="mt-5 flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-[var(--wfcts-secondary-soft)]"
                  style={{ width: `${weeklyProgress}%` }}
                />
              </div>
              <span className="text-xs font-bold">{weeklyProgress}%</span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-blue-100">
              You have logged {thisWeekHours} hours in the last 7 days. {Math.max(weeklyTarget - thisWeekHours, 0)} hours remain to reach the reference target of {weeklyTarget}.
            </p>
          </div>

          <div className="wfcts-card-muted border-l-4 border-[var(--wfcts-secondary)] p-6">
            <h4 className="font-headline text-lg font-bold text-[var(--wfcts-primary)]">Policy Reminder</h4>
            <div className="mt-4 space-y-3 text-sm text-[var(--wfcts-muted)]">
              <div className="flex gap-2">
                <span className="material-symbols-outlined text-[var(--wfcts-secondary)] text-base">check_circle</span>
                <span>Include specific lab details and covered topics when logging practical sessions.</span>
              </div>
              <div className="flex gap-2">
                <span className="material-symbols-outlined text-[var(--wfcts-secondary)] text-base">check_circle</span>
                <span>Use the actual date of work so subject-hour tracking stays accurate across the semester.</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h4 className="font-headline text-lg font-bold text-[var(--wfcts-primary)]">Recent Entries</h4>
              <span className="text-xs font-semibold text-[var(--wfcts-muted)]">{totalLoggedHours}h total</span>
            </div>

            {isLoading ? (
              <div className="wfcts-card p-5 text-sm text-[var(--wfcts-muted)]">Loading recent work entries...</div>
            ) : teacherEntries.length === 0 ? (
              <div className="wfcts-card p-6 text-center">
                <p className="font-semibold text-slate-800">No work logged yet</p>
                <p className="mt-2 text-sm text-[var(--wfcts-muted)]">Your recent lectures and duties will appear here once saved.</p>
              </div>
            ) : (
              teacherEntries.slice(0, 4).map((entry) => (
                <div key={entry.id} className="wfcts-card flex items-center justify-between gap-4 p-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{formatDate(entry.date)}</p>
                    <p className="mt-1 font-semibold text-[var(--wfcts-primary)]">{entry.subject}</p>
                    <p className="text-xs text-[var(--wfcts-muted)]">{entry.hours} Hours • {entry.workType}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="rounded-full bg-[var(--wfcts-secondary)]/12 px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[var(--wfcts-secondary)]">
                      Logged
                    </span>
                    <button
                      type="button"
                      onClick={() => startEdit(entry)}
                      className="rounded-full bg-[var(--wfcts-primary)]/8 px-3 py-1.5 text-xs font-semibold text-[var(--wfcts-primary)]"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>

      {toast && <Toast message="Work logged successfully" />}
    </div>
  )
}

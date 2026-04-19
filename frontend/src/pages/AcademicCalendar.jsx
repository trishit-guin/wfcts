import { useState, useEffect } from 'react'
import { useWFCTS } from '../context/WFCTSContext'

const EVENT_TYPES = ['HOLIDAY', 'EXAM', 'EVENT', 'BREAK']

const TYPE_STYLE = {
  HOLIDAY: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-400' },
  EXAM:    { bg: 'bg-rose-50',    border: 'border-rose-200',    text: 'text-rose-800',    badge: 'bg-rose-100 text-rose-700',    dot: 'bg-rose-400' },
  EVENT:   { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-800',   badge: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-400' },
  BREAK:   { bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-800',  badge: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-400' },
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatDisplayDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
}

function SymIcon({ name, className = '' }) {
  return (
    <span className={`material-symbols-outlined leading-none ${className}`} aria-hidden="true">
      {name}
    </span>
  )
}

function AddEventForm({ onAdd, onCancel }) {
  const [form, setForm] = useState({
    title: '',
    date: '',
    endDate: '',
    type: 'HOLIDAY',
    description: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return setError('Title is required')
    if (!form.date) return setError('Date is required')
    setSaving(true)
    setError('')
    try {
      await onAdd({
        title: form.title.trim(),
        date: form.date,
        endDate: form.endDate || undefined,
        type: form.type,
        description: form.description.trim(),
      })
      onCancel()
    } catch (err) {
      setError(err.message || 'Failed to create event')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <h3 className="font-headline text-base font-bold text-slate-800">New Academic Event</h3>

      {error && <div className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</div>}

      {/* Type */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-600">Type</label>
        <div className="flex flex-wrap gap-2">
          {EVENT_TYPES.map((t) => {
            const s = TYPE_STYLE[t]
            return (
              <button
                key={t}
                type="button"
                onClick={() => setForm((f) => ({ ...f, type: t }))}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                  form.type === t ? `${s.bg} ${s.border} ${s.text}` : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                {t.charAt(0) + t.slice(1).toLowerCase()}
              </button>
            )
          })}
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-600">Title</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="e.g. Diwali Holiday, Mid-term Exams"
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-(--wfcts-primary) focus:outline-none focus:ring-2 focus:ring-(--wfcts-primary)/20"
        />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Start Date</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-(--wfcts-primary) focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">End Date <span className="font-normal text-slate-400">(optional)</span></label>
          <input
            type="date"
            value={form.endDate}
            onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-(--wfcts-primary) focus:outline-none"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-600">Notes <span className="font-normal text-slate-400">(optional)</span></label>
        <textarea
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          rows={2}
          placeholder="Additional details..."
          className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-(--wfcts-primary) focus:outline-none"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 rounded-xl bg-(--wfcts-primary) py-2.5 text-sm font-bold text-white shadow-md shadow-(--wfcts-primary)/20 hover:opacity-90 disabled:opacity-60"
        >
          {saving ? 'Adding...' : 'Add Event'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

export default function AcademicCalendar() {
  const { academicEvents, fetchAcademicEvents, addAcademicEvent, removeAcademicEvent } = useWFCTS()
  const [showForm, setShowForm] = useState(false)
  const [deleting, setDeleting] = useState('')
  const [filterType, setFilterType] = useState('ALL')

  useEffect(() => {
    fetchAcademicEvents().catch(() => {})
  }, [fetchAcademicEvents])

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this event from the academic calendar?')) return
    setDeleting(id)
    try {
      await removeAcademicEvent(id)
    } finally {
      setDeleting('')
    }
  }

  const filtered = filterType === 'ALL' ? academicEvents : academicEvents.filter((e) => e.type === filterType)

  // Group by month
  const grouped = filtered.reduce((acc, event) => {
    const monthKey = event.date ? event.date.slice(0, 7) : 'unknown'
    if (!acc[monthKey]) acc[monthKey] = []
    acc[monthKey].push(event)
    return acc
  }, {})

  return (
    <div className="space-y-6 animate-float-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-label text-[0.62rem] font-bold uppercase tracking-[0.28em] text-(--wfcts-muted)">
            Institution-wide
          </p>
          <h1 className="font-headline text-2xl font-extrabold tracking-[-0.04em] text-slate-800 sm:text-3xl">
            Academic Calendar
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Holidays, exams, and events visible to all staff members.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-xl bg-(--wfcts-primary) px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-(--wfcts-primary)/20 hover:-translate-y-0.5 transition-transform"
        >
          <SymIcon name="add" className="text-base" />
          Add Event
        </button>
      </div>

      {showForm && (
        <AddEventForm
          onAdd={addAcademicEvent}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Type filter */}
      <div className="flex flex-wrap gap-2">
        {['ALL', ...EVENT_TYPES].map((t) => {
          const s = t !== 'ALL' ? TYPE_STYLE[t] : null
          return (
            <button
              key={t}
              type="button"
              onClick={() => setFilterType(t)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                filterType === t
                  ? t === 'ALL'
                    ? 'bg-(--wfcts-primary) border-(--wfcts-primary) text-white'
                    : `${s.bg} ${s.border} ${s.text}`
                  : 'border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              {s && <span className={`h-2 w-2 rounded-full ${s.dot}`} />}
              {t === 'ALL' ? 'All Events' : t.charAt(0) + t.slice(1).toLowerCase()}
            </button>
          )
        })}
        <span className="ml-auto self-center text-xs text-slate-400">
          {filtered.length} event{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Events grouped by month */}
      {Object.keys(grouped).length === 0 ? (
        <div className="wfcts-card flex flex-col items-center py-16 gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <SymIcon name="event_note" className="text-3xl" />
          </div>
          <p className="font-semibold text-slate-700">No academic events yet</p>
          <p className="text-sm text-slate-400">Add holidays, exam periods, and institutional events.</p>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-xl bg-(--wfcts-primary) px-5 py-2.5 text-sm font-bold text-white"
          >
            <SymIcon name="add" className="text-sm" /> Add First Event
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([monthKey, events]) => {
            const [year, month] = monthKey.split('-')
            const monthLabel = `${MONTH_NAMES[Number(month) - 1]} ${year}`
            return (
              <div key={monthKey}>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">{monthLabel}</h3>
                <div className="space-y-2">
                  {events.map((event) => {
                    const s = TYPE_STYLE[event.type] || TYPE_STYLE.EVENT
                    const isMultiDay = event.endDate && event.endDate !== event.date
                    return (
                      <div
                        key={event.id}
                        className={`flex items-start gap-4 rounded-2xl border p-4 ${s.bg} ${s.border}`}
                      >
                        <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${s.badge.split(' ')[0]} ${s.text}`}>
                          <SymIcon name={
                            event.type === 'HOLIDAY' ? 'celebration' :
                            event.type === 'EXAM' ? 'edit_document' :
                            event.type === 'BREAK' ? 'wb_sunny' : 'event'
                          } className="text-lg" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-wider ${s.badge}`}>
                              {event.type}
                            </span>
                            <p className="font-semibold text-slate-800">{event.title}</p>
                          </div>
                          <p className={`mt-0.5 text-xs ${s.text} opacity-80`}>
                            {formatDisplayDate(event.date)}
                            {isMultiDay && ` – ${formatDisplayDate(event.endDate)}`}
                          </p>
                          {event.description && (
                            <p className="mt-1 text-xs text-slate-600">{event.description}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDelete(event.id)}
                          disabled={deleting === event.id}
                          className="shrink-0 rounded-xl p-1.5 text-slate-400 hover:bg-white/60 hover:text-rose-500 disabled:opacity-40"
                        >
                          <SymIcon name="delete" className="text-base" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

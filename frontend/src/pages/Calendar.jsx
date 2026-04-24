import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useWFCTS } from '../context/WFCTSContext'
import { getManagersRequest, exportMonthlyRequest, getUserCalendarEventsRequest, getSubstituteSuggestionsRequest } from '../utils/api'
import { ClassPicker } from '../components/ClassPicker'

// ─── Constants ────────────────────────────────────────────────────────────────

const GRID_START = 7   // 07:00
const GRID_END = 21    // 21:00
const HOUR_HEIGHT = 64 // px per hour
const TOTAL_HEIGHT = (GRID_END - GRID_START) * HOUR_HEIGHT
const HOURS = Array.from({ length: GRID_END - GRID_START + 1 }, (_, i) => GRID_START + i)
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

const EVENT_TYPES = ['LECTURE', 'LAB', 'ADMIN', 'EXTRA_DUTY', 'MEETING', 'SUBSTITUTE_COVER']

const FAIRNESS_WEIGHTS = {
  LECTURE: 1.0, LAB: 1.2, ADMIN: 0.8,
  EXTRA_DUTY: 1.5, MEETING: 0.5, SUBSTITUTE_COVER: 2.0,
}

const EVENT_COLORS = {
  LECTURE:         { bg: 'bg-blue-50',   border: 'border-blue-300',   text: 'text-blue-800',   dot: 'bg-blue-400',   badge: 'bg-blue-100 text-blue-700' },
  LAB:             { bg: 'bg-teal-50',   border: 'border-teal-300',   text: 'text-teal-800',   dot: 'bg-teal-400',   badge: 'bg-teal-100 text-teal-700' },
  ADMIN:           { bg: 'bg-slate-50',  border: 'border-slate-300',  text: 'text-slate-700',  dot: 'bg-slate-400',  badge: 'bg-slate-100 text-slate-600' },
  EXTRA_DUTY:      { bg: 'bg-amber-50',  border: 'border-amber-300',  text: 'text-amber-800',  dot: 'bg-amber-400',  badge: 'bg-amber-100 text-amber-700' },
  MEETING:         { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-800', dot: 'bg-purple-400', badge: 'bg-purple-100 text-purple-700' },
  SUBSTITUTE_COVER:{ bg: 'bg-rose-50',   border: 'border-rose-300',   text: 'text-rose-800',   dot: 'bg-rose-400',   badge: 'bg-rose-100 text-rose-700' },
}

const STATUS_STYLE = {
  SCHEDULED:        '',
  PENDING_APPROVAL: 'border-l-[3px] border-l-amber-400',
  COMPLETED:        'opacity-60',
  CANCELLED:        'opacity-30',
  SUBSTITUTED:      'opacity-50',
}

const STATUS_LABELS = {
  SCHEDULED: 'Scheduled', PENDING_APPROVAL: 'Pending Approval',
  COMPLETED: 'Completed', CANCELLED: 'Cancelled', SUBSTITUTED: 'Substituted',
}

const WORK_TYPE_LABEL = {
  LECTURE: 'Lecture', LAB: 'Lab', ADMIN: 'Admin',
  EXTRA_DUTY: 'Extra Duty', MEETING: 'Meeting', SUBSTITUTE_COVER: 'Sub Cover',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeToMin(t) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function initials(name) {
  if (!name) return '?'
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

function dayOfWeekFromDateStr(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}


function calcTop(startTime) {
  const startMin = timeToMin(startTime)
  return (startMin - GRID_START * 60) * (HOUR_HEIGHT / 60)
}

function calcHeight(startTime, endTime) {
  return Math.max((timeToMin(endTime) - timeToMin(startTime)) * (HOUR_HEIGHT / 60), 22)
}

function formatTime12(t) {
  const [h, m] = t.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`
}

function getWeekStart(date) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  d.setHours(0, 0, 0, 0)
  return d
}

function getWeekDays(weekStart) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })
}

function toISODate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function isSameDay(d1, d2) {
  return toISODate(d1) === toISODate(d2)
}

function isToday(date) {
  return isSameDay(date, new Date())
}

function getMonthGrid(year, month) {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const startDay = first.getDay()
  const offset = startDay === 0 ? 6 : startDay - 1 // Monday-first offset
  const days = []
  for (let i = 0; i < offset; i++) {
    const d = new Date(year, month, 1 - offset + i)
    days.push({ date: d, inMonth: false })
  }
  for (let i = 1; i <= last.getDate(); i++) {
    days.push({ date: new Date(year, month, i), inMonth: true })
  }
  const remaining = 7 - (days.length % 7)
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), inMonth: false })
    }
  }
  return days
}

function calcHours(startTime, endTime) {
  return Math.max(0.5, (timeToMin(endTime) - timeToMin(startTime)) / 60)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SymIcon({ name, className = '' }) {
  return (
    <span className={`material-symbols-outlined leading-none ${className}`} aria-hidden="true">
      {name}
    </span>
  )
}

function FairnessBadge({ weight }) {
  const color = weight >= 1.5 ? 'text-rose-600 bg-rose-50' : weight >= 1.2 ? 'text-amber-600 bg-amber-50' : 'text-slate-500 bg-slate-100'
  return (
    <span className={`inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[0.55rem] font-bold ${color}`}>
      <SymIcon name="bolt" className="text-[0.6rem]" />
      {weight}×
    </span>
  )
}

function EventBlock({ event, onClick, teacherDirectory }) {
  const colors = EVENT_COLORS[event.eventType] || EVENT_COLORS.ADMIN
  const top = calcTop(event.startTime)
  const height = calcHeight(event.startTime, event.endTime)
  const statusStyle = STATUS_STYLE[event.status] || ''
  const compact = height < 44
  const assigneeName = teacherDirectory.find((t) => t.id === event.assignedTo)?.name || ''

  return (
    <button
      onClick={() => onClick(event)}
      className={`absolute inset-x-0.5 rounded-md border text-left transition-all hover:z-20 hover:shadow-md hover:-translate-y-px focus:outline-none ${colors.bg} ${colors.border} ${colors.text} ${statusStyle}`}
      style={{ top: `${top}px`, height: `${height}px`, zIndex: 10 }}
    >
      <div className="flex h-full flex-col overflow-hidden px-1.5 py-1">
        {event.status === 'PENDING_APPROVAL' && (
          <span className="mb-0.5 inline-block self-start rounded-sm bg-amber-100 px-1 py-px text-[0.48rem] font-bold uppercase tracking-widest text-amber-700">
            Pending
          </span>
        )}
        {event.status === 'SUBSTITUTED' && (
          <span className="mb-0.5 inline-block self-start rounded-sm bg-slate-200 px-1 py-px text-[0.48rem] font-bold uppercase tracking-widest text-slate-500">
            Substituted
          </span>
        )}
        <p className={`font-semibold leading-tight ${compact ? 'text-[0.6rem]' : 'text-[0.65rem]'} truncate`}>
          {event.title}
        </p>
        {!compact && (
          <>
            <p className="text-[0.55rem] opacity-75">
              {formatTime12(event.startTime)} – {formatTime12(event.endTime)}
            </p>
            {assigneeName && (
              <p className="mt-auto truncate text-[0.5rem] opacity-60">{assigneeName}</p>
            )}
          </>
        )}
      </div>
    </button>
  )
}

function TimetableOverlay({ slot, onClick }) {
  const top = calcTop(slot.startTime)
  const height = calcHeight(slot.startTime, slot.endTime)
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${slot.subject || 'Class'}${slot.className ? ` · ${slot.className}` : ''} (${slot.startTime}–${slot.endTime}) — click to schedule`}
      className="absolute inset-x-0 rounded-md border border-slate-200 bg-slate-100/50 text-left transition-colors hover:bg-indigo-50/60 hover:border-indigo-200"
      style={{ top: `${top}px`, height: `${height}px`, zIndex: 1 }}
    >
      {height > 24 && (
        <p className="truncate px-1.5 pt-1 text-[0.5rem] font-medium text-slate-400">
          {slot.subject || 'Class'}{slot.className ? ` · ${slot.className}` : ''}
        </p>
      )}
    </button>
  )
}

function MiniCalendar({ currentDate, selectedDate, onSelectDate, calendarEvents }) {
  const [viewYear, setViewYear] = useState(currentDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(currentDate.getMonth())
  const grid = getMonthGrid(viewYear, viewMonth)
  const weekStart = getWeekStart(currentDate)
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6)

  const eventDates = new Set(calendarEvents.map((e) => e.date))

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11) }
    else setViewMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0) }
    else setViewMonth((m) => m + 1)
  }

  return (
    <div className="rounded-2xl border border-white/60 bg-white/70 p-3 shadow-sm backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-700">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <div className="flex gap-1">
          <button onClick={prevMonth} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <SymIcon name="chevron_left" className="text-sm" />
          </button>
          <button onClick={nextMonth} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <SymIcon name="chevron_right" className="text-sm" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <div key={i} className="text-center text-[0.55rem] font-bold uppercase tracking-widest text-slate-400">
            {d}
          </div>
        ))}
        {grid.map(({ date, inMonth }, i) => {
          const dateStr = toISODate(date)
          const inWeek = date >= weekStart && date <= weekEnd
          const isSelected = selectedDate && isSameDay(date, selectedDate)
          const hasEvents = eventDates.has(dateStr)
          const today = isToday(date)

          return (
            <button
              key={i}
              onClick={() => onSelectDate(date)}
              className={`relative flex h-7 w-full items-center justify-center rounded-lg text-[0.65rem] font-medium transition-colors
                ${!inMonth ? 'text-slate-300' : ''}
                ${inMonth && !isSelected && !today ? 'text-slate-600 hover:bg-slate-100' : ''}
                ${today && !isSelected ? 'font-bold text-(--wfcts-primary)' : ''}
                ${isSelected ? 'bg-(--wfcts-primary) text-white shadow-sm' : ''}
                ${inWeek && !isSelected ? 'bg-(--wfcts-primary)/6' : ''}
              `}
            >
              {date.getDate()}
              {hasEvents && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-(--wfcts-secondary)" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Legend() {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/70 p-3 shadow-sm backdrop-blur">
      <p className="mb-2 text-[0.6rem] font-bold uppercase tracking-widest text-slate-400">Event Types</p>
      <div className="space-y-1.5">
        {EVENT_TYPES.map((type) => {
          const colors = EVENT_COLORS[type]
          return (
            <div key={type} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${colors.dot}`} />
                <span className="text-[0.65rem] font-medium text-slate-600">{WORK_TYPE_LABEL[type]}</span>
              </div>
              <FairnessBadge weight={FAIRNESS_WEIGHTS[type]} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Event Create/Edit Modal ──────────────────────────────────────────────────

function EventModal({ onClose, onSave, initial, prefill, teacherDirectory, managers, user, tasks }) {
  const isEdit = Boolean(initial)
  const defaultAssigned = user.role === 'TEACHER' ? user.id : ''

  const [form, setForm] = useState({
    title: initial?.title || prefill?.title || '',
    description: initial?.description || '',
    date: initial?.date || prefill?.date || toISODate(new Date()),
    startTime: initial?.startTime || prefill?.startTime || '09:00',
    endTime: initial?.endTime || prefill?.endTime || '10:00',
    eventType: initial?.eventType || prefill?.eventType || 'LECTURE',
    subject: initial?.subject || prefill?.subject || '',
    className: initial?.className || prefill?.className || '',
    location: initial?.location || prefill?.location || '',
    assignedTo: initial?.assignedTo || defaultAssigned,
    linkedTaskId: initial?.linkedTaskId || '',
    forManager: false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isTeacher = user.role === 'TEACHER'

  const handleChange = (field, value) => setForm((f) => {
    if (field === 'eventType') {
      const structured = (t) => t === 'LAB' || t === 'LECTURE'
      return { ...f, eventType: value, className: structured(value) !== structured(f.eventType) ? '' : f.className }
    }
    return { ...f, [field]: value }
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.title.trim()) return setError('Title is required')
    if (!form.date) return setError('Date is required')
    if (timeToMin(form.startTime) >= timeToMin(form.endTime)) return setError('End time must be after start time')

    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        eventType: form.eventType,
        subject: form.subject.trim(),
        className: form.className.trim(),
        location: form.location.trim(),
        assignedTo: form.forManager && form.assignedTo ? form.assignedTo : (isTeacher ? user.id : form.assignedTo),
        linkedTaskId: form.linkedTaskId || undefined,
      }
      await onSave(payload, isEdit ? initial.id : null)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save event')
    } finally {
      setSaving(false)
    }
  }

  const durationMin = timeToMin(form.endTime) - timeToMin(form.startTime)
  const hours = durationMin > 0 ? (durationMin / 60).toFixed(1) : '—'
  const fairnessImpact = durationMin > 0 ? (FAIRNESS_WEIGHTS[form.eventType] * (durationMin / 60)).toFixed(2) : '—'

  const pendingTasks = tasks.filter((t) => t.status === 'Pending' && (
    user.role !== 'TEACHER' || t.assignTo === user.id
  ))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-lg overflow-y-auto rounded-3xl border border-white/60 bg-white shadow-2xl shadow-slate-900/20"
        style={{ maxHeight: 'calc(100vh - 2rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
          <h2 className="font-headline text-lg font-extrabold tracking-tight text-slate-800">
            {isEdit ? 'Edit Event' : 'Schedule Event'}
          </h2>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <SymIcon name="close" className="text-xl" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
          )}

          {/* Title */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="e.g. Guest Lecture – AI in Healthcare"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-(--wfcts-primary) focus:outline-none focus:ring-2 focus:ring-(--wfcts-primary)/20"
            />
          </div>

          {/* Event Type */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Event Type</label>
            <div className="grid grid-cols-3 gap-2">
              {EVENT_TYPES.map((type) => {
                const colors = EVENT_COLORS[type]
                const active = form.eventType === type
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleChange('eventType', type)}
                    className={`flex flex-col items-center gap-1 rounded-xl border py-2 text-center text-[0.6rem] font-semibold transition-all
                      ${active ? `${colors.bg} ${colors.border} ${colors.text} shadow-sm` : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                  >
                    <span className={`h-2 w-2 rounded-full ${colors.dot}`} />
                    {WORK_TYPE_LABEL[type]}
                    <FairnessBadge weight={FAIRNESS_WEIGHTS[type]} />
                  </button>
                )
              })}
            </div>
          </div>

          {/* Date & Times */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => handleChange('date', e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-(--wfcts-primary) focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Start</label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => handleChange('startTime', e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-(--wfcts-primary) focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">End</label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => handleChange('endTime', e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-(--wfcts-primary) focus:outline-none"
              />
            </div>
          </div>

          {/* Fairness Impact Preview */}
          {durationMin > 0 && (
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
              <SymIcon name="bolt" className="text-amber-500 text-lg" />
              <div>
                <p className="text-xs font-semibold text-slate-700">
                  Fairness impact: <span className="text-amber-600">{fairnessImpact} pts</span>
                </p>
                <p className="text-[0.6rem] text-slate-400">
                  {hours}h × {FAIRNESS_WEIGHTS[form.eventType]}× ({form.eventType})
                </p>
              </div>
            </div>
          )}

          {/* Subject / Class / Location */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Subject</label>
              <input
                type="text"
                value={form.subject}
                onChange={(e) => handleChange('subject', e.target.value)}
                placeholder="e.g. OS"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-(--wfcts-primary) focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Room</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => handleChange('location', e.target.value)}
                placeholder="e.g. LH-3"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-(--wfcts-primary) focus:outline-none"
              />
            </div>
          </div>
          {(form.eventType === 'LAB' || form.eventType === 'LECTURE') && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                {form.eventType === 'LAB' ? 'Batch & Division' : 'Year & Division'}
              </label>
              <ClassPicker
                eventType={form.eventType}
                value={form.className}
                onChange={(val) => handleChange('className', val)}
                selectCls="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-(--wfcts-primary) focus:outline-none"
              />
            </div>
          )}

          {/* Assign To (manager view) */}
          {!isTeacher && teacherDirectory.length > 0 && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Assign To</label>
              <select
                value={form.assignedTo}
                onChange={(e) => handleChange('assignedTo', e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-(--wfcts-primary) focus:outline-none"
              >
                <option value="">Select teacher...</option>
                {teacherDirectory.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Schedule for Manager (teacher delegation) */}
          {isTeacher && managers.length > 0 && (
            <div className="rounded-xl border border-slate-200 p-3">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.forManager}
                  onChange={(e) => handleChange('forManager', e.target.checked)}
                  className="h-4 w-4 rounded accent-(--wfcts-primary)"
                />
                <span className="text-xs font-semibold text-slate-600">Schedule on behalf of manager</span>
              </label>
              {form.forManager && (
                <div className="mt-2">
                  <select
                    value={form.assignedTo}
                    onChange={(e) => handleChange('assignedTo', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-(--wfcts-primary) focus:outline-none"
                  >
                    <option value="">Select manager...</option>
                    {managers.map((m) => (
                      <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-[0.6rem] text-amber-600">
                    The manager will need to approve this event before it appears as scheduled.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Link to Task */}
          {pendingTasks.length > 0 && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Link to Task <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <select
                value={form.linkedTaskId}
                onChange={(e) => handleChange('linkedTaskId', e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-(--wfcts-primary) focus:outline-none"
              >
                <option value="">None</option>
                {pendingTasks.map((t) => (
                  <option key={t.id} value={t.id}>{t.title} (due {t.deadline})</option>
                ))}
              </select>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Notes <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={2}
              placeholder="Any additional context..."
              className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-(--wfcts-primary) focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-(--wfcts-primary) py-3 text-sm font-bold text-white shadow-lg shadow-(--wfcts-primary)/20 transition-all hover:-translate-y-px hover:shadow-xl disabled:opacity-60"
          >
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Schedule Event'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Event Detail Drawer ──────────────────────────────────────────────────────

function EventDrawer({ event, onClose, teacherDirectory, user, onComplete, onApprove, onReject, onCancel, onSubstitute, onEdit, fetchSubSuggestions }) {
  const [showSubModal, setShowSubModal] = useState(false)
  const [subTeacherId, setSubTeacherId] = useState('')
  const [acting, setActing] = useState('')
  const [actionError, setActionError] = useState('')
  const [subSuggestions, setSubSuggestions] = useState([])
  const [subLoading, setSubLoading] = useState(false)

  useEffect(() => {
    if (!showSubModal || !fetchSubSuggestions) return
    setSubLoading(true)
    setSubSuggestions([])
    fetchSubSuggestions({
      dayOfWeek: dayOfWeekFromDateStr(event.date),
      startTime: event.startTime,
      endTime: event.endTime,
      referenceTeacherId: event.assignedTo,
      excludeTeacherId: event.assignedTo,
      ...(event.className ? { className: event.className } : {}),
    }).then(setSubSuggestions).catch(() => {}).finally(() => setSubLoading(false))
  }, [showSubModal, event.date, event.startTime, event.endTime, event.assignedTo, event.className, fetchSubSuggestions])

  const colors = EVENT_COLORS[event.eventType] || EVENT_COLORS.ADMIN
  const assigneeName = teacherDirectory.find((t) => t.id === event.assignedTo)?.name || event.assignedTo
  const isManager = user.role === 'ADMIN' || user.role === 'HOD'
  const isAssignee = user.id === event.assignedTo
  const isCreator = user.id === event.createdBy
  const canEdit = ['SCHEDULED', 'PENDING_APPROVAL'].includes(event.status) && (isAssignee || isCreator || isManager)
  const canComplete = event.status === 'SCHEDULED' && (isAssignee || isManager)
  const canApprove = event.status === 'PENDING_APPROVAL' && isManager
  const canSubstitute = event.status === 'SCHEDULED' && (isAssignee || isManager)
  const canCancel = !['COMPLETED', 'CANCELLED'].includes(event.status) && (isAssignee || isCreator || isManager)

  const act = async (label, fn) => {
    setActing(label)
    setActionError('')
    try { await fn() } catch (e) { setActionError(e.message || 'Action failed') }
    finally { setActing('') }
  }

  const handleSubstitute = async () => {
    if (!subTeacherId) return setActionError('Select a substitute teacher')
    await act('sub', async () => {
      await onSubstitute(event.id, subTeacherId)
      onClose()
    })
  }

  const hoursVal = calcHours(event.startTime, event.endTime)
  const fairnessVal = (FAIRNESS_WEIGHTS[event.eventType] * hoursVal).toFixed(2)
  const statusColor = {
    SCHEDULED: 'text-emerald-600 bg-emerald-50', PENDING_APPROVAL: 'text-amber-600 bg-amber-50',
    COMPLETED: 'text-slate-500 bg-slate-100', CANCELLED: 'text-red-500 bg-red-50',
    SUBSTITUTED: 'text-slate-400 bg-slate-100',
  }[event.status]

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-md overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-white/60 bg-white shadow-2xl shadow-slate-900/20"
        style={{ maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Colored top strip */}
        <div className={`h-1.5 w-full rounded-t-3xl ${colors.dot}`} />

        <div className="p-5">
          {/* Header */}
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider ${colors.badge}`}>
                  {WORK_TYPE_LABEL[event.eventType]}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider ${statusColor}`}>
                  {STATUS_LABELS[event.status]}
                </span>
              </div>
              <h3 className="mt-1 font-headline text-base font-extrabold tracking-tight text-slate-800">
                {event.title}
              </h3>
            </div>
            <button onClick={onClose} className="shrink-0 rounded-xl p-1.5 text-slate-400 hover:bg-slate-100">
              <SymIcon name="close" className="text-lg" />
            </button>
          </div>

          {/* Details grid */}
          <div className="mb-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[0.55rem] font-bold uppercase tracking-widest text-slate-400">Date</p>
              <p className="text-sm font-semibold text-slate-700">{event.date}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[0.55rem] font-bold uppercase tracking-widest text-slate-400">Time</p>
              <p className="text-sm font-semibold text-slate-700">
                {formatTime12(event.startTime)} – {formatTime12(event.endTime)}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[0.55rem] font-bold uppercase tracking-widest text-slate-400">Assigned To</p>
              <p className="text-sm font-semibold text-slate-700">{assigneeName}</p>
            </div>
            <div className={`rounded-xl p-3 ${FAIRNESS_WEIGHTS[event.eventType] >= 1.5 ? 'bg-rose-50' : FAIRNESS_WEIGHTS[event.eventType] >= 1.2 ? 'bg-amber-50' : 'bg-slate-50'}`}>
              <p className="text-[0.55rem] font-bold uppercase tracking-widest text-slate-400">Fairness Impact</p>
              <div className="flex items-center gap-1.5">
                <SymIcon name="bolt" className="text-sm text-amber-500" />
                <p className="text-sm font-bold text-slate-700">{fairnessVal} pts</p>
                <FairnessBadge weight={FAIRNESS_WEIGHTS[event.eventType]} />
              </div>
            </div>
            {event.subject && (
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[0.55rem] font-bold uppercase tracking-widest text-slate-400">Subject</p>
                <p className="text-sm font-semibold text-slate-700">{event.subject}</p>
              </div>
            )}
            {event.className && (
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[0.55rem] font-bold uppercase tracking-widest text-slate-400">Class</p>
                <p className="text-sm font-semibold text-slate-700">{event.className}</p>
              </div>
            )}
            {event.location && (
              <div className="col-span-2 rounded-xl bg-slate-50 p-3">
                <p className="text-[0.55rem] font-bold uppercase tracking-widest text-slate-400">Location</p>
                <p className="text-sm font-semibold text-slate-700">{event.location}</p>
              </div>
            )}
          </div>

          {/* Linkage badges */}
          <div className="mb-4 flex flex-wrap gap-2">
            {event.linkedWorkEntryId && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[0.6rem] font-semibold text-emerald-700">
                <SymIcon name="check_circle" className="text-xs" /> Work entry logged
              </span>
            )}
            {event.linkedSubstituteEntryId && (
              <span className="flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[0.6rem] font-semibold text-rose-700">
                <SymIcon name="swap_horiz" className="text-xs" /> Substitute record created
              </span>
            )}
            {event.linkedTaskId && (
              <span className="flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-[0.6rem] font-semibold text-purple-700">
                <SymIcon name="task" className="text-xs" /> Linked to task
              </span>
            )}
            {event.originalEventId && (
              <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[0.6rem] font-semibold text-slate-600">
                <SymIcon name="replace" className="text-xs" /> Sub cover event
              </span>
            )}
            {event.status === 'PENDING_APPROVAL' && (
              <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[0.6rem] font-semibold text-amber-700">
                <SymIcon name="pending" className="text-xs" /> Awaiting manager approval
              </span>
            )}
          </div>

          {event.description && (
            <p className="mb-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">{event.description}</p>
          )}

          {actionError && (
            <div className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{actionError}</div>
          )}

          {/* Substitute picker */}
          {showSubModal && (
            <div className="mb-4 rounded-2xl border border-slate-200 p-4 space-y-3">
              <p className="text-xs font-bold text-slate-700">Available Substitutes</p>
              <p className="text-[0.65rem] text-slate-500">Ranked by fairness: teachers who owe a sub first, then by workload.</p>

              {subLoading ? (
                <p className="text-xs text-slate-400 py-2">Finding available teachers...</p>
              ) : subSuggestions.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">No free teachers found for this slot. Try checking the Substitutions page for manual selection.</p>
              ) : (
                <div className="space-y-1.5 max-h-52 overflow-y-auto">
                  {subSuggestions.map((teacher) => {
                    const tierMeta = teacher.tier === 0
                      ? { label: 'Owes Sub', cls: 'bg-orange-100 text-orange-700' }
                      : teacher.tier === 2
                        ? { label: 'Has Credits', cls: 'bg-blue-100 text-blue-700' }
                        : { label: 'Balanced', cls: 'bg-slate-100 text-slate-500' }
                    const isSelected = subTeacherId === teacher.id
                    return (
                      <button
                        key={teacher.id}
                        type="button"
                        onClick={() => setSubTeacherId(teacher.id)}
                        className={`w-full flex items-center justify-between rounded-xl border-2 px-3 py-2 text-left transition-all ${isSelected ? 'border-(--wfcts-primary) bg-(--wfcts-primary)/5' : 'border-slate-100 bg-slate-50 hover:border-slate-300'}`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${isSelected ? 'bg-(--wfcts-primary) text-white' : 'bg-white text-slate-500 shadow-sm'}`}>
                            {initials(teacher.name)}
                          </div>
                          <span className={`text-sm font-semibold ${isSelected ? 'text-(--wfcts-primary)' : 'text-slate-700'}`}>{teacher.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {teacher.classMatch && (
                            <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[0.55rem] font-bold text-indigo-700">Same Class</span>
                          )}
                          <span className={`rounded-full px-1.5 py-0.5 text-[0.55rem] font-bold ${tierMeta.cls}`}>{tierMeta.label}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {subTeacherId && (
                <div className="rounded-xl bg-amber-50 px-3 py-2 text-[0.65rem] text-amber-700">
                  {teacherDirectory.find((t) => t.id === subTeacherId)?.name} earns +1 credit · {assigneeName} incurs a substitution debt. Settlement engine updated automatically.
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowSubModal(false); setSubTeacherId('') }}
                  className="flex-1 rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubstitute}
                  disabled={acting === 'sub' || !subTeacherId}
                  className="flex-1 rounded-xl bg-rose-500 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-600 disabled:opacity-60"
                >
                  {acting === 'sub' ? 'Processing...' : 'Confirm Substitution'}
                </button>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {canEdit && (
              <button
                onClick={() => onEdit(event)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                <SymIcon name="edit" className="text-sm" /> Edit
              </button>
            )}
            {canApprove && (
              <>
                <button
                  onClick={() => act('approve', () => { onApprove(event.id); onClose() })}
                  disabled={acting === 'approve'}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-600 disabled:opacity-60"
                >
                  <SymIcon name="check_circle" className="text-sm" />
                  {acting === 'approve' ? '...' : 'Approve'}
                </button>
                <button
                  onClick={() => act('reject', () => { onReject(event.id); onClose() })}
                  disabled={acting === 'reject'}
                  className="flex items-center gap-1.5 rounded-xl bg-rose-500 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-600 disabled:opacity-60"
                >
                  <SymIcon name="cancel" className="text-sm" />
                  {acting === 'reject' ? '...' : 'Reject'}
                </button>
              </>
            )}
            {canComplete && (
              <button
                onClick={() => act('complete', () => { onComplete(event.id); onClose() })}
                disabled={acting === 'complete'}
                className="flex items-center gap-1.5 rounded-xl bg-(--wfcts-primary) px-3 py-2 text-xs font-bold text-white shadow-sm hover:opacity-90 disabled:opacity-60"
              >
                <SymIcon name="task_alt" className="text-sm" />
                {acting === 'complete' ? 'Logging...' : 'Mark Complete'}
              </button>
            )}
            {canSubstitute && !showSubModal && (
              <button
                onClick={() => setShowSubModal(true)}
                className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
              >
                <SymIcon name="swap_horiz" className="text-sm" /> Request Sub
              </button>
            )}
            {canCancel && (
              <button
                onClick={() => act('cancel', () => { onCancel(event.id); onClose() })}
                disabled={acting === 'cancel'}
                className="ml-auto flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-400 hover:border-red-200 hover:text-red-500 disabled:opacity-60"
              >
                <SymIcon name="delete" className="text-sm" />
                {acting === 'cancel' ? '...' : 'Cancel'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Calendar Page ───────────────────────────────────────────────────────

export default function Calendar() {
  const { user, token } = useAuth()
  const {
    calendarEvents, fetchCalendarEvents,
    addCalendarEvent, updateCalendarEvent,
    approveCalendarEvent, rejectCalendarEvent,
    completeCalendarEvent, substituteCalendarEvent,
    cancelCalendarEvent,
    teacherDirectory, timetableSlots, tasks,
    academicEvents, fetchAcademicEvents,
  } = useWFCTS()

  const isManager = user?.role === 'ADMIN' || user?.role === 'HOD'

  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [managers, setManagers] = useState([])
  // admin/HOD: which teacher's calendar to view ('' = own)
  const [viewingUserId, setViewingUserId] = useState('')
  const [viewingEvents, setViewingEvents] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState('')
  const [slotPrefill, setSlotPrefill] = useState(null)
  const gridRef = useRef(null)

  const fetchSubSuggestions = useCallback(async (params) => {
    const result = await getSubstituteSuggestionsRequest(token, params)
    return result.suggestions || []
  }, [token])

  const handleExport = async () => {
    setIsExporting(true)
    try {
      await exportMonthlyRequest(token, {
        year: currentDate.getFullYear(),
        month: currentDate.getMonth() + 1,
        format: 'xlsx',
      })
    } catch (e) {
      setError(e.message || 'Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  const weekStart = getWeekStart(currentDate)
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6)
  const weekDays = getWeekDays(weekStart)

  // Fetch events for current week + adjacent (for mini calendar dots)
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()
  const fetchRange = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      // Fetch a wider range for the mini calendar dot indicators (current month ±1)
      const rangeStart = new Date(currentYear, currentMonth - 1, 1)
      const rangeEnd = new Date(currentYear, currentMonth + 2, 0)
      await fetchCalendarEvents({
        startDate: toISODate(rangeStart),
        endDate: toISODate(rangeEnd),
      })
    } catch (e) {
      setError(e.message || 'Failed to load events')
    } finally {
      setIsLoading(false)
    }
  }, [fetchCalendarEvents, currentYear, currentMonth])

  useEffect(() => { fetchRange() }, [fetchRange])

  // Fetch managers for delegation
  useEffect(() => {
    getManagersRequest(token).then((r) => setManagers(r.managers || [])).catch(() => {})
  }, [token])

  // Fetch academic events once on mount
  useEffect(() => { fetchAcademicEvents().catch(() => {}) }, [fetchAcademicEvents])

  // Fetch selected teacher's calendar when viewingUserId changes
  useEffect(() => {
    if (!isManager || !viewingUserId) { setViewingEvents([]); return }
    const rangeStart = new Date(currentYear, currentMonth - 1, 1)
    const rangeEnd = new Date(currentYear, currentMonth + 2, 0)
    getUserCalendarEventsRequest(token, viewingUserId, {
      startDate: toISODate(rangeStart),
      endDate: toISODate(rangeEnd),
    }).then((r) => setViewingEvents(r.events || [])).catch(() => {})
  }, [viewingUserId, isManager, token, currentYear, currentMonth])

  // Scroll to 8am on mount
  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.scrollTop = (8 - GRID_START) * HOUR_HEIGHT
    }
  }, [])

  const prevWeek = () => { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d) }
  const nextWeek = () => { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d) }
  const goToday = () => setCurrentDate(new Date())

  const handleSelectDate = (date) => {
    setSelectedDate(date)
    setCurrentDate(date)
  }

  // Filter events for the current week view
  const weekStartStr = toISODate(weekStart)
  const weekEndStr = toISODate(weekEnd)
  const activeEvents = (isManager && viewingUserId) ? viewingEvents : calendarEvents
  const weekEvents = activeEvents.filter((e) => e.date >= weekStartStr && e.date <= weekEndStr)

  const getEventsForDay = (date) => {
    const dateStr = toISODate(date)
    return weekEvents.filter((e) => e.date === dateStr)
  }

  const getAcademicEventsForDay = (date) => {
    const dateStr = toISODate(date)
    return academicEvents.filter((e) => {
      if (!e.date) return false
      if (e.endDate && e.endDate !== e.date) return dateStr >= e.date && dateStr <= e.endDate
      return e.date === dateStr
    })
  }

  const ACADEMIC_TYPE_STYLE = {
    HOLIDAY: 'bg-emerald-100 text-emerald-700',
    EXAM:    'bg-rose-100 text-rose-700',
    EVENT:   'bg-blue-100 text-blue-700',
    BREAK:   'bg-amber-100 text-amber-700',
  }

  const getTimetableSlotsForDay = (date) => {
    const dow = date.getDay() // 0=Sun, 1=Mon ...
    return timetableSlots.filter((s) => {
      const slotDow = Number(s.dayOfWeek)
      // Managers see all slots; teachers see only their own
      return slotDow === dow
    })
  }

  const handleSaveEvent = async (payload, editId) => {
    if (editId) {
      await updateCalendarEvent(editId, payload)
    } else {
      await addCalendarEvent(payload)
    }
  }

  const weekLabel = (() => {
    const startLabel = `${DAY_NAMES_FULL[weekDays[0].getDay()]} ${weekDays[0].getDate()} ${MONTH_NAMES[weekDays[0].getMonth()]}`
    const endLabel = weekDays[6].getMonth() === weekDays[0].getMonth()
      ? `${weekDays[6].getDate()}`
      : `${weekDays[6].getDate()} ${MONTH_NAMES[weekDays[6].getMonth()]}`
    return `${startLabel} – ${endLabel} ${weekDays[6].getFullYear()}`
  })()

  const pendingApprovalCount = calendarEvents.filter(
    (e) => e.status === 'PENDING_APPROVAL' && (user.role === 'ADMIN' || user.role === 'HOD'),
  ).length

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-label text-[0.62rem] font-bold uppercase tracking-[0.28em] text-(--wfcts-muted)">
            Work Scheduling Engine
          </p>
          <h1 className="font-headline text-2xl font-extrabold tracking-[-0.04em] text-slate-800 sm:text-3xl">
            Calendar
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {pendingApprovalCount > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-700">
              <SymIcon name="pending" className="text-sm" />
              {pendingApprovalCount} pending approval
            </span>
          )}
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <SymIcon name={isExporting ? 'progress_activity' : 'download'} className={`text-base ${isExporting ? 'animate-spin' : ''}`} />
            Export
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 rounded-xl bg-(--wfcts-primary) px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-(--wfcts-primary)/20 transition-all hover:-translate-y-0.5"
          >
            <SymIcon name="add" className="text-base" />
            Schedule Event
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      {/* Main layout: sidebar + week grid */}
      <div className="flex gap-4 flex-1 overflow-hidden">
        {/* Sidebar — desktop only */}
        <div className="hidden w-52 shrink-0 flex-col gap-3 lg:flex">
          <MiniCalendar
            currentDate={currentDate}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            calendarEvents={calendarEvents}
          />
          <Legend />
        </div>

        {/* Week Grid */}
        <div className="flex min-w-0 flex-1 flex-col rounded-3xl border border-white/60 bg-white/80 shadow-sm backdrop-blur overflow-hidden">
          {/* Week nav */}
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
            <button onClick={prevWeek} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <SymIcon name="chevron_left" className="text-xl" />
            </button>
            <button onClick={nextWeek} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <SymIcon name="chevron_right" className="text-xl" />
            </button>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700">{weekLabel}</span>
            {isManager && (
              <select
                value={viewingUserId}
                onChange={(e) => setViewingUserId(e.target.value)}
                className="rounded-xl border border-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-700 focus:border-(--wfcts-primary) focus:outline-none max-w-40"
              >
                <option value="">My Calendar</option>
                {teacherDirectory.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            )}
            <button
              onClick={goToday}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Today
            </button>
            {isLoading && (
              <span className="text-xs text-slate-400">Loading...</span>
            )}
          </div>

          {/* Day headers */}
          <div className="grid border-b border-slate-100" style={{ gridTemplateColumns: '44px repeat(7, 1fr)' }}>
            <div className="border-r border-slate-100" />
            {weekDays.map((day, i) => {
              const today = isToday(day)
              const hasEvents = getEventsForDay(day).length > 0
              const acEvents = getAcademicEventsForDay(day)
              return (
                <div
                  key={i}
                  className={`border-r border-slate-100 px-1 py-2 text-center last:border-r-0 ${today ? 'bg-(--wfcts-primary)/5' : ''}`}
                >
                  <p className={`text-[0.55rem] font-bold uppercase tracking-widest ${today ? 'text-(--wfcts-primary)' : 'text-slate-400'}`}>
                    {DAY_NAMES[day.getDay()]}
                  </p>
                  <div className={`mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold
                    ${today ? 'bg-(--wfcts-primary) text-white' : 'text-slate-700'}`}>
                    {day.getDate()}
                  </div>
                  {hasEvents && (
                    <div className="mx-auto mt-0.5 h-1 w-1 rounded-full bg-(--wfcts-secondary)" />
                  )}
                  {acEvents.map((ae) => (
                    <div key={ae.id} className={`mt-0.5 truncate rounded px-1 py-px text-[0.45rem] font-bold leading-tight ${ACADEMIC_TYPE_STYLE[ae.type] || 'bg-slate-100 text-slate-600'}`}>
                      {ae.title}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>

          {/* Time grid (scrollable) */}
          <div ref={gridRef} className="flex-1 overflow-y-auto overflow-x-hidden">
            <div
              className="relative grid"
              style={{ gridTemplateColumns: '44px repeat(7, 1fr)', height: `${TOTAL_HEIGHT}px` }}
            >
              {/* Time axis */}
              <div className="relative border-r border-slate-100">
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="absolute right-2 flex items-center"
                    style={{ top: `${(hour - GRID_START) * HOUR_HEIGHT - 8}px` }}
                  >
                    <span className="text-[0.55rem] font-medium text-slate-300 tabular-nums">
                      {hour.toString().padStart(2, '0')}:00
                    </span>
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {weekDays.map((day, di) => {
                const today = isToday(day)
                const dayEvents = getEventsForDay(day)
                const daySlots = getTimetableSlotsForDay(day)
                const nowMin = new Date().getHours() * 60 + new Date().getMinutes()
                const nowTop = today ? (nowMin - GRID_START * 60) * (HOUR_HEIGHT / 60) : null

                return (
                  <div
                    key={di}
                    className={`relative border-r border-slate-100 last:border-r-0 ${today ? 'bg-(--wfcts-primary)/[0.02]' : ''}`}
                  >
                    {/* Hour lines */}
                    {HOURS.map((hour) => (
                      <div
                        key={hour}
                        className="absolute inset-x-0 border-t border-slate-100/80"
                        style={{ top: `${(hour - GRID_START) * HOUR_HEIGHT}px` }}
                      />
                    ))}

                    {/* Half-hour lines */}
                    {HOURS.slice(0, -1).map((hour) => (
                      <div
                        key={`${hour}.5`}
                        className="absolute inset-x-0 border-t border-slate-50"
                        style={{ top: `${(hour - GRID_START) * HOUR_HEIGHT + HOUR_HEIGHT / 2}px` }}
                      />
                    ))}

                    {/* Current time indicator */}
                    {today && nowTop !== null && nowTop >= 0 && nowTop <= TOTAL_HEIGHT && (
                      <div
                        className="pointer-events-none absolute inset-x-0 z-30"
                        style={{ top: `${nowTop}px` }}
                      >
                        <div className="h-0.5 w-full bg-rose-500/60" />
                        <div className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-rose-500" />
                      </div>
                    )}

                    {/* Timetable slots overlay */}
                    {daySlots.map((slot) => (
                      <TimetableOverlay
                        key={slot.id}
                        slot={slot}
                        onClick={() => {
                          setSlotPrefill({
                            title: slot.subject || 'Class',
                            date: toISODate(day),
                            startTime: slot.startTime,
                            endTime: slot.endTime,
                            eventType: slot.eventType || 'LECTURE',
                            subject: slot.subject || '',
                            className: slot.className || '',
                            location: slot.location || '',
                          })
                          setShowCreateModal(true)
                        }}
                      />
                    ))}

                    {/* Calendar events */}
                    {dayEvents.map((event) => (
                      <EventBlock
                        key={event.id}
                        event={event}
                        onClick={setSelectedEvent}
                        teacherDirectory={teacherDirectory}
                      />
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile legend (below grid) */}
      <div className="flex flex-wrap gap-2 lg:hidden">
        {EVENT_TYPES.map((type) => {
          const colors = EVENT_COLORS[type]
          return (
            <div key={type} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${colors.dot}`} />
              <span className="text-[0.6rem] font-medium text-slate-500">{WORK_TYPE_LABEL[type]}</span>
              <FairnessBadge weight={FAIRNESS_WEIGHTS[type]} />
            </div>
          )
        })}
      </div>

      {/* Modals */}
      {(showCreateModal || editingEvent) && (
        <EventModal
          onClose={() => { setShowCreateModal(false); setEditingEvent(null); setSlotPrefill(null) }}
          onSave={handleSaveEvent}
          initial={editingEvent}
          prefill={slotPrefill}
          teacherDirectory={teacherDirectory}
          managers={managers}
          user={user}
          tasks={tasks}
        />
      )}

      {selectedEvent && (
        <EventDrawer
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          teacherDirectory={teacherDirectory}
          user={user}
          onComplete={completeCalendarEvent}
          onApprove={approveCalendarEvent}
          onReject={rejectCalendarEvent}
          onCancel={cancelCalendarEvent}
          onSubstitute={substituteCalendarEvent}
          onEdit={(evt) => { setSelectedEvent(null); setEditingEvent(evt) }}
          fetchSubSuggestions={fetchSubSuggestions}
        />
      )}
    </div>
  )
}

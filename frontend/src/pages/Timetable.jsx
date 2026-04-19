import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useWFCTS } from '../context/WFCTSContext'

const dayOptions = [
  { value: 1, short: 'Mon', label: 'Monday' },
  { value: 2, short: 'Tue', label: 'Tuesday' },
  { value: 3, short: 'Wed', label: 'Wednesday' },
  { value: 4, short: 'Thu', label: 'Thursday' },
  { value: 5, short: 'Fri', label: 'Friday' },
  { value: 6, short: 'Sat', label: 'Saturday' },
  { value: 0, short: 'Sun', label: 'Sunday' },
]

function currentSelectedDay() {
  const currentDay = new Date().getDay()
  return dayOptions.some((day) => day.value === currentDay) ? currentDay : 1
}

function formatTime(value) {
  if (!value || !value.includes(':')) return value || ''
  const [hoursText, minutes] = value.split(':')
  const hours = Number(hoursText)
  if (Number.isNaN(hours)) return value
  const suffix = hours >= 12 ? 'PM' : 'AM'
  const displayHours = ((hours + 11) % 12) + 1
  return `${displayHours}:${minutes} ${suffix}`
}

function dayLabel(dayOfWeek) {
  return dayOptions.find((day) => day.value === dayOfWeek)?.label || 'Unknown'
}

export default function Timetable() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    teacherDirectory,
    timetableSlots,
    addTimetableSlot,
    updateTimetableSlot,
    deleteTimetableSlot,
  } = useWFCTS()

  const isManager = user?.role === 'ADMIN' || user?.role === 'HOD'
  const [selectedDay, setSelectedDay] = useState(currentSelectedDay)
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [form, setForm] = useState({
    teacherId: isManager ? '' : user?.id || '',
    dayOfWeek: currentSelectedDay(),
    startTime: '09:00',
    endTime: '10:00',
    subject: '',
    className: '',
    location: '',
  })
  const [editingSlotId, setEditingSlotId] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const teacherNameById = useMemo(
    () => new Map(teacherDirectory.map((teacher) => [teacher.id, teacher.name])),
    [teacherDirectory],
  )

  const visibleSlots = useMemo(() => {
    const slots = isManager
      ? timetableSlots
      : timetableSlots.filter((slot) => slot.teacherId === user?.id)

    return [...slots].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime))
  }, [isManager, timetableSlots, user?.id])

  const selectedDaySlots = useMemo(
    () => visibleSlots.filter((slot) => slot.dayOfWeek === selectedDay),
    [selectedDay, visibleSlots],
  )

  const nextSession = selectedDaySlots[0] || visibleSlots[0]

  function resetForm(nextDay = selectedDay) {
    setForm({
      teacherId: isManager ? '' : user?.id || '',
      dayOfWeek: nextDay,
      startTime: '09:00',
      endTime: '10:00',
      subject: '',
      className: '',
      location: '',
    })
    setEditingSlotId('')
    setError('')
  }

  function openComposer() {
    resetForm(selectedDay)
    setIsComposerOpen(true)
  }

  function onEdit(slot) {
    setSelectedDay(slot.dayOfWeek)
    setForm({
      teacherId: slot.teacherId,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      subject: slot.subject || '',
      className: slot.className || '',
      location: slot.location || '',
    })
    setEditingSlotId(slot.id)
    setError('')
    setIsComposerOpen(true)
  }

  async function onSubmit(event) {
    event.preventDefault()
    setError('')

    if (!form.startTime || !form.endTime) {
      setError('Start time and end time are required.')
      return
    }

    if (isManager && !form.teacherId) {
      setError('Please select a teacher.')
      return
    }

    const payload = {
      teacherId: form.teacherId || undefined,
      dayOfWeek: Number(form.dayOfWeek),
      startTime: form.startTime,
      endTime: form.endTime,
      subject: form.subject,
      className: form.className,
      location: form.location,
    }

    setIsSubmitting(true)

    try {
      if (editingSlotId) {
        await updateTimetableSlot(editingSlotId, payload)
      } else {
        await addTimetableSlot(payload)
      }
      setSelectedDay(Number(form.dayOfWeek))
      setIsComposerOpen(false)
      resetForm(Number(form.dayOfWeek))
    } catch (submitError) {
      setError(submitError.message || 'Unable to save timetable slot.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function onDelete(slotId) {
    try {
      await deleteTimetableSlot(slotId)
      if (editingSlotId === slotId) {
        setIsComposerOpen(false)
        resetForm(selectedDay)
      }
    } catch (deleteError) {
      setError(deleteError.message || 'Unable to delete timetable slot.')
    }
  }

  return (
    <div className="space-y-8 animate-float-in">
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-label text-sm font-semibold uppercase tracking-[0.22em] text-(--wfcts-primary)">
            Academic Staff Portal
          </p>
          <h2 className="font-headline mt-2 text-4xl font-extrabold tracking-[-0.06em] text-(--wfcts-primary) sm:text-5xl">
            Timetable
          </h2>
          <p className="mt-3 text-sm text-(--wfcts-muted) sm:text-base">
            Manage recurring teaching slots, departments, and coverage windows across the week.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/timetable-upload')}
          className="flex items-center gap-2 rounded-xl border border-(--wfcts-primary)/20 bg-(--wfcts-primary)/6 px-4 py-2.5 text-sm font-bold text-(--wfcts-primary) hover:bg-(--wfcts-primary)/10 transition-colors"
        >
          <span className="material-symbols-outlined text-base">document_scanner</span>
          Upload Timetable
        </button>
      </section>

      <section className="hide-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {dayOptions.map((day) => (
          <button
            key={day.value}
            type="button"
            onClick={() => {
              setSelectedDay(day.value)
              if (!editingSlotId) {
                setForm((prev) => ({ ...prev, dayOfWeek: day.value }))
              }
            }}
            className={`shrink-0 rounded-[1rem] px-5 py-3 font-headline text-sm font-bold transition-all ${
              selectedDay === day.value
                ? 'bg-[var(--wfcts-primary)] text-white shadow-lg shadow-[var(--wfcts-primary)]/15'
                : 'bg-[var(--wfcts-surface-muted)] text-[var(--wfcts-muted)] hover:bg-slate-200/70'
            }`}
          >
            {day.short}
          </button>
        ))}
      </section>

      <section className="flex justify-end">
        <button
          type="button"
          onClick={openComposer}
          className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-gradient-to-br from-[var(--wfcts-secondary)] to-[#0f766e] text-white shadow-[0_18px_32px_rgba(13,148,136,0.28)] transition-transform active:scale-90"
          aria-label="Add timetable slot"
        >
          <span className="material-symbols-outlined text-[1.8rem]">add</span>
        </button>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-6">
          {nextSession && (
            <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[var(--wfcts-primary)] to-[#284bb0] p-7 text-white shadow-[0_24px_60px_rgba(30,58,138,0.22)]">
              <div className="absolute right-[-15%] top-[-20%] h-52 w-52 rounded-full bg-white/6 blur-3xl" />
              <div className="relative z-10">
                <div className="mb-6 flex items-center justify-between">
                  <span className="text-[0.68rem] font-bold uppercase tracking-[0.24em] opacity-80">Next Session</span>
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                    bolt
                  </span>
                </div>

                <h3 className="font-headline text-3xl font-extrabold tracking-[-0.05em]">
                  {nextSession.subject || 'Teaching Slot'}
                </h3>
                <p className="mt-2 text-sm text-blue-100">
                  {nextSession.className || 'Scheduled class'}{nextSession.location ? ` • ${nextSession.location}` : ''}
                </p>

                <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                  <div>
                    <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-white/60">Timeline</p>
                    <p className="font-headline mt-1 text-lg font-bold">
                      {formatTime(nextSession.startTime)} - {formatTime(nextSession.endTime)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-white/60">Day</p>
                    <p className="font-headline mt-1 text-lg font-bold">{dayLabel(nextSession.dayOfWeek)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isComposerOpen && (
            <div className="wfcts-card p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-label text-[0.66rem] font-bold uppercase tracking-[0.2em] text-[var(--wfcts-muted)]">
                    Weekly Slot
                  </p>
                  <h3 className="font-headline text-2xl font-bold text-[var(--wfcts-primary)]">
                    {editingSlotId ? 'Edit Slot' : 'Add Slot'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsComposerOpen(false)
                    resetForm(selectedDay)
                  }}
                  className="self-start rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600"
                >
                  Close
                </button>
              </div>

              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {isManager && (
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-semibold text-slate-700">Teacher</span>
                      <select
                        value={form.teacherId}
                        onChange={(event) => setForm((prev) => ({ ...prev, teacherId: event.target.value }))}
                        className="w-full rounded-[1rem] border border-slate-200 bg-[var(--wfcts-surface-muted)] px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[var(--wfcts-primary)]/20 focus:bg-white focus:ring-2 focus:ring-[var(--wfcts-primary)]/10"
                      >
                        <option value="">Select teacher</option>
                        {teacherDirectory.map((teacher) => (
                          <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                        ))}
                      </select>
                    </label>
                  )}

                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-700">Day</span>
                    <select
                      value={form.dayOfWeek}
                      onChange={(event) => setForm((prev) => ({ ...prev, dayOfWeek: Number(event.target.value) }))}
                      className="w-full rounded-[1rem] border border-slate-200 bg-[var(--wfcts-surface-muted)] px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[var(--wfcts-primary)]/20 focus:bg-white focus:ring-2 focus:ring-[var(--wfcts-primary)]/10"
                    >
                      {dayOptions.map((day) => (
                        <option key={day.value} value={day.value}>{day.label}</option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-700">Subject</span>
                    <input
                      type="text"
                      value={form.subject}
                      onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))}
                      placeholder="Subject"
                      className="w-full rounded-[1rem] border border-slate-200 bg-[var(--wfcts-surface-muted)] px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[var(--wfcts-primary)]/20 focus:bg-white focus:ring-2 focus:ring-[var(--wfcts-primary)]/10"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-700">Start Time</span>
                    <input
                      type="time"
                      value={form.startTime}
                      onChange={(event) => setForm((prev) => ({ ...prev, startTime: event.target.value }))}
                      className="w-full rounded-[1rem] border border-slate-200 bg-[var(--wfcts-surface-muted)] px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[var(--wfcts-primary)]/20 focus:bg-white focus:ring-2 focus:ring-[var(--wfcts-primary)]/10"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-700">End Time</span>
                    <input
                      type="time"
                      value={form.endTime}
                      onChange={(event) => setForm((prev) => ({ ...prev, endTime: event.target.value }))}
                      className="w-full rounded-[1rem] border border-slate-200 bg-[var(--wfcts-surface-muted)] px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[var(--wfcts-primary)]/20 focus:bg-white focus:ring-2 focus:ring-[var(--wfcts-primary)]/10"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-700">Class / Section</span>
                    <input
                      type="text"
                      value={form.className}
                      onChange={(event) => setForm((prev) => ({ ...prev, className: event.target.value }))}
                      placeholder="Class / Division"
                      className="w-full rounded-[1rem] border border-slate-200 bg-[var(--wfcts-surface-muted)] px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[var(--wfcts-primary)]/20 focus:bg-white focus:ring-2 focus:ring-[var(--wfcts-primary)]/10"
                    />
                  </label>

                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-semibold text-slate-700">Location</span>
                    <input
                      type="text"
                      value={form.location}
                      onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
                      placeholder="Location"
                      className="w-full rounded-[1rem] border border-slate-200 bg-[var(--wfcts-surface-muted)] px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[var(--wfcts-primary)]/20 focus:bg-white focus:ring-2 focus:ring-[var(--wfcts-primary)]/10"
                    />
                  </label>
                </div>

                {error && (
                  <div className="rounded-[1rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-full bg-gradient-to-br from-[var(--wfcts-primary)] to-[#284bb0] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[var(--wfcts-primary)]/15 transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmitting ? 'Saving...' : editingSlotId ? 'Update Slot' : 'Add Slot'}
                  </button>

                  {editingSlotId && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsComposerOpen(false)
                        resetForm(selectedDay)
                      }}
                      className="rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {selectedDaySlots.length === 0 ? (
              <div className="wfcts-card p-8 text-center">
                <p className="font-semibold text-slate-800">No timetable slots for {dayLabel(selectedDay)}</p>
                <p className="mt-2 text-sm text-[var(--wfcts-muted)]">
                  Use the add button to create a recurring slot for this day.
                </p>
              </div>
            ) : (
              selectedDaySlots.map((slot, index) => (
                <div
                  key={slot.id}
                  className={`rounded-[1.6rem] p-5 transition-all ${index % 2 === 0 ? 'wfcts-card' : 'wfcts-card-muted'}`}
                >
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div className={`rounded-full px-3 py-1 text-[0.64rem] font-bold uppercase tracking-[0.18em] ${
                      index === 0
                        ? 'bg-[var(--wfcts-secondary)]/12 text-[var(--wfcts-secondary)]'
                        : 'bg-[var(--wfcts-primary)]/10 text-[var(--wfcts-primary)]'
                    }`}>
                      {index === 0 ? 'Active Slot' : 'Lecture'}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(slot)}
                        className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-white hover:text-[var(--wfcts-primary)]"
                      >
                        <span className="material-symbols-outlined text-base">edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(slot.id)}
                        className="flex h-10 w-10 items-center justify-center rounded-full text-red-600 transition-colors hover:bg-red-50"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex min-w-[4.5rem] flex-col items-center justify-center border-r border-slate-200 pr-4">
                      <span className={`font-headline text-2xl font-extrabold leading-none ${index === 0 ? 'text-[var(--wfcts-primary)]' : 'text-slate-500'}`}>
                        {formatTime(slot.startTime)}
                      </span>
                      <span className="mt-1 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-slate-400">
                        Start
                      </span>
                    </div>

                    <div className="flex flex-col justify-center">
                      <h3 className="font-headline text-xl font-bold leading-tight text-slate-900">
                        {slot.subject || 'Scheduled Slot'}
                      </h3>
                      <p className="mt-1 text-sm text-[var(--wfcts-muted)]">
                        {slot.className || 'Class not specified'}{slot.location ? ` • ${slot.location}` : ''}
                      </p>
                      {isManager && (
                        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--wfcts-primary)]">
                          {teacherNameById.get(slot.teacherId) || 'Teacher'}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base">schedule</span>
                      <span>{formatTime(slot.endTime)} End</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base">location_on</span>
                      <span>{slot.location || 'Campus'}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <aside className="space-y-5">
          <div className="wfcts-card p-5">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[var(--wfcts-muted)]">
              Day Snapshot
            </p>
            <h3 className="font-headline mt-2 text-2xl font-extrabold tracking-[-0.05em] text-[var(--wfcts-primary)]">
              {dayLabel(selectedDay)}
            </h3>
            <p className="mt-3 text-sm text-[var(--wfcts-muted)]">
              {selectedDaySlots.length} slot{selectedDaySlots.length === 1 ? '' : 's'} scheduled for this day.
            </p>
          </div>

          <div className="wfcts-card p-5">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[var(--wfcts-muted)]">
              Coverage Window
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-800">
              These recurring slots are also used by the backend availability checks when suggesting teachers for substitution links.
            </p>
          </div>
        </aside>
      </section>

    </div>
  )
}

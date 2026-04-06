import { useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useWFCTS } from '../context/WFCTSContext'

const dayOptions = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

function dayLabel(dayOfWeek) {
  return dayOptions.find((day) => day.value === dayOfWeek)?.label || 'Unknown'
}

export default function Timetable() {
  const { user } = useAuth()
  const {
    teacherDirectory,
    timetableSlots,
    addTimetableSlot,
    updateTimetableSlot,
    deleteTimetableSlot,
  } = useWFCTS()

  const isManager = user?.role === 'ADMIN' || user?.role === 'HOD'

  const [form, setForm] = useState({
    teacherId: isManager ? '' : user?.id || '',
    dayOfWeek: 1,
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

  function resetForm() {
    setForm({
      teacherId: isManager ? '' : user?.id || '',
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '10:00',
      subject: '',
      className: '',
      location: '',
    })
    setEditingSlotId('')
  }

  function onEdit(slot) {
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
      resetForm()
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
        resetForm()
      }
    } catch (deleteError) {
      setError(deleteError.message || 'Unable to delete timetable slot.')
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="bg-white px-5 pt-10 pb-6 shadow-sm">
        <p className="text-xs font-semibold text-emerald-500 uppercase tracking-widest mb-1">Timetable</p>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Weekly Teaching Slots</h1>
        <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Manage recurring periods and coverage windows</p>
      </div>

      <form onSubmit={onSubmit} className="mx-5 mt-5 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
          {editingSlotId ? 'Edit Slot' : 'Add Slot'}
        </h2>

        {isManager && (
          <select
            value={form.teacherId}
            onChange={(event) => setForm((prev) => ({ ...prev, teacherId: event.target.value }))}
            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="">Select teacher</option>
            {teacherDirectory.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
            ))}
          </select>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select
            value={form.dayOfWeek}
            onChange={(event) => setForm((prev) => ({ ...prev, dayOfWeek: Number(event.target.value) }))}
            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            {dayOptions.map((day) => (
              <option key={day.value} value={day.value}>{day.label}</option>
            ))}
          </select>

          <input
            type="time"
            value={form.startTime}
            onChange={(event) => setForm((prev) => ({ ...prev, startTime: event.target.value }))}
            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />

          <input
            type="time"
            value={form.endTime}
            onChange={(event) => setForm((prev) => ({ ...prev, endTime: event.target.value }))}
            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />

          <input
            type="text"
            value={form.subject}
            onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))}
            placeholder="Subject"
            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />

          <input
            type="text"
            value={form.className}
            onChange={(event) => setForm((prev) => ({ ...prev, className: event.target.value }))}
            placeholder="Class / Division"
            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />

          <input
            type="text"
            value={form.location}
            onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
            placeholder="Location"
            className="sm:col-span-2 w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 text-white text-sm font-semibold rounded-xl px-4 py-2.5"
          >
            {isSubmitting ? 'Saving...' : editingSlotId ? 'Update Slot' : 'Add Slot'}
          </button>

          {editingSlotId && (
            <button
              type="button"
              onClick={resetForm}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl px-4 py-2.5"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="mx-5 mt-4 mb-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Current Slots</h2>

        {visibleSlots.length === 0 ? (
          <p className="text-sm text-gray-500">No timetable slots yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {visibleSlots.map((slot) => (
              <div key={slot.id} className="rounded-xl border border-gray-100 px-3 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {dayLabel(slot.dayOfWeek)} | {slot.startTime} - {slot.endTime}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {(teacherNameById.get(slot.teacherId) || 'Teacher')} | {slot.subject || 'General'} {slot.className ? `(${slot.className})` : ''}
                    </p>
                    {slot.location && <p className="text-xs text-gray-400 mt-0.5">{slot.location}</p>}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onEdit(slot)}
                      className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(slot.id)}
                      className="text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-lg"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

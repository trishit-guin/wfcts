import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useWFCTS } from '../context/WFCTSContext'
import {
  uploadTimetableRequest,
  patchTimetableUploadRequest,
  saveTimetableUploadRequest,
} from '../utils/api'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const EVENT_TYPES = ['LECTURE', 'LAB', 'ADMIN', 'EXTRA_DUTY', 'MEETING']
const EVENT_TYPE_COLORS = {
  LECTURE: 'bg-blue-100 text-blue-700',
  LAB: 'bg-teal-100 text-teal-700',
  ADMIN: 'bg-slate-100 text-slate-600',
  EXTRA_DUTY: 'bg-amber-100 text-amber-700',
  MEETING: 'bg-purple-100 text-purple-700',
}
const TEACHING_TYPES = new Set(['LECTURE', 'LAB'])

function SymIcon({ name, className = '' }) {
  return (
    <span className={`material-symbols-outlined leading-none ${className}`} aria-hidden="true">
      {name}
    </span>
  )
}

function calcHours(startTime, endTime) {
  if (!startTime || !endTime) return 0
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  return Math.max(0, ((eh * 60 + em) - (sh * 60 + sm)) / 60)
}

function HoursSummary({ slots }) {
  const teachingHours = slots
    .filter((s) => TEACHING_TYPES.has(s.eventType))
    .reduce((sum, s) => sum + calcHours(s.startTime, s.endTime), 0)
  const otherHours = slots
    .filter((s) => !TEACHING_TYPES.has(s.eventType))
    .reduce((sum, s) => sum + calcHours(s.startTime, s.endTime), 0)
  const totalHours = teachingHours + otherHours

  return (
    <div className="wfcts-card p-5">
      <p className="mb-4 text-[0.62rem] font-bold uppercase tracking-widest text-slate-400">
        Weekly Hours Summary
      </p>
      <div className="flex flex-wrap items-center gap-6">
        <div className="text-center">
          <p className="text-2xl font-extrabold text-[var(--wfcts-primary)]">
            {totalHours.toFixed(1)}<span className="text-sm font-semibold text-slate-400">h</span>
          </p>
          <p className="mt-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400">Total / Week</p>
        </div>
        <div className="h-10 w-px bg-slate-100" />
        <div className="text-center">
          <p className="text-xl font-bold text-blue-600">
            {teachingHours.toFixed(1)}<span className="text-xs font-semibold text-slate-400">h</span>
          </p>
          <p className="mt-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400">Teaching</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-slate-600">
            {otherHours.toFixed(1)}<span className="text-xs font-semibold text-slate-400">h</span>
          </p>
          <p className="mt-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400">Other</p>
        </div>
        <div className="ml-auto hidden sm:block">
          <p className="text-xs text-slate-400">
            Progress bar teaching target will be set to{' '}
            <strong className="text-slate-700">{teachingHours.toFixed(1)}h / week</strong>
          </p>
        </div>
      </div>

      {/* Per-day breakdown */}
      {slots.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6, 0].map((day) => {
            const daySlots = slots.filter((s) => s.day === day)
            if (!daySlots.length) return null
            const hrs = daySlots.reduce((sum, s) => sum + calcHours(s.startTime, s.endTime), 0)
            return (
              <div key={day} className="flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-[0.65rem] font-semibold text-slate-600">
                <span className="text-slate-400">{DAY_NAMES[day].slice(0, 3)}</span>
                {hrs.toFixed(1)}h
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const DETECTION_LEGEND = [
  { type: 'LECTURE', color: EVENT_TYPE_COLORS.LECTURE, hint: 'Regular class lecture' },
  { type: 'LAB', color: EVENT_TYPE_COLORS.LAB, hint: 'Practical / lab session' },
  { type: 'ADMIN', color: EVENT_TYPE_COLORS.ADMIN, hint: 'Administrative duty' },
  { type: 'EXTRA_DUTY', color: EVENT_TYPE_COLORS.EXTRA_DUTY, hint: 'Exam invigilation, duty etc.' },
  { type: 'MEETING', color: EVENT_TYPE_COLORS.MEETING, hint: 'Department or staff meeting' },
]

function DetectionLegend() {
  return (
    <div className="wfcts-card p-5">
      <p className="mb-3 text-[0.62rem] font-bold uppercase tracking-widest text-slate-400">
        Detection Rules — Event Types
      </p>
      <div className="flex flex-wrap gap-3">
        {DETECTION_LEGEND.map(({ type, color, hint }) => (
          <div key={type} className="flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.62rem] font-bold ${color}`}>
              {type}
            </span>
            <span className="text-[0.65rem] text-slate-400">{hint}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[0.65rem] text-slate-400">
        The AI infers event type from keywords in the timetable (e.g. "Lab", "Meeting", "Duty"). You can override any type in the preview.
      </p>
    </div>
  )
}

function SlotRow({ slot, index, teacherDirectory, onUpdate, onRemove }) {
  const [editing, setEditing] = useState(false)
  const [local, setLocal] = useState({ ...slot })

  const handleSave = () => {
    onUpdate(index, local)
    setEditing(false)
  }

  const handleCancel = () => {
    setLocal({ ...slot })
    setEditing(false)
  }

  if (editing) {
    return (
      <tr className="bg-blue-50/40">
        <td className="px-3 py-2">
          <select
            value={local.day}
            onChange={(e) => setLocal({ ...local, day: Number(e.target.value) })}
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
          >
            {DAY_NAMES.map((d, i) => (
              <option key={i} value={i}>{d}</option>
            ))}
          </select>
        </td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-1">
            <input
              type="time"
              value={local.startTime}
              onChange={(e) => setLocal({ ...local, startTime: e.target.value })}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
            />
            <span className="text-slate-400">–</span>
            <input
              type="time"
              value={local.endTime}
              onChange={(e) => setLocal({ ...local, endTime: e.target.value })}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
            />
          </div>
        </td>
        <td className="px-3 py-2">
          <input
            value={local.subject}
            onChange={(e) => setLocal({ ...local, subject: e.target.value })}
            placeholder="e.g. CS401"
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
          />
        </td>
        <td className="px-3 py-2">
          <input
            value={local.className}
            onChange={(e) => setLocal({ ...local, className: e.target.value })}
            placeholder="e.g. BCA-3A"
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
          />
        </td>
        <td className="px-3 py-2">
          <select
            value={local.eventType}
            onChange={(e) => setLocal({ ...local, eventType: e.target.value })}
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
          >
            {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </td>
        <td className="px-3 py-2">
          <select
            value={local.teacherId || ''}
            onChange={(e) => setLocal({ ...local, teacherId: e.target.value })}
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
          >
            <option value="">Unassigned</option>
            {teacherDirectory.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </td>
        <td className="px-3 py-2 text-center">
          <div className="flex items-center justify-center gap-1">
            <button onClick={handleSave} className="rounded-lg bg-emerald-500 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-600">
              Save
            </button>
            <button onClick={handleCancel} className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </td>
      </tr>
    )
  }

  const teacher = teacherDirectory.find((t) => t.id === slot.teacherId)
  const slotHours = calcHours(slot.startTime, slot.endTime)

  return (
    <tr className="group border-b border-slate-100 hover:bg-slate-50/60">
      <td className="px-3 py-3 text-xs font-semibold text-slate-700">{DAY_NAMES[slot.day]}</td>
      <td className="px-3 py-3 text-xs text-slate-600">
        {slot.startTime} – {slot.endTime}
        <span className="ml-1.5 text-slate-400">({slotHours.toFixed(1)}h)</span>
      </td>
      <td className="px-3 py-3 text-xs font-semibold text-[var(--wfcts-primary)]">
        {slot.subject || <span className="italic text-slate-400">—</span>}
      </td>
      <td className="px-3 py-3 text-xs text-slate-600">
        {slot.className || <span className="italic text-slate-400">—</span>}
      </td>
      <td className="px-3 py-3">
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.62rem] font-bold ${EVENT_TYPE_COLORS[slot.eventType] || 'bg-slate-100 text-slate-600'}`}>
          {slot.eventType}
        </span>
      </td>
      <td className="px-3 py-3 text-xs text-slate-600">
        {teacher ? teacher.name : (
          <span className="text-amber-600 font-semibold">Unassigned</span>
        )}
      </td>
      <td className="px-3 py-3 text-center">
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setEditing(true)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
          >
            <SymIcon name="edit" className="text-sm" />
          </button>
          <button
            onClick={() => onRemove(index)}
            className="rounded-lg p-1.5 text-rose-300 hover:bg-rose-50 hover:text-rose-500"
          >
            <SymIcon name="delete" className="text-sm" />
          </button>
        </div>
      </td>
    </tr>
  )
}

export default function TimetableUpload() {
  const { token, user } = useAuth()
  const { teacherDirectory } = useWFCTS()
  const navigate = useNavigate()

  const isManager = user?.role === 'ADMIN' || user?.role === 'HOD'

  const [step, setStep] = useState('upload') // 'upload' | 'preview' | 'done'
  const [uploadId, setUploadId] = useState(null)
  const [parsedSlots, setParsedSlots] = useState([])
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedCount, setSavedCount] = useState(0)
  const [targetTeacherId, setTargetTeacherId] = useState('')
  const fileInputRef = useRef(null)

  const handleFile = useCallback(async (file) => {
    if (!file) return
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowed.includes(file.type)) {
      setError('Unsupported file type. Please upload a JPG, PNG, WebP or PDF.')
      return
    }

    setError('')
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      if (isManager && targetTeacherId) {
        formData.append('targetUserId', targetTeacherId)
      }
      const result = await uploadTimetableRequest(token, formData)
      const upload = result.upload
      setUploadId(upload.id)
      setParsedSlots(upload.parsedSlots || [])
      setStep('preview')
    } catch (e) {
      setError(e.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }, [token, isManager, targetTeacherId])

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  const handleUpdateSlot = (index, updated) => {
    const next = parsedSlots.map((s, i) => (i === index ? { ...s, ...updated } : s))
    setParsedSlots(next)
    patchTimetableUploadRequest(token, uploadId, { parsedSlots: next }).catch(() => {})
  }

  const handleRemoveSlot = (index) => {
    const next = parsedSlots.filter((_, i) => i !== index)
    setParsedSlots(next)
    patchTimetableUploadRequest(token, uploadId, { parsedSlots: next }).catch(() => {})
  }

  const handleAddSlot = () => {
    const blank = {
      day: 1, startTime: '09:00', endTime: '10:00',
      subject: '', className: '', location: '',
      eventType: 'LECTURE', teacherId: '', confidence: 1,
      _rowId: `manual_${Date.now()}`,
    }
    setParsedSlots((prev) => [...prev, blank])
  }

  const handleSave = async () => {
    const unassigned = parsedSlots.filter((s) => !s.teacherId).length
    if (unassigned > 0) {
      const proceed = window.confirm(
        `${unassigned} slot(s) have no teacher assigned. Continue?`
      )
      if (!proceed) return
    }
    setSaving(true)
    setError('')
    try {
      const result = await saveTimetableUploadRequest(token, uploadId)
      setSavedCount(result.eventsCreated || 0)
      setStep('done')
    } catch (e) {
      setError(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const unassignedCount = parsedSlots.filter((s) => !s.teacherId).length

  // ── Done ──────────────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6 animate-float-in">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <SymIcon name="check_circle" className="text-[2.5rem]" />
        </div>
        <div className="text-center">
          <h2 className="font-headline text-2xl font-extrabold text-slate-800">Timetable Saved</h2>
          <p className="mt-2 text-slate-500">
            {savedCount} calendar event{savedCount !== 1 ? 's' : ''} generated across 16 weeks.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/calendar')}
            className="flex items-center gap-2 rounded-full bg-[var(--wfcts-primary)] px-6 py-3 text-sm font-bold text-white shadow-lg"
          >
            <SymIcon name="calendar_month" className="text-base" />
            View Calendar
          </button>
          <button
            onClick={() => { setStep('upload'); setUploadId(null); setParsedSlots([]) }}
            className="rounded-full border border-slate-200 px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            Upload Another
          </button>
        </div>
      </div>
    )
  }

  // ── Preview ───────────────────────────────────────────────────────────────
  if (step === 'preview') {
    return (
      <div className="space-y-6 animate-float-in">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-label text-[0.62rem] font-bold uppercase tracking-[0.28em] text-[var(--wfcts-muted)]">
              Timetable Upload
            </p>
            <h1 className="font-headline text-2xl font-extrabold tracking-[-0.04em] text-slate-800">
              Review & Assign
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {parsedSlots.length} slot{parsedSlots.length !== 1 ? 's' : ''} extracted by AI. Edit, assign teachers, then save.
            </p>
          </div>
          <button
            onClick={handleAddSlot}
            className="flex items-center gap-2 rounded-xl border border-[var(--wfcts-primary)]/30 bg-[var(--wfcts-primary)]/6 px-4 py-2.5 text-xs font-semibold text-[var(--wfcts-primary)] hover:bg-[var(--wfcts-primary)]/10"
          >
            <SymIcon name="add" className="text-sm" />
            Add Slot
          </button>
        </div>

        {error && (
          <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        )}

        {unassignedCount > 0 && (
          <div className="flex items-center gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <SymIcon name="warning" className="text-base" />
            <span>{unassignedCount} slot{unassignedCount !== 1 ? 's are' : ' is'} unassigned.</span>
          </div>
        )}

        <DetectionLegend />

        {/* Slots table */}
        <div className="wfcts-card overflow-hidden">
          {parsedSlots.length === 0 ? (
            <div className="p-12 text-center">
              <p className="font-semibold text-slate-700">No slots extracted</p>
              <p className="mt-1 text-sm text-slate-400">Click "Add Slot" to add manually.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    <th className="px-3 py-3 text-[0.62rem] font-bold uppercase tracking-wider text-slate-400">Day</th>
                    <th className="px-3 py-3 text-[0.62rem] font-bold uppercase tracking-wider text-slate-400">Time</th>
                    <th className="px-3 py-3 text-[0.62rem] font-bold uppercase tracking-wider text-slate-400">Subject</th>
                    <th className="px-3 py-3 text-[0.62rem] font-bold uppercase tracking-wider text-slate-400">Class</th>
                    <th className="px-3 py-3 text-[0.62rem] font-bold uppercase tracking-wider text-slate-400">Type</th>
                    <th className="px-3 py-3 text-[0.62rem] font-bold uppercase tracking-wider text-slate-400">Teacher</th>
                    <th className="px-3 py-3 text-center text-[0.62rem] font-bold uppercase tracking-wider text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedSlots.map((slot, i) => (
                    <SlotRow
                      key={slot._rowId || i}
                      slot={slot}
                      index={i}
                      teacherDirectory={teacherDirectory}
                      onUpdate={handleUpdateSlot}
                      onRemove={handleRemoveSlot}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Hours summary — shown below the table */}
        {parsedSlots.length > 0 && <HoursSummary slots={parsedSlots} />}

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white px-6 py-4 shadow-sm">
          <button
            onClick={() => { setStep('upload'); setUploadId(null); setParsedSlots([]) }}
            className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-700"
          >
            <SymIcon name="arrow_back" className="text-sm" />
            Upload Again
          </button>
          <div className="flex items-center gap-2">
            <p className="text-xs text-slate-400">
              Creates <strong>{parsedSlots.length * 16}</strong> calendar events (16 weeks)
            </p>
            <button
              onClick={handleSave}
              disabled={saving || parsedSlots.length === 0}
              className="flex items-center gap-2 rounded-full bg-[var(--wfcts-primary)] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[var(--wfcts-primary)]/20 transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                  Generating…
                </>
              ) : (
                <>
                  <SymIcon name="save" className="text-base" />
                  Save & Generate Schedule
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Upload step ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-float-in">
      <div>
        <p className="font-label text-[0.62rem] font-bold uppercase tracking-[0.28em] text-[var(--wfcts-muted)]">
          Timetable Management
        </p>
        <h1 className="font-headline text-2xl font-extrabold tracking-[-0.04em] text-slate-800 sm:text-3xl">
          Upload Timetable
        </h1>
        <p className="mt-2 max-w-xl text-sm text-slate-500">
          Upload a photo or PDF of the timetable. Llama 4 Scout via Groq will extract all slots, times, and subjects automatically.
          Review and edit before generating the 16-week schedule.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      {isManager && (
        <div className="wfcts-card p-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Upload Timetable For</p>
          <select
            value={targetTeacherId}
            onChange={(e) => setTargetTeacherId(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-(--wfcts-primary) focus:outline-none focus:ring-2 focus:ring-(--wfcts-primary)/20"
          >
            <option value="">Whole department (assign per slot in preview)</option>
            {teacherDirectory.map((t) => (
              <option key={t.id} value={t.id}>{t.name} — {t.department || t.role}</option>
            ))}
          </select>
          {targetTeacherId && (
            <p className="mt-2 text-xs text-slate-400">
              All detected slots will be auto-assigned to <strong>{teacherDirectory.find((t) => t.id === targetTeacherId)?.name}</strong>.
            </p>
          )}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`relative flex min-h-[22rem] cursor-pointer flex-col items-center justify-center gap-5 rounded-3xl border-2 border-dashed transition-all ${
          dragOver
            ? 'border-[var(--wfcts-primary)] bg-[var(--wfcts-primary)]/5 scale-[1.01]'
            : 'border-slate-200 bg-slate-50/60 hover:border-[var(--wfcts-primary)]/50 hover:bg-[var(--wfcts-primary)]/3'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.pdf"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-4">
            <span className="material-symbols-outlined animate-spin text-[3rem] text-[var(--wfcts-primary)]">
              progress_activity
            </span>
            <p className="font-semibold text-slate-700">Llama 4 Scout is reading your timetable…</p>
            <p className="text-sm text-slate-400">AI extraction takes 5–15 seconds</p>
          </div>
        ) : (
          <>
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--wfcts-primary)]/10 text-[var(--wfcts-primary)]">
              <SymIcon name="cloud_upload" className="text-[2.5rem]" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-slate-700">Drop timetable here or click to browse</p>
              <p className="mt-1 text-sm text-slate-400">Supports JPG, PNG, WebP, PDF</p>
            </div>
            <div className="flex gap-3">
              {['Photo', 'Scanned PDF', 'Screenshot'].map((label) => (
                <span key={label} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-sm">
                  {label}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { icon: 'smart_toy', title: 'Groq / Llama 4 Scout', desc: 'Llama 4 Scout via Groq reads your timetable image or PDF and returns structured slots in under 5 seconds.' },
          { icon: 'edit_note', title: 'Review & Correct', desc: 'Check extracted slots, fix any errors, assign teachers, and add missing entries manually.' },
          { icon: 'calendar_add_on', title: '16-Week Schedule', desc: 'Each slot generates calendar events for the next 4 months and sets your weekly teaching target.' },
        ].map((item) => (
          <div key={item.title} className="wfcts-card p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--wfcts-primary)]/8 text-[var(--wfcts-primary)]">
              <SymIcon name={item.icon} className="text-xl" />
            </div>
            <p className="font-semibold text-slate-800">{item.title}</p>
            <p className="mt-1 text-xs text-slate-500">{item.desc}</p>
          </div>
        ))}
      </div>

      <DetectionLegend />
    </div>
  )
}

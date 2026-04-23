import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useWFCTS } from '../context/WFCTSContext'
import { formatDate } from '../utils/formatDate'

function dayOfWeekFromDate(dateText) {
  const [y, m, d] = dateText.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d).getDay()
}

function initials(name) {
  if (!name) return 'WF'
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 3)
    .join('')
    .toUpperCase()
}

function directionMeta(direction) {
  if (direction === 'SUBSTITUTION') {
    return {
      label: 'Sub Taken',
      icon: 'history_edu',
      iconClass: 'bg-orange-100 text-[#7c2d12]',
      badgeClass: 'bg-orange-100 text-[#7c2d12]',
      delta: '-1',
      description: 'Covered by',
    }
  }
  return {
    label: 'Credit',
    icon: 'assignment_turned_in',
    iconClass: 'bg-(--wfcts-secondary)/12 text-(--wfcts-secondary)',
    badgeClass: 'bg-(--wfcts-secondary)/14 text-(--wfcts-secondary)',
    delta: '+1',
    description: 'Covered for',
  }
}

function statusClasses(status) {
  if (status === 'Repaid') return 'bg-(--wfcts-secondary)/14 text-(--wfcts-secondary)'
  return 'bg-orange-100 text-[#7c2d12]'
}

function SummaryTile({ label, value, tone }) {
  const tones = {
    primary: 'bg-(--wfcts-primary)/8 text-(--wfcts-primary)',
    secondary: 'bg-(--wfcts-secondary)/10 text-(--wfcts-secondary)',
    tertiary: 'bg-orange-100 text-[#9a3412]',
  }
  const icons = { primary: 'payments', secondary: 'history_edu', tertiary: 'schedule' }

  return (
    <div className="wfcts-card p-5">
      <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${tones[tone]}`}>
        <span className="material-symbols-outlined text-[1.25rem]">{icons[tone]}</span>
      </div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-(--wfcts-muted)">{label}</p>
      <p className="font-headline mt-2 text-3xl font-extrabold tracking-[-0.05em] text-(--wfcts-primary)">{value}</p>
    </div>
  )
}

export default function Credits() {
  const { user } = useAuth()
  const {
    substituteEntries,
    teacherDirectory,
    timetableSlots,
    substituteSuggestions,
    hoursCompletion,
    addSubstituteEntry,
    fetchSubstituteSuggestions,
    fetchHoursCompletion,
    fetchTeachingAllocations,
    addTeachingAllocation,
    removeTeachingAllocation,
  } = useWFCTS()

  const [activeAction, setActiveAction] = useState('none') // 'none' | 'need-sub' | 'covered'
  const [activeFilter, setActiveFilter] = useState('ALL')
  const [form, setForm] = useState({
    counterpartTeacherId: '',
    date: new Date().toISOString().slice(0, 10),
    startTime: '',
    endTime: '',
    className: '',
    subject: '',
  })
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'HOD'
  const [showAllocationForm, setShowAllocationForm] = useState(false)
  const [allocationForm, setAllocationForm] = useState({
    teacherId: '', subject: '', className: '', requiredHours: '', academicYear: '',
  })
  const [allocationError, setAllocationError] = useState('')
  const [isAddingAllocation, setIsAddingAllocation] = useState(false)

  // ── Derived data ──────────────────────────────────────────────────────────────

  const teacherEntries = useMemo(
    () => substituteEntries.filter((entry) => entry.teacherId === user?.id),
    [substituteEntries, user?.id],
  )

  const creditsGiven = teacherEntries.filter((e) => (e.direction || 'CREDIT') === 'CREDIT')
  const substitutionsReceived = teacherEntries.filter((e) => (e.direction || 'CREDIT') === 'SUBSTITUTION')
  const pendingCount = creditsGiven.filter((e) => e.status === 'Pending').length
    + substitutionsReceived.filter((e) => e.status === 'Pending').length
  const netBalance = creditsGiven.length - substitutionsReceived.length

  const teacherNameById = useMemo(
    () => new Map(teacherDirectory.map((t) => [t.id, t.name])),
    [teacherDirectory],
  )
  const counterpartOptions = useMemo(
    () => teacherDirectory.filter((t) => t.id !== user?.id),
    [teacherDirectory, user?.id],
  )

  const combinedLedger = useMemo(() => {
    const rows = teacherEntries.map((entry) => ({
      ...entry,
      direction: entry.direction || 'CREDIT',
      counterpartName: teacherNameById.get(entry.counterpartTeacherId) || entry.coveredFor || 'Faculty Member',
    }))
    rows.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    return rows
  }, [teacherEntries, teacherNameById])

  const filteredLedger = combinedLedger.filter((entry) => {
    if (activeFilter === 'ALL') return true
    return entry.direction === activeFilter
  })

  // ── Real-time slot detection ──────────────────────────────────────────────────

  const { activeSlot, upcomingSlot } = useMemo(() => {
    const now = new Date()
    const currentDay = now.getDay()
    const hh = String(now.getHours()).padStart(2, '0')
    const mm = String(now.getMinutes()).padStart(2, '0')
    const currentHHMM = `${hh}:${mm}`

    const mySlots = timetableSlots
      .filter((s) => s.teacherId === user?.id && s.dayOfWeek === currentDay)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))

    const active = mySlots.find((s) => s.startTime <= currentHHMM && currentHHMM < s.endTime) || null
    const upcoming = mySlots.find((s) => s.startTime > currentHHMM) || null
    return { activeSlot: active, upcomingSlot: upcoming }
  }, [timetableSlots, user?.id])

  const displaySlot = activeSlot || upcomingSlot

  // ── Effects ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchTeachingAllocations().catch(() => {})
    fetchHoursCompletion().catch(() => {})
  }, [fetchTeachingAllocations, fetchHoursCompletion])

  useEffect(() => {
    if (activeAction !== 'need-sub') return
    const dayOfWeek = dayOfWeekFromDate(form.date)
    if (dayOfWeek === null || !form.startTime || !form.endTime) return
    fetchSubstituteSuggestions({
      dayOfWeek,
      startTime: form.startTime,
      endTime: form.endTime,
      referenceTeacherId: user?.id,
      ...(form.className ? { className: form.className } : {}),
    }).catch(() => {})
  }, [activeAction, fetchSubstituteSuggestions, form.className, form.date, form.endTime, form.startTime, user?.id])

  // ── Handlers ──────────────────────────────────────────────────────────────────

  function openWithSlot(slot) {
    const today = new Date().toISOString().slice(0, 10)
    setForm((p) => ({
      ...p,
      date: today,
      startTime: slot.startTime,
      endTime: slot.endTime,
      className: slot.className || '',
      subject: slot.subject || '',
      counterpartTeacherId: '',
    }))
    setActiveAction('need-sub')
    setFormError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!form.counterpartTeacherId) { setFormError('Select a teacher first.'); return }
    if (!form.date) { setFormError('Date is required.'); return }
    if (!form.startTime || !form.endTime) { setFormError('Start and end time are required.'); return }
    if (!form.className.trim()) { setFormError('Class / division is required.'); return }

    setFormError('')
    setIsSubmitting(true)
    try {
      const linkedName = teacherNameById.get(form.counterpartTeacherId) || 'Teacher'
      const direction = activeAction === 'covered' ? 'CREDIT' : 'SUBSTITUTION'
      await addSubstituteEntry({
        counterpartTeacherId: form.counterpartTeacherId,
        coveredFor: linkedName,
        direction,
        status: 'Pending',
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        className: form.className.trim(),
        subject: form.subject.trim(),
      })
      setForm({
        counterpartTeacherId: '',
        date: new Date().toISOString().slice(0, 10),
        startTime: '',
        endTime: '',
        className: '',
        subject: '',
      })
      setActiveAction('none')
    } catch (error) {
      setFormError(error.message || 'Unable to save substitution entry.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleAddAllocation(event) {
    event.preventDefault()
    const { teacherId, subject, className, requiredHours, academicYear } = allocationForm
    if (!teacherId || !subject || !className || !requiredHours || !academicYear) {
      setAllocationError('All fields are required.')
      return
    }
    setAllocationError('')
    setIsAddingAllocation(true)
    try {
      await addTeachingAllocation({ teacherId, subject, className, requiredHours: Number(requiredHours), academicYear })
      await fetchHoursCompletion()
      setAllocationForm({ teacherId: '', subject: '', className: '', requiredHours: '', academicYear: '' })
      setShowAllocationForm(false)
    } catch (error) {
      setAllocationError(error.message || 'Failed to save allocation.')
    } finally {
      setIsAddingAllocation(false)
    }
  }

  const inputCls = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-(--wfcts-primary)/30 focus:bg-white focus:ring-2 focus:ring-(--wfcts-primary)/10'
  const inputGreenCls = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100'

  return (
    <div className="space-y-8 animate-float-in">

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <h2 className="font-headline text-4xl font-extrabold tracking-[-0.06em] text-(--wfcts-primary) sm:text-5xl">
          Substitutions
        </h2>
        <div className="rounded-[1.4rem] bg-(--wfcts-secondary)/12 px-5 py-4 text-right">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-(--wfcts-secondary)/80">Balance</p>
          <p className="font-headline text-2xl font-extrabold tracking-[-0.04em] text-(--wfcts-secondary)">
            {netBalance > 0 ? '+' : ''}{netBalance}
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">

          {/* ── Right Now card ──────────────────────────────────────────────── */}
          <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-(--wfcts-primary) to-[#284bb0] p-6 text-white shadow-[0_24px_60px_rgba(30,58,138,0.22)]">
            <div className="absolute right-[-12%] top-[-18%] h-40 w-40 rounded-full bg-white/8 blur-3xl" />
            <div className="relative z-10">
              <div className="mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-(--wfcts-secondary-soft)">
                  {activeSlot ? 'radio_button_checked' : 'schedule'}
                </span>
                <h3 className="text-sm font-bold tracking-[0.08em] text-white">
                  {activeSlot ? 'Right Now' : upcomingSlot ? 'Up Next Today' : 'No Class Today'}
                </h3>
              </div>

              {displaySlot ? (
                <div className="rounded-[1.5rem] border border-white/8 bg-white/10 p-4 backdrop-blur-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-extrabold tracking-[-0.03em] text-white">
                        {displaySlot.subject || 'Class'}
                        {displaySlot.className && (
                          <span className="ml-2 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-bold">
                            {displaySlot.className}
                          </span>
                        )}
                      </p>
                      <p className="mt-1 text-sm text-blue-100">
                        {displaySlot.startTime} – {displaySlot.endTime}
                        {activeSlot && (
                          <span className="ml-2 rounded-full bg-emerald-400/25 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-emerald-200">Live</span>
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openWithSlot(displaySlot)}
                      className="shrink-0 rounded-[1rem] bg-(--wfcts-secondary-soft) px-4 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-[#032521] transition-transform active:scale-[0.98]"
                    >
                      Find Sub
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-[1.5rem] border border-white/8 bg-white/10 p-4 backdrop-blur-sm">
                  <p className="text-sm text-blue-100">
                    No classes scheduled for today. Use the actions below to log a substitution manually.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* ── Filter tabs ─────────────────────────────────────────────────── */}
          <section className="flex items-center gap-4">
            <div className="flex w-fit rounded-full bg-(--wfcts-surface-muted) p-1">
              {[
                { key: 'ALL', label: 'All' },
                { key: 'CREDIT', label: 'Credits' },
                { key: 'SUBSTITUTION', label: 'Subs' },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveFilter(item.key)}
                  className={`rounded-full px-5 py-2 text-xs font-bold transition-all ${
                    activeFilter === item.key
                      ? 'bg-white text-(--wfcts-primary) shadow-sm'
                      : 'text-(--wfcts-muted) hover:text-(--wfcts-primary)'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </section>

          {/* ── Action chooser ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setActiveAction(activeAction === 'need-sub' ? 'none' : 'need-sub')
                setFormError('')
                setForm((p) => ({ ...p, counterpartTeacherId: '' }))
              }}
              className={`flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all ${
                activeAction === 'need-sub'
                  ? 'border-(--wfcts-primary) bg-(--wfcts-primary)/5'
                  : 'border-slate-200 bg-white hover:border-(--wfcts-primary)/40'
              }`}
            >
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${activeAction === 'need-sub' ? 'bg-(--wfcts-primary) text-white' : 'bg-slate-100 text-slate-500'}`}>
                <span className="material-symbols-outlined text-[1.1rem]">person_search</span>
              </span>
              <div>
                <p className="text-sm font-bold text-slate-800">I need a sub</p>
                <p className="text-xs text-(--wfcts-muted)">Find someone to cover my class</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveAction(activeAction === 'covered' ? 'none' : 'covered')
                setFormError('')
                setForm((p) => ({ ...p, counterpartTeacherId: '' }))
              }}
              className={`flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all ${
                activeAction === 'covered'
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-slate-200 bg-white hover:border-emerald-300'
              }`}
            >
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${activeAction === 'covered' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                <span className="material-symbols-outlined text-[1.1rem]">assignment_turned_in</span>
              </span>
              <div>
                <p className="text-sm font-bold text-slate-800">I covered someone</p>
                <p className="text-xs text-(--wfcts-muted)">Log a class I took for a colleague</p>
              </div>
            </button>
          </div>

          {/* ── "I need a sub" panel ────────────────────────────────────────── */}
          {activeAction === 'need-sub' && (
            <section className="wfcts-card space-y-4 p-5">
              <div>
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-(--wfcts-muted)">Step 1 — Which class needs covering?</p>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <label className="col-span-2 space-y-1.5 sm:col-span-1">
                    <span className="text-xs font-semibold text-slate-600">Date <span className="text-red-500">*</span></span>
                    <input type="date" value={form.date}
                      onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                      className={inputCls}
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold text-slate-600">From <span className="text-red-500">*</span></span>
                    <input type="time" value={form.startTime}
                      onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))}
                      className={inputCls}
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold text-slate-600">To <span className="text-red-500">*</span></span>
                    <input type="time" value={form.endTime}
                      onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))}
                      className={inputCls}
                    />
                  </label>
                  <label className="col-span-2 space-y-1.5 sm:col-span-1">
                    <span className="text-xs font-semibold text-slate-600">Class <span className="text-red-500">*</span></span>
                    <input type="text" placeholder="e.g. TE-10" value={form.className}
                      onChange={(e) => setForm((p) => ({ ...p, className: e.target.value }))}
                      className={inputCls}
                    />
                  </label>
                </div>
                <div className="mt-3">
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold text-slate-600">Subject <span className="font-normal text-(--wfcts-muted)">(optional)</span></span>
                    <input type="text" placeholder="e.g. OS" value={form.subject}
                      onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                      className={`${inputCls} max-w-xs`}
                    />
                  </label>
                </div>
              </div>

              <div>
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-(--wfcts-muted)">Step 2 — Who will cover?</p>
                {!form.startTime || !form.endTime ? (
                  <p className="mt-2 text-sm text-(--wfcts-muted)">Fill in time and class above to see available teachers.</p>
                ) : substituteSuggestions.length === 0 ? (
                  <p className="mt-2 text-sm text-(--wfcts-muted)">No free teachers found for this slot.</p>
                ) : (
                  <div className="mt-3 flex flex-col gap-2">
                    {substituteSuggestions.map((teacher) => {
                      const tierMeta = teacher.tier === 0
                        ? { label: 'Owes Sub', chipClass: 'bg-orange-100 text-[#7c2d12]' }
                        : teacher.tier === 2
                          ? { label: 'Has Credits', chipClass: 'bg-(--wfcts-secondary)/14 text-(--wfcts-secondary)' }
                          : { label: 'Balanced', chipClass: 'bg-slate-100 text-slate-500' }
                      const isSelected = form.counterpartTeacherId === teacher.id
                      return (
                        <button
                          key={teacher.id}
                          type="button"
                          onClick={() => setForm((p) => ({ ...p, counterpartTeacherId: teacher.id }))}
                          className={`flex items-center justify-between rounded-2xl border-2 px-4 py-3 text-left transition-all ${
                            isSelected ? 'border-(--wfcts-primary) bg-(--wfcts-primary)/5' : 'border-slate-100 bg-slate-50 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${isSelected ? 'bg-(--wfcts-primary) text-white' : 'bg-white text-slate-500 shadow-sm'}`}>
                              {initials(teacher.name)}
                            </div>
                            <span className={`text-sm font-semibold ${isSelected ? 'text-(--wfcts-primary)' : 'text-slate-700'}`}>
                              {teacher.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {teacher.classMatch && (
                              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-indigo-700">Same Class</span>
                            )}
                            <span className={`rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.1em] ${tierMeta.chipClass}`}>{tierMeta.label}</span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {formError && <p className="text-sm text-red-600">{formError}</p>}

              <form onSubmit={handleSubmit} className="flex gap-3">
                <button type="submit" disabled={isSubmitting || !form.counterpartTeacherId}
                  className="rounded-full bg-(--wfcts-primary) px-6 py-3 text-sm font-bold text-white shadow-lg shadow-(--wfcts-primary)/20 transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? 'Requesting...' : 'Confirm Request'}
                </button>
                <button type="button" onClick={() => setActiveAction('none')}
                  className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600"
                >
                  Cancel
                </button>
              </form>
            </section>
          )}

          {/* ── "I covered someone" panel ───────────────────────────────────── */}
          {activeAction === 'covered' && (
            <section className="wfcts-card space-y-4 p-5">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-(--wfcts-muted)">Details of the class you covered</p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="space-y-1.5 sm:col-span-2">
                  <span className="text-xs font-semibold text-slate-600">Teacher you covered <span className="text-red-500">*</span></span>
                  <select value={form.counterpartTeacherId}
                    onChange={(e) => { setForm((p) => ({ ...p, counterpartTeacherId: e.target.value })); setFormError('') }}
                    className={inputGreenCls}
                  >
                    <option value="">Select a colleague</option>
                    {counterpartOptions.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-600">Date <span className="text-red-500">*</span></span>
                  <input type="date" value={form.date}
                    onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                    className={inputGreenCls}
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-600">Class / Division <span className="text-red-500">*</span></span>
                  <input type="text" placeholder="e.g. TE-10" value={form.className}
                    onChange={(e) => setForm((p) => ({ ...p, className: e.target.value }))}
                    className={inputGreenCls}
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-600">From <span className="text-red-500">*</span></span>
                  <input type="time" value={form.startTime}
                    onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))}
                    className={inputGreenCls}
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-600">To <span className="text-red-500">*</span></span>
                  <input type="time" value={form.endTime}
                    onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))}
                    className={inputGreenCls}
                  />
                </label>
                <label className="space-y-1.5 sm:col-span-2">
                  <span className="text-xs font-semibold text-slate-600">Subject <span className="font-normal text-(--wfcts-muted)">(optional)</span></span>
                  <input type="text" placeholder="e.g. OS" value={form.subject}
                    onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                    className={inputGreenCls}
                  />
                </label>
              </div>

              {formError && <p className="text-sm text-red-600">{formError}</p>}

              <form onSubmit={handleSubmit} className="flex gap-3">
                <button type="submit" disabled={isSubmitting || !form.counterpartTeacherId}
                  className="rounded-full bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? 'Logging...' : 'Log Coverage'}
                </button>
                <button type="button" onClick={() => setActiveAction('none')}
                  className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600"
                >
                  Cancel
                </button>
              </form>
            </section>
          )}

          {/* ── Teaching Hours ──────────────────────────────────────────────── */}
          <section className="wfcts-card space-y-4 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <span className="material-symbols-outlined text-[1.1rem]">school</span>
                </span>
                <div>
                  <p className="font-headline text-base font-bold text-(--wfcts-primary)">Teaching Hours</p>
                  <p className="text-xs text-(--wfcts-muted)">Semester allocation vs. actual taught</p>
                </div>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setShowAllocationForm((v) => !v)}
                  className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-indigo-200 hover:text-indigo-700"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  Add Allocation
                </button>
              )}
            </div>

            {isAdmin && showAllocationForm && (
              <form onSubmit={handleAddAllocation} className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-3">
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-indigo-600">New Allocation</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-xs font-semibold text-slate-600">Teacher</span>
                    <select
                      value={allocationForm.teacherId}
                      onChange={(e) => setAllocationForm((p) => ({ ...p, teacherId: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                    >
                      <option value="">Select teacher</option>
                      {teacherDirectory.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-semibold text-slate-600">Subject</span>
                    <input type="text" placeholder="e.g. OS" value={allocationForm.subject}
                      onChange={(e) => setAllocationForm((p) => ({ ...p, subject: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-semibold text-slate-600">Class / Division</span>
                    <input type="text" placeholder="e.g. TE-10" value={allocationForm.className}
                      onChange={(e) => setAllocationForm((p) => ({ ...p, className: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-semibold text-slate-600">Required Hours</span>
                    <input type="number" min="0" step="0.5" placeholder="e.g. 40" value={allocationForm.requiredHours}
                      onChange={(e) => setAllocationForm((p) => ({ ...p, requiredHours: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                    />
                  </label>
                  <label className="space-y-1 sm:col-span-2">
                    <span className="text-xs font-semibold text-slate-600">Academic Year</span>
                    <input type="text" placeholder="e.g. 2024-25" value={allocationForm.academicYear}
                      onChange={(e) => setAllocationForm((p) => ({ ...p, academicYear: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                    />
                  </label>
                </div>
                {allocationError && <p className="text-xs text-red-600">{allocationError}</p>}
                <div className="flex gap-2">
                  <button type="submit" disabled={isAddingAllocation}
                    className="rounded-full bg-indigo-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
                  >
                    {isAddingAllocation ? 'Saving...' : 'Save Allocation'}
                  </button>
                  <button type="button" onClick={() => setShowAllocationForm(false)}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {hoursCompletion.length === 0 ? (
              <p className="text-sm text-(--wfcts-muted)">
                {isAdmin ? 'No allocations set. Add one above to start tracking.' : 'No teaching allocations have been set for you yet.'}
              </p>
            ) : (
              <div className="space-y-3">
                {hoursCompletion.map((item) => {
                  const teacherName = isAdmin ? teacherDirectory.find((t) => t.id === item.teacherId)?.name : null
                  return (
                    <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          {teacherName && (
                            <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-indigo-600">{teacherName}</p>
                          )}
                          <p className="text-sm font-bold text-slate-800">
                            {item.subject} <span className="font-normal text-(--wfcts-muted)">·</span> {item.className}
                          </p>
                          <p className="text-[0.68rem] text-(--wfcts-muted)">{item.academicYear}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.atRisk && (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.12em] text-red-700">At Risk</span>
                          )}
                          <span className={`text-sm font-extrabold ${item.completionPct >= 80 ? 'text-emerald-600' : item.completionPct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                            {item.completionPct}%
                          </span>
                          {isAdmin && (
                            <button type="button"
                              onClick={() => removeTeachingAllocation(item.id).then(() => fetchHoursCompletion())}
                              className="ml-1 text-(--wfcts-muted) hover:text-red-500"
                              aria-label="Delete allocation"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={`h-2 rounded-full transition-all ${item.completionPct >= 80 ? 'bg-emerald-500' : item.completionPct >= 50 ? 'bg-amber-400' : 'bg-red-500'}`}
                          style={{ width: `${item.completionPct}%` }}
                        />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                        <span className="text-[0.68rem] text-(--wfcts-muted)">
                          Taught: <span className="font-semibold text-slate-700">{item.hoursActuallyTaught}h</span>
                        </span>
                        <span className="text-[0.68rem] text-(--wfcts-muted)">
                          Required: <span className="font-semibold text-slate-700">{item.requiredHours}h</span>
                        </span>
                        <span className="text-[0.68rem] text-(--wfcts-muted)">
                          Lost to subs: <span className={`font-semibold ${item.hoursLostToSubs > 0 ? 'text-orange-600' : 'text-slate-700'}`}>{item.hoursLostToSubs}h</span>
                        </span>
                        {item.shortfall > 0 && (
                          <span className="text-[0.68rem] text-(--wfcts-muted)">
                            Shortfall: <span className="font-semibold text-red-600">{item.shortfall}h</span>
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* ── Recent Ledger ───────────────────────────────────────────────── */}
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-4 px-1">
              <h4 className="font-label text-xs font-bold uppercase tracking-[0.22em] text-(--wfcts-muted)">
                History
              </h4>
              <span className="text-xs font-semibold text-(--wfcts-muted)">
                {filteredLedger.length} {filteredLedger.length === 1 ? 'entry' : 'entries'}
              </span>
            </div>

            {filteredLedger.length === 0 ? (
              <div className="wfcts-card p-8 text-center">
                <p className="font-semibold text-slate-800">No entries in this view</p>
                <p className="mt-2 text-sm text-(--wfcts-muted)">Switch filters or log a substitution to get started.</p>
              </div>
            ) : (
              filteredLedger.map((entry) => {
                const meta = directionMeta(entry.direction)
                return (
                  <div key={entry.id} className="wfcts-card flex items-center gap-4 p-5 transition-colors hover:bg-white">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${meta.iconClass}`}>
                      <span className="material-symbols-outlined">{meta.icon}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <h5 className="truncate text-sm font-bold text-slate-900">{entry.counterpartName}</h5>
                        <span className="font-headline text-lg font-extrabold text-(--wfcts-primary)">{meta.delta}</span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="text-xs text-(--wfcts-muted)">{formatDate(entry.date)}</p>
                        {entry.className && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.6rem] font-bold text-slate-500">{entry.className}</span>
                        )}
                        {entry.startTime && (
                          <span className="text-[0.6rem] text-(--wfcts-muted)">{entry.startTime}–{entry.endTime}</span>
                        )}
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.14em] ${meta.badgeClass}`}>{meta.label}</span>
                        <span className={`rounded-full px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.14em] ${statusClasses(entry.status)}`}>{entry.status}</span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </section>
        </div>

        {/* ── Sidebar ────────────────────────────────────────────────────────── */}
        <aside className="space-y-5">
          <SummaryTile label="Credits Given" value={creditsGiven.length} tone="primary" />
          <SummaryTile label="Subs Taken" value={substitutionsReceived.length} tone="secondary" />
          <SummaryTile label="Pending" value={pendingCount} tone="tertiary" />

          {combinedLedger.length > 0 && (
            <section className="wfcts-card p-5">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-(--wfcts-muted) mb-3">Recent Activity</p>
              <div className="space-y-2">
                {combinedLedger.slice(0, 5).map((entry) => {
                  const meta = directionMeta(entry.direction)
                  return (
                    <div key={entry.id} className="flex items-center gap-3 rounded-2xl bg-(--wfcts-surface-muted) px-3 py-2.5">
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-[0.65rem] font-bold ${meta.iconClass}`}>
                        {meta.delta}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-slate-800">{entry.counterpartName}</p>
                        <p className="text-[0.62rem] text-(--wfcts-muted)">{formatDate(entry.date)}{entry.className ? ` · ${entry.className}` : ''}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}

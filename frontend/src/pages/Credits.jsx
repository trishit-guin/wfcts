import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useWFCTS } from '../context/WFCTSContext'
import { formatDate } from '../utils/formatDate'

function dayOfWeekFromDate(dateText) {
  const date = new Date(dateText)
  if (Number.isNaN(date.getTime())) return null
  return date.getDay()
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
      label: 'Substitution',
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
    iconClass: 'bg-[var(--wfcts-secondary)]/12 text-[var(--wfcts-secondary)]',
    badgeClass: 'bg-[var(--wfcts-secondary)]/14 text-[var(--wfcts-secondary)]',
    delta: '+1',
    description: 'Covered for',
  }
}

function statusClasses(status) {
  if (status === 'Repaid') return 'bg-[var(--wfcts-secondary)]/14 text-[var(--wfcts-secondary)]'
  return 'bg-orange-100 text-[#7c2d12]'
}

function SummaryTile({ label, value, tone }) {
  const tones = {
    primary: 'bg-[var(--wfcts-primary)]/8 text-[var(--wfcts-primary)]',
    secondary: 'bg-[var(--wfcts-secondary)]/10 text-[var(--wfcts-secondary)]',
    tertiary: 'bg-orange-100 text-[#9a3412]',
  }

  return (
    <div className="wfcts-card p-5">
      <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${tones[tone]}`}>
        <span className="material-symbols-outlined text-[1.25rem]">
          {tone === 'primary' ? 'payments' : tone === 'secondary' ? 'history_edu' : 'schedule'}
        </span>
      </div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--wfcts-muted)]">{label}</p>
      <p className="font-headline mt-2 text-3xl font-extrabold tracking-[-0.05em] text-[var(--wfcts-primary)]">{value}</p>
    </div>
  )
}

export default function Credits() {
  const { user } = useAuth()
  const {
    substituteEntries,
    teacherDirectory,
    availableTeachers,
    settlementPlan,
    addSubstituteEntry,
    fetchAvailableTeachers,
    refreshSettlementPlan,
  } = useWFCTS()

  const [showComposer, setShowComposer] = useState(false)
  const [activeFilter, setActiveFilter] = useState('ALL')
  const [form, setForm] = useState({
    counterpartTeacherId: '',
    direction: 'CREDIT',
    status: 'Pending',
    date: new Date().toISOString().slice(0, 10),
    startTime: '09:00',
    endTime: '10:00',
  })
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRefreshingPlan, setIsRefreshingPlan] = useState(false)

  const teacherEntries = useMemo(
    () => substituteEntries.filter((entry) => entry.teacherId === user?.id),
    [substituteEntries, user?.id],
  )

  const creditsGiven = teacherEntries.filter((entry) => (entry.direction || 'CREDIT') === 'CREDIT')
  const substitutionsReceived = teacherEntries.filter((entry) => (entry.direction || 'CREDIT') === 'SUBSTITUTION')

  const pendingCredits = creditsGiven.filter((entry) => entry.status === 'Pending').length
  const pendingSubstitutions = substitutionsReceived.filter((entry) => entry.status === 'Pending').length
  const pendingCount = pendingCredits + pendingSubstitutions
  const netBalance = creditsGiven.length - substitutionsReceived.length

  const teacherNameById = useMemo(
    () => new Map(teacherDirectory.map((teacher) => [teacher.id, teacher.name])),
    [teacherDirectory],
  )

  const counterpartOptions = useMemo(
    () => teacherDirectory.filter((teacher) => teacher.id !== user?.id),
    [teacherDirectory, user?.id],
  )

  const visibleSettlements = useMemo(() => {
    if (!settlementPlan?.settlements) return []
    return settlementPlan.settlements.filter(
      (item) => item.fromTeacherId === user?.id || item.toTeacherId === user?.id,
    )
  }, [settlementPlan, user?.id])

  const visibleBalances = useMemo(() => {
    if (!settlementPlan?.balances) return []
    return settlementPlan.balances.filter((item) => item.teacherId === user?.id)
  }, [settlementPlan, user?.id])

  const firstSettlement = visibleSettlements[0]

  const combinedLedger = useMemo(() => {
    const rows = teacherEntries.map((entry) => {
      const direction = entry.direction || 'CREDIT'
      const counterpartName = teacherNameById.get(entry.counterpartTeacherId) || entry.coveredFor || 'Faculty Member'
      return {
        ...entry,
        direction,
        counterpartName,
      }
    })

    rows.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    return rows
  }, [teacherEntries, teacherNameById])

  const filteredLedger = combinedLedger.filter((entry) => {
    if (activeFilter === 'ALL') return true
    return entry.direction === activeFilter
  })

  useEffect(() => {
    const dayOfWeek = dayOfWeekFromDate(form.date)
    if (dayOfWeek === null || !form.startTime || !form.endTime) return

    fetchAvailableTeachers({
      dayOfWeek,
      startTime: form.startTime,
      endTime: form.endTime,
      excludeTeacherId: user?.id,
    }).catch(() => {})
  }, [fetchAvailableTeachers, form.date, form.endTime, form.startTime, user?.id])

  async function handleSubmit(event) {
    event.preventDefault()

    if (!form.counterpartTeacherId) {
      setFormError('Select a teacher to link this entry.')
      setShowComposer(true)
      return
    }

    setFormError('')
    setIsSubmitting(true)

    try {
      const linkedName = teacherNameById.get(form.counterpartTeacherId) || 'Teacher'
      await addSubstituteEntry({
        counterpartTeacherId: form.counterpartTeacherId,
        coveredFor: linkedName,
        direction: form.direction,
        status: form.status,
        date: form.date,
      })

      setForm({
        counterpartTeacherId: '',
        direction: 'CREDIT',
        status: 'Pending',
        date: new Date().toISOString().slice(0, 10),
        startTime: '09:00',
        endTime: '10:00',
      })
      setShowComposer(false)
      await refreshSettlementPlan()
    } catch (error) {
      setFormError(error.message || 'Unable to save substitution entry.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleRefreshPlan() {
    setIsRefreshingPlan(true)
    try {
      await refreshSettlementPlan()
    } finally {
      setIsRefreshingPlan(false)
    }
  }

  return (
    <div className="space-y-8 animate-float-in">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-label text-xs font-bold uppercase tracking-[0.26em] text-[var(--wfcts-muted)]">
            Credits Ledger
          </p>
          <h2 className="font-headline mt-2 text-4xl font-extrabold tracking-[-0.06em] text-[var(--wfcts-primary)] sm:text-5xl">
            Credits
          </h2>
        </div>
        <div className="rounded-[1.4rem] bg-[var(--wfcts-secondary)]/12 px-5 py-4 text-right">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-[var(--wfcts-secondary)]/80">
            Current Balance
          </p>
          <p className="font-headline text-2xl font-extrabold tracking-[-0.04em] text-[var(--wfcts-secondary)]">
            {netBalance > 0 ? '+' : ''}{netBalance} credits
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[var(--wfcts-primary)] to-[#284bb0] p-6 text-white shadow-[0_24px_60px_rgba(30,58,138,0.22)]">
            <div className="absolute right-[-12%] top-[-18%] h-40 w-40 rounded-full bg-white/8 blur-3xl" />
            <div className="relative z-10">
              <div className="mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-[var(--wfcts-secondary-soft)]">account_tree</span>
                <h3 className="text-sm font-bold tracking-[0.08em] text-white">Smart Settlement Recommended</h3>
              </div>

              <div className="rounded-[1.5rem] border border-white/8 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-sm leading-relaxed text-blue-100">
                  {firstSettlement
                    ? `System found a linked settlement path. ${firstSettlement.fromTeacherName} should settle ${firstSettlement.amount} with ${firstSettlement.toTeacherName}.`
                    : 'No chain settlement is required right now. Your linked credit ledger is currently balanced or awaiting more entries.'}
                </p>

                {firstSettlement && (
                  <div className="mt-4 flex items-center justify-between text-white">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-blue-200/30 bg-blue-300/15 text-[0.62rem] font-bold">
                        YOU
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-[var(--wfcts-secondary-soft)]/70">trending_flat</span>
                    <div className="flex flex-col items-center gap-2 opacity-60">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-slate-300/10 text-[0.62rem] font-bold">
                        {initials(firstSettlement.fromTeacherName)}
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-[var(--wfcts-secondary-soft)]/70">trending_flat</span>
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--wfcts-secondary-soft)]/35 bg-[var(--wfcts-secondary-soft)]/14 text-[0.62rem] font-bold text-[var(--wfcts-secondary-soft)]">
                        {initials(firstSettlement.toTeacherName)}
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleRefreshPlan}
                  className="mt-4 w-full rounded-[1rem] bg-[var(--wfcts-secondary-soft)] px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-[#032521] transition-transform active:scale-[0.98]"
                >
                  {isRefreshingPlan ? 'Refreshing...' : 'Refresh Settlement Plan'}
                </button>
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex w-fit rounded-full bg-[var(--wfcts-surface-muted)] p-1">
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
                      ? 'bg-white text-[var(--wfcts-primary)] shadow-sm'
                      : 'text-[var(--wfcts-muted)] hover:text-[var(--wfcts-primary)]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowComposer((current) => !current)}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--wfcts-primary)] text-white shadow-lg shadow-[var(--wfcts-primary)]/20 transition-transform active:scale-95"
              aria-label="Add credit entry"
            >
              <span className="material-symbols-outlined">add</span>
            </button>
          </section>

          {showComposer && (
            <section className="wfcts-card p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-label text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[var(--wfcts-muted)]">
                    Linked Entry
                  </p>
                  <h3 className="font-headline text-2xl font-bold text-[var(--wfcts-primary)]">Add Credit or Substitution</h3>
                </div>
                <span className="wfcts-chip bg-[var(--wfcts-primary)]/8 text-[var(--wfcts-primary)]">
                  Backend Connected
                </span>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-700">Counterpart Teacher</span>
                    <select
                      value={form.counterpartTeacherId}
                      onChange={(event) => {
                        setForm((prev) => ({ ...prev, counterpartTeacherId: event.target.value }))
                        if (formError) setFormError('')
                      }}
                      className="w-full rounded-[1rem] border border-slate-200 bg-[var(--wfcts-surface-muted)] px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[var(--wfcts-primary)]/20 focus:bg-white focus:ring-2 focus:ring-[var(--wfcts-primary)]/10"
                    >
                      <option value="">Select counterpart teacher</option>
                      {counterpartOptions.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-700">Entry Type</span>
                    <select
                      value={form.direction}
                      onChange={(event) => setForm((prev) => ({ ...prev, direction: event.target.value }))}
                      className="w-full rounded-[1rem] border border-slate-200 bg-[var(--wfcts-surface-muted)] px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[var(--wfcts-primary)]/20 focus:bg-white focus:ring-2 focus:ring-[var(--wfcts-primary)]/10"
                    >
                      <option value="CREDIT">I covered for this teacher</option>
                      <option value="SUBSTITUTION">This teacher covered for me</option>
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-700">Status</span>
                    <select
                      value={form.status}
                      onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
                      className="w-full rounded-[1rem] border border-slate-200 bg-[var(--wfcts-surface-muted)] px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[var(--wfcts-primary)]/20 focus:bg-white focus:ring-2 focus:ring-[var(--wfcts-primary)]/10"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Repaid">Repaid</option>
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-700">Date</span>
                    <input
                      type="date"
                      value={form.date}
                      onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
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
                </div>

                <div className="rounded-[1.5rem] border border-[var(--wfcts-primary)]/10 bg-[var(--wfcts-primary)]/4 p-4">
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[var(--wfcts-primary)]">
                    Available Teachers For Selected Timing
                  </p>
                  {availableTeachers.length === 0 ? (
                    <p className="mt-2 text-sm text-[var(--wfcts-muted)]">No free teachers were found for this slot.</p>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {availableTeachers.map((teacher) => (
                        <button
                          key={teacher.id}
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, counterpartTeacherId: teacher.id }))}
                          className={`rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${
                            form.counterpartTeacherId === teacher.id
                              ? 'border-[var(--wfcts-secondary)]/30 bg-[var(--wfcts-secondary)]/12 text-[var(--wfcts-secondary)]'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-[var(--wfcts-primary)]/20'
                          }`}
                        >
                          {teacher.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {formError && <p className="text-sm text-red-600">{formError}</p>}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-full bg-gradient-to-br from-[var(--wfcts-primary)] to-[#284bb0] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[var(--wfcts-primary)]/15 transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmitting ? 'Saving...' : 'Add Entry'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowComposer(false)}
                    className="rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600"
                  >
                    Close
                  </button>
                </div>
              </form>
            </section>
          )}

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-4 px-1">
              <h4 className="font-label text-xs font-bold uppercase tracking-[0.22em] text-[var(--wfcts-muted)]">
                Recent Ledger
              </h4>
              <span className="text-xs font-semibold text-[var(--wfcts-muted)]">
                {filteredLedger.length} entry{filteredLedger.length === 1 ? '' : 'ies'}
              </span>
            </div>

            {filteredLedger.length === 0 ? (
              <div className="wfcts-card p-8 text-center">
                <p className="font-semibold text-slate-800">No ledger items in this view</p>
                <p className="mt-2 text-sm text-[var(--wfcts-muted)]">
                  Switch filters or add a linked credit entry to populate your ledger.
                </p>
              </div>
            ) : (
              filteredLedger.map((entry) => {
                const meta = directionMeta(entry.direction)
                return (
                  <div
                    key={entry.id}
                    className="wfcts-card flex items-center gap-4 p-5 transition-colors hover:bg-white"
                  >
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${meta.iconClass}`}>
                      <span className="material-symbols-outlined">{meta.icon}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <h5 className="truncate text-sm font-bold text-slate-900">{entry.counterpartName}</h5>
                        <span className="font-headline text-lg font-extrabold text-[var(--wfcts-primary)]">
                          {meta.delta}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs text-[var(--wfcts-muted)]">
                          {meta.description} {entry.counterpartName} • {formatDate(entry.date)}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.14em] ${meta.badgeClass}`}>
                            {meta.label}
                          </span>
                          <span className={`rounded-full px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.14em] ${statusClasses(entry.status)}`}>
                            {entry.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </section>
        </div>

        <aside className="space-y-5">
          <SummaryTile label="Credits Given" value={creditsGiven.length} tone="primary" />
          <SummaryTile label="Substitutions Taken" value={substitutionsReceived.length} tone="secondary" />
          <SummaryTile label="Pending Items" value={pendingCount} tone="tertiary" />

          <section className="wfcts-card p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--wfcts-primary)]/10 text-[var(--wfcts-primary)]">
                <span className="material-symbols-outlined">account_balance_wallet</span>
              </span>
              <div>
                <p className="font-headline text-lg font-bold text-[var(--wfcts-primary)]">Your Linked Balance</p>
                <p className="text-sm text-[var(--wfcts-muted)]">Derived from the live settlement engine.</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {visibleBalances.length === 0 ? (
                <div className="wfcts-card-muted p-4">
                  <p className="text-sm text-[var(--wfcts-muted)]">No unsettled balances are currently attached to your account.</p>
                </div>
              ) : (
                visibleBalances.map((item) => (
                  <div key={item.teacherId} className="wfcts-card-muted flex items-center justify-between p-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{item.teacherName}</p>
                      <p className="text-xs text-[var(--wfcts-muted)]">Current net balance</p>
                    </div>
                    <span className={`font-headline text-xl font-extrabold ${item.balance >= 0 ? 'text-[var(--wfcts-secondary)]' : 'text-[#9a3412]'}`}>
                      {item.balance > 0 ? '+' : ''}{item.balance}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="mt-5 rounded-[1.4rem] bg-[var(--wfcts-surface-muted)] p-4">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[var(--wfcts-muted)]">
                Settlement Snapshot
              </p>
              <p className="mt-2 text-sm text-slate-800">
                Pending linked credits: <span className="font-bold">{settlementPlan?.totalPendingLinkedCredits || 0}</span>
              </p>
              <p className="mt-1 text-sm text-slate-800">
                Unsettled teachers: <span className="font-bold">{settlementPlan?.unsettledTeachers || 0}</span>
              </p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

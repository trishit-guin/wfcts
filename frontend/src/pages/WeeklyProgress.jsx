import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useWFCTS } from '../context/WFCTSContext'

const BREAKDOWN_LABELS = {
  lectureHours: { label: 'Lectures', icon: 'menu_book', color: 'bg-blue-400' },
  labHours: { label: 'Labs', icon: 'science', color: 'bg-teal-400' },
  subCoverHours: { label: 'Sub Cover', icon: 'swap_horiz', color: 'bg-rose-400' },
  adminHours: { label: 'Admin', icon: 'assignment', color: 'bg-slate-400' },
  extraDutyHours: { label: 'Extra Duty', icon: 'bolt', color: 'bg-amber-400' },
  meetingHours: { label: 'Meetings', icon: 'groups', color: 'bg-purple-400' },
  manualLogHours: { label: 'Manual Logs', icon: 'edit_note', color: 'bg-slate-300' },
}

function SymIcon({ name, className = '' }) {
  return (
    <span className={`material-symbols-outlined leading-none ${className}`} aria-hidden="true">
      {name}
    </span>
  )
}

function ProgressArc({ percent, size = 80, stroke = 8, color = 'var(--wfcts-primary)' }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.min(percent, 100) / 100) * circ

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  )
}

function WeekCard({ week, isCurrent }) {
  const teachPct = week.percentages?.teaching ?? 0
  const otherPct = week.percentages?.other ?? 0
  const totalPct = week.percentages?.total ?? 0

  return (
    <div className={`wfcts-card p-6 ${isCurrent ? 'ring-2 ring-[var(--wfcts-primary)]/30' : ''}`}>
      {isCurrent && (
        <div className="mb-3">
          <span className="rounded-full bg-[var(--wfcts-primary)]/10 px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-wider text-[var(--wfcts-primary)]">
            Current Week
          </span>
        </div>
      )}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.62rem] font-bold uppercase tracking-wider text-slate-400">{week.weekId}</p>
          <p className="mt-1 text-sm font-semibold text-slate-700">
            {week.weekStart} – {week.weekEnd}
          </p>
        </div>
        <div className="relative flex h-16 w-16 items-center justify-center">
          <ProgressArc percent={totalPct} size={64} stroke={6} />
          <span className="absolute text-sm font-extrabold text-[var(--wfcts-primary)]">{totalPct}%</span>
        </div>
      </div>

      <div className="space-y-2">
        <div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Teaching</span>
            <span className="font-semibold text-slate-700">{week.teachingHours}h / {week.targets?.teaching ?? 20}h</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[var(--wfcts-primary)] transition-all"
              style={{ width: `${teachPct}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Admin Work</span>
            <span className="font-semibold text-slate-700">
              {week.otherHours}h{week.targets?.admin != null ? ` / ${week.targets.admin}h` : ''}
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[var(--wfcts-secondary)] transition-all"
              style={{ width: `${otherPct}%` }}
            />
          </div>
        </div>
      </div>

      {week.breakdown && (
        <div className="mt-4 flex flex-wrap gap-2">
          {Object.entries(BREAKDOWN_LABELS).map(([key, meta]) => {
            const hrs = week.breakdown[key]
            if (!hrs) return null
            return (
              <div key={key} className="flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-[0.6rem] font-semibold text-slate-600">
                <span className={`h-2 w-2 rounded-full ${meta.color}`} />
                {meta.label}: {hrs}h
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function WeeklyProgress() {
  const { user } = useAuth()
  const { weeklyProgress, weeklyProgressHistory, fetchWeeklyProgress, fetchWeeklyProgressHistory, snapshotWeeklyProgress } = useWFCTS()

  const [loading, setLoading] = useState(false)
  const [snapshotting, setSnapshotting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetchWeeklyProgress(),
      fetchWeeklyProgressHistory(16),
    ])
      .catch((e) => setError(e.message || 'Failed to load progress'))
      .finally(() => setLoading(false))
  }, [fetchWeeklyProgress, fetchWeeklyProgressHistory])

  const handleSnapshot = async () => {
    setSnapshotting(true)
    try {
      await snapshotWeeklyProgress()
      await fetchWeeklyProgressHistory(16)
    } catch (e) {
      setError(e.message || 'Snapshot failed')
    } finally {
      setSnapshotting(false)
    }
  }

  const currentProgress = weeklyProgress

  return (
    <div className="space-y-8 animate-float-in">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-label text-[0.62rem] font-bold uppercase tracking-[0.28em] text-[var(--wfcts-muted)]">
            Workload Compliance
          </p>
          <h1 className="font-headline text-3xl font-extrabold tracking-[-0.05em] text-[var(--wfcts-primary)] sm:text-4xl">
            Weekly Progress
          </h1>
          <p className="mt-2 max-w-lg text-sm text-[var(--wfcts-muted)]">
            Teaching target is set from your timetable. Admin work target is configured by your department head. History shows the last 16 weeks.
          </p>
        </div>
        <button
          onClick={handleSnapshot}
          disabled={snapshotting}
          className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          <SymIcon name="save" className="text-base" />
          {snapshotting ? 'Saving…' : 'Save Snapshot'}
        </button>
      </div>

      {error && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="material-symbols-outlined animate-spin text-[2rem] text-[var(--wfcts-primary)]">
            progress_activity
          </span>
        </div>
      ) : (
        <>
          {/* Current week summary */}
          {currentProgress && (
            <div className="rounded-3xl bg-[var(--wfcts-primary)] p-8 text-white shadow-[0_22px_60px_rgba(30,58,138,0.22)]">
              <div className="flex flex-wrap items-start justify-between gap-6">
                <div>
                  <p className="text-[0.62rem] font-bold uppercase tracking-wider text-white/60">
                    {currentProgress.weekId}
                  </p>
                  <h2 className="font-headline mt-1 text-2xl font-extrabold">This Week</h2>
                  <p className="mt-1 text-sm text-white/70">
                    {currentProgress.weekStart} – {currentProgress.weekEnd}
                  </p>
                </div>

                <div className="flex gap-8">
                  {[
                    {
                      label: 'Teaching',
                      hours: currentProgress.teachingHours,
                      target: currentProgress.targets?.teaching,
                      pct: currentProgress.percentages?.teaching ?? 0,
                      color: 'rgba(255,255,255,0.9)',
                    },
                    {
                      label: 'Admin Work',
                      hours: currentProgress.otherHours,
                      target: currentProgress.targets?.admin,
                      pct: currentProgress.percentages?.other ?? 0,
                      color: '#5eead4',
                    },
                    {
                      label: 'Total',
                      hours: currentProgress.totalHours,
                      target: currentProgress.targets?.total,
                      pct: currentProgress.percentages?.total ?? 0,
                      color: '#fbbf24',
                    },
                  ].map(({ label, hours, target, pct, color }) => (
                    <div key={label} className="flex flex-col items-center gap-2">
                      <div className="relative flex h-[72px] w-[72px] items-center justify-center">
                        <ProgressArc percent={pct} size={72} stroke={7} color={color} />
                        <span className="absolute text-sm font-extrabold text-white">{pct}%</span>
                      </div>
                      <div className="text-center">
                        <p className="text-[0.6rem] font-bold uppercase tracking-wider text-white/60">{label}</p>
                        <p className="text-sm font-bold text-white">
                          {hours}h{target != null && target > 0 ? ` / ${target}h` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Breakdown pills */}
              {currentProgress.breakdown && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {Object.entries(BREAKDOWN_LABELS).map(([key, meta]) => {
                    const hrs = currentProgress.breakdown[key]
                    if (!hrs) return null
                    return (
                      <div key={key} className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
                        <SymIcon name={meta.icon} className="text-xs" />
                        {meta.label}: {hrs}h
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* History grid */}
          {weeklyProgressHistory.length > 0 && (
            <div>
              <h2 className="font-headline mb-4 text-lg font-bold text-slate-700">History</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {weeklyProgressHistory.map((week) => (
                  <WeekCard
                    key={week.weekId}
                    week={week}
                    isCurrent={week.weekId === currentProgress?.weekId}
                  />
                ))}
              </div>
            </div>
          )}

          {!currentProgress && weeklyProgressHistory.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-4 rounded-3xl border border-slate-100 bg-slate-50">
              <SymIcon name="bar_chart" className="text-[3rem] text-slate-300" />
              <p className="font-semibold text-slate-600">No progress data yet</p>
              <p className="text-sm text-slate-400">Complete calendar events to populate your weekly progress.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

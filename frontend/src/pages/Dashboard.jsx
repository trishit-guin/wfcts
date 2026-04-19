import { useMemo, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useWFCTS } from '../context/WFCTSContext'
import { formatDate } from '../utils/formatDate'
import { getRequiredHours } from '../utils/subjectHours'

const dayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function workloadLevel(percent) {
  if (percent >= 80) {
    return {
      label: 'Optimal',
      badgeClass: 'bg-[var(--wfcts-secondary)]/14 text-[var(--wfcts-secondary)]',
    }
  }

  if (percent >= 45) {
    return {
      label: 'On Track',
      badgeClass: 'bg-[var(--wfcts-primary)]/10 text-[var(--wfcts-primary)]',
    }
  }

  return {
    label: 'Low Load',
    badgeClass: 'bg-amber-100 text-amber-700',
  }
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

function iconForWorkType(type) {
  if (type === 'Lecture') return 'menu_book'
  if (type === 'Lab') return 'science'
  if (type === 'Admin') return 'assignment'
  if (type === 'Extra Duty') return 'bolt'
  return 'history_edu'
}

function OverviewCard({ icon, label, value, sub, badge, tone }) {
  const toneClasses = {
    primary: 'text-[var(--wfcts-primary)] bg-[var(--wfcts-primary)]/8',
    secondary: 'text-[var(--wfcts-secondary)] bg-[var(--wfcts-secondary)]/10',
    tertiary: 'text-[#9a3412] bg-orange-100',
  }

  return (
    <div className="wfcts-card p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${toneClasses[tone]}`}>
          <span className="material-symbols-outlined text-[1.35rem]">{icon}</span>
        </span>
        {badge && <span className="wfcts-chip bg-slate-100 text-slate-600">{badge}</span>}
      </div>
      <p className="text-sm font-medium text-[var(--wfcts-muted)]">{label}</p>
      <p className="font-headline mt-2 text-3xl font-extrabold tracking-[-0.04em] text-[var(--wfcts-primary)]">
        {value}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-[var(--wfcts-muted)]">{sub}</p>
    </div>
  )
}

function ProgressRow({ item }) {
  const progress = item.requiredHours
    ? Math.min(Math.round((item.completedHours / item.requiredHours) * 100), 100)
    : 0

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm font-semibold">
        <span className="text-slate-800">{item.name}</span>
        <span className="text-[var(--wfcts-primary)]">
          {item.completedHours}/{item.requiredHours} Hours
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-200/80">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--wfcts-primary)] to-[#4f7bff] shadow-[0_0_16px_rgba(30,58,138,0.18)]"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

function ActivityRow({ entry }) {
  return (
    <div className="group flex items-center gap-4 rounded-[1.4rem] px-4 py-4 transition-colors hover:bg-slate-50">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--wfcts-secondary)]/10 text-[var(--wfcts-secondary)]">
        <span className="material-symbols-outlined">{iconForWorkType(entry.workType)}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-slate-900">
          {entry.subject || 'Work Entry'}
        </p>
        <p className="text-xs text-[var(--wfcts-muted)]">
          {formatDate(entry.date)} • {entry.hours} Hours • {entry.workType || 'Recorded'}
        </p>
      </div>
      <span className="material-symbols-outlined text-slate-300 transition-colors group-hover:text-[var(--wfcts-primary)]">
        chevron_right
      </span>
    </div>
  )
}

function ScheduleItem({ slot, highlight }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`h-3 w-3 rounded-full ${highlight ? 'bg-[var(--wfcts-secondary)] shadow-[0_0_12px_rgba(13,148,136,0.5)]' : 'border-2 border-white/40'}`} />
        <div className="my-2 h-full w-px bg-white/20" />
      </div>
      <div className="pb-2">
        <p className={`text-[0.65rem] font-bold uppercase tracking-[0.24em] ${highlight ? 'text-[var(--wfcts-secondary-soft)]' : 'text-white/60'}`}>
          {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
        </p>
        <p className="font-headline mt-1 text-lg font-bold leading-tight text-white">
          {slot.subject || 'Open Slot'}
        </p>
        <p className="text-xs text-white/75">
          {slot.className || 'Teaching block'}{slot.location ? ` • ${slot.location}` : ''}
        </p>
      </div>
    </div>
  )
}

function WeeklyProgressBanner({ weeklyProgress, onNavigate }) {
  const [expanded, setExpanded] = useState(false)

  const teachPct = weeklyProgress?.percentages?.teaching ?? 0
  const otherPct = weeklyProgress?.percentages?.other ?? 0
  const totalPct = weeklyProgress?.percentages?.total ?? 0

  const statusColor = totalPct >= 75 ? 'text-emerald-600' : totalPct >= 40 ? 'text-(--wfcts-primary)' : 'text-amber-600'
  const barColor = totalPct >= 75 ? 'bg-emerald-500' : totalPct >= 40 ? 'bg-(--wfcts-primary)' : 'bg-amber-500'

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 ${expanded ? 'shadow-md' : ''}`}
    >
      {/* Collapsed bar — always visible, click to expand */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-4 px-5 py-3.5 text-left"
      >
        <span className="material-symbols-outlined text-base text-slate-400">
          {expanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
        </span>

        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="hidden text-[0.62rem] font-bold uppercase tracking-wider text-slate-400 sm:inline whitespace-nowrap">
            {weeklyProgress ? `Week ${weeklyProgress.weekId?.split('-W')[1]}` : 'This Week'}
          </span>

          {/* Thin composite bar */}
          <div className="relative flex-1 h-2.5 overflow-hidden rounded-full bg-slate-100">
            {/* teaching portion */}
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-linear-to-r from-(--wfcts-primary) to-[#4f7bff] transition-all duration-500"
              style={{ width: `${Math.min(teachPct / 2, 50)}%` }}
            />
            {/* other duties portion */}
            <div
              className="absolute top-0 h-full rounded-full bg-linear-to-r from-(--wfcts-secondary) to-teal-400 transition-all duration-500"
              style={{ left: '50%', width: `${Math.min(otherPct / 2, 50)}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className={`text-sm font-extrabold tabular-nums ${statusColor}`}>
            {weeklyProgress?.totalHours ?? 0}h
            <span className="ml-1 text-[0.65rem] font-semibold text-slate-400">/ 40h</span>
          </span>
          <span className={`hidden rounded-full px-2.5 py-0.5 text-[0.6rem] font-bold sm:inline ${
            totalPct >= 75 ? 'bg-emerald-100 text-emerald-700'
            : totalPct >= 40 ? 'bg-blue-100 text-blue-700'
            : 'bg-amber-100 text-amber-700'
          }`}>
            {totalPct}%
          </span>
        </div>
      </button>

      {/* Overall thin progress rail */}
      <div className="h-0.5 w-full bg-slate-100">
        <div
          className={`h-full transition-all duration-500 ${barColor}`}
          style={{ width: `${totalPct}%` }}
        />
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-slate-100 px-5 py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-2">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="inline-block h-2 w-2 rounded-full bg-(--wfcts-primary)" />
                  Teaching
                </span>
                <span className="text-(--wfcts-primary)">{weeklyProgress?.teachingHours ?? 0}h / 20h</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-linear-to-r from-(--wfcts-primary) to-[#4f7bff] transition-all duration-500"
                  style={{ width: `${teachPct}%` }}
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {weeklyProgress?.breakdown?.lectureHours > 0 && (
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[0.6rem] font-semibold text-blue-600">
                    Lectures {weeklyProgress.breakdown.lectureHours}h
                  </span>
                )}
                {weeklyProgress?.breakdown?.labHours > 0 && (
                  <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[0.6rem] font-semibold text-teal-600">
                    Labs {weeklyProgress.breakdown.labHours}h
                  </span>
                )}
                {weeklyProgress?.breakdown?.subCoverHours > 0 && (
                  <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[0.6rem] font-semibold text-rose-600">
                    Sub Cover {weeklyProgress.breakdown.subCoverHours}h
                  </span>
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-2">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="inline-block h-2 w-2 rounded-full bg-(--wfcts-secondary)" />
                  Other Duties
                </span>
                <span className="text-(--wfcts-secondary)">{weeklyProgress?.otherHours ?? 0}h / 20h</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-linear-to-r from-(--wfcts-secondary) to-teal-400 transition-all duration-500"
                  style={{ width: `${otherPct}%` }}
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {weeklyProgress?.breakdown?.adminHours > 0 && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.6rem] font-semibold text-slate-600">
                    Admin {weeklyProgress.breakdown.adminHours}h
                  </span>
                )}
                {weeklyProgress?.breakdown?.meetingHours > 0 && (
                  <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[0.6rem] font-semibold text-purple-600">
                    Meetings {weeklyProgress.breakdown.meetingHours}h
                  </span>
                )}
                {weeklyProgress?.breakdown?.extraDutyHours > 0 && (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[0.6rem] font-semibold text-amber-600">
                    Extra Duty {weeklyProgress.breakdown.extraDutyHours}h
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-400">{weeklyProgress?.weekStart} – {weeklyProgress?.weekEnd}</p>
            <button
              onClick={() => onNavigate('/weekly-progress')}
              className="flex items-center gap-1.5 text-xs font-bold text-(--wfcts-primary) hover:opacity-75"
            >
              Full History
              <span className="material-symbols-outlined text-sm">north_east</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { workEntries, substituteEntries, tasks, timetableSlots, industrySessions, weeklyProgress, fetchWeeklyProgress } = useWFCTS()

  useEffect(() => {
    fetchWeeklyProgress().catch(() => {})
  }, [fetchWeeklyProgress])

  const teacherEntries = useMemo(
    () => workEntries.filter((entry) => entry.teacherId === user?.id),
    [workEntries, user?.id],
  )

  const teacherCredits = useMemo(
    () => substituteEntries.filter((entry) => entry.teacherId === user?.id),
    [substituteEntries, user?.id],
  )

  const teacherTasks = useMemo(
    () => tasks.filter((task) => task.assignTo === user?.id),
    [tasks, user?.id],
  )

  const teacherSlots = useMemo(
    () => timetableSlots
      .filter((slot) => slot.teacherId === user?.id)
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime)),
    [timetableSlots, user?.id],
  )

  const subjectPlans = useMemo(() => {
    const grouped = new Map()

    for (const entry of teacherEntries) {
      const key = `${entry.subject}|${entry.className}`
      if (!grouped.has(key)) {
        grouped.set(key, {
          id: key,
          name: entry.subject,
          section: entry.className,
          requiredHours: getRequiredHours(entry.subject, entry.className),
          completedHours: 0,
        })
      }

      grouped.get(key).completedHours += Number(entry.hours) || 0
    }

    return Array.from(grouped.values())
      .sort((a, b) => b.completedHours - a.completedHours)
      .slice(0, 4)
  }, [teacherEntries])

  const totalHours = teacherEntries.reduce((sum, entry) => sum + Number(entry.hours || 0), 0)
  const totalRequiredHours = subjectPlans.reduce((sum, item) => sum + Number(item.requiredHours || 0), 0)
  const completionPercent = totalRequiredHours
    ? Math.min(Math.round((totalHours / totalRequiredHours) * 100), 100)
    : Math.min(Math.round(totalHours * 8), 100)
  const workload = workloadLevel(completionPercent)

  const creditsGiven = teacherCredits.filter((entry) => (entry.direction || 'CREDIT') === 'CREDIT')
  const substitutionsTaken = teacherCredits.filter((entry) => (entry.direction || 'CREDIT') === 'SUBSTITUTION')
  const netCreditBalance = creditsGiven.length - substitutionsTaken.length

  const pendingTasks = teacherTasks
    .filter((task) => task.status === 'Pending')
    .sort((a, b) => (a.deadline || '').localeCompare(b.deadline || ''))
  const nextTask = pendingTasks[0]

  const recentLogs = [...teacherEntries]
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 4)

  const todayIndex = new Date().getDay()
  const todaySlots = teacherSlots.filter((slot) => slot.dayOfWeek === todayIndex)
  const displayedSchedule = todaySlots.length > 0 ? todaySlots.slice(0, 3) : teacherSlots.slice(0, 3)
  const scheduleLabel = todaySlots.length > 0 ? `Today, ${dayLabels[todayIndex]}` : 'Next recurring slots'

  const nextIndustrySession = [...industrySessions]
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    .find((session) => session.date)

  return (
    <div className="space-y-6 animate-float-in">
      <WeeklyProgressBanner weeklyProgress={weeklyProgress} onNavigate={navigate} />

      <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-label text-sm font-semibold uppercase tracking-[0.22em] text-[var(--wfcts-muted)]">
            Academic Staff Dashboard
          </p>
          <h2 className="font-headline mt-2 text-4xl font-extrabold tracking-[-0.06em] text-[var(--wfcts-primary)] sm:text-5xl">
            Welcome back, {user?.name || 'Faculty Member'}
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-[var(--wfcts-muted)] sm:text-base">
            Track your workload, credits, tasks, and recurring teaching slots from one connected workspace.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate('/work-entry')}
            className="flex items-center gap-2 rounded-full bg-gradient-to-br from-[var(--wfcts-primary)] to-[#284bb0] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[var(--wfcts-primary)]/20 transition-transform hover:-translate-y-0.5"
          >
            <span className="material-symbols-outlined text-base">add_circle</span>
            Log Work
          </button>
          <button
            type="button"
            onClick={() => navigate('/credits')}
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-[var(--wfcts-primary)] shadow-sm transition-colors hover:bg-slate-50"
          >
            <span className="material-symbols-outlined text-base">payments</span>
            Add Substitution
          </button>
          <button
            type="button"
            onClick={() => navigate('/timetable-upload')}
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-[var(--wfcts-primary)] shadow-sm transition-colors hover:bg-slate-50"
          >
            <span className="material-symbols-outlined text-base">document_scanner</span>
            Upload Timetable
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <OverviewCard
          icon="balance"
          label="Workload Balance"
          value={`${completionPercent}%`}
          sub={`${subjectPlans.length || 0} tracked subject${subjectPlans.length === 1 ? '' : 's'} contributing to your current progress.`}
          badge={workload.label}
          tone="primary"
        />
        <OverviewCard
          icon="assignment_turned_in"
          label="Pending Tasks"
          value={String(pendingTasks.length).padStart(2, '0')}
          sub={nextTask ? `Next: ${nextTask.title} due ${formatDate(nextTask.deadline)}` : 'You have no pending tasks right now.'}
          badge={pendingTasks.length > 0 ? 'Due Soon' : 'Clear'}
          tone="tertiary"
        />
        <OverviewCard
          icon="payments"
          label="Substitution Credits"
          value={`${netCreditBalance > 0 ? '+' : ''}${netCreditBalance}`}
          sub={`${creditsGiven.length} credit entries recorded and ${substitutionsTaken.length} substitution entries linked to your account.`}
          badge={netCreditBalance >= 0 ? 'Redeemable' : 'Outstanding'}
          tone="secondary"
        />
      </section>

      <section className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <div className="relative overflow-hidden rounded-[2rem] bg-[rgba(255,255,255,0.72)] p-8 shadow-[0_20px_60px_rgba(15,23,42,0.06)] ring-1 ring-white/70">
            <div className="absolute right-0 top-0 p-8 opacity-10">
              <span className="material-symbols-outlined text-[7rem]" style={{ fontVariationSettings: "'FILL' 1" }}>
                insights
              </span>
            </div>
            <div className="relative z-10 space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-headline text-xl font-bold text-[var(--wfcts-primary)]">Workload Metrics</h3>
                  <p className="mt-1 text-sm text-[var(--wfcts-muted)]">
                    Subject progress is calculated from your live work entries and required hour targets.
                  </p>
                </div>
                <span className={`wfcts-chip ${workload.badgeClass}`}>{workload.label}</span>
              </div>

              {subjectPlans.length === 0 ? (
                <div className="wfcts-card-muted p-6">
                  <p className="font-semibold text-slate-800">No teaching hours logged yet</p>
                  <p className="mt-1 text-sm text-[var(--wfcts-muted)]">
                    Add your first work entry to start populating the workload chart.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {subjectPlans.map((item) => (
                    <ProgressRow key={item.id} item={item} />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="wfcts-card p-8">
            <div className="flex items-center justify-between gap-4">
              <h3 className="font-headline text-xl font-bold text-[var(--wfcts-primary)]">Recent Logs</h3>
              <button
                type="button"
                onClick={() => navigate('/work-entry')}
                className="text-sm font-bold text-[var(--wfcts-primary)] transition-opacity hover:opacity-75"
              >
                View All
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {recentLogs.length === 0 ? (
                <div className="wfcts-card-muted p-6">
                  <p className="font-semibold text-slate-800">Nothing logged yet</p>
                  <p className="mt-1 text-sm text-[var(--wfcts-muted)]">
                    Your latest lectures, labs, and duties will appear here.
                  </p>
                </div>
              ) : (
                recentLogs.map((entry) => (
                  <ActivityRow key={entry.id} entry={entry} />
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="relative min-h-[28rem] overflow-hidden rounded-[2rem] bg-[var(--wfcts-primary)] p-8 text-white shadow-[0_22px_60px_rgba(30,58,138,0.22)]">
            <div className="absolute right-[-10%] top-[-14%] h-64 w-64 rounded-full bg-white/6 blur-3xl" />
            <div className="relative z-10 flex h-full flex-col">
              <div className="mb-8 flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-headline text-xl font-bold">Today's Schedule</h3>
                  <p className="mt-1 text-sm text-white/70">{scheduleLabel}</p>
                </div>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                  calendar_view_week
                </span>
              </div>

              <div className="flex-1 space-y-7">
                {displayedSchedule.length === 0 ? (
                  <div className="rounded-[1.5rem] border border-white/10 bg-white/10 p-5">
                    <p className="font-semibold">No recurring slots yet</p>
                    <p className="mt-1 text-sm text-white/70">
                      Add timetable slots to see your teaching rhythm here.
                    </p>
                  </div>
                ) : (
                  displayedSchedule.map((slot, index) => (
                    <ScheduleItem key={slot.id} slot={slot} highlight={index === 0} />
                  ))
                )}

                <div className="border-t border-white/10 pt-6">
                  <div className="rounded-[1.4rem] bg-white/10 p-4">
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-[var(--wfcts-secondary-soft)]">
                        notifications_active
                      </span>
                      <p className="text-sm leading-relaxed text-white/80">
                        {nextTask
                          ? `Reminder: ${nextTask.title} is due on ${formatDate(nextTask.deadline)}.`
                          : 'Your current queue is clear. Keep logging work and credits to maintain accurate tracking.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="wfcts-card-muted flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--wfcts-primary)]/10 text-[var(--wfcts-primary)]">
              <span className="material-symbols-outlined">chat</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--wfcts-primary)]">
                Coordination Cue
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-slate-800">
                {nextIndustrySession?.title || nextIndustrySession?.companyName || nextTask?.assignedBy || user?.department || 'Department Office'}
              </p>
              <p className="text-xs text-[var(--wfcts-muted)]">
                {nextIndustrySession?.date
                  ? `Upcoming session on ${formatDate(nextIndustrySession.date)}`
                  : nextTask
                    ? `Assigned by ${nextTask.assignedBy}`
                    : 'No urgent coordination items at the moment.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate(nextIndustrySession ? '/industry-sessions' : nextTask ? '/tasks' : '/profile')}
              className="ml-auto flex h-10 w-10 items-center justify-center rounded-full bg-white text-[var(--wfcts-primary)] shadow-sm"
            >
              <span className="material-symbols-outlined text-base">north_east</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

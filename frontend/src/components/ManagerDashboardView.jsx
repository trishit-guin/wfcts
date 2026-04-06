import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDate } from '../utils/formatDate'
import { buildTeacherScores, statusForScore } from '../utils/workloadScore'

function OverviewCard({ icon, label, value, sub, tone = 'primary' }) {
  const tones = {
    primary: 'bg-[var(--wfcts-primary)]/8 text-[var(--wfcts-primary)]',
    secondary: 'bg-[var(--wfcts-secondary)]/10 text-[var(--wfcts-secondary)]',
    tertiary: 'bg-orange-100 text-[#7c2d12]',
  }

  return (
    <div className="wfcts-card p-5">
      <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${tones[tone]}`}>
        <span className="material-symbols-outlined text-[1.25rem]">{icon}</span>
      </div>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--wfcts-muted)]">{label}</p>
      <p className="font-headline mt-2 text-3xl font-extrabold tracking-[-0.05em] text-[var(--wfcts-primary)]">{value}</p>
      <p className="mt-2 text-xs leading-relaxed text-[var(--wfcts-muted)]">{sub}</p>
    </div>
  )
}

export default function ManagerDashboardView({
  user,
  roleLabel,
  intro,
  teacherDirectory,
  tasks,
  substituteEntries,
  workEntries,
}) {
  const navigate = useNavigate()

  const data = useMemo(() => {
    const teacherScores = buildTeacherScores(teacherDirectory, workEntries, substituteEntries, tasks)
    const pendingTasks = [...tasks]
      .filter((task) => task.status === 'Pending')
      .sort((a, b) => (a.deadline || '').localeCompare(b.deadline || ''))
    const totalTeachers = teacherDirectory.length
    const totalSubstitutions = substituteEntries.filter(
      (entry) => (entry.direction || 'CREDIT') === 'CREDIT',
    ).length
    const totalScore = teacherScores.reduce((sum, teacher) => sum + teacher.workloadScore, 0)
    const averageScore = teacherScores.length > 0 ? (totalScore / teacherScores.length).toFixed(1) : '0.0'
    const mostActiveTeacher = teacherScores[0]
    const leastActiveTeacher = teacherScores[teacherScores.length - 1]
    const maxScore = Math.max(...teacherScores.map((teacher) => teacher.workloadScore), 1)
    const teacherNameById = new Map(teacherDirectory.map((teacher) => [teacher.id, teacher.name]))

    return {
      teacherScores,
      pendingTasks,
      totalTeachers,
      totalSubstitutions,
      averageScore,
      mostActiveTeacher,
      leastActiveTeacher,
      maxScore,
      teacherNameById,
    }
  }, [teacherDirectory, tasks, substituteEntries, workEntries])

  return (
    <div className="space-y-8 animate-float-in">
      <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-label text-sm font-semibold uppercase tracking-[0.22em] text-[var(--wfcts-muted)]">
            {roleLabel}
          </p>
          <h2 className="font-headline mt-2 text-4xl font-extrabold tracking-[-0.06em] text-[var(--wfcts-primary)] sm:text-5xl">
            Welcome back, {user?.name || 'Manager'}
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-[var(--wfcts-muted)] sm:text-base">
            {intro}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate('/assign-task')}
            className="flex items-center gap-2 rounded-full bg-gradient-to-br from-[var(--wfcts-primary)] to-[#284bb0] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[var(--wfcts-primary)]/18 transition-transform hover:-translate-y-0.5"
          >
            <span className="material-symbols-outlined text-base">task_alt</span>
            Assign Task
          </button>
          <button
            type="button"
            onClick={() => navigate('/fairness')}
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-[var(--wfcts-primary)] shadow-sm transition-colors hover:bg-slate-50"
          >
            <span className="material-symbols-outlined text-base">balance</span>
            Review Fairness
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-4">
        <OverviewCard
          icon="groups"
          label="Teachers"
          value={data.totalTeachers}
          sub="Faculty records currently active in the shared workload system."
          tone="primary"
        />
        <OverviewCard
          icon="assignment_late"
          label="Pending Tasks"
          value={data.pendingTasks.length}
          sub={data.pendingTasks[0] ? `Next deadline: ${formatDate(data.pendingTasks[0].deadline)}` : 'No pending queue right now.'}
          tone="tertiary"
        />
        <OverviewCard
          icon="history_edu"
          label="Substitutions"
          value={data.totalSubstitutions}
          sub="Credit-generating substitution records across the institution."
          tone="secondary"
        />
        <OverviewCard
          icon="insights"
          label="Avg. Workload Score"
          value={data.averageScore}
          sub="Current score uses lectures + substitution credits + completed tasks."
          tone="primary"
        />
      </section>

      <section className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="relative overflow-hidden rounded-[2rem] bg-[rgba(255,255,255,0.72)] p-8 shadow-[0_20px_60px_rgba(15,23,42,0.06)] ring-1 ring-white/70">
            <div className="absolute right-0 top-0 p-8 opacity-10">
              <span className="material-symbols-outlined text-[7rem]" style={{ fontVariationSettings: "'FILL' 1" }}>
                monitoring
              </span>
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-headline text-xl font-bold text-[var(--wfcts-primary)]">Workload Distribution</h3>
                  <p className="mt-1 text-sm text-[var(--wfcts-muted)]">
                    Live ranking based on teaching, substitution coverage, and completed workflow tasks.
                  </p>
                </div>
                <span className="rounded-full bg-[var(--wfcts-primary)]/8 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--wfcts-primary)]">
                  Ranked View
                </span>
              </div>

              <div className="mt-6 space-y-5">
                {data.teacherScores.length === 0 ? (
                  <div className="wfcts-card-muted p-6">
                    <p className="font-semibold text-slate-800">No teacher data available</p>
                    <p className="mt-1 text-sm text-[var(--wfcts-muted)]">
                      Add live records to see fairness insights populate here.
                    </p>
                  </div>
                ) : (
                  data.teacherScores.map((teacher, index) => {
                    const scoreState = statusForScore(teacher.workloadScore)
                    const widthPct = Math.max((teacher.workloadScore / data.maxScore) * 100, teacher.workloadScore > 0 ? 12 : 0)

                    return (
                      <div key={teacher.id} className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900">
                              {index + 1}. {teacher.name}
                            </p>
                            <p className="text-xs text-[var(--wfcts-muted)]">
                              Lectures {teacher.lectures} • Credits {teacher.substitutions} • Tasks {teacher.completedTasks}
                            </p>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.16em] ${scoreState.badge}`}>
                            {scoreState.label}
                          </span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-slate-200/80">
                          <div className={`h-full rounded-full ${scoreState.bar}`} style={{ width: `${widthPct}%` }} />
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="wfcts-card p-6">
            <h3 className="font-headline text-xl font-bold text-[var(--wfcts-primary)]">Balance Snapshot</h3>
            <div className="mt-5 space-y-4">
              <div className="wfcts-card-muted p-4">
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-[var(--wfcts-muted)]">Most Active</p>
                <p className="mt-2 text-lg font-bold text-slate-900">{data.mostActiveTeacher?.name || 'N/A'}</p>
                <p className="text-sm text-[var(--wfcts-muted)]">Score: {data.mostActiveTeacher?.workloadScore ?? 0}</p>
              </div>
              <div className="wfcts-card-muted p-4">
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-[var(--wfcts-muted)]">Least Active</p>
                <p className="mt-2 text-lg font-bold text-slate-900">{data.leastActiveTeacher?.name || 'N/A'}</p>
                <p className="text-sm text-[var(--wfcts-muted)]">Score: {data.leastActiveTeacher?.workloadScore ?? 0}</p>
              </div>
            </div>
          </div>

          <div className="wfcts-card p-6">
            <div className="flex items-center justify-between gap-4">
              <h3 className="font-headline text-xl font-bold text-[var(--wfcts-primary)]">Priority Queue</h3>
              <button
                type="button"
                onClick={() => navigate('/assign-task')}
                className="text-sm font-bold text-[var(--wfcts-primary)] hover:opacity-75"
              >
                View All
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {data.pendingTasks.length === 0 ? (
                <div className="wfcts-card-muted p-4">
                  <p className="text-sm text-[var(--wfcts-muted)]">No pending tasks in the queue.</p>
                </div>
              ) : (
                data.pendingTasks.slice(0, 4).map((task) => (
                  <div key={task.id} className="wfcts-card-muted p-4">
                    <p className="font-semibold text-slate-900">{task.title}</p>
                    <p className="mt-1 text-xs text-[var(--wfcts-muted)]">
                      {data.teacherNameById.get(task.assignTo) || task.assignTo} • {formatDate(task.deadline)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

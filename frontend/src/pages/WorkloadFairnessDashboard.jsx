import { useWFCTS } from '../context/WFCTSContext'
import { buildTeacherScores, statusForScore } from '../utils/workloadScore'

export default function WorkloadFairnessDashboard() {
  const { workEntries, substituteEntries, tasks, teacherDirectory } = useWFCTS()

  const teacherScores = buildTeacherScores(teacherDirectory, workEntries, substituteEntries, tasks)
  const maxScore = Math.max(...teacherScores.map((item) => item.workloadScore), 1)
  const averageScore = teacherScores.length > 0
    ? (teacherScores.reduce((sum, item) => sum + item.workloadScore, 0) / teacherScores.length).toFixed(1)
    : '0.0'
  const highLoadCount = teacherScores.filter((item) => item.workloadScore >= 8).length
  const balancedCount = teacherScores.filter((item) => item.workloadScore >= 4 && item.workloadScore < 8).length

  return (
    <div className="space-y-8 animate-float-in">
      <section>
        <p className="font-label text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[var(--wfcts-muted)]">
          Workload Insights
        </p>
        <h2 className="font-headline mt-2 text-4xl font-extrabold tracking-[-0.06em] text-[var(--wfcts-primary)] sm:text-5xl">
          Workload Fairness
        </h2>
        <p className="mt-3 text-sm text-[var(--wfcts-muted)] sm:text-base">
          Monitor relative load across teachers using the current score model: lectures + substitution credits + completed tasks.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="wfcts-card p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--wfcts-muted)]">Average Score</p>
          <p className="font-headline mt-2 text-4xl font-extrabold text-[var(--wfcts-primary)]">{averageScore}</p>
        </div>
        <div className="wfcts-card p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--wfcts-muted)]">High Load Teachers</p>
          <p className="font-headline mt-2 text-4xl font-extrabold text-[#7c2d12]">{highLoadCount}</p>
        </div>
        <div className="wfcts-card p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--wfcts-muted)]">Balanced Range</p>
          <p className="font-headline mt-2 text-4xl font-extrabold text-[var(--wfcts-secondary)]">{balancedCount}</p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          {teacherScores.map((teacher, index) => {
            const status = statusForScore(teacher.workloadScore)
            const widthPct = Math.max((teacher.workloadScore / maxScore) * 100, teacher.workloadScore > 0 ? 12 : 0)

            return (
              <div key={teacher.id} className="wfcts-card p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="font-headline text-2xl font-bold text-[var(--wfcts-primary)]">
                        {index + 1}. {teacher.name}
                      </p>
                      <span className={`rounded-full px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.16em] ${status.badge}`}>
                        {status.label}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[var(--wfcts-muted)]">Workload Score: {teacher.workloadScore}</p>
                  </div>
                </div>

                <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200/80">
                  <div className={`h-full rounded-full ${status.bar}`} style={{ width: `${widthPct}%` }} />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="wfcts-card-muted p-3">
                    <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[var(--wfcts-muted)]">Lectures</p>
                    <p className="mt-1 text-sm font-bold text-[var(--wfcts-primary)]">{teacher.lectures}</p>
                  </div>
                  <div className="wfcts-card-muted p-3">
                    <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[var(--wfcts-muted)]">Credits</p>
                    <p className="mt-1 text-sm font-bold text-[var(--wfcts-primary)]">{teacher.substitutions}</p>
                  </div>
                  <div className="wfcts-card-muted p-3">
                    <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[var(--wfcts-muted)]">Tasks</p>
                    <p className="mt-1 text-sm font-bold text-[var(--wfcts-primary)]">{teacher.completedTasks}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <aside className="space-y-5">
          <div className="wfcts-card p-5">
            <p className="text-[0.66rem] font-bold uppercase tracking-[0.2em] text-[var(--wfcts-muted)]">Algorithm</p>
            <p className="mt-3 text-sm leading-relaxed text-slate-800">
              Each teacher&apos;s workload score is currently calculated as:
            </p>
            <p className="mt-3 rounded-[1rem] bg-[var(--wfcts-surface-muted)] px-4 py-3 font-mono text-sm font-semibold text-[var(--wfcts-primary)]">
              lectures + substitutions + completedTasks
            </p>
          </div>

          <div className="wfcts-card p-5">
            <p className="text-[0.66rem] font-bold uppercase tracking-[0.2em] text-[var(--wfcts-muted)]">Interpretation</p>
            <p className="mt-3 text-sm leading-relaxed text-slate-800">
              This score is count-based, so it is best used for quick relative comparison rather than exact effort estimation.
            </p>
          </div>
        </aside>
      </section>
    </div>
  )
}

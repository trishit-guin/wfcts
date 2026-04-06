export function buildTeacherScores(teacherDirectory, workEntries, substituteEntries, tasks) {
  const rows = teacherDirectory.map((teacher) => {
    const lectures = workEntries.filter(
      (entry) => (entry.teacherId || 'u1') === teacher.id && entry.workType === 'Lecture',
    ).length

    const substitutions = substituteEntries.filter(
      (entry) => (entry.teacherId || 'u1') === teacher.id && (entry.direction || 'CREDIT') === 'CREDIT',
    ).length

    const completedTasks = tasks.filter(
      (task) => task.assignTo === teacher.id && task.status === 'Completed',
    ).length

    return {
      id: teacher.id,
      name: teacher.name,
      lectures,
      substitutions,
      completedTasks,
      workloadScore: lectures + substitutions + completedTasks,
    }
  })

  return rows.sort((a, b) => b.workloadScore - a.workloadScore)
}

export function statusForScore(score) {
  if (score >= 8) {
    return {
      label: 'High',
      badge: 'bg-orange-100 text-[#7c2d12]',
      bar: 'bg-gradient-to-r from-orange-500 to-red-500',
    }
  }

  if (score >= 4) {
    return {
      label: 'Medium',
      badge: 'bg-[var(--wfcts-primary)]/10 text-[var(--wfcts-primary)]',
      bar: 'bg-gradient-to-r from-[var(--wfcts-primary)] to-[#4f7bff]',
    }
  }

  return {
    label: 'Low',
    badge: 'bg-[var(--wfcts-secondary)]/12 text-[var(--wfcts-secondary)]',
    bar: 'bg-gradient-to-r from-[var(--wfcts-secondary)] to-[#34d399]',
  }
}

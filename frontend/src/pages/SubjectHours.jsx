import { useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { useWFCTS } from '../context/WFCTSContext'
import { getRequiredHours } from '../utils/subjectHours'

function progressMeta(percent) {
  if (percent < 50) {
    return {
      badge: 'bg-red-100 text-red-700',
      bar: 'bg-red-500',
      label: 'Low',
    }
  }
  if (percent <= 80) {
    return {
      badge: 'bg-amber-100 text-amber-700',
      bar: 'bg-amber-500',
      label: 'Medium',
    }
  }
  return {
    badge: 'bg-emerald-100 text-emerald-700',
    bar: 'bg-emerald-500',
    label: 'High',
  }
}

function ClassProgressCard({ item }) {
  const percent = item.requiredHours > 0
    ? Math.min(Math.round((item.completedHours / item.requiredHours) * 100), 100)
    : 0
  const remainingHours = Math.max(item.requiredHours - item.completedHours, 0)
  const color = progressMeta(percent)

  return (
    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-gray-800">{item.className}</p>
        <span className={`text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full ${color.badge}`}>
          {percent}%
        </span>
      </div>

      <div className="mt-2 h-2 w-full rounded-full bg-gray-200 overflow-hidden">
        <div className={`h-full rounded-full ${color.bar}`} style={{ width: `${percent}%` }} />
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-400">Completed</p>
          <p className="text-xs font-bold text-gray-700 mt-0.5">{item.completedHours}h</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-400">Required</p>
          <p className="text-xs font-bold text-gray-700 mt-0.5">{item.requiredHours}h</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-400">Remaining</p>
          <p className="text-xs font-bold text-gray-700 mt-0.5">{remainingHours}h</p>
        </div>
      </div>
    </div>
  )
}

export default function SubjectHours() {
  const { user } = useAuth()
  const { workEntries, teacherDirectory } = useWFCTS()

  const grouped = useMemo(() => {
    const byKey = new Map()

    for (const entry of workEntries) {
      const teacherId = entry.teacherId
      const subject = entry.subject || 'Unknown Subject'
      const className = entry.className || 'General'
      const hours = Number(entry.hours) || 0
      const key = `${teacherId}|${subject}|${className}`

      if (!byKey.has(key)) {
        byKey.set(key, {
          teacherId,
          subject,
          className,
          completedHours: 0,
        })
      }

      byKey.get(key).completedHours += hours
    }

    const byTeacher = new Map()
    for (const item of byKey.values()) {
      const requiredHours = getRequiredHours(item.subject, item.className)
      const teacherName = teacherDirectory.find((teacher) => teacher.id === item.teacherId)?.name || item.teacherId

      if (!byTeacher.has(item.teacherId)) {
        byTeacher.set(item.teacherId, {
          teacherId: item.teacherId,
          teacherName,
          subjects: new Map(),
        })
      }

      const teacherBucket = byTeacher.get(item.teacherId)
      if (!teacherBucket.subjects.has(item.subject)) {
        teacherBucket.subjects.set(item.subject, {
          subject: item.subject,
          totalCompletedHours: 0,
          totalRequiredHours: 0,
          classes: [],
        })
      }

      const subjectBucket = teacherBucket.subjects.get(item.subject)
      subjectBucket.totalCompletedHours += item.completedHours
      subjectBucket.totalRequiredHours += requiredHours
      subjectBucket.classes.push({
        className: item.className,
        completedHours: item.completedHours,
        requiredHours,
      })
    }

    return Array.from(byTeacher.values()).map((teacher) => ({
      ...teacher,
      subjects: Array.from(teacher.subjects.values()).map((subject) => ({
        ...subject,
        classes: subject.classes.sort((a, b) => a.className.localeCompare(b.className)),
      })),
    }))
  }, [workEntries, teacherDirectory])

  const teacherView = user?.role === 'TEACHER'
    ? grouped.filter((item) => item.teacherId === user?.id)
    : grouped

  return (
    <div className="flex flex-col min-h-full">
      <div className="bg-white px-5 pt-10 pb-6 shadow-sm">
        <p className="text-xs font-semibold text-emerald-500 uppercase tracking-widest mb-1">WFCTS</p>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Subject Hours</h1>
        <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Class/division-wise teaching progress tracking</p>
      </div>

      <div className="px-5 pt-5 pb-4 flex flex-col gap-4">
        {teacherView.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-6 text-center">
            <p className="text-sm font-semibold text-gray-700">No subject-hour data found</p>
            <p className="text-xs text-gray-400 mt-1">Log work entries to see progress here.</p>
          </div>
        )}

        {teacherView.map((teacher) => (
          <div key={teacher.teacherId} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            {user?.role !== 'TEACHER' && (
              <p className="text-sm sm:text-base font-bold text-gray-900 mb-3">{teacher.teacherName}</p>
            )}

            <div className="flex flex-col gap-3">
              {teacher.subjects.map((subjectBlock) => (
                <div key={`${teacher.teacherId}-${subjectBlock.subject}`} className="rounded-xl border border-gray-100 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-800">{subjectBlock.subject}</p>
                    <p className="text-xs text-gray-500">
                      {subjectBlock.totalCompletedHours}h / {subjectBlock.totalRequiredHours}h
                    </p>
                  </div>

                  <div className="mt-3 flex flex-col gap-2">
                    {subjectBlock.classes.map((classItem) => (
                      <ClassProgressCard
                        key={`${teacher.teacherId}-${subjectBlock.subject}-${classItem.className}`}
                        item={classItem}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

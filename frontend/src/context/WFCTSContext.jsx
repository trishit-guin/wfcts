import { createContext, useContext, useState } from 'react'

const WFCTSContext = createContext(null)

const initialSubstituteEntries = [
  { id: 1, coveredFor: 'Prof. Rao',   date: '2026-02-28', status: 'Repaid',  teacherId: 'u1', direction: 'CREDIT' },
  { id: 2, coveredFor: 'Prof. Iyer',  date: '2026-02-20', status: 'Pending', teacherId: 'u1', direction: 'CREDIT' },
  { id: 3, coveredFor: 'Prof. Mehta', date: '2026-02-14', status: 'Repaid',  teacherId: 'u1', direction: 'CREDIT' },
  { id: 4, coveredFor: 'Prof. Rao',   date: '2026-01-30', status: 'Pending', teacherId: 'u1', direction: 'CREDIT' },
  { id: 5, coveredFor: 'Prof. Singh', date: '2026-01-22', status: 'Repaid',  teacherId: 'u1', direction: 'CREDIT' },
  { id: 6, coveredFor: 'Prof. Nair',  date: '2026-03-03', status: 'Pending', teacherId: 'u1', direction: 'SUBSTITUTION' },
  { id: 7, coveredFor: 'Prof. Kulkarni', date: '2026-02-26', status: 'Repaid', teacherId: 'u1', direction: 'SUBSTITUTION' },
]

const initialWorkEntries = [
  { id: 1, subject: 'Data Structures',   className: 'FY-A', hours: 3, workType: 'Lecture', date: '2026-02-27', teacherId: 'u1' },
  { id: 2, subject: 'Algorithms',        className: 'SY-B', hours: 2, workType: 'Lab',     date: '2026-02-25', teacherId: 'u1' },
  { id: 3, subject: 'Operating Systems', className: 'TY-A', hours: 3, workType: 'Lecture', date: '2026-02-20', teacherId: 'u1' },
  { id: 4, subject: 'Machine Learning',  className: 'TY-B', hours: 4, workType: 'Lecture', date: '2026-02-18', teacherId: 'u1' },
  { id: 5, subject: 'Database Management', className: 'SY-A', hours: 2, workType: 'Admin', date: '2026-02-15', teacherId: 'u1' },
]

const teacherDirectory = [
  { id: 'u1', name: 'Prof. Sharma' },
  { id: 'u4', name: 'Prof. Neha' },
  { id: 'u5', name: 'Prof. Arjun' },
]

const initialTasks = [
  {
    id: 1,
    title: 'Prepare AI Lab Plan',
    description: 'Draft weekly plan for semester AI labs.',
    assignedBy: 'Dr. N. Verma (HOD)',
    assignTo: 'u1',
    deadline: '2026-03-20',
    status: 'Pending',
  },
  {
    id: 2,
    title: 'Update Attendance Sheet',
    description: 'Consolidate attendance for Section II A.',
    assignedBy: 'Admin Office',
    assignTo: 'u1',
    deadline: '2026-03-12',
    status: 'Completed',
  },
]

export function WFCTSProvider({ children }) {
  const [substituteEntries, setSubstituteEntries] = useState(initialSubstituteEntries)
  const [workEntries, setWorkEntries] = useState(initialWorkEntries)
  const [tasks, setTasks] = useState(initialTasks)

  function addSubstituteEntry(entry) {
    setSubstituteEntries((prev) => [{
      ...entry,
      id: Date.now(),
      teacherId: entry.teacherId || 'u1',
      direction: entry.direction || 'CREDIT',
    }, ...prev])
  }

  function addWorkEntry(entry) {
    setWorkEntries((prev) => [{
      ...entry,
      id: Date.now(),
      teacherId: entry.teacherId || 'u1',
      className: entry.className || 'FY-A',
    }, ...prev])
  }

  function addTask(task) {
    setTasks((prev) => [{ ...task, id: Date.now(), status: 'Pending' }, ...prev])
  }

  function markTaskComplete(taskId) {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, status: 'Completed' } : task,
      ),
    )
  }

  return (
    <WFCTSContext.Provider
      value={{
        substituteEntries,
        workEntries,
        tasks,
        teacherDirectory,
        addSubstituteEntry,
        addWorkEntry,
        addTask,
        markTaskComplete,
      }}
    >
      {children}
    </WFCTSContext.Provider>
  )
}

export function useWFCTS() {
  const ctx = useContext(WFCTSContext)
  if (!ctx) throw new Error('useWFCTS must be used inside WFCTSProvider')
  return ctx
}

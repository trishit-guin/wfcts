import { useAuth } from '../context/AuthContext'
import { useWFCTS } from '../context/WFCTSContext'
import ManagerDashboardView from '../components/ManagerDashboardView'

export default function HodDashboard() {
  const { user } = useAuth()
  const { teacherDirectory, tasks, substituteEntries, workEntries } = useWFCTS()

  return (
    <ManagerDashboardView
      user={user}
      roleLabel="Department Oversight"
      intro="Track fairness and department execution with one view into teacher load, substitutions, and pending responsibilities."
      teacherDirectory={teacherDirectory}
      tasks={tasks}
      substituteEntries={substituteEntries}
      workEntries={workEntries}
    />
  )
}

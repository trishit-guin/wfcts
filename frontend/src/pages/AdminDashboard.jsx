import { useAuth } from '../context/AuthContext'
import { useWFCTS } from '../context/WFCTSContext'
import ManagerDashboardView from '../components/ManagerDashboardView'

export default function AdminDashboard() {
  const { user } = useAuth()
  const { teacherDirectory, tasks, substituteEntries, workEntries } = useWFCTS()

  return (
    <ManagerDashboardView
      user={user}
      roleLabel="Administrator Console"
      intro="Use the live overview to coordinate tasks, monitor substitution pressure, and spot overload trends across the institution."
      teacherDirectory={teacherDirectory}
      tasks={tasks}
      substituteEntries={substituteEntries}
      workEntries={workEntries}
    />
  )
}

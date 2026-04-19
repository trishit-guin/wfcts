import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useWFCTS } from '../context/WFCTSContext'
import ManagerDashboardView from '../components/ManagerDashboardView'

function TimetableActions({ navigate }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-8">
      <button
        type="button"
        onClick={() => navigate('/timetable-upload')}
        className="flex items-center gap-4 rounded-2xl border border-(--wfcts-primary)/20 bg-(--wfcts-primary)/5 p-5 text-left transition-all hover:bg-(--wfcts-primary)/10 hover:-translate-y-0.5"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-(--wfcts-primary)/10 text-(--wfcts-primary)">
          <span className="material-symbols-outlined">document_scanner</span>
        </div>
        <div>
          <p className="font-semibold text-slate-800">Upload Timetable</p>
          <p className="text-xs text-slate-500">OCR + parse → 16-week calendar schedule</p>
        </div>
        <span className="material-symbols-outlined ml-auto text-slate-300">north_east</span>
      </button>
      <button
        type="button"
        onClick={() => navigate('/timetable')}
        className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left transition-all hover:bg-slate-50 hover:-translate-y-0.5"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
          <span className="material-symbols-outlined">calendar_view_week</span>
        </div>
        <div>
          <p className="font-semibold text-slate-800">Manage Slots</p>
          <p className="text-xs text-slate-500">View, edit, and assign timetable slots</p>
        </div>
        <span className="material-symbols-outlined ml-auto text-slate-300">north_east</span>
      </button>
    </div>
  )
}

export default function HodDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { teacherDirectory, tasks, substituteEntries, workEntries } = useWFCTS()

  return (
    <div>
      <TimetableActions navigate={navigate} />
      <ManagerDashboardView
        user={user}
        roleLabel="Department Oversight"
        intro="Track fairness and department execution with one view into teacher load, substitutions, and pending responsibilities."
        teacherDirectory={teacherDirectory}
        tasks={tasks}
        substituteEntries={substituteEntries}
        workEntries={workEntries}
      />
    </div>
  )
}

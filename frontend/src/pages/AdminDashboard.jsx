import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useWFCTS } from '../context/WFCTSContext'
import ManagerDashboardView from '../components/ManagerDashboardView'

function getInitials(name) {
  if (!name) return 'T'
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

function QuickActions({ navigate }) {
  const actions = [
    { label: 'Upload Timetable', sub: 'OCR → 16-week schedule', icon: 'document_scanner', to: '/timetable-upload', primary: true },
    { label: 'Manage Slots', sub: 'View, edit, assign slots', icon: 'calendar_view_week', to: '/timetable', primary: false },
    { label: 'Academic Calendar', sub: 'Holidays, exams, events', icon: 'event_note', to: '/academic-calendar', primary: false },
    { label: 'My Calendar', sub: 'Schedule personal tasks', icon: 'calendar_month', to: '/calendar', primary: false },
  ]
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-8">
      {actions.map((a) => (
        <button
          key={a.to}
          type="button"
          onClick={() => navigate(a.to)}
          className={`flex items-center gap-4 rounded-2xl border p-5 text-left transition-all hover:-translate-y-0.5 ${
            a.primary
              ? 'border-(--wfcts-primary)/20 bg-(--wfcts-primary)/5 hover:bg-(--wfcts-primary)/10'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
            a.primary ? 'bg-(--wfcts-primary)/10 text-(--wfcts-primary)' : 'bg-slate-100 text-slate-500'
          }`}>
            <span className="material-symbols-outlined">{a.icon}</span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-800">{a.label}</p>
            <p className="text-xs text-slate-500">{a.sub}</p>
          </div>
          <span className="material-symbols-outlined ml-auto shrink-0 text-slate-300">north_east</span>
        </button>
      ))}
    </div>
  )
}

function TeacherDirectoryTable({ teacherDirectory, navigate }) {
  if (!teacherDirectory.length) return null
  return (
    <div className="wfcts-card overflow-hidden mb-8">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div>
          <h3 className="font-headline text-base font-bold text-(--wfcts-primary)">Staff Directory</h3>
          <p className="text-xs text-slate-400 mt-0.5">{teacherDirectory.length} staff members</p>
        </div>
      </div>
      <div className="divide-y divide-slate-100">
        {teacherDirectory.map((t) => (
          <div key={t.id} className="flex items-center gap-4 px-6 py-3 hover:bg-slate-50 transition-colors">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--wfcts-primary)/10 text-(--wfcts-primary) text-xs font-bold">
              {t.profileImage ? (
                <img src={t.profileImage} alt={t.name} className="h-full w-full rounded-full object-cover" />
              ) : (
                getInitials(t.name)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800 truncate">{t.name}</p>
              <p className="text-xs text-slate-400">{t.department || t.role}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(`/timetable-upload?for=${t.id}`)}
                title="Upload timetable for this teacher"
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[0.65rem] font-semibold text-slate-600 hover:border-(--wfcts-primary)/30 hover:text-(--wfcts-primary) hover:bg-(--wfcts-primary)/5 transition-colors"
              >
                <span className="material-symbols-outlined text-[0.85rem]">document_scanner</span>
                Upload TT
              </button>
              <button
                onClick={() => navigate('/calendar')}
                title="View this teacher's calendar"
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[0.65rem] font-semibold text-slate-600 hover:border-(--wfcts-secondary)/30 hover:text-(--wfcts-secondary) hover:bg-(--wfcts-secondary)/5 transition-colors"
              >
                <span className="material-symbols-outlined text-[0.85rem]">calendar_month</span>
                Calendar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { teacherDirectory, tasks, substituteEntries, workEntries } = useWFCTS()

  return (
    <div>
      <QuickActions navigate={navigate} />
      <TeacherDirectoryTable teacherDirectory={teacherDirectory} navigate={navigate} />
      <ManagerDashboardView
        user={user}
        roleLabel="Administrator Console"
        intro="Use the live overview to coordinate tasks, monitor substitution pressure, and spot overload trends across the institution."
        teacherDirectory={teacherDirectory}
        tasks={tasks}
        substituteEntries={substituteEntries}
        workEntries={workEntries}
      />
    </div>
  )
}

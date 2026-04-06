import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { WFCTSProvider } from './context/WFCTSContext'
import { getHomeRouteByRole, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import WorkEntry from './pages/WorkEntry'
import Credits from './pages/Credits'
import Profile from './pages/Profile'
import AdminDashboard from './pages/AdminDashboard'
import HodDashboard from './pages/HodDashboard'
import Tasks from './pages/Tasks'
import AssignTask from './pages/AssignTask'
import IndustrySessions from './pages/IndustrySessions'
import WorkloadFairnessDashboard from './pages/WorkloadFairnessDashboard'
import SubjectHours from './pages/SubjectHours'
import Timetable from './pages/Timetable'

function RoleHomeRedirect() {
  const { user } = useAuth()
  return <Navigate to={getHomeRouteByRole(user?.role)} replace />
}

function App() {
  return (
    <WFCTSProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <RoleHomeRedirect />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute roles={['TEACHER']}>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/work-entry"
            element={
              <ProtectedRoute roles={['TEACHER']}>
                <Layout>
                  <WorkEntry />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/credits"
            element={
              <ProtectedRoute roles={['TEACHER']}>
                <Layout>
                  <Credits />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tasks"
            element={
              <ProtectedRoute roles={['TEACHER']}>
                <Layout>
                  <Tasks />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/industry-sessions"
            element={
              <ProtectedRoute roles={['TEACHER']}>
                <Layout>
                  <IndustrySessions />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/subject-hours"
            element={
              <ProtectedRoute roles={['TEACHER', 'ADMIN', 'HOD']}>
                <Layout>
                  <SubjectHours />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/timetable"
            element={
              <ProtectedRoute roles={['TEACHER', 'ADMIN', 'HOD']}>
                <Layout>
                  <Timetable />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute roles={['TEACHER', 'ADMIN', 'HOD']}>
                <Layout>
                  <Profile />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <Layout>
                  <AdminDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/hod/dashboard"
            element={
              <ProtectedRoute roles={['HOD']}>
                <Layout>
                  <HodDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/assign-task"
            element={
              <ProtectedRoute roles={['ADMIN', 'HOD']}>
                <Layout>
                  <AssignTask />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/fairness"
            element={
              <ProtectedRoute roles={['ADMIN', 'HOD']}>
                <Layout>
                  <WorkloadFairnessDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </WFCTSProvider>
  )
}

export default App

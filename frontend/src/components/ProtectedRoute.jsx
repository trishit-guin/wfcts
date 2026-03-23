import { Navigate } from 'react-router-dom'
import { getHomeRouteByRole, useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, user, authReady } = useAuth()

  if (!authReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white border border-gray-100 shadow-sm rounded-2xl px-5 py-4 text-center">
          <p className="text-sm font-semibold text-gray-700">Loading your workspace...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to={getHomeRouteByRole(user.role)} replace />
  }

  return children
}

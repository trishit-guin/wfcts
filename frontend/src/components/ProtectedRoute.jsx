import { Navigate } from 'react-router-dom'
import { getHomeRouteByRole, useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, user } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to={getHomeRouteByRole(user.role)} replace />
  }

  return children
}

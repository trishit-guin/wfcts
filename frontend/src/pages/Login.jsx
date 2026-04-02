import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getHomeRouteByRole, useAuth } from '../context/AuthContext'

const initialForm = { email: '', password: '' }

const sampleAccounts = [
  { role: 'Teacher', email: 'teacher@wfcts.edu', password: 'teacher123' },
  { role: 'Admin', email: 'admin@wfcts.edu', password: 'admin123' },
  { role: 'HOD', email: 'hod@wfcts.edu', password: 'hod123' },
]

export default function Login() {
  const navigate = useNavigate()
  const { login, isAuthenticated, user, authReady } = useAuth()
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (authReady && isAuthenticated && user) {
      navigate(getHomeRouteByRole(user.role), { replace: true })
    }
  }, [authReady, isAuthenticated, user, navigate])

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    if (error) setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const loggedInUser = await login(form)
      navigate(getHomeRouteByRole(loggedInUser.role), { replace: true })
    } catch (err) {
      setError(err.message || 'Unable to login')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 pt-16 pb-8 flex items-start justify-center">
      <div className="w-full max-w-sm bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
        <p className="text-xs font-semibold text-emerald-500 uppercase tracking-widest mb-1">WFCTS</p>
        <h1 className="text-lg sm:text-xl font-bold text-gray-900">WFCTS - Workload Fairness and Credit Tracking System</h1>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">Sign in</h2>
        <p className="text-xs sm:text-sm text-gray-400 mt-1">Use an existing account to access the app.</p>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="teacher@wfcts.edu"
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Enter password"
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              required
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-1 w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-70 text-white font-semibold rounded-2xl py-3.5 text-sm shadow-lg shadow-emerald-200 transition-all"
          >
            {isSubmitting ? 'Signing in...' : 'Login'}
          </button>
        </form>

        <p className="mt-4 text-xs text-center text-gray-500">
          New here?{' '}
          <Link to="/signup" className="font-semibold text-emerald-600 hover:text-emerald-700">
            Create an account
          </Link>
        </p>

        <div className="mt-4 rounded-xl bg-gray-50 border border-gray-100 p-3 space-y-2">
          <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">Sample Accounts</p>
          {sampleAccounts.map((account) => (
            <div key={account.role} className="text-[11px] text-gray-500">
              <p>{account.role}: {account.email}</p>
              <p>Password: {account.password}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

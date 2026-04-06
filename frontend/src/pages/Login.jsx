import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getHomeRouteByRole, useAuth } from '../context/AuthContext'
import AuthShell from '../components/AuthShell'

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

  function handleChange(event) {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }))
    if (error) setError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
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
    <AuthShell
      title="Sign in"
      subtitle="Use your existing account to access the live MongoDB-backed workspace."
      panelLabel="Workload Fairness and Credit Tracking"
      panelTitle="One shared system for credits, tasks, timetables, and workload balance."
      panelBody="Log in to continue with the connected frontend and backend experience for teachers, administrators, and department heads."
      infoCards={sampleAccounts.map((account) => ({
        label: account.role,
        title: account.email,
        body: `Password: ${account.password}`,
      }))}
      footer={(
        <p className="text-sm text-[var(--wfcts-muted)]">
          New here?{' '}
          <Link to="/signup" className="font-semibold text-[var(--wfcts-primary)] hover:opacity-75">
            Create an account
          </Link>
        </p>
      )}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Email</span>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="teacher@wfcts.edu"
            className="w-full rounded-[1rem] border border-slate-200 bg-[var(--wfcts-surface-muted)] px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[var(--wfcts-primary)]/20 focus:bg-white focus:ring-2 focus:ring-[var(--wfcts-primary)]/10"
            required
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Password</span>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Enter password"
            className="w-full rounded-[1rem] border border-slate-200 bg-[var(--wfcts-surface-muted)] px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[var(--wfcts-primary)]/20 focus:bg-white focus:ring-2 focus:ring-[var(--wfcts-primary)]/10"
            required
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 w-full rounded-full bg-gradient-to-br from-[var(--wfcts-primary)] to-[#284bb0] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-[var(--wfcts-primary)]/18 transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? 'Signing in...' : 'Login'}
        </button>
      </form>
    </AuthShell>
  )
}

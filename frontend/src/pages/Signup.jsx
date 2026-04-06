import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getHomeRouteByRole, useAuth } from '../context/AuthContext'
import AuthShell from '../components/AuthShell'

const initialForm = {
  name: '',
  department: 'Computer Science',
  email: '',
  password: '',
  confirmPassword: '',
}

export default function Signup() {
  const navigate = useNavigate()
  const { signup, isAuthenticated, user, authReady } = useAuth()
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

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const createdUser = await signup({
        name: form.name,
        department: form.department,
        email: form.email,
        password: form.password,
      })
      navigate(getHomeRouteByRole(createdUser.role), { replace: true })
    } catch (err) {
      setError(err.message || 'Unable to create account')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthShell
      title="Sign up"
      subtitle="Create a teacher account using the same connected auth flow and design language as sign in."
      panelLabel="Teacher Onboarding"
      panelTitle="Start with a fully connected account and land directly in the live app."
      panelBody="Signup creates a teacher profile, persists it through the backend, and signs you in immediately with JWT-based authentication."
      infoCards={[
        {
          label: 'Access',
          title: 'Teacher accounts only',
          body: 'Admin and HOD identities continue to be provisioned separately.',
        },
        {
          label: 'Backend',
          title: 'MongoDB + JWT',
          body: 'New accounts are stored in MongoDB and authenticated through JWT sessions.',
        },
      ]}
      footer={(
        <p className="text-sm text-[var(--wfcts-muted)]">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-[var(--wfcts-primary)] hover:opacity-75">
            Sign in
          </Link>
        </p>
      )}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Name</span>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Prof. Your Name"
            className="w-full rounded-[1rem] border border-slate-200 bg-[var(--wfcts-surface-muted)] px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[var(--wfcts-primary)]/20 focus:bg-white focus:ring-2 focus:ring-[var(--wfcts-primary)]/10"
            required
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Department</span>
          <input
            type="text"
            name="department"
            value={form.department}
            onChange={handleChange}
            placeholder="Computer Science"
            className="w-full rounded-[1rem] border border-slate-200 bg-[var(--wfcts-surface-muted)] px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[var(--wfcts-primary)]/20 focus:bg-white focus:ring-2 focus:ring-[var(--wfcts-primary)]/10"
            required
          />
        </label>

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
            placeholder="Create password"
            className="w-full rounded-[1rem] border border-slate-200 bg-[var(--wfcts-surface-muted)] px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[var(--wfcts-primary)]/20 focus:bg-white focus:ring-2 focus:ring-[var(--wfcts-primary)]/10"
            required
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Confirm Password</span>
          <input
            type="password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            placeholder="Confirm password"
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
          {isSubmitting ? 'Creating account...' : 'Create Account'}
        </button>
      </form>
    </AuthShell>
  )
}

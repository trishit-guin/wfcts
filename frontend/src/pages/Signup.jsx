import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getHomeRouteByRole, useAuth } from '../context/AuthContext'

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

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    if (error) setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()

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
    <div className="min-h-screen bg-gray-50 px-4 pt-16 pb-8 flex items-start justify-center">
      <div className="w-full max-w-sm bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
        <p className="text-xs font-semibold text-emerald-500 uppercase tracking-widest mb-1">WFCTS</p>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Sign up</h1>
        <p className="text-xs sm:text-sm text-gray-400 mt-1">Create a teacher account to start using the app.</p>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">Name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Prof. Your Name"
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">Department</label>
            <input
              type="text"
              name="department"
              value={form.department}
              onChange={handleChange}
              placeholder="Computer Science"
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              required
            />
          </div>

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
              placeholder="Create password"
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm password"
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
            {isSubmitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-4 text-xs text-center text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-emerald-600 hover:text-emerald-700">
            Sign in
          </Link>
        </p>

        <div className="mt-4 rounded-xl bg-gray-50 border border-gray-100 p-3 space-y-1.5">
          <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">Signup Access</p>
          <p className="text-[11px] text-gray-500">This page creates TEACHER accounts only.</p>
          <p className="text-[11px] text-gray-500">Admin and HOD accounts remain managed separately.</p>
        </div>
      </div>
    </div>
  )
}

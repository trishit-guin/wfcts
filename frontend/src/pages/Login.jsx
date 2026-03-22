import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getHomeRouteByRole, useAuth } from '../context/AuthContext'

const initialForm = { email: '', password: '' }

export default function Login() {
  const navigate = useNavigate()
  const { login, isAuthenticated, user } = useAuth()
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(getHomeRouteByRole(user.role), { replace: true })
    }
  }, [isAuthenticated, user, navigate])

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    if (error) setError('')
  }

  function handleSubmit(e) {
    e.preventDefault()
    try {
      const loggedInUser = login(form)
      navigate(getHomeRouteByRole(loggedInUser.role), { replace: true })
    } catch (err) {
      setError(err.message || 'Unable to login')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 pt-16 pb-8 flex items-start justify-center">
      <div className="w-full max-w-sm bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
        <p className="text-xs font-semibold text-emerald-500 uppercase tracking-widest mb-1">WFCTS</p>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Sign in</h1>
        <p className="text-xs sm:text-sm text-gray-400 mt-1">Use a mock account to continue</p>

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
            className="mt-1 w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold rounded-2xl py-3.5 text-sm shadow-lg shadow-emerald-200 transition-all"
          >
            Login
          </button>
        </form>

        <div className="mt-4 rounded-xl bg-gray-50 border border-gray-100 p-3">
          <p className="text-[11px] text-gray-500">Mock roles by email:</p>
          <p className="text-[11px] text-gray-500 mt-0.5">Contains "admin" -> ADMIN</p>
          <p className="text-[11px] text-gray-500">Contains "hod" -> HOD</p>
          <p className="text-[11px] text-gray-500">Anything else -> TEACHER</p>
        </div>
      </div>
    </div>
  )
}

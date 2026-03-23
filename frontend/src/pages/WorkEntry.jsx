import { useState } from 'react'
import { useWFCTS } from '../context/WFCTSContext'
import { formatDate } from '../utils/formatDate'

const subjects = [
  'Data Structures',
  'Algorithms',
  'Operating Systems',
  'Database Management',
  'Computer Networks',
  'Software Engineering',
  'Machine Learning',
  'Mathematics I',
  'Mathematics II',
  'Physics',
]

const classes = ['FY-A', 'FY-B', 'SY-A', 'SY-B', 'TY-A', 'TY-B']

const workTypes = ['Lecture', 'Lab', 'Admin', 'Extra Duty']
const initialForm = { subject: '', className: '', hours: '', workType: '' }

function Toast({ message }) {
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-xl animate-fade-in">
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
      </svg>
      {message}
    </div>
  )
}

export default function WorkEntry() {
  const { addWorkEntry, workEntries, isLoading } = useWFCTS()
  const [form, setForm] = useState(initialForm)
  const [toast, setToast] = useState(false)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function validate() {
    const nextErrors = {}
    if (!form.subject) nextErrors.subject = 'Please select a subject.'
    if (!form.className) nextErrors.className = 'Please select a class/division.'
    if (!form.hours || Number(form.hours) <= 0) nextErrors.hours = 'Enter valid hours.'
    if (!form.workType) nextErrors.workType = 'Please select a work type.'
    return nextErrors
  }

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setErrors((prev) => ({ ...prev, [e.target.name]: undefined }))
    if (submitError) setSubmitError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const nextErrors = validate()
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }

    setIsSubmitting(true)
    setSubmitError('')

    try {
      await addWorkEntry({
        ...form,
        hours: Number(form.hours),
        date: new Date().toISOString().split('T')[0],
      })
      setToast(true)
      setForm(initialForm)
      setTimeout(() => setToast(false), 3000)
    } catch (err) {
      setSubmitError(err.message || 'Unable to save work entry.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="bg-white px-5 pt-10 pb-6 shadow-sm">
        <p className="text-xs font-semibold text-emerald-500 uppercase tracking-widest mb-1">Work Entry</p>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Log Your Work</h1>
        <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Record lectures, labs or duties</p>
      </div>

      <form onSubmit={handleSubmit} className="px-5 pt-6 flex flex-col gap-5 flex-1">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-gray-700">Subject</label>
          <select
            name="subject"
            value={form.subject}
            onChange={handleChange}
            className={`w-full bg-white border rounded-xl px-4 py-3.5 text-sm text-gray-800 appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-400 transition ${
              errors.subject ? 'border-red-400' : 'border-gray-200'
            }`}
          >
            <option value="">Select a subject...</option>
            {subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
          {errors.subject && <p className="text-xs text-red-500">{errors.subject}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-gray-700">Class / Division</label>
          <select
            name="className"
            value={form.className}
            onChange={handleChange}
            className={`w-full bg-white border rounded-xl px-4 py-3.5 text-sm text-gray-800 appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-400 transition ${
              errors.className ? 'border-red-400' : 'border-gray-200'
            }`}
          >
            <option value="">Select class/division...</option>
            {classes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          {errors.className && <p className="text-xs text-red-500">{errors.className}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-gray-700">Hours</label>
          <input
            type="number"
            name="hours"
            value={form.hours}
            onChange={handleChange}
            min="0.5"
            max="12"
            step="0.5"
            placeholder="e.g. 2"
            className={`w-full bg-white border rounded-xl px-4 py-3.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition ${
              errors.hours ? 'border-red-400' : 'border-gray-200'
            }`}
          />
          {errors.hours && <p className="text-xs text-red-500">{errors.hours}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-gray-700">Work Type</label>
          <div className="grid grid-cols-2 gap-2">
            {workTypes.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setForm((prev) => ({ ...prev, workType: type }))
                  setErrors((prev) => ({ ...prev, workType: undefined }))
                  if (submitError) setSubmitError('')
                }}
                className={`py-3 rounded-xl text-sm font-medium border transition-all duration-150 ${
                  form.workType === type
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-100'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
          {errors.workType && <p className="text-xs text-red-500">{errors.workType}</p>}
        </div>

        {submitError && <p className="text-xs text-red-500">{submitError}</p>}

        <div className="flex-1" />

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-70 text-white font-semibold rounded-2xl py-4 text-base shadow-lg shadow-emerald-200 transition-all duration-150 mb-2"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Entry'}
        </button>
      </form>

      <div className="px-5 pt-2 pb-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Recent Entries</h2>
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-sm text-gray-500">
            Loading recent work entries...
          </div>
        ) : workEntries.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm font-medium">No work logged yet</p>
            <p className="text-xs">Use the form above to add your first entry.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {workEntries.slice(0, 5).map((entry) => (
              <div key={entry.id} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{entry.subject}</p>
                  <p className="text-xs text-gray-400">{entry.className} | {entry.workType} | {formatDate(entry.date)}</p>
                </div>
                <span className="text-sm font-bold text-emerald-600 shrink-0">{entry.hours}h</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && <Toast message="Work logged successfully" />}
    </div>
  )
}

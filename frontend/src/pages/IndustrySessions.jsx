import { useState } from 'react'
import { useWFCTS } from '../context/WFCTSContext'
import { formatDate } from '../utils/formatDate'

function ProofBadge({ uploaded, name }) {
  if (uploaded) {
    return (
      <span className="text-[10px] sm:text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
        Uploaded{name ? `: ${name}` : ''}
      </span>
    )
  }

  return (
    <span className="text-[10px] sm:text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
      Not Uploaded
    </span>
  )
}

export default function IndustrySessions() {
  const { industrySessions, addIndustrySession } = useWFCTS()
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({
    title: '',
    speaker: '',
    date: '',
    proof: '',
  })

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }))
    if (error) setError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!form.title || !form.speaker || !form.date) {
      setError('Please complete the title, speaker, and date fields.')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      await addIndustrySession({
        title: form.title,
        speaker: form.speaker,
        date: form.date,
        proofName: form.proof,
      })

      setForm({ title: '', speaker: '', date: '', proof: '' })
      setShowForm(false)
    } catch (err) {
      setError(err.message || 'Unable to save industry session.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="bg-white px-5 pt-10 pb-6 shadow-sm">
        <p className="text-xs font-semibold text-emerald-500 uppercase tracking-widest mb-1">WFCTS</p>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Industry Sessions</h1>
        <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Track required expert sessions</p>
      </div>

      <div className="px-5 pt-5">
        <button
          type="button"
          onClick={() => setShowForm((value) => !value)}
          className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-2.5 transition-colors"
        >
          {showForm ? 'Close Form' : 'Add Session'}
        </button>
      </div>

      {showForm && (
        <div className="px-5 pt-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <div>
              <label className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Session Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => updateField('title', e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                placeholder="Enter session title"
              />
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Speaker</label>
              <input
                type="text"
                value={form.speaker}
                onChange={(e) => updateField('speaker', e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                placeholder="Enter speaker name"
              />
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => updateField('date', e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Upload Proof (filename only)</label>
              <input
                type="file"
                onChange={(e) => updateField('proof', e.target.files?.[0]?.name || '')}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-2 file:py-1 file:text-emerald-700"
              />
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-gray-900 hover:bg-gray-800 disabled:opacity-70 text-white text-sm font-semibold py-2.5 transition-colors"
            >
              {isSubmitting ? 'Saving...' : 'Save Session'}
            </button>
          </form>
        </div>
      )}

      <div className="px-5 pt-5 pb-4 flex flex-col gap-3">
        {industrySessions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-6 text-center">
            <p className="text-sm font-semibold text-gray-700">No industry sessions logged yet</p>
            <p className="text-xs text-gray-400 mt-1">Add your first session to start tracking proof.</p>
          </div>
        ) : (
          industrySessions.map((session) => (
            <div key={session.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm sm:text-base font-bold text-gray-900">{session.title}</h3>
                <ProofBadge uploaded={session.proofUploaded} name={session.proofName} />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">Speaker Name</p>
                  <p className="text-xs sm:text-sm font-semibold text-gray-700 mt-0.5">{session.speaker}</p>
                </div>
                <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">Date</p>
                  <p className="text-xs sm:text-sm font-semibold text-gray-700 mt-0.5">{formatDate(session.date)}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

import { useWFCTS } from '../context/WFCTSContext'
import { formatDate } from '../utils/formatDate'

export default function Credits() {
  const { substituteEntries } = useWFCTS()

  const creditsGiven = substituteEntries.filter((e) => (e.direction || 'CREDIT') === 'CREDIT')
  const substitutionsReceived = substituteEntries.filter((e) => (e.direction || 'CREDIT') === 'SUBSTITUTION')

  const pendingCredits = creditsGiven.filter((e) => e.status === 'Pending').length
  const pendingSubstitutions = substitutionsReceived.filter((e) => e.status === 'Pending').length
  const netBalance = creditsGiven.length - substitutionsReceived.length

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="bg-white px-5 pt-10 pb-6 shadow-sm">
        <p className="text-xs font-semibold text-emerald-500 uppercase tracking-widest mb-1">Credits</p>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Give & Take Ledger</h1>
        <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Credits: you covered for others | Substitutions: others covered for you</p>
      </div>

      {/* Summary row */}
      <div className="px-5 pt-5 grid grid-cols-3 gap-3">
        <div className="bg-blue-50 border border-blue-100 rounded-2xl px-2 sm:px-3 py-3 flex flex-col gap-0.5">
          <span className="text-[10px] sm:text-xs text-blue-500 font-medium whitespace-nowrap">Credits Given</span>
          <span className="text-xl sm:text-2xl font-bold text-blue-600">{creditsGiven.length}</span>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-2 sm:px-3 py-3 flex flex-col gap-0.5">
          <span className="text-[10px] sm:text-xs text-emerald-500 font-medium whitespace-nowrap">Substitutions Taken</span>
          <span className="text-xl sm:text-2xl font-bold text-emerald-600">{substitutionsReceived.length}</span>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-2 sm:px-3 py-3 flex flex-col gap-0.5">
          <span className="text-[10px] sm:text-xs text-amber-500 font-medium whitespace-nowrap">Pending Items</span>
          <span className="text-xl sm:text-2xl font-bold text-amber-600">{pendingCredits + pendingSubstitutions}</span>
        </div>
      </div>

      {/* Net balance banner */}
      <div className="mx-5 mt-4">
        <div className={`rounded-2xl px-5 py-4 flex items-center justify-between ${netBalance >= 0 ? 'bg-emerald-600' : 'bg-gray-700'} text-white`}>
          <div>
            <p className="text-[10px] sm:text-xs font-semibold opacity-80 uppercase tracking-wide">Net Give/Take Balance</p>
            <p className="text-2xl sm:text-3xl font-bold mt-0.5">
              {netBalance > 0 ? '+' : ''}{netBalance}{' '}
              <span className="text-xs sm:text-sm font-medium opacity-80">entry{Math.abs(netBalance) !== 1 ? 'ies' : ''}</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
            </svg>
          </div>
        </div>
      </div>

      {/* Credits (you covered for others) */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Credits (You Covered For Others)</h2>
          <span className="text-[10px] sm:text-xs font-semibold bg-emerald-100 text-emerald-600 px-2 sm:px-2.5 py-1 rounded-full whitespace-nowrap">
            Pending {pendingCredits}
          </span>
        </div>
        {creditsGiven.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium">No credit entries</p>
            <p className="text-xs">Credits you give will appear here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {creditsGiven.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-emerald-100 shadow-sm px-4 py-4 flex items-center justify-between"
              >
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-bold text-gray-900">{item.coveredFor}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(item.date)}</p>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${item.status === 'Repaid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Substitutions (others covered for you) */}
      <div className="px-5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Substitutions (Others Covered For You)</h2>
          <span className="text-[10px] sm:text-xs font-semibold bg-blue-100 text-blue-600 px-2 sm:px-2.5 py-1 rounded-full whitespace-nowrap">
            Pending {pendingSubstitutions}
          </span>
        </div>
        {substitutionsReceived.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <p className="text-sm font-medium">No substitution entries</p>
            <p className="text-xs">Substitutions taken will appear here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {substitutionsReceived.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl border border-blue-100 shadow-sm px-4 py-4 flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-bold text-gray-900">{item.coveredFor}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(item.date)}</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${item.status === 'Repaid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

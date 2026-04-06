import { Link } from 'react-router-dom'

function InfoCard({ label, title, body }) {
  return (
    <div className="wfcts-card-muted p-4">
      <p className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-[var(--wfcts-muted)]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-[var(--wfcts-muted)]">{body}</p>
    </div>
  )
}

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
  panelLabel,
  panelTitle,
  panelBody,
  infoCards = [],
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(30,58,138,0.12),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(13,148,136,0.12),transparent_30%),linear-gradient(180deg,#fbfcff_0%,#f5f7fb_100%)] px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-xl items-center justify-center">
        <section className="wfcts-card w-full p-6 sm:p-8">
          <div className="mx-auto w-full max-w-md">
            <div className="flex items-center justify-between gap-3">
              <Link to="/login" className="inline-flex items-center gap-3">
                <span className="font-headline text-2xl font-black tracking-[-0.08em] text-[var(--wfcts-primary)]">WFCTS</span>
              </Link>
              <span className="rounded-full bg-[var(--wfcts-primary)]/8 px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.22em] text-[var(--wfcts-primary)]">
                Connected
              </span>
            </div>

            <p className="font-label text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[var(--wfcts-muted)]">
              WFCTS Access
            </p>
            <h2 className="font-headline mt-2 text-4xl font-extrabold tracking-[-0.06em] text-[var(--wfcts-primary)]">
              {title}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--wfcts-muted)]">
              {subtitle}
            </p>

            <div className="mt-6">
              {children}
            </div>

            {footer && <div className="mt-5">{footer}</div>}

            {(panelLabel || panelTitle || panelBody || infoCards.length > 0) && (
              <div className="mt-6 border-t border-slate-200 pt-6">
                {(panelLabel || panelTitle || panelBody) && (
                  <div className="rounded-[1.4rem] bg-[var(--wfcts-primary)]/6 p-5">
                    {panelLabel && (
                      <p className="font-label text-[0.62rem] font-bold uppercase tracking-[0.22em] text-[var(--wfcts-primary)]">
                        {panelLabel}
                      </p>
                    )}
                    {panelTitle && (
                      <p className="font-headline mt-2 text-xl font-bold tracking-[-0.04em] text-[var(--wfcts-primary)]">
                        {panelTitle}
                      </p>
                    )}
                    {panelBody && (
                      <p className="mt-2 text-sm leading-relaxed text-[var(--wfcts-muted)]">
                        {panelBody}
                      </p>
                    )}
                  </div>
                )}

                {infoCards.length > 0 && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {infoCards.map((card) => (
                      <InfoCard
                        key={`${card.label}-${card.title}`}
                        label={card.label}
                        title={card.title}
                        body={card.body}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

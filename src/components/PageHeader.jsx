export default function PageHeader({ icon, title, subtitle, note }) {
  return (
    <header className="mb-4">
      <h2 className="fw-bold">{icon && <i className={`bi bi-${icon} me-2 text-primary`} />}{title}</h2>
      {subtitle && <p className="text-muted mb-0">{subtitle}</p>}
      {note && <p className="text-muted mb-0 mt-1" style={{ fontSize: "calc(1rem - 2pt)" }}>{note}</p>}
    </header>
  )
}

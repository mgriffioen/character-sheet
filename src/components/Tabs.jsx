export default function Tabs({ tabs, active, onChange }) {
  return (
    <nav className="tabs">
      {tabs.map((t) => (
        <button
          key={t.key}
          className={`tab ${t.key === active ? 'is-active' : ''}`}
          onClick={() => onChange(t.key)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  )
}

// An SVG die rendered in the correct silhouette for its number of sides, with
// the result drawn on its face. Used in the dice tray and roll log.

const SHAPES = {
  4: { points: '50,12 90,84 10,84', textY: 64 }, // tetrahedron (triangle)
  6: { rect: true, textY: 52 }, // cube (rounded square)
  8: { points: '50,6 92,50 50,94 8,50', textY: 52 }, // octahedron (diamond)
  10: { points: '50,5 88,37 50,95 12,37', textY: 50 }, // pentagonal trapezohedron (kite)
  12: { points: '50,5 94,38 77,93 23,93 6,38', textY: 56 }, // dodecahedron (pentagon)
  20: { points: '50,4 91,27 91,73 50,96 9,73 9,27', textY: 53, inner: '32,41 68,41 50,76' }, // icosahedron
  100: { points: '50,5 88,37 50,95 12,37', textY: 50 }, // percentile (kite)
}

function shapeFor(sides) {
  return SHAPES[sides] || SHAPES[20]
}

export default function Die({ sides, value, tone = 'normal', size = 46, rolling = false, settle = false }) {
  const s = shapeFor(sides)
  const str = String(value)
  const fontSize = str.length >= 4 ? 26 : str.length === 3 ? 34 : 46
  const toneClass = tone === 'crit' ? 'die--crit' : tone === 'fail' ? 'die--fail' : ''
  const motionClass = rolling ? 'is-rolling' : settle ? 'settle' : ''

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`die ${toneClass} ${motionClass}`.trim()}
      role="img"
      aria-label={`d${sides} showing ${value}`}
    >
      {s.rect ? (
        <rect x="11" y="11" width="78" height="78" rx="15" className="die__shape" />
      ) : (
        <polygon points={s.points} className="die__shape" />
      )}
      {s.inner && <polygon points={s.inner} className="die__inner" />}
      <text
        x="50"
        y={s.textY}
        className="die__num"
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ fontSize }}
      >
        {value}
      </text>
    </svg>
  )
}

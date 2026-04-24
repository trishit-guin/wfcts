export const LAB_BATCHES = ['E', 'F', 'G', 'H', 'K', 'L', 'M', 'N']
export const LECTURE_YEARS = ['SE', 'TE']
export const CLASS_DIVISIONS = ['9', '10', '11']

export function parseClassNameParts(className = '', eventType) {
  if (eventType === 'LAB') {
    const batch = LAB_BATCHES.find((b) => className.startsWith(b)) || ''
    return { left: batch, right: batch ? className.slice(batch.length) : '' }
  }
  if (eventType === 'LECTURE') {
    const year = LECTURE_YEARS.find((y) => className.startsWith(y)) || ''
    return { left: year, right: year ? className.slice(year.length) : '' }
  }
  return { left: '', right: '' }
}

// Renders two side-by-side selects for Batch+Div (LAB) or Year+Div (LECTURE).
// Returns null for other event types — parent should hide the class field.
export function ClassPicker({ eventType, value = '', onChange, selectCls }) {
  if (eventType !== 'LAB' && eventType !== 'LECTURE') return null
  const options = eventType === 'LAB' ? LAB_BATCHES : LECTURE_YEARS
  const { left, right } = parseClassNameParts(value, eventType)

  return (
    <div className="flex gap-2">
      <select
        value={left}
        onChange={(e) => onChange(e.target.value + right)}
        className={selectCls}
      >
        <option value="">{eventType === 'LAB' ? 'Batch' : 'Year'}</option>
        {options.map((v) => <option key={v} value={v}>{v}</option>)}
      </select>
      <select
        value={right}
        onChange={(e) => onChange(left + e.target.value)}
        className={selectCls}
      >
        <option value="">Div</option>
        {CLASS_DIVISIONS.map((v) => <option key={v} value={v}>{v}</option>)}
      </select>
    </div>
  )
}

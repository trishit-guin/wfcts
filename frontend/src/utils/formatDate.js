export function formatDate(iso) {
  if (!iso || typeof iso !== 'string') return ''

  const parts = iso.split('-')
  if (parts.length !== 3) return iso

  const [y, m, d] = parts
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthName = months[Number(m) - 1]
  if (!monthName) return iso

  return `${Number(d)} ${monthName} ${y}`
}

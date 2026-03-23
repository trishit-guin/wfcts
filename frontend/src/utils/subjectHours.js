export const REQUIRED_HOURS_BY_SUBJECT_CLASS = {
  'Data Structures|FY-A': 60,
  'Data Structures|FY-B': 60,
  'Algorithms|SY-A': 54,
  'Algorithms|SY-B': 54,
  'Operating Systems|TY-A': 48,
  'Operating Systems|TY-B': 48,
  'Machine Learning|TY-A': 42,
  'Machine Learning|TY-B': 42,
  'Database Management|SY-A': 50,
  'Database Management|SY-B': 50,
}

export function getRequiredHours(subject, className) {
  return REQUIRED_HOURS_BY_SUBJECT_CLASS[`${subject}|${className}`] ?? 48
}

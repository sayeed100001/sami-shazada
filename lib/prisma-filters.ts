type ContainsFilter = {
  contains: string
  mode?: 'insensitive'
}

function isPostgresUrl(databaseUrl?: string) {
  return /^postgres(?:ql)?:\/\//i.test(databaseUrl || '')
}

export function caseInsensitiveContains(value: string): ContainsFilter {
  const filter: ContainsFilter = {
    contains: value,
  }

  if (isPostgresUrl(process.env.DATABASE_URL)) {
    filter.mode = 'insensitive'
  }

  return filter
}

export function isVercelRuntime(): boolean {
  // Vercel's env surface has changed over time. Be robust so we don't accidentally
  // enable disk-based operations on serverless runtimes.
  const env = process.env
  const vercelFlag = String(env.VERCEL || '').trim().toLowerCase()

  if (vercelFlag && vercelFlag !== '0' && vercelFlag !== 'false' && vercelFlag !== 'no') {
    return true
  }

  return Boolean(
    env.VERCEL_ENV ||
      env.VERCEL_URL ||
      env.VERCEL_REGION ||
      env.NOW_REGION ||
      env.NOW_DEPLOYMENT_ID
  )
}


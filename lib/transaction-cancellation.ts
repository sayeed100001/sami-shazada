export const MAX_TRANSACTION_CANCELLATION_AGE_MS = 24 * 60 * 60 * 1000
export const MAX_DAILY_SARAF_CANCELLATIONS = 3

export async function assertSarafTransactionCanBeCancelled(
  tx: any,
  options: {
    sarafId: string
    createdAt: Date
    transactionId?: string
  }
) {
  const transactionAge = Date.now() - options.createdAt.getTime()
  if (transactionAge > MAX_TRANSACTION_CANCELLATION_AGE_MS) {
    throw new Error('CANCELLATION_WINDOW_EXPIRED')
  }

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const cancelledToday = await tx.transaction.count({
    where: {
      sarafId: options.sarafId,
      status: 'CANCELLED',
      updatedAt: { gte: startOfDay },
      ...(options.transactionId
        ? {
            NOT: {
              id: options.transactionId,
            },
          }
        : {}),
    },
  })

  if (cancelledToday >= MAX_DAILY_SARAF_CANCELLATIONS) {
    throw new Error('DAILY_CANCELLATION_LIMIT_EXCEEDED')
  }
}

export function mapCancellationConstraintError(error: unknown) {
  if (!(error instanceof Error)) {
    return null
  }

  if (error.message === 'CANCELLATION_WINDOW_EXPIRED') {
    return {
      status: 400,
      error: 'Cancellation window expired. Pending transactions can only be cancelled within 24 hours.',
    }
  }

  if (error.message === 'DAILY_CANCELLATION_LIMIT_EXCEEDED') {
    return {
      status: 429,
      error: 'Daily cancellation limit exceeded for this saraf.',
    }
  }

  return null
}

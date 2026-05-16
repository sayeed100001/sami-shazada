interface ValidationResult {
  isValid: boolean
  error?: string
}

export function validateExchangeRates(buyRate: number, sellRate: number): ValidationResult {
  if (buyRate <= 0 || sellRate <= 0) {
    return {
      isValid: false,
      error: 'نرخ خرید و فروش باید بزرگتر از صفر باشد'
    }
  }

  if (buyRate >= sellRate) {
    return {
      isValid: false,
      error: 'نرخ خرید باید کمتر از نرخ فروش باشد'
    }
  }

  const spread = ((sellRate - buyRate) / buyRate) * 100
  if (spread > 10) {
    return {
      isValid: false,
      error: 'اختلاف نرخ خرید و فروش بیش از حد مجاز است (حداکثر 10%)'
    }
  }

  return { isValid: true }
}

export function validateTransactionAmount(
  amount: number,
  minAmount: number = 1,
  maxAmount: number = 1000000
): ValidationResult {
  if (!Number.isFinite(amount)) {
    return {
      isValid: false,
      error: 'مبلغ نامعتبر است'
    }
  }

  if (amount < minAmount) {
    return {
      isValid: false,
      error: `مبلغ نمیتواند کمتر از ${minAmount} باشد`
    }
  }

  if (amount > maxAmount) {
    return {
      isValid: false,
      error: `مبلغ نمیتواند بیشتر از ${maxAmount} باشد`
    }
  }

  const decimalPlaces = (amount.toString().split('.')[1] || '').length
  if (decimalPlaces > 2) {
    return {
      isValid: false,
      error: 'مبلغ نمیتواند بیش از 2 رقم اعشار داشته باشد'
    }
  }

  return { isValid: true }
}

export function validateBranchRoute(
  originBranchId: string,
  destinationBranchId: string
): ValidationResult {
  if (originBranchId === destinationBranchId) {
    return {
      isValid: false,
      error: 'شعبه مبدا و مقصد نمیتوانند یکسان باشند'
    }
  }

  return { isValid: true }
}

export function validateCreditAmount(amount: number): ValidationResult {
  if (!Number.isInteger(amount)) {
    return {
      isValid: false,
      error: 'مقدار کریدیت باید عدد صحیح باشد'
    }
  }

  if (amount < 100) {
    return {
      isValid: false,
      error: 'حداقل مقدار کریدیت 100 است'
    }
  }

  if (amount > 1000000) {
    return {
      isValid: false,
      error: 'حداکثر مقدار کریدیت 1,000,000 است'
    }
  }

  return { isValid: true }
}

export function validateCommissionRate(rate: number): ValidationResult {
  if (rate < 0) {
    return {
      isValid: false,
      error: 'نرخ کمیسیون نمیتواند منفی باشد'
    }
  }

  if (rate > 10) {
    return {
      isValid: false,
      error: 'نرخ کمیسیون نمیتواند بیشتر از 10% باشد'
    }
  }

  return { isValid: true }
}

export function validateDuplicateCurrency(
  fromCurrency: string,
  toCurrency: string
): ValidationResult {
  if (fromCurrency === toCurrency) {
    return {
      isValid: false,
      error: 'ارز مبدا و مقصد نمیتوانند یکسان باشند'
    }
  }

  return { isValid: true }
}

export function validateDateRange(startDate: Date, endDate: Date): ValidationResult {
  if (startDate >= endDate) {
    return {
      isValid: false,
      error: 'تاریخ شروع باید قبل از تاریخ پایان باشد'
    }
  }

  const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  if (daysDiff > 365) {
    return {
      isValid: false,
      error: 'بازه زمانی نمیتواند بیشتر از یک سال باشد'
    }
  }

  return { isValid: true }
}

export function validateDiscountCode(
  code: string,
  validFrom: Date,
  validUntil: Date,
  maxUses?: number
): ValidationResult {
  if (code.length < 3 || code.length > 20) {
    return {
      isValid: false,
      error: 'کد تخفیف باید بین 3 تا 20 کاراکتر باشد'
    }
  }

  if (!/^[A-Z0-9]+$/.test(code)) {
    return {
      isValid: false,
      error: 'کد تخفیف فقط میتواند شامل حروف بزرگ انگلیسی و اعداد باشد'
    }
  }

  const dateValidation = validateDateRange(validFrom, validUntil)
  if (!dateValidation.isValid) {
    return dateValidation
  }

  if (maxUses !== undefined && maxUses < 1) {
    return {
      isValid: false,
      error: 'حداکثر تعداد استفاده باید حداقل 1 باشد'
    }
  }

  return { isValid: true }
}

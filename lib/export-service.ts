interface ExportData {
  headers: string[]
  rows: any[][]
  title?: string
}

// Generate CSV content
export function generateCSV(data: ExportData): string {
  const lines: string[] = []

  // Add title if provided
  if (data.title) {
    lines.push(`"${data.title}"`)
    lines.push('')
  }

  // Add headers
  lines.push(data.headers.map(h => `"${h}"`).join(','))

  // Add rows
  for (const row of data.rows) {
    const csvRow = row.map(cell => {
      if (cell === null || cell === undefined) return '""'
      const str = String(cell).replace(/"/g, '""')
      return `"${str}"`
    }).join(',')
    lines.push(csvRow)
  }

  return lines.join('\n')
}

// Generate Excel-compatible HTML (can be opened in Excel)
export function generateExcelHTML(data: ExportData): string {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    table { border-collapse: collapse; width: 100%; font-family: Tahoma, Arial, sans-serif; }
    th { background-color: #4CAF50; color: white; padding: 8px; text-align: right; border: 1px solid #ddd; }
    td { padding: 8px; text-align: right; border: 1px solid #ddd; }
    tr:nth-child(even) { background-color: #f2f2f2; }
    h1 { font-family: Tahoma, Arial, sans-serif; color: #333; }
  </style>
</head>
<body dir="rtl">
  ${data.title ? `<h1>${escapeHtml(data.title)}</h1>` : ''}
  <table>
    <thead>
      <tr>
        ${data.headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${data.rows.map(row => `
        <tr>
          ${row.map(cell => `<td>${escapeHtml(String(cell ?? ''))}</td>`).join('')}
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>
  `.trim()

  return html
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, m => map[m])
}

// Export transactions report
export function exportTransactionsReport(transactions: any[], format: 'csv' | 'excel' = 'csv') {
  const data: ExportData = {
    title: 'گزارش تراکنشها',
    headers: [
      'کد مرجع',
      'نوع',
      'وضعیت',
      'مبلغ مبدا',
      'ارز مبدا',
      'مبلغ مقصد',
      'ارز مقصد',
      'نرخ',
      'کمیسیون',
      'فرستنده',
      'گیرنده',
      'تاریخ ایجاد'
    ],
    rows: transactions.map(t => [
      t.referenceCode,
      t.type,
      t.status,
      t.fromAmount,
      t.fromCurrency,
      t.toAmount,
      t.toCurrency,
      t.rate,
      t.totalCommission,
      t.senderName,
      t.receiverName,
      new Date(t.createdAt).toLocaleDateString('fa-IR')
    ])
  }

  if (format === 'excel') {
    return {
      content: generateExcelHTML(data),
      mimeType: 'application/vnd.ms-excel',
      extension: 'xls'
    }
  }

  return {
    content: generateCSV(data),
    mimeType: 'text/csv',
    extension: 'csv'
  }
}

// Export sarafs report
export function exportSarafsReport(sarafs: any[], format: 'csv' | 'excel' = 'csv') {
  const data: ExportData = {
    title: 'گزارش صرافان',
    headers: [
      'نام تجاری',
      'وضعیت',
      'امتیاز',
      'تعداد تراکنش',
      'موجودی کریدیت',
      'نوع اشتراک',
      'تاریخ ثبت'
    ],
    rows: sarafs.map(s => [
      s.businessName,
      s.status,
      s.rating.toFixed(1),
      s.totalTransactions,
      s.creditBalance,
      s.subscriptionType,
      new Date(s.createdAt).toLocaleDateString('fa-IR')
    ])
  }

  if (format === 'excel') {
    return {
      content: generateExcelHTML(data),
      mimeType: 'application/vnd.ms-excel',
      extension: 'xls'
    }
  }

  return {
    content: generateCSV(data),
    mimeType: 'text/csv',
    extension: 'csv'
  }
}

// Export users report
export function exportUsersReport(users: any[], format: 'csv' | 'excel' = 'csv') {
  const data: ExportData = {
    title: 'گزارش کاربران',
    headers: [
      'نام',
      'ایمیل',
      'تلفن',
      'نقش',
      'سطح VIP',
      'وضعیت',
      'تاریخ ثبت نام',
      'آخرین ورود'
    ],
    rows: users.map(u => [
      u.name,
      u.email,
      u.phone || '-',
      u.role,
      u.vipLevel,
      u.isActive ? 'فعال' : 'غیرفعال',
      new Date(u.createdAt).toLocaleDateString('fa-IR'),
      u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('fa-IR') : '-'
    ])
  }

  if (format === 'excel') {
    return {
      content: generateExcelHTML(data),
      mimeType: 'application/vnd.ms-excel',
      extension: 'xls'
    }
  }

  return {
    content: generateCSV(data),
    mimeType: 'text/csv',
    extension: 'csv'
  }
}

// Export financial report
export function exportFinancialReport(data: any, format: 'csv' | 'excel' = 'csv') {
  const reportData: ExportData = {
    title: 'گزارش مالی',
    headers: [
      'شاخص',
      'مقدار'
    ],
    rows: [
      ['کل درآمد', `${data.totalRevenue} افغانی`],
      ['درآمد سیستم', `${data.systemRevenue} افغانی`],
      ['درآمد صرافان', `${data.sarafRevenue} افغانی`],
      ['تعداد تراکنش', data.totalTransactions],
      ['میانگین کمیسیون', `${data.avgCommission}%`],
      ['تعداد صرافان فعال', data.activeSarafs],
      ['تعداد کاربران فعال', data.activeUsers]
    ]
  }

  if (format === 'excel') {
    return {
      content: generateExcelHTML(reportData),
      mimeType: 'application/vnd.ms-excel',
      extension: 'xls'
    }
  }

  return {
    content: generateCSV(reportData),
    mimeType: 'text/csv',
    extension: 'csv'
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type') || 'overview'
    const format = searchParams.get('format') || 'pdf'

    if (!['pdf', 'csv', 'excel'].includes(format)) {
      return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
    }

    try {
      const reportData = await generateReportData(reportType)
      const rows = normalizeReportRows(reportData, reportType)
      const dateStamp = new Date().toISOString().split('T')[0]

      if (format === 'csv') {
        const csv = generateCSV(rows)
        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="report-${reportType}-${dateStamp}.csv"`,
          },
        })
      }

      if (format === 'excel') {
        const workbook = generateExcelWorkbook(rows, reportType)
        return new NextResponse(workbook, {
          headers: {
            'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
            'Content-Disposition': `attachment; filename="report-${reportType}-${dateStamp}.xls"`,
          },
        })
      }

      // PDF: return a printable HTML page with proper RTL + Persian font support
      const html = generatePdfReport(rows, reportType)
      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `inline; filename="report-${reportType}-${dateStamp}.html"`,
        },
      })
    } catch (dbError) {
      console.error('Database error in report export:', dbError)
      return NextResponse.json({ error: 'Failed to generate report' }, { status: 503 })
    }
  } catch (error) {
    console.error('Report export error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function generateReportData(reportType: string) {
  switch (reportType) {
    case 'users':
      return prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          lastLogin: true,
        },
        orderBy: { createdAt: 'desc' },
      })

    case 'sarafs':
      return prisma.saraf.findMany({
        include: {
          user: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      })

    case 'transactions':
      return prisma.transaction.findMany({
        include: {
          saraf: { select: { businessName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      })

    default: {
      const [users, sarafs, transactions] = await Promise.all([
        prisma.user.count(),
        prisma.saraf.count(),
        prisma.transaction.count(),
      ])
      return {
        summary: {
          totalUsers: users,
          totalSarafs: sarafs,
          totalTransactions: transactions,
          generatedAt: new Date().toISOString(),
        },
      }
    }
  }
}

type ReportRow = Record<string, string | number | boolean | null>

function normalizeReportRows(data: any, reportType: string): ReportRow[] {
  if (reportType === 'users' && Array.isArray(data)) {
    return data.map((user) => ({
      ID: user.id,
      Name: user.name,
      Email: user.email,
      Role: user.role,
      Active: user.isActive ? 'Yes' : 'No',
      'Created At': formatDate(user.createdAt),
      'Last Login': user.lastLogin ? formatDate(user.lastLogin) : 'Never',
    }))
  }

  if (reportType === 'sarafs' && Array.isArray(data)) {
    return data.map((saraf) => ({
      ID: saraf.id,
      'Business Name': saraf.businessName,
      'Owner Name': saraf.user?.name || '',
      'Owner Email': saraf.user?.email || '',
      Status: saraf.status,
      Premium: saraf.isPremium ? 'Yes' : 'No',
      'Created At': formatDate(saraf.createdAt),
    }))
  }

  if (reportType === 'transactions' && Array.isArray(data)) {
    return data.map((transaction) => ({
      ID: transaction.id,
      'Reference Code': transaction.referenceCode,
      Type: transaction.type,
      Status: transaction.status,
      'From Amount': transaction.fromAmount,
      'To Amount': transaction.toAmount,
      Saraf: transaction.saraf?.businessName || '',
      'Created At': formatDate(transaction.createdAt),
    }))
  }

  const summary = (data as any)?.summary || {}
  return [
    { Metric: 'Generated At', Value: formatDateTime(summary.generatedAt || new Date().toISOString()) },
    { Metric: 'Total Users', Value: summary.totalUsers || 0 },
    { Metric: 'Total Sarafs', Value: summary.totalSarafs || 0 },
    { Metric: 'Total Transactions', Value: summary.totalTransactions || 0 },
  ]
}

function formatDate(value: string | Date) {
  return new Date(value).toISOString().split('T')[0]
}

function formatDateTime(value: string | Date) {
  return new Date(value).toISOString().replace('T', ' ').slice(0, 19)
}

function escapeCsv(value: unknown) {
  const normalized = value === null || value === undefined ? '' : String(value)
  return `"${normalized.replace(/"/g, '""')}"`
}

function generateCSV(rows: ReportRow[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const body = rows.map((row) => headers.map((h) => escapeCsv(row[h])).join(','))
  return [headers.join(','), ...body].join('\n')
}

function xmlEscape(value: unknown) {
  const s = value === null || value === undefined ? '' : String(value)
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function generateExcelWorkbook(rows: ReportRow[], reportType: string) {
  if (rows.length === 0) rows = [{ Message: 'No data available' }]

  const headers = Object.keys(rows[0])
  const headerRow = headers
    .map((h) => `<Cell ss:StyleID="header"><Data ss:Type="String">${xmlEscape(h)}</Data></Cell>`)
    .join('')

  const dataRows = rows
    .map((row) => {
      const cells = headers
        .map((h) => {
          const v = row[h]
          const isNum = typeof v === 'number' && Number.isFinite(v)
          return `<Cell><Data ss:Type="${isNum ? 'Number' : 'String'}">${xmlEscape(v)}</Data></Cell>`
        })
        .join('')
      return `<Row>${cells}</Row>`
    })
    .join('')

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="header"><Font ss:Bold="1"/></Style>
 </Styles>
 <Worksheet ss:Name="${xmlEscape(reportType)}">
  <Table>
   <Row>${headerRow}</Row>
   ${dataRows}
  </Table>
 </Worksheet>
</Workbook>`
}

// Returns a printable HTML page instead of broken raw PDF.
// The browser's built-in Print → Save as PDF handles RTL/Persian correctly.
function generatePdfReport(rows: ReportRow[], reportType: string): string {
  const title = `Saray Shahzada - ${reportType.toUpperCase()} Report`
  const generatedAt = formatDateTime(new Date())
  const headers = rows.length > 0 ? Object.keys(rows[0]) : []

  const headerCells = headers.map((h) => `<th>${xmlEscape(h)}</th>`).join('')
  const tableRows =
    rows.length === 0
      ? `<tr><td colspan="${Math.max(headers.length, 1)}" style="text-align:center;color:#888">No data available</td></tr>`
      : rows
          .map(
            (row) =>
              `<tr>${headers.map((h) => `<td>${xmlEscape(String(row[h] ?? ''))}</td>`).join('')}</tr>`
          )
          .join('')

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
<meta charset="UTF-8">
<title>${xmlEscape(title)}</title>
<style>
  @page { size: A4; margin: 18mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Tahoma, Arial, sans-serif; font-size: 11px; color: #1a1a1a; direction: rtl; padding: 16px; }
  h1 { font-size: 15px; margin-bottom: 4px; color: #1e3a8a; }
  .meta { font-size: 10px; color: #555; margin-bottom: 14px; }
  table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
  tr { page-break-inside: avoid; page-break-after: auto; }
  th { background: #1e40af; color: #fff; padding: 6px 8px; text-align: right; border: 1px solid #1e3a8a; font-size: 10px; white-space: nowrap; }
  td { padding: 5px 8px; border: 1px solid #d1d5db; text-align: right; font-size: 10px; word-break: break-word; }
  tr:nth-child(even) td { background: #f8fafc; }
  .print-btn { margin-bottom: 12px; padding: 6px 16px; background: #1e40af; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; }
  @media print { .print-btn { display: none; } }
</style>
</head>
<body>
<button class="print-btn" onclick="window.print()">&#128438; Print / Save as PDF</button>
<h1>${xmlEscape(title)}</h1>
<div class="meta">Generated: ${xmlEscape(generatedAt)} &nbsp;|&nbsp; Total records: ${rows.length}</div>
<table>
  <thead><tr>${headerCells}</tr></thead>
  <tbody>${tableRows}</tbody>
</table>
</body>
</html>`

  return html
}

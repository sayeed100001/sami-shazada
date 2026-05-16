import { describe, it, expect } from 'vitest'
import { generateCSV, generateExcelHTML } from '../lib/export-service'

describe('Export Service', () => {
  describe('generateCSV', () => {
    it('should generate CSV with headers and rows', () => {
      const data = {
        headers: ['Name', 'Email', 'Age'],
        rows: [
          ['John Doe', 'john@example.com', 30],
          ['Jane Smith', 'jane@example.com', 25]
        ]
      }

      const csv = generateCSV(data)
      expect(csv).toContain('"Name","Email","Age"')
      expect(csv).toContain('"John Doe","john@example.com","30"')
      expect(csv).toContain('"Jane Smith","jane@example.com","25"')
    })

    it('should handle null and undefined values', () => {
      const data = {
        headers: ['Name', 'Email'],
        rows: [
          ['John', null],
          [undefined, 'test@example.com']
        ]
      }

      const csv = generateCSV(data)
      expect(csv).toContain('""')
    })

    it('should escape quotes in values', () => {
      const data = {
        headers: ['Name'],
        rows: [['John "Johnny" Doe']]
      }

      const csv = generateCSV(data)
      expect(csv).toContain('"John ""Johnny"" Doe"')
    })

    it('should include title if provided', () => {
      const data = {
        title: 'Test Report',
        headers: ['Name'],
        rows: [['John']]
      }

      const csv = generateCSV(data)
      expect(csv).toContain('"Test Report"')
    })
  })

  describe('generateExcelHTML', () => {
    it('should generate valid HTML table', () => {
      const data = {
        headers: ['Name', 'Email'],
        rows: [['John', 'john@example.com']]
      }

      const html = generateExcelHTML(data)
      expect(html).toContain('<table>')
      expect(html).toContain('<thead>')
      expect(html).toContain('<tbody>')
      expect(html).toContain('<th>Name</th>')
      expect(html).toContain('<td>John</td>')
    })

    it('should escape HTML in values', () => {
      const data = {
        headers: ['Name'],
        rows: [['<script>alert("xss")</script>']]
      }

      const html = generateExcelHTML(data)
      expect(html).not.toContain('<script>')
      expect(html).toContain('&lt;script&gt;')
    })

    it('should include title if provided', () => {
      const data = {
        title: 'Test Report',
        headers: ['Name'],
        rows: [['John']]
      }

      const html = generateExcelHTML(data)
      expect(html).toContain('<h1>Test Report</h1>')
    })

    it('should set RTL direction', () => {
      const data = {
        headers: ['نام'],
        rows: [['احمد']]
      }

      const html = generateExcelHTML(data)
      expect(html).toContain('dir="rtl"')
    })
  })
})

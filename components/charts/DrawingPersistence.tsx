'use client'

import { useState, useEffect } from 'react'

export interface Drawing {
  id: string
  type: 'line' | 'rectangle' | 'fibonacci'
  startPrice: number
  endPrice: number
  startTime: number
  endTime: number
  color: string
  symbol: string
}

export function useDrawingPersistence(symbol: string) {
  const [drawings, setDrawings] = useState<Drawing[]>([])

  useEffect(() => {
    const saved = localStorage.getItem(`drawings_${symbol}`)
    if (saved) {
      try {
        setDrawings(JSON.parse(saved))
      } catch (error) {
        console.error('Failed to load drawings:', error)
      }
    }
  }, [symbol])

  const saveDrawing = (drawing: Drawing) => {
    const updated = [...drawings, drawing]
    setDrawings(updated)
    localStorage.setItem(`drawings_${symbol}`, JSON.stringify(updated))
  }

  const removeDrawing = (id: string) => {
    const updated = drawings.filter(d => d.id !== id)
    setDrawings(updated)
    localStorage.setItem(`drawings_${symbol}`, JSON.stringify(updated))
  }

  const clearDrawings = () => {
    setDrawings([])
    localStorage.removeItem(`drawings_${symbol}`)
  }

  return { drawings, saveDrawing, removeDrawing, clearDrawings }
}
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Calculator, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Zap,
  Globe,
  Bitcoin
} from 'lucide-react'

interface CalculatorProps {
  onConvert: (from: string, to: string, amount: number) => void
  isLoading: boolean
}

export function EnterpriseCalculator({ onConvert, isLoading }: CalculatorProps) {
  const [display, setDisplay] = useState('0')
  const [previousValue, setPreviousValue] = useState<number | null>(null)
  const [operation, setOperation] = useState<string | null>(null)
  const [waitingForOperand, setWaitingForOperand] = useState(false)

  const inputNumber = (num: string) => {
    if (waitingForOperand) {
      setDisplay(num)
      setWaitingForOperand(false)
    } else {
      setDisplay(display === '0' ? num : display + num)
    }
  }

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay('0.')
      setWaitingForOperand(false)
    } else if (display.indexOf('.') === -1) {
      setDisplay(display + '.')
    }
  }

  const clear = () => {
    setDisplay('0')
    setPreviousValue(null)
    setOperation(null)
    setWaitingForOperand(false)
  }

  const performOperation = (nextOperation: string) => {
    const inputValue = parseFloat(display)

    if (previousValue === null) {
      setPreviousValue(inputValue)
    } else if (operation) {
      const currentValue = previousValue || 0
      const newValue = calculate(currentValue, inputValue, operation)

      setDisplay(String(newValue))
      setPreviousValue(newValue)
    }

    setWaitingForOperand(true)
    setOperation(nextOperation)
  }

  const calculate = (firstValue: number, secondValue: number, operation: string) => {
    switch (operation) {
      case '+':
        return firstValue + secondValue
      case '-':
        return firstValue - secondValue
      case '×':
        return firstValue * secondValue
      case '÷':
        return firstValue / secondValue
      case '=':
        return secondValue
      default:
        return secondValue
    }
  }

  const handleEquals = () => {
    const inputValue = parseFloat(display)

    if (previousValue !== null && operation) {
      const newValue = calculate(previousValue, inputValue, operation)
      setDisplay(String(newValue))
      setPreviousValue(null)
      setOperation(null)
      setWaitingForOperand(true)
    }
  }

  const buttons = [
    ['C', '±', '%', '÷'],
    ['7', '8', '9', '×'],
    ['4', '5', '6', '-'],
    ['1', '2', '3', '+'],
    ['0', '.', '=']
  ]

  const getButtonClass = (btn: string) => {
    if (['C', '±', '%'].includes(btn)) {
      return 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200'
    }
    if (['÷', '×', '-', '+', '='].includes(btn)) {
      return 'bg-blue-600 hover:bg-blue-700 text-white'
    }
    return 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700'
  }

  return (
    <Card className="w-full max-w-sm mx-auto">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="h-5 w-5" />
          ماشین حساب علمی
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Display */}
        <div className="bg-black text-white p-4 rounded-lg text-right">
          <div className="text-3xl font-mono font-bold overflow-hidden">
            {display}
          </div>
          {operation && previousValue !== null && (
            <div className="text-sm text-gray-400 mt-1">
              {previousValue} {operation}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-4 gap-2">
          {buttons.flat().map((btn, index) => (
            <Button
              key={index}
              variant="outline"
              className={`h-12 text-lg font-semibold ${getButtonClass(btn)} ${
                btn === '0' ? 'col-span-2' : ''
              }`}
              onClick={() => {
                if (btn >= '0' && btn <= '9') {
                  inputNumber(btn)
                } else if (btn === '.') {
                  inputDecimal()
                } else if (btn === 'C') {
                  clear()
                } else if (btn === '=') {
                  handleEquals()
                } else if (['+', '-', '×', '÷'].includes(btn)) {
                  performOperation(btn)
                } else if (btn === '%') {
                  setDisplay(String(parseFloat(display) / 100))
                } else if (btn === '±') {
                  setDisplay(String(parseFloat(display) * -1))
                }
              }}
            >
              {btn}
            </Button>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">عملیات سریع</div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onConvert('USD', 'AFN', parseFloat(display))}
              disabled={isLoading}
            >
              USD → AFN
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onConvert('BTC', 'USD', parseFloat(display))}
              disabled={isLoading}
            >
              BTC → USD
            </Button>
          </div>
        </div>

        {/* Memory Functions */}
        <div className="grid grid-cols-4 gap-1">
          {['MC', 'MR', 'M+', 'M-'].map((btn) => (
            <Button
              key={btn}
              variant="ghost"
              size="sm"
              className="text-xs"
            >
              {btn}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
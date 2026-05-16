'use client'

import { useMemo, useState } from 'react'
import { Check, ChevronsUpDown, Phone, Search, ShieldCheck, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface SarafComboboxItem {
  id: string
  businessName: string
  phone: string
  city: string
  rating: number
  totalTransactions: number
  isFavorite: boolean
  isVerified: boolean
}

interface SarafComboboxProps {
  items: SarafComboboxItem[]
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  placeholder: string
  searchPlaceholder: string
  emptyLabel: string
  favoriteLabel: string
  verifiedLabel: string
  transactionsLabel: string
  loadingLabel: string
}

function normalizeSearchValue(value: string) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim()
}

function buildSearchHaystack(item: SarafComboboxItem) {
  return normalizeSearchValue(
    [item.businessName, item.city, item.phone, item.rating.toFixed(1), item.totalTransactions.toString()].join(' ')
  )
}

function getSearchScore(item: SarafComboboxItem, query: string) {
  if (!query) return item.isFavorite ? 20 : 10

  const haystack = buildSearchHaystack(item)
  if (!haystack.includes(query)) return -1

  const businessName = normalizeSearchValue(item.businessName)
  const phone = normalizeSearchValue(item.phone)
  const city = normalizeSearchValue(item.city)

  let score = item.isFavorite ? 20 : 10

  if (businessName === query || phone === query) score += 100
  else if (businessName.startsWith(query) || phone.startsWith(query)) score += 70
  else if (city.startsWith(query)) score += 50
  else score += 30

  return score
}

export function SarafCombobox({
  items,
  value,
  onValueChange,
  disabled = false,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  favoriteLabel,
  verifiedLabel,
  transactionsLabel,
  loadingLabel,
}: SarafComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const selectedItem = items.find((item) => item.id === value) || null
  const normalizedQuery = normalizeSearchValue(query)

  const filteredItems = useMemo(() => {
    return [...items]
      .map((item) => ({ item, score: getSearchScore(item, normalizedQuery) }))
      .filter((entry) => entry.score >= 0)
      .sort((left, right) => right.score - left.score || right.item.rating - left.item.rating)
      .map((entry) => entry.item)
  }, [items, normalizedQuery])

  const handleSelect = (id: string) => {
    onValueChange(id)
    setOpen(false)
    setQuery('')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'h-14 w-full justify-between rounded-2xl border-slate-200 bg-white px-4 text-base shadow-sm hover:bg-slate-50',
            'dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10'
          )}
        >
          <div className="min-w-0 text-left">
            {selectedItem ? (
              <div className="min-w-0">
                <div className="truncate font-semibold text-slate-900 dark:text-white">{selectedItem.businessName}</div>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="truncate">{selectedItem.city}</span>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <span dir="ltr">{selectedItem.phone}</span>
                </div>
              </div>
            ) : (
              <span className="text-muted-foreground">{disabled && items.length === 0 ? loadingLabel : placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-3 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] rounded-[24px] border border-slate-200/80 bg-white/96 p-0 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/96"
      >
        <div className="border-b border-slate-200/70 px-4 py-3 dark:border-white/10">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/90 px-3 dark:border-white/10 dark:bg-white/5">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => {
              const isSelected = item.id === value

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item.id)}
                  className={cn(
                    'w-full rounded-2xl border p-3 text-left transition-colors',
                    'mb-2 last:mb-0',
                    isSelected
                      ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10'
                      : 'border-transparent hover:border-slate-200 hover:bg-slate-50 dark:hover:border-white/10 dark:hover:bg-white/5'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Check className={cn('h-4 w-4 shrink-0', isSelected ? 'opacity-100 text-emerald-500' : 'opacity-0')} />
                        <span className="truncate font-semibold text-slate-900 dark:text-white">{item.businessName}</span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span>{item.city}</span>
                        <span className="text-slate-300 dark:text-slate-600">•</span>
                        <span dir="ltr" className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {item.phone}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {item.isFavorite ? (
                          <Badge className="rounded-full bg-rose-500 text-white hover:bg-rose-500">{favoriteLabel}</Badge>
                        ) : null}
                        {item.isVerified ? (
                          <Badge
                            variant="outline"
                            className="rounded-full border-emerald-200 bg-white/70 text-emerald-700 dark:border-emerald-500/20 dark:bg-transparent dark:text-emerald-300"
                          >
                            <ShieldCheck className="mr-1 h-3 w-3" />
                            {verifiedLabel}
                          </Badge>
                        ) : null}
                        <Badge
                          variant="outline"
                          className="rounded-full border-slate-200 bg-white/70 text-slate-700 dark:border-white/10 dark:bg-transparent dark:text-slate-300"
                        >
                          <Star className="mr-1 h-3 w-3 text-amber-400" />
                          {item.rating.toFixed(1)}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="rounded-full border-slate-200 bg-white/70 text-slate-700 dark:border-white/10 dark:bg-transparent dark:text-slate-300"
                        >
                          {item.totalTransactions} {transactionsLabel}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })
          ) : (
            <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">{emptyLabel}</div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

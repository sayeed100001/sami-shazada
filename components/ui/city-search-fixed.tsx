'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, Search, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { searchCities, type City } from '@/lib/worldCities'

interface CitySearchProps {
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function CitySearchFixed({
  value,
  onValueChange,
  placeholder = "انتخاب شهر...",
  disabled = false,
  className
}: CitySearchProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [cities, setCities] = React.useState<City[]>([])
  const [filteredCities, setFilteredCities] = React.useState<City[]>([])
  const [loading, setLoading] = React.useState(false)

  // Load initial cities safely
  React.useEffect(() => {
    try {
      setLoading(true)
      const initialCities = searchCities('', 100)
      setCities(initialCities || [])
      setFilteredCities(initialCities?.slice(0, 50) || [])
    } catch (error) {
      console.error('Error loading cities:', error)
      setCities([])
      setFilteredCities([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Search cities when query changes
  React.useEffect(() => {
    try {
      if (!searchQuery.trim()) {
        setFilteredCities(cities.slice(0, 50))
      } else {
        const results = searchCities(searchQuery, 50)
        setFilteredCities(results || [])
      }
    } catch (error) {
      console.error('Error filtering cities:', error)
      setFilteredCities([])
    }
  }, [searchQuery, cities])

  const selectedCity = React.useMemo(() => {
    try {
      return cities.find(city => city?.name === value) || null
    } catch (error) {
      console.error('Error finding selected city:', error)
      return null
    }
  }, [cities, value])

  const handleCitySelect = React.useCallback((cityName: string) => {
    try {
      onValueChange?.(cityName === value ? '' : cityName)
      setOpen(false)
    } catch (error) {
      console.error('Error selecting city:', error)
    }
  }, [value, onValueChange])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled}
        >
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 opacity-50" />
            {selectedCity ? (
              <div className="flex items-center gap-2">
                <span>{selectedCity.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {selectedCity.country}
                </Badge>
              </div>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <div className="flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0"
              placeholder="جستجوی شهر یا کشور..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="max-h-64 overflow-auto p-1">
            {loading ? (
              <div className="py-6 text-center text-sm">
                <div className="text-muted-foreground">در حال بارگذاری...</div>
              </div>
            ) : filteredCities && filteredCities.length > 0 ? (
              filteredCities.map((city, index) => {
                if (!city || !city.name) return null
                
                return (
                  <div
                    key={`${city.name}-${city.country}-${index}`}
                    className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                    onClick={() => handleCitySelect(city.name)}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === city.name ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{city.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {city.country} • {city.region}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {city.country}
                    </Badge>
                  </div>
                )
              })
            ) : (
              <div className="py-6 text-center text-sm">
                <MapPin className="mx-auto h-8 w-8 opacity-50 mb-2" />
                شهری یافت نشد
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
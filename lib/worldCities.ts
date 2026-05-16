// World Cities Database for Hawala System
export interface City {
  name: string
  country: string
  region: string
  population?: number
  coordinates?: {
    lat: number
    lng: number
  }
}

export const WORLD_CITIES: City[] = [
  // Afghanistan
  { name: 'Kabul', country: 'Afghanistan', region: 'Asia' },
  { name: 'Herat', country: 'Afghanistan', region: 'Asia' },
  { name: 'Kandahar', country: 'Afghanistan', region: 'Asia' },
  { name: 'Mazar-i-Sharif', country: 'Afghanistan', region: 'Asia' },
  { name: 'Jalalabad', country: 'Afghanistan', region: 'Asia' },
  { name: 'Kunduz', country: 'Afghanistan', region: 'Asia' },
  { name: 'Ghazni', country: 'Afghanistan', region: 'Asia' },
  { name: 'Balkh', country: 'Afghanistan', region: 'Asia' },
  { name: 'Bamyan', country: 'Afghanistan', region: 'Asia' },
  { name: 'Farah', country: 'Afghanistan', region: 'Asia' },
  
  // Pakistan
  { name: 'Karachi', country: 'Pakistan', region: 'Asia' },
  { name: 'Lahore', country: 'Pakistan', region: 'Asia' },
  { name: 'Islamabad', country: 'Pakistan', region: 'Asia' },
  { name: 'Rawalpindi', country: 'Pakistan', region: 'Asia' },
  { name: 'Faisalabad', country: 'Pakistan', region: 'Asia' },
  { name: 'Multan', country: 'Pakistan', region: 'Asia' },
  { name: 'Peshawar', country: 'Pakistan', region: 'Asia' },
  { name: 'Quetta', country: 'Pakistan', region: 'Asia' },
  
  // Iran
  { name: 'Tehran', country: 'Iran', region: 'Asia' },
  { name: 'Mashhad', country: 'Iran', region: 'Asia' },
  { name: 'Isfahan', country: 'Iran', region: 'Asia' },
  { name: 'Shiraz', country: 'Iran', region: 'Asia' },
  { name: 'Tabriz', country: 'Iran', region: 'Asia' },
  { name: 'Ahvaz', country: 'Iran', region: 'Asia' },
  { name: 'Kermanshah', country: 'Iran', region: 'Asia' },
  
  // India
  { name: 'Mumbai', country: 'India', region: 'Asia' },
  { name: 'Delhi', country: 'India', region: 'Asia' },
  { name: 'Bangalore', country: 'India', region: 'Asia' },
  { name: 'Hyderabad', country: 'India', region: 'Asia' },
  { name: 'Chennai', country: 'India', region: 'Asia' },
  { name: 'Kolkata', country: 'India', region: 'Asia' },
  { name: 'Pune', country: 'India', region: 'Asia' },
  { name: 'Ahmedabad', country: 'India', region: 'Asia' },
  
  // UAE
  { name: 'Dubai', country: 'UAE', region: 'Asia' },
  { name: 'Abu Dhabi', country: 'UAE', region: 'Asia' },
  { name: 'Sharjah', country: 'UAE', region: 'Asia' },
  { name: 'Ajman', country: 'UAE', region: 'Asia' },
  
  // Saudi Arabia
  { name: 'Riyadh', country: 'Saudi Arabia', region: 'Asia' },
  { name: 'Jeddah', country: 'Saudi Arabia', region: 'Asia' },
  { name: 'Mecca', country: 'Saudi Arabia', region: 'Asia' },
  { name: 'Medina', country: 'Saudi Arabia', region: 'Asia' },
  { name: 'Dammam', country: 'Saudi Arabia', region: 'Asia' },
  
  // Turkey
  { name: 'Istanbul', country: 'Turkey', region: 'Europe/Asia' },
  { name: 'Ankara', country: 'Turkey', region: 'Europe/Asia' },
  { name: 'Izmir', country: 'Turkey', region: 'Europe/Asia' },
  { name: 'Bursa', country: 'Turkey', region: 'Europe/Asia' },
  
  // USA
  { name: 'New York', country: 'USA', region: 'North America' },
  { name: 'Los Angeles', country: 'USA', region: 'North America' },
  { name: 'Chicago', country: 'USA', region: 'North America' },
  { name: 'Houston', country: 'USA', region: 'North America' },
  { name: 'Phoenix', country: 'USA', region: 'North America' },
  { name: 'Philadelphia', country: 'USA', region: 'North America' },
  { name: 'San Antonio', country: 'USA', region: 'North America' },
  { name: 'San Diego', country: 'USA', region: 'North America' },
  { name: 'Dallas', country: 'USA', region: 'North America' },
  { name: 'San Jose', country: 'USA', region: 'North America' },
  { name: 'Austin', country: 'USA', region: 'North America' },
  { name: 'Jacksonville', country: 'USA', region: 'North America' },
  { name: 'Fort Worth', country: 'USA', region: 'North America' },
  { name: 'Columbus', country: 'USA', region: 'North America' },
  { name: 'Charlotte', country: 'USA', region: 'North America' },
  { name: 'San Francisco', country: 'USA', region: 'North America' },
  { name: 'Indianapolis', country: 'USA', region: 'North America' },
  { name: 'Seattle', country: 'USA', region: 'North America' },
  { name: 'Denver', country: 'USA', region: 'North America' },
  { name: 'Washington DC', country: 'USA', region: 'North America' },
  { name: 'Boston', country: 'USA', region: 'North America' },
  { name: 'El Paso', country: 'USA', region: 'North America' },
  { name: 'Detroit', country: 'USA', region: 'North America' },
  { name: 'Nashville', country: 'USA', region: 'North America' },
  { name: 'Portland', country: 'USA', region: 'North America' },
  { name: 'Memphis', country: 'USA', region: 'North America' },
  { name: 'Oklahoma City', country: 'USA', region: 'North America' },
  { name: 'Las Vegas', country: 'USA', region: 'North America' },
  { name: 'Louisville', country: 'USA', region: 'North America' },
  { name: 'Baltimore', country: 'USA', region: 'North America' },
  { name: 'Milwaukee', country: 'USA', region: 'North America' },
  { name: 'Albuquerque', country: 'USA', region: 'North America' },
  { name: 'Tucson', country: 'USA', region: 'North America' },
  { name: 'Fresno', country: 'USA', region: 'North America' },
  { name: 'Sacramento', country: 'USA', region: 'North America' },
  { name: 'Kansas City', country: 'USA', region: 'North America' },
  { name: 'Mesa', country: 'USA', region: 'North America' },
  { name: 'Atlanta', country: 'USA', region: 'North America' },
  { name: 'Colorado Springs', country: 'USA', region: 'North America' },
  { name: 'Raleigh', country: 'USA', region: 'North America' },
  { name: 'Omaha', country: 'USA', region: 'North America' },
  { name: 'Miami', country: 'USA', region: 'North America' },
  { name: 'Oakland', country: 'USA', region: 'North America' },
  { name: 'Tulsa', country: 'USA', region: 'North America' },
  { name: 'Minneapolis', country: 'USA', region: 'North America' },
  { name: 'Cleveland', country: 'USA', region: 'North America' },
  { name: 'Wichita', country: 'USA', region: 'North America' },
  { name: 'Arlington', country: 'USA', region: 'North America' },
  
  // Canada
  { name: 'Toronto', country: 'Canada', region: 'North America' },
  { name: 'Montreal', country: 'Canada', region: 'North America' },
  { name: 'Vancouver', country: 'Canada', region: 'North America' },
  { name: 'Calgary', country: 'Canada', region: 'North America' },
  { name: 'Edmonton', country: 'Canada', region: 'North America' },
  { name: 'Ottawa', country: 'Canada', region: 'North America' },
  { name: 'Winnipeg', country: 'Canada', region: 'North America' },
  { name: 'Quebec City', country: 'Canada', region: 'North America' },
  
  // UK
  { name: 'London', country: 'UK', region: 'Europe' },
  { name: 'Birmingham', country: 'UK', region: 'Europe' },
  { name: 'Manchester', country: 'UK', region: 'Europe' },
  { name: 'Glasgow', country: 'UK', region: 'Europe' },
  { name: 'Liverpool', country: 'UK', region: 'Europe' },
  { name: 'Leeds', country: 'UK', region: 'Europe' },
  { name: 'Sheffield', country: 'UK', region: 'Europe' },
  { name: 'Edinburgh', country: 'UK', region: 'Europe' },
  { name: 'Bristol', country: 'UK', region: 'Europe' },
  { name: 'Cardiff', country: 'UK', region: 'Europe' },
  
  // Germany
  { name: 'Berlin', country: 'Germany', region: 'Europe' },
  { name: 'Hamburg', country: 'Germany', region: 'Europe' },
  { name: 'Munich', country: 'Germany', region: 'Europe' },
  { name: 'Cologne', country: 'Germany', region: 'Europe' },
  { name: 'Frankfurt', country: 'Germany', region: 'Europe' },
  { name: 'Stuttgart', country: 'Germany', region: 'Europe' },
  { name: 'Düsseldorf', country: 'Germany', region: 'Europe' },
  { name: 'Dortmund', country: 'Germany', region: 'Europe' },
  
  // France
  { name: 'Paris', country: 'France', region: 'Europe' },
  { name: 'Marseille', country: 'France', region: 'Europe' },
  { name: 'Lyon', country: 'France', region: 'Europe' },
  { name: 'Toulouse', country: 'France', region: 'Europe' },
  { name: 'Nice', country: 'France', region: 'Europe' },
  { name: 'Nantes', country: 'France', region: 'Europe' },
  { name: 'Strasbourg', country: 'France', region: 'Europe' },
  { name: 'Montpellier', country: 'France', region: 'Europe' },
  
  // Australia
  { name: 'Sydney', country: 'Australia', region: 'Oceania' },
  { name: 'Melbourne', country: 'Australia', region: 'Oceania' },
  { name: 'Brisbane', country: 'Australia', region: 'Oceania' },
  { name: 'Perth', country: 'Australia', region: 'Oceania' },
  { name: 'Adelaide', country: 'Australia', region: 'Oceania' },
  { name: 'Gold Coast', country: 'Australia', region: 'Oceania' },
  { name: 'Newcastle', country: 'Australia', region: 'Oceania' },
  { name: 'Canberra', country: 'Australia', region: 'Oceania' },
  
  // China
  { name: 'Beijing', country: 'China', region: 'Asia' },
  { name: 'Shanghai', country: 'China', region: 'Asia' },
  { name: 'Guangzhou', country: 'China', region: 'Asia' },
  { name: 'Shenzhen', country: 'China', region: 'Asia' },
  { name: 'Chengdu', country: 'China', region: 'Asia' },
  { name: 'Hangzhou', country: 'China', region: 'Asia' },
  { name: 'Wuhan', country: 'China', region: 'Asia' },
  { name: 'Xian', country: 'China', region: 'Asia' },
  
  // Japan
  { name: 'Tokyo', country: 'Japan', region: 'Asia' },
  { name: 'Osaka', country: 'Japan', region: 'Asia' },
  { name: 'Kyoto', country: 'Japan', region: 'Asia' },
  { name: 'Yokohama', country: 'Japan', region: 'Asia' },
  { name: 'Nagoya', country: 'Japan', region: 'Asia' },
  { name: 'Sapporo', country: 'Japan', region: 'Asia' },
  { name: 'Fukuoka', country: 'Japan', region: 'Asia' },
  { name: 'Kobe', country: 'Japan', region: 'Asia' },
  
  // South Korea
  { name: 'Seoul', country: 'South Korea', region: 'Asia' },
  { name: 'Busan', country: 'South Korea', region: 'Asia' },
  { name: 'Incheon', country: 'South Korea', region: 'Asia' },
  { name: 'Daegu', country: 'South Korea', region: 'Asia' },
  { name: 'Daejeon', country: 'South Korea', region: 'Asia' },
  { name: 'Gwangju', country: 'South Korea', region: 'Asia' },
  
  // Russia
  { name: 'Moscow', country: 'Russia', region: 'Europe/Asia' },
  { name: 'Saint Petersburg', country: 'Russia', region: 'Europe' },
  { name: 'Novosibirsk', country: 'Russia', region: 'Asia' },
  { name: 'Yekaterinburg', country: 'Russia', region: 'Europe/Asia' },
  { name: 'Nizhny Novgorod', country: 'Russia', region: 'Europe' },
  { name: 'Kazan', country: 'Russia', region: 'Europe' },
  
  // Brazil
  { name: 'São Paulo', country: 'Brazil', region: 'South America' },
  { name: 'Rio de Janeiro', country: 'Brazil', region: 'South America' },
  { name: 'Brasília', country: 'Brazil', region: 'South America' },
  { name: 'Salvador', country: 'Brazil', region: 'South America' },
  { name: 'Fortaleza', country: 'Brazil', region: 'South America' },
  { name: 'Belo Horizonte', country: 'Brazil', region: 'South America' },
  
  // Mexico
  { name: 'Mexico City', country: 'Mexico', region: 'North America' },
  { name: 'Guadalajara', country: 'Mexico', region: 'North America' },
  { name: 'Monterrey', country: 'Mexico', region: 'North America' },
  { name: 'Puebla', country: 'Mexico', region: 'North America' },
  { name: 'Tijuana', country: 'Mexico', region: 'North America' },
  { name: 'León', country: 'Mexico', region: 'North America' },
  
  // Other major cities
  { name: 'Cairo', country: 'Egypt', region: 'Africa' },
  { name: 'Lagos', country: 'Nigeria', region: 'Africa' },
  { name: 'Johannesburg', country: 'South Africa', region: 'Africa' },
  { name: 'Buenos Aires', country: 'Argentina', region: 'South America' },
  { name: 'Lima', country: 'Peru', region: 'South America' },
  { name: 'Bogotá', country: 'Colombia', region: 'South America' },
  { name: 'Santiago', country: 'Chile', region: 'South America' },
  { name: 'Caracas', country: 'Venezuela', region: 'South America' },
]

export function searchCities(query: string, limit: number = 50): City[] {
  try {
    if (!query || query.trim().length === 0) {
      return WORLD_CITIES.slice(0, limit)
    }
    
    const searchTerm = query.toLowerCase().trim()
    
    const filtered = WORLD_CITIES.filter(city => {
      if (!city || !city.name || !city.country) return false
      return city.name.toLowerCase().includes(searchTerm) ||
             city.country.toLowerCase().includes(searchTerm)
    })
    
    const sorted = filtered.sort((a, b) => {
      if (!a || !b || !a.name || !b.name) return 0
      
      // Prioritize exact matches
      const aExact = a.name.toLowerCase().startsWith(searchTerm)
      const bExact = b.name.toLowerCase().startsWith(searchTerm)
      
      if (aExact && !bExact) return -1
      if (!aExact && bExact) return 1
      
      // Then sort alphabetically
      return a.name.localeCompare(b.name)
    })
    
    return sorted.slice(0, limit)
  } catch (error) {
    console.error('Error searching cities:', error)
    return WORLD_CITIES.slice(0, Math.min(limit, 20))
  }
}

export function getCitiesByCountry(country: string): City[] {
  return WORLD_CITIES.filter(city => 
    city.country.toLowerCase() === country.toLowerCase()
  )
}

export function getCitiesByRegion(region: string): City[] {
  return WORLD_CITIES.filter(city => 
    city.region.toLowerCase().includes(region.toLowerCase())
  )
}
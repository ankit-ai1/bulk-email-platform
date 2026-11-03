import { createContext, useContext, useEffect } from 'react'

const ThemeContext = createContext({ theme: 'light' })

// The product ships in light mode only.
export function ThemeProvider({ children }) {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light')
    try { localStorage.removeItem('theme') } catch { /* nothing stored */ }
  }, [])

  return (
    <ThemeContext.Provider value={{ theme: 'light' }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)

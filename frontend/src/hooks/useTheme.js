/**
 * Theme hook for managing light/dark/system theme
 */

import { useState, useEffect } from 'react'
import { THEME, STORAGE_KEYS } from '@/lib/constants'

const useTheme = () => {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME)
    return savedTheme || THEME.SYSTEM
  })

  useEffect(() => {
    const root = window.document.documentElement
    
    // Remove all theme classes
    root.classList.remove('light', 'dark')
    
    // Set theme based on preference
    if (theme === THEME.SYSTEM) {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? THEME.DARK
        : THEME.LIGHT
      root.classList.add(systemTheme)
    } else {
      root.classList.add(theme)
    }
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEYS.THEME, theme)
  }, [theme])

  const toggleTheme = () => {
    const newTheme = theme === THEME.LIGHT 
      ? THEME.DARK 
      : theme === THEME.DARK 
        ? THEME.SYSTEM 
        : THEME.LIGHT
    setTheme(newTheme)
  }

  const setLightTheme = () => setTheme(THEME.LIGHT)
  const setDarkTheme = () => setTheme(THEME.DARK)
  const setSystemTheme = () => setTheme(THEME.SYSTEM)

  return {
    theme,
    setTheme,
    toggleTheme,
    setLightTheme,
    setDarkTheme,
    setSystemTheme
  }
}

export { useTheme }

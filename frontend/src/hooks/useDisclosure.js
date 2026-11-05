/**
 * Hook for managing open/close state
 */

import { useState, useCallback } from 'react'

const useDisclosure = (initialState = false) => {
  const [isOpen, setIsOpen] = useState(initialState)

  const onOpen = useCallback(() => setIsOpen(true), [])
  const onClose = useCallback(() => setIsOpen(false), [])
  const onToggle = useCallback(() => setIsOpen((prev) => !prev), [])

  return {
    isOpen,
    onOpen,
    onClose,
    onToggle,
    setIsOpen
  }
}

export { useDisclosure }

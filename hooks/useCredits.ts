'use client'
import { useState } from 'react'

export function useCredits(initial = 10) {
  const [credits, setCredits] = useState(initial)

  const spend = (amount = 0.5) => {
    if (credits <= 0) return false
    setCredits((c) => Math.max(0, parseFloat((c - amount).toFixed(2))))
    return true
  }

  return { credits, spend, hasCredits: credits > 0 }
}

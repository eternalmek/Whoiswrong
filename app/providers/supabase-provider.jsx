'use client'
import { createContext, useContext, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

const SupabaseContext = createContext()

export default function SupabaseProvider({ children }) {
  const [supabase] = useState(() => createClient())

  return (
    <SupabaseContext.Provider value={{ supabase }}>
      {children}
    </SupabaseContext.Provider>
  )
}

export function useSupabase() {
  return useContext(SupabaseContext)
}

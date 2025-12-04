'use client'
import { createContext, useContext } from 'react'
import { supabase } from '@/utils/supabase/client'

const SupabaseContext = createContext()

export default function SupabaseProvider({ children }) {
  return (
    <SupabaseContext.Provider value={{ supabase }}>
      {children}
    </SupabaseContext.Provider>
  )
}

export function useSupabase() {
  return useContext(SupabaseContext)
}

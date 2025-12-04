'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase/client'

export default function AccountPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadUser() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) {
          throw sessionError
        }

        if (!session?.user) {
          window.location.href = '/login'
          return
        }

        if (isMounted) {
          setUser(session.user)
        }
      } catch (err) {
        console.error('Failed to load account session', err)
        if (isMounted) {
          setError('Unable to load your account right now.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadUser()

    return () => {
      isMounted = false
    }
  }, [])

  const handleDelete = async () => {
    if (deleting) return

    const confirmed = window.confirm('Are you sure you want to delete your account? This cannot be undone.')
    if (!confirmed) return

    try {
      setDeleting(true)
      setError(null)
      setMessage('')

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) {
        throw sessionError
      }

      if (!session?.access_token) {
        throw new Error('You must be logged in to delete your account.')
      }

      const response = await fetch('/api/auth/me', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to delete account.')
      }

      await supabase.auth.signOut()
      setMessage('Account deleted. Redirecting...')
      setTimeout(() => {
        window.location.href = '/'
      }, 1500)
    } catch (err) {
      console.error('Account deletion failed', err)
      setError(err.message || 'Unable to delete account. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return <p>Loading account...</p>
  }

  if (error) {
    return (
      <div className="account-page">
        <h1>My Account</h1>
        <p className="account-error">{error}</p>
      </div>
    )
  }

  return (
    <div className="account-page">
      <h1>My Account</h1>
      {user && <p className="account-email">Signed in as {user.email}</p>}

      <button type="button" onClick={handleDelete} disabled={deleting} className="account-delete-button">
        {deleting ? 'Deleting account...' : 'Delete my account'}
      </button>

      {message && <p className="account-message">{message}</p>}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase/client'

export default function AccountPage() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [message, setMessage] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function fetchSession() {
      try {
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          throw error
        }

        if (!data.session) {
          window.location.href = '/login'
          return
        }

        if (isMounted) {
          setSession(data.session)
        }
      } catch (err) {
        console.error('Unable to load account session', err)
        if (isMounted) {
          setLoadError('We could not load your account right now. Please refresh to try again.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchSession()

    return () => {
      isMounted = false
    }
  }, [])

  const handleDelete = async () => {
    if (!session || deleting) return

    const confirmed = window.confirm('Delete your account and all related data? This cannot be undone.')
    if (!confirmed) return

    try {
      setDeleting(true)
      setActionError('')
      setMessage('')

      const response = await fetch('/api/auth/me', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error || 'Unable to delete account. Please try again.')
      }

      await supabase.auth.signOut()
      setMessage('Your account has been deleted. Redirecting to the homepage...')
      setTimeout(() => {
        window.location.href = '/'
      }, 1200)
    } catch (err) {
      console.error('Account deletion failed', err)
      setActionError(err.message || 'Unable to delete account. Please try again later.')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <main className="account-page">
        <p>Loading your account...</p>
      </main>
    )
  }

  if (loadError) {
    return (
      <main className="account-page">
        <h1>Account</h1>
        <p className="account-error">{loadError}</p>
      </main>
    )
  }

  const user = session?.user

  return (
    <main className="account-page">
      <section className="account-card">
        <h1>Account</h1>
        <dl className="account-details">
          <div>
            <dt>Email</dt>
            <dd>{user?.email}</dd>
          </div>
          <div>
            <dt>User ID</dt>
            <dd>{user?.id}</dd>
          </div>
        </dl>
      </section>

      <section className="account-card account-card-danger">
        <h2>Delete account</h2>
        <p>This will remove your account and any associated data.</p>
        <button type="button" onClick={handleDelete} disabled={deleting} className="account-delete-button">
          {deleting ? 'Deleting your account…' : 'Delete account'}
        </button>
        {actionError && <p className="account-error">{actionError}</p>}
        {message && <p className="account-message">{message}</p>}
      </section>
    </main>
  )
}

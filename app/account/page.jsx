'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase/client'

export default function AccountPage() {
  const [user, setUser] = useState(null)
  const [judgements, setJudgements] = useState([])
  const [purchases, setPurchases] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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

        const currentUser = session?.user

        if (!currentUser) {
          window.location.href = '/login'
          return
        }

        if (!isMounted) return

        setUser(currentUser)

        const [judgementsResponse, purchasesResponse] = await Promise.all([
          supabase
            .from('judgements')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false }),
          supabase.from('purchases').select('*').eq('user_id', currentUser.id),
        ])

        if (!isMounted) return

        if (judgementsResponse.error) {
          throw judgementsResponse.error
        }

        if (purchasesResponse.error) {
          throw purchasesResponse.error
        }

        setJudgements(judgementsResponse.data || [])
        setPurchases(purchasesResponse.data || [])
      } catch (err) {
        console.error('Failed to load account data', err)
        if (isMounted) {
          setError('Unable to load account details. Please try again later.')
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

  if (loading) return <p>Loading...</p>

  if (error) {
    return (
      <div>
        <h1>My Account</h1>
        <p>{error}</p>
      </div>
    )
  }

  if (!user) return null

  const username = user.user_metadata?.username

  return (
    <div>
      <h1>My Account</h1>

      <section>
        <h2>Profile</h2>
        <p>Email: {user.email}</p>
        <p>Created: {new Date(user.created_at).toLocaleDateString()}</p>
        {username && <p>Username: {username}</p>}
      </section>

      <section>
        <h2>History</h2>
        {judgements.length === 0 ? (
          <p>No judgements found.</p>
        ) : (
          <ul>
            {judgements.map((judgement) => (
              <li key={judgement.id}>
                <p><strong>Prompt:</strong> {judgement.prompt || 'N/A'}</p>
                <p><strong>Verdict:</strong> {judgement.verdict || 'N/A'}</p>
                <p><strong>Created:</strong> {new Date(judgement.created_at).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Purchases</h2>
        {purchases.length === 0 ? (
          <p>No purchases found.</p>
        ) : (
          <ul>
            {purchases.map((purchase) => (
              <li key={purchase.id}>
                <p><strong>Item:</strong> {purchase.item || 'Purchase'}</p>
                <p><strong>Amount:</strong> {purchase.amount || 'N/A'}</p>
                <p><strong>Date:</strong> {new Date(purchase.created_at).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/utils/supabase/client'

const initialStats = { questions: 0, judgements: 0, friends: 0 }

export default function AccountPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [questions, setQuestions] = useState([])
  const [judgements, setJudgements] = useState([])
  const [friends, setFriends] = useState([])
  const [settings, setSettings] = useState(null)
  const [stats, setStats] = useState(initialStats)
  const [profileForm, setProfileForm] = useState({ username: '', full_name: '' })
  const [settingsForm, setSettingsForm] = useState({ theme: 'light', language: 'en', marketing_opt_in: false })
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadAccount() {
      setLoading(true)
      setError(null)

      const { data: userData, error: userError } = await supabase.auth.getUser()
      console.log('Loaded auth user', userData?.user || null)
      if (userError) {
        console.error('Error loading auth user', userError)
        if (isMounted) {
          setError(userError.message || 'Unable to load user')
          setLoading(false)
        }
        return
      }

      const currentUser = userData?.user || null
      if (!currentUser) {
        if (isMounted) {
          setUser(null)
          setLoading(false)
        }
        return
      }

      try {
        const loadedProfile = await fetchOrCreateProfile(currentUser)
        if (!loadedProfile) {
          throw new Error('Profile could not be created or loaded')
        }

        const [statsResult, questionsResult, judgementsResult, friendsResult, settingsResult] =
          await Promise.all([
            loadStats(currentUser),
            loadQuestions(currentUser),
            loadJudgements(currentUser),
            loadFriends(currentUser),
            loadSettings(currentUser),
          ])

        if (!isMounted) return

        setUser(currentUser)
        setProfile(loadedProfile)
        setProfileForm({
          username: loadedProfile.username || '',
          full_name: loadedProfile.full_name || '',
        })
        setStats(statsResult)
        setQuestions(questionsResult)
        setJudgements(judgementsResult)
        setFriends(friendsResult)
        setSettings(settingsResult)
        setSettingsForm({
          theme: settingsResult?.theme || 'light',
          language: settingsResult?.language || 'en',
          marketing_opt_in: !!settingsResult?.marketing_opt_in,
        })
      } catch (err) {
        console.error('Account load failed', err)
        if (isMounted) {
          setError(err.message || 'We could not load your data. Please try again later.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadAccount()

    return () => {
      isMounted = false
    }
  }, [])

  const acceptedFriends = useMemo(
    () => friends.filter((f) => f.status === 'accepted'),
    [friends]
  )
  const pendingFriends = useMemo(
    () => friends.filter((f) => f.status === 'pending'),
    [friends]
  )

  async function fetchOrCreateProfile(currentUser) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .maybeSingle()
    if (error) {
      console.error('Error loading profile', error)
      throw error
    }
    console.log('Loaded profile', data)

    if (data) return data

    const { error: insertError } = await supabase
      .from('profiles')
      .insert({ id: currentUser.id, username: null, full_name: null })
    if (insertError) {
      console.error('Error creating profile', insertError)
      throw insertError
    }

    const { data: inserted, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .maybeSingle()
    if (fetchError) {
      console.error('Error reloading profile after insert', fetchError)
      throw fetchError
    }
    console.log('Created profile', inserted)
    return inserted
  }

  async function loadStats(currentUser) {
    const [questionsCount, judgementsCount, friendsCount] = await Promise.all([
      supabase
        .from('questions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', currentUser.id),
      supabase
        .from('judgements')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', currentUser.id),
      supabase
        .from('friends')
        .select('id', { count: 'exact', head: true })
        .or(`user_id.eq.${currentUser.id},friend_user_id.eq.${currentUser.id}`)
        .eq('status', 'accepted'),
    ])

    const questionsTotal = questionsCount.count || 0
    const judgementsTotal = judgementsCount.count || 0
    const friendsTotal = friendsCount.count || 0

    console.log('Loaded stats', { questionsTotal, judgementsTotal, friendsTotal })

    if (questionsCount.error) throw questionsCount.error
    if (judgementsCount.error) throw judgementsCount.error
    if (friendsCount.error) throw friendsCount.error

    return { questions: questionsTotal, judgements: judgementsTotal, friends: friendsTotal }
  }

  async function loadQuestions(currentUser) {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Error loading questions', error)
      throw error
    }
    console.log('Loaded questions', data)
    return data || []
  }

  async function loadJudgements(currentUser) {
    const { data, error } = await supabase
      .from('judgements')
      .select('id, judge_id, question_text, verdict_text, created_at, judges(name, slug)')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Error loading judgements', error)
      throw error
    }
    console.log('Loaded judgements', data)
    return data || []
  }

  async function loadFriends(currentUser) {
    const { data, error } = await supabase
      .from('friends')
      .select('*')
      .or(`user_id.eq.${currentUser.id},friend_user_id.eq.${currentUser.id}`)
      .neq('status', 'blocked')

    if (error) {
      console.error('Error loading friends', error)
      throw error
    }
    console.log('Loaded friends', data)
    return data || []
  }

  async function loadSettings(currentUser) {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', currentUser.id)
      .maybeSingle()

    if (error) {
      console.error('Error loading settings', error)
      throw error
    }

    if (data) {
      console.log('Loaded settings', data)
      return data
    }

    const defaultSettings = {
      user_id: currentUser.id,
      theme: 'light',
      language: 'en',
      marketing_opt_in: false,
    }
    const { error: insertError } = await supabase.from('user_settings').upsert(defaultSettings)
    if (insertError) {
      console.error('Error creating default settings', insertError)
      throw insertError
    }

    const { data: inserted, error: fetchError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', currentUser.id)
      .maybeSingle()

    if (fetchError) {
      console.error('Error reloading settings', fetchError)
      throw fetchError
    }

    console.log('Loaded settings', inserted)
    return inserted
  }

  async function handleProfileSave(event) {
    event.preventDefault()
    if (!user) return
    setSavingProfile(true)
    setError(null)

    const { data, error: updateError } = await supabase
      .from('profiles')
      .update({
        username: profileForm.username || null,
        full_name: profileForm.full_name || null,
      })
      .eq('id', user.id)
      .select()
      .maybeSingle()

    if (updateError) {
      console.error('Error updating profile', updateError)
      setError(updateError.message || 'Unable to save profile')
    } else {
      console.log('Updated profile', data)
      setProfile(data)
      setProfileForm({
        username: data?.username || '',
        full_name: data?.full_name || '',
      })
    }

    setSavingProfile(false)
  }

  async function handleSettingsSave(event) {
    event.preventDefault()
    if (!user) return
    setSavingSettings(true)
    setError(null)

    const payload = {
      user_id: user.id,
      theme: settingsForm.theme,
      language: settingsForm.language,
      marketing_opt_in: settingsForm.marketing_opt_in,
    }

    const { data, error: updateError } = await supabase
      .from('user_settings')
      .upsert(payload)
      .select()
      .maybeSingle()

    if (updateError) {
      console.error('Error updating settings', updateError)
      setError(updateError.message || 'Unable to save settings')
    } else {
      console.log('Updated settings', data)
      setSettings(data)
      setSettingsForm({
        theme: data?.theme || 'light',
        language: data?.language || 'en',
        marketing_opt_in: !!data?.marketing_opt_in,
      })
    }

    setSavingSettings(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  async function handleDeleteAccount() {
    if (!user) return
    setDeletingAccount(true)
    setError(null)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token

      if (!token) {
        setError('Unable to verify your session. Please log in again.')
        setDeletingAccount(false)
        return
      }

      const response = await fetch('/api/auth/me', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Unable to delete account. Please try again.')
        setDeletingAccount(false)
        return
      }

      await supabase.auth.signOut()
      window.location.href = '/'
    } catch (err) {
      console.error('Delete account error', err)
      setError('Unable to delete account. Please try again.')
      setDeletingAccount(false)
    }
  }

  if (loading) {
    return (
      <main className="account-page">
        <p>Loading your account…</p>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="account-page">
        <h1>Account</h1>
        <p>You need to log in to access your account.</p>
        <button type="button" onClick={() => (window.location.href = '/login')}>
          Log in
        </button>
      </main>
    )
  }

  if (error) {
    return (
      <main className="account-page">
        <h1>Account</h1>
        <p>We couldn’t load your data. Please refresh or try again later.</p>
        <pre>{error}</pre>
      </main>
    )
  }

  return (
    <main className="account-page">
      <section className="account-card">
        <h1>Account</h1>
        <p>Email: {user.email}</p>
        <form onSubmit={handleProfileSave} className="account-form">
          <label>
            Username
            <input
              type="text"
              value={profileForm.username}
              onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
            />
          </label>
          <label>
            Full name
            <input
              type="text"
              value={profileForm.full_name}
              onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
            />
          </label>
          <button type="submit" disabled={savingProfile}>
            {savingProfile ? 'Saving…' : 'Save profile'}
          </button>
        </form>
      </section>

      <section className="account-card">
        <h2>Your stats</h2>
        <ul>
          <li>Questions: {stats.questions}</li>
          <li>Judgements: {stats.judgements}</li>
          <li>Friends: {stats.friends}</li>
        </ul>
      </section>

      <section className="account-card">
        <h2>Your last questions</h2>
        {questions.length === 0 ? (
          <p>No questions yet — ask your first question!</p>
        ) : (
          <ul>
            {questions.map((q) => (
              <li key={q.id}>
                <div>{q.text}</div>
                <small>{new Date(q.created_at).toLocaleString()}</small>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="account-card">
        <h2>Your last judgements</h2>
        {judgements.length === 0 ? (
          <p>No judgements yet — request one!</p>
        ) : (
          <ul>
            {judgements.map((j) => (
              <li key={j.id}>
                <div>
                  <strong>{j.judges?.name || j.judge_id || 'Judge'}</strong>
                  <div>Question: {j.question_text}</div>
                  <div>Verdict: {j.verdict_text}</div>
                  <small>{new Date(j.created_at).toLocaleString()}</small>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="account-card">
        <h2>Friends</h2>
        <div>
          <h3>Accepted</h3>
          {acceptedFriends.length === 0 ? (
            <p>No friends yet.</p>
          ) : (
            <ul>
              {acceptedFriends.map((f) => (
                <li key={f.id}>Friend ID: {f.user_id === user.id ? f.friend_user_id : f.user_id}</li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3>Pending</h3>
          {pendingFriends.length === 0 ? (
            <p>No pending requests.</p>
          ) : (
            <ul>
              {pendingFriends.map((f) => (
                <li key={f.id}>Friend request with {f.user_id === user.id ? f.friend_user_id : f.user_id}</li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="account-card">
        <h2>Settings</h2>
        <form onSubmit={handleSettingsSave} className="account-form">
          <label>
            Theme
            <select
              value={settingsForm.theme}
              onChange={(e) => setSettingsForm({ ...settingsForm, theme: e.target.value })}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>

          <label>
            Language
            <select
              value={settingsForm.language}
              onChange={(e) => setSettingsForm({ ...settingsForm, language: e.target.value })}
            >
              <option value="en">English</option>
            </select>
          </label>

          <label>
            <input
              type="checkbox"
              checked={settingsForm.marketing_opt_in}
              onChange={(e) => setSettingsForm({ ...settingsForm, marketing_opt_in: e.target.checked })}
            />
            Marketing opt-in
          </label>

          <button type="submit" disabled={savingSettings}>
            {savingSettings ? 'Saving…' : 'Save settings'}
          </button>
        </form>
      </section>

      <section className="account-card">
        <button type="button" onClick={handleLogout}>
          Log out
        </button>
      </section>

      <section className="account-card">
        <h2>Delete Account</h2>
        <p>Permanently delete your account and all associated data. This action cannot be undone.</p>
        {!showDeleteConfirm ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            style={{ backgroundColor: '#dc2626', color: 'white' }}
          >
            Delete Account
          </button>
        ) : (
          <div>
            <p><strong>Are you sure you want to delete your account?</strong></p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                style={{ backgroundColor: '#dc2626', color: 'white' }}
              >
                {deletingAccount ? 'Deleting…' : 'Yes, delete my account'}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deletingAccount}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}

import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/Button'
import { IskeleLogo } from '../components/IskeleLogo'

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('testci')
  const [password, setPassword] = useState('testci')
  const [error, setError] = useState<string | null>(null)

  if (user) return <Navigate to="/" replace />

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const err = login(username, password)
    if (err) {
      setError(err)
      return
    }
    navigate('/')
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-[#0c0c0c] px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-2xl border border-[#2a2a2a] bg-[#141414] p-6"
      >
        <div className="mb-6 flex items-center gap-3">
          <IskeleLogo size={40} />
          <div>
            <h1 className="text-lg font-semibold text-[#e8e8e8]">Iskele</h1>
            <p className="text-[12px] text-[#7a7a7a]">Build · Tar · Zip · Push</p>
          </div>
        </div>

        <label className="mb-3 block text-[12px] text-[#8a8a8a]">
          Username
          <input
            className="mt-1.5 w-full rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2.5 text-sm text-[#e8e8e8] outline-none focus:border-[#5a6b3f]"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
        </label>
        <label className="mb-4 block text-[12px] text-[#8a8a8a]">
          Password
          <input
            type="password"
            className="mt-1.5 w-full rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2.5 text-sm text-[#e8e8e8] outline-none focus:border-[#5a6b3f]"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>

        {error && (
          <p className="mb-3 rounded-xl border border-[#5c3a38] bg-[#2a1c1b] px-3 py-2 text-[13px] text-[#c98984]">
            {error}
          </p>
        )}

        <Button
          type="submit"
          className="w-full !rounded-xl !bg-[#3d4a2a] !text-[#d5e0c0] hover:!bg-[#4a5a34]"
        >
          Sign in
        </Button>
        <p className="mt-3 text-center text-[11px] text-[#5a5a5a]">
          mock · testci/testci · admin/admin
        </p>
      </form>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Mail, CheckCircle, AlertCircle, Loader } from 'lucide-react'

export default function ConfirmEmailPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState('loading') // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('Verifying your email...')

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Get the token from URL
        const token = searchParams.get('token')
        const type = searchParams.get('type')

        if (!token || type !== 'email') {
          setStatus('error')
          setMessage('Invalid verification link')
          toast.error('Invalid verification link')
          return
        }

        // Verify the email using the token
        const { error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'email'
        })

        if (error) {
          setStatus('error')
          setMessage(error.message || 'Failed to verify email')
          toast.error(error.message || 'Email verification failed')
          return
        }

        setStatus('success')
        setMessage('Email verified successfully!')
        toast.success('Email verified! Redirecting to login...')

        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/login')
        }, 2000)
      } catch (err) {
        setStatus('error')
        setMessage(err.message || 'Something went wrong')
        toast.error(err.message || 'Verification error')
      }
    }

    verifyEmail()
  }, [searchParams, navigate])

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '48px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        maxWidth: '400px',
        width: '100%',
        textAlign: 'center',
      }}>
        {status === 'loading' && (
          <>
            <div style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'spin 1s linear infinite',
            }}>
              <Loader size={40} color="#6c63ff" />
            </div>
            <h2 style={{
              color: '#333',
              fontSize: '20px',
              marginBottom: '12px',
              fontWeight: '600',
            }}>
              {message}
            </h2>
            <p style={{ color: '#666', fontSize: '14px' }}>
              Please wait while we verify your email address...
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#d4edda',
              borderRadius: '50%',
            }}>
              <CheckCircle size={40} color="#28a745" />
            </div>
            <h2 style={{
              color: '#28a745',
              fontSize: '20px',
              marginBottom: '12px',
              fontWeight: '600',
            }}>
              {message}
            </h2>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '24px' }}>
              Your email is now verified. Redirecting to login...
            </p>
            <button
              onClick={() => navigate('/login')}
              style={{
                background: '#6c63ff',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background 0.3s',
              }}
              onMouseEnter={(e) => e.target.style.background = '#5a52d5'}
              onMouseLeave={(e) => e.target.style.background = '#6c63ff'}
            >
              Go to Login
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#f8d7da',
              borderRadius: '50%',
            }}>
              <AlertCircle size={40} color="#dc3545" />
            </div>
            <h2 style={{
              color: '#dc3545',
              fontSize: '20px',
              marginBottom: '12px',
              fontWeight: '600',
            }}>
              Verification Failed
            </h2>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '24px' }}>
              {message}
            </p>
            <button
              onClick={() => navigate('/login')}
              style={{
                background: '#6c63ff',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background 0.3s',
              }}
              onMouseEnter={(e) => e.target.style.background = '#5a52d5'}
              onMouseLeave={(e) => e.target.style.background = '#6c63ff'}
            >
              Back to Login
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

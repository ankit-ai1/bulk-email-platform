import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Mail, CheckCircle, AlertCircle, Loader } from 'lucide-react'

export default function ConfirmEmailPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [status, setStatus] = useState('loading') // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('Verifying your email...')

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Get hash fragment from URL
        const hash = location.hash.slice(1) // Remove the #
        const params = new URLSearchParams(hash)
        
        const accessToken = params.get('access_token')
        const type = params.get('type')

        // type should be 'email_confirmation' or 'recovery' for email verification
        if (!accessToken) {
          setStatus('error')
          setMessage('Invalid verification link - missing token')
          toast.error('Invalid verification link')
          return
        }

        // Set the session with the access token from the email link
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: params.get('refresh_token') || '',
        })

        if (error) {
          setStatus('error')
          setMessage(error.message || 'Failed to verify email')
          toast.error(error.message || 'Email verification failed')
          return
        }

        // Check if email is confirmed
        if (data.user && data.user.email_confirmed_at) {
          setStatus('success')
          setMessage('Email verified successfully!')
          toast.success('Email verified! Redirecting to login...')
          
          // Sign out so they have to login
          await supabase.auth.signOut()
          
          setTimeout(() => {
            navigate('/login')
          }, 2000)
        } else {
          // Try alternative: use verifyOtp directly
          const tokenHash = params.get('token_hash')
          if (tokenHash) {
            const { error: otpError } = await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: 'email'
            })
            
            if (!otpError) {
              await supabase.auth.signOut()
              setStatus('success')
              setMessage('Email verified successfully!')
              toast.success('Email verified!')
              setTimeout(() => navigate('/login'), 2000)
              return
            }
          }
          
          setStatus('error')
          setMessage('Email verification failed - please check your link')
          toast.error('Verification failed')
        }
      } catch (err) {
        setStatus('error')
        setMessage(err.message || 'Something went wrong')
        toast.error(err.message || 'Verification error')
      }
    }

    verifyEmail()
  }, [location, navigate])

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

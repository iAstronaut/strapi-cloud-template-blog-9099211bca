import React, { useEffect, useState } from 'react';

interface TokenPayload {
  username: string;
  email: string;
  password: string;
  isCms: boolean;
  exp: number;
}

const CustomLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAutoLogging, setIsAutoLogging] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // Check for auto-login token in URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const emailParam = urlParams.get('email');

    if (token && emailParam) {
      console.log('[CustomLogin] Auto-login token detected');
      handleAutoLogin(token, emailParam);
    }
  }, []);

  const handleAutoLogin = async (token: string, emailParam: string) => {
    try {
      setIsAutoLogging(true);
      setError('');
      setSuccess('Processing auto-login...');

      console.log('[CustomLogin] Decoding JWT token...');
      
      // Simple JWT decode (base64 only)
      const [, payloadB64] = token.split('.');
      const base64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
      const jsonStr = atob(base64);
      const decoded: TokenPayload = JSON.parse(jsonStr);
      
      console.log('[CustomLogin] Token decoded:', { 
        username: decoded.username, 
        email: decoded.email,
        isCms: decoded.isCms,
        exp: decoded.exp 
      });

      // Check if token is expired
      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < now) {
        throw new Error('Token expired');
      }

      // Check if user has CMS access
      if (!decoded.isCms) {
        throw new Error('User does not have CMS access');
      }

      // Set email and password from token
      setEmail(decoded.email || emailParam);
      setPassword(decoded.password);

      // Attempt to login with Strapi admin
      console.log('[CustomLogin] Attempting Strapi admin login...');
      const loginResponse = await fetch('/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: decoded.email || emailParam,
          password: decoded.password,
        }),
      });

      if (loginResponse.ok) {
        console.log('[CustomLogin] Auto-login successful!');
        setSuccess('Auto-login successful! Redirecting...');
        

      } else {
        const errorData = await loginResponse.json();
        throw new Error(errorData.error?.message || 'Login failed');
      }

    } catch (error) {
      console.error('[CustomLogin] Auto-login error:', error);
      setError(`Auto-login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsAutoLogging(false);
    }
  };

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    // Handle manual login if needed
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(195deg, #42424a, #191919)',
      padding: '16px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        maxWidth: '400px',
        width: '100%',
        background: 'white',
        borderRadius: '8px',
        padding: '24px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{ color: '#1976d2', margin: '0 0 8px 0', fontSize: '32px' }}>
            JAL
          </h1>
          <h2 style={{ color: '#666', margin: '0', fontSize: '18px' }}>
            Cobalt CMS
          </h2>
        </div>

        {/* Status Messages */}
        {isAutoLogging && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#e3f2fd',
            color: '#1976d2',
            borderRadius: '4px',
            marginBottom: '16px',
            border: '1px solid #bbdefb'
          }}>
            {success}
          </div>
        )}

        {error && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#ffebee',
            color: '#d32f2f',
            borderRadius: '4px',
            marginBottom: '16px',
            border: '1px solid #ffcdd2'
          }}>
            {error}
          </div>
        )}

        {/* Auto-login Instructions */}
        {!isAutoLogging && !error && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#e8f5e8',
            color: '#2e7d32',
            borderRadius: '4px',
            marginBottom: '16px',
            border: '1px solid #c8e6c9'
          }}>
            If you have a JAL Webclient token, it will be automatically processed.
            Otherwise, please login manually.
          </div>
        )}

        {/* Manual Login Form */}
        <form onSubmit={handleManualLogin}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isAutoLogging}
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isAutoLogging}
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isAutoLogging}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              cursor: isAutoLogging ? 'not-allowed' : 'pointer',
              opacity: isAutoLogging ? 0.6 : 1
            }}
          >
            {isAutoLogging ? 'Processing...' : 'Login'}
          </button>
        </form>

        {/* Debug Info */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#666'
          }}>
            Debug: Check console for auto-login details
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomLogin;

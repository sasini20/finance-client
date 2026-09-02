import React, { useState } from 'react';
import API from '../api/axios';
import { Sparkles, Lock, Mail, ArrowRight } from 'lucide-react';

export default function Auth({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const response = await API.post(endpoint, { email, password });

      if (isLogin) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('email', response.data.email);
        onLoginSuccess();
      } else {
        alert('Registration successful! Please login.');
        setIsLogin(true);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'Inter, sans-serif', padding: '20px' }}>
      
      {/* Background Glow Effect */}
      <div style={{ position: 'absolute', width: '350px', height: '350px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '50%', filter: 'blur(80px)', zIndex: 0 }}></div>

      <div style={{ background: 'rgba(30, 41, 59, 0.7)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '40px 30px', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)', width: '100%', maxWidth: '400px', zIndex: 1, color: '#f8fafc' }}>
        
        {/* Header Icon & Title */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ width: '50px', height: '50px', background: 'linear-gradient(135deg, #38bdf8, #6366f1)', borderRadius: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 15px auto', boxShadow: '0 8px 16px rgba(56, 189, 248, 0.3)' }}>
            <Sparkles size={24} color="#fff" />
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: 0, background: 'linear-gradient(to right, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '6px' }}>
            {isLogin ? 'Enter your credentials to access your finance dashboard' : 'Start tracking your wealth with AI intelligence'}
          </p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', padding: '12px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '20px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Email Input */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '8px', fontWeight: '500' }}>Email Address</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Mail size={18} color="#64748b" style={{ position: 'absolute', left: '14px' }} />
              <input 
                type="email" 
                placeholder="name@example.com"
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                style={{ width: '100%', padding: '12px 12px 12px 45px', borderRadius: '10px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid #334155', color: '#fff', fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s' }}
                required 
              />
            </div>
          </div>

          {/* Password Input */}
          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '8px', fontWeight: '500' }}>Password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={18} color="#64748b" style={{ position: 'absolute', left: '14px' }} />
              <input 
                type="password" 
                placeholder="••••••••"
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                style={{ width: '100%', padding: '12px 12px 12px 45px', borderRadius: '10px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid #334155', color: '#fff', fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s' }}
                required 
              />
            </div>
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={loading}
            style={{ width: '100%', padding: '14px', background: 'linear-gradient(to right, #38bdf8, #6366f1)', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(56, 189, 248, 0.3)', transition: 'opacity 0.2s' }}
          >
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        {/* Toggle between Login & Register */}
        <div style={{ textAlign: 'center', marginTop: '25px' }}>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
            {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
            <span 
              onClick={() => setIsLogin(!isLogin)} 
              style={{ color: '#38bdf8', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline' }}
            >
              {isLogin ? 'Register now' : 'Sign in'}
            </span>
          </p>
        </div>

      </div>
    </div>
  );
}
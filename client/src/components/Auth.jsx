import React, { useState, useContext } from 'react';
import { AppStateContext } from '../context/AppStateContext';
import { useNavigate } from 'react-router-dom';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { setCurrentUser } = useContext(AppStateContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setCurrentUser(data.user);
        // Persist user session locally
        localStorage.setItem('favorcito_user', JSON.stringify(data.user));
        navigate('/');
      } else {
        setError(data.message || 'Failed to login');
      }
    } catch (err) {
      setError('A network error occurred. Please try again.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md p-8 bg-white/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-gray-200/50">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#01533c] rounded-2xl shadow-lg mb-4">
            <span className="text-white text-3xl">✉️</span>
          </div>
          <h2 className="text-3xl font-bold text-[#01533c] mb-2">
            Favorcito Mailer
          </h2>
          <p className="text-gray-500 text-sm">Inicia sesión para continuar</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="email">
              Correo Electrónico
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#01533c] focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
              placeholder="tu@correo.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="password">
              Contraseña
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#01533c] focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
              placeholder="••••••••"
              required
            />
          </div>
          {error && (
            <div className="p-3 bg-red-50 border-2 border-red-200 rounded-xl">
              <p className="text-red-600 text-sm font-medium text-center">{error}</p>
            </div>
          )}
          <button
            type="submit"
            className="w-full bg-[#01533c] text-white py-3 rounded-xl hover:bg-[#014030] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#01533c] shadow-lg shadow-[#01533c]/30 hover:shadow-xl hover:shadow-[#01533c]/40 font-semibold transform hover:-translate-y-0.5"
          >
            Iniciar Sesión
          </button>
        </form>
      </div>
    </div>
  );
};

export default Auth;

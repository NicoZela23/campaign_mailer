import React, { useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppStateContext } from '../context/AppStateContext';

const Header = () => {
  const { currentUser, setCurrentUser } = useContext(AppStateContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('campaign_mailer_user');
    setCurrentUser(null);
  };

  return (
    <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-[#7c3aed] rounded-lg flex items-center justify-center shadow-md">
            <span className="text-white text-xl font-bold">✉️</span>
          </div>
          <h1 className="text-2xl font-bold text-[#7c3aed]">
            Campaign Mailer
          </h1>
        </div>
        {currentUser && (
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(location.pathname === '/campaigns' ? '/' : '/campaigns')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                location.pathname === '/campaigns'
                  ? 'bg-[#7c3aed] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {location.pathname === '/campaigns' ? '← Inicio' : '📋 Campañas'}
            </button>
            <div className="hidden sm:flex items-center space-x-2 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
              <div className="w-8 h-8 bg-[#7c3aed] rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-semibold">
                  {currentUser.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-sm font-medium text-gray-700">{currentUser.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-red-500 to-red-600 rounded-lg hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              Cerrar Sesión
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;

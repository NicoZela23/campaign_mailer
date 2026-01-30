import React, { useContext } from 'react';
import { AppStateContext } from '../context/AppStateContext';

const Header = () => {
  const { currentUser, setCurrentUser } = useContext(AppStateContext);

  const handleLogout = () => {
    localStorage.removeItem('favorcito_user');
    setCurrentUser(null);
  };

  return (
    <header className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">
          Favorcito Mailer
        </h1>
        {currentUser && (
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{currentUser.email}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;

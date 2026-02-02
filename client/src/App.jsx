import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppStateProvider, AppStateContext } from './context/AppStateContext';
import Auth from './components/Auth';
import MainStepper from './components/MainStepper';
import Header from './components/Header';
import { Toaster } from 'react-hot-toast';

const AppContent = () => {
  const { currentUser } = React.useContext(AppStateContext);

  return (
    <>
      <Toaster />
      {currentUser && <Header />}
      <main>
        <Routes>
          <Route path="/login" element={!currentUser ? <Auth /> : <Navigate to="/" />} />
          <Route path="/" element={currentUser ? <MainStepper /> : <Navigate to="/login" />} />
        </Routes>
      </main>
    </>
  );
};

const App = () => {
  return (
    <AppStateProvider>
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
          <AppContent />
        </div>
      </Router>
    </AppStateProvider>
  );
};

export default App;
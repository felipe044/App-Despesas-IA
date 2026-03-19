import { useState } from 'react';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Onboarding from './pages/Onboarding';
import Checkout from './pages/Checkout';
import Dashboard from './pages/Dashboard';

function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'login' | 'register' | 'onboarding' | 'checkout' | 'dashboard'>('home');

  if (currentPage === 'login') {
    return (
      <Login
        onBack={() => setCurrentPage('home')}
        onRegisterClick={() => setCurrentPage('register')}
        onLoginSuccess={() => setCurrentPage('dashboard')}
        onStartOnboarding={() => setCurrentPage('onboarding')}
      />
    );
  }

  if (currentPage === 'register') {
    return (
      <Register 
        onBack={() => setCurrentPage('home')} 
        onLoginClick={() => setCurrentPage('login')} 
        onRegisterSuccess={() => setCurrentPage('onboarding')}
      />
    );
  }

  if (currentPage === 'onboarding') {
    return <Onboarding onFinish={() => setCurrentPage('checkout')} />;
  }

  if (currentPage === 'checkout') {
    return <Checkout onBack={() => setCurrentPage('home')} onSuccess={() => setCurrentPage('dashboard')} />;
  }

  if (currentPage === 'dashboard') {
    return (
      <Dashboard
        onLogout={() => {
          localStorage.removeItem('cfo_user');
          setCurrentPage('home');
        }}
      />
    );
  }

  return <Home onLoginClick={() => setCurrentPage('login')} onRegisterClick={() => setCurrentPage('register')} />;
}

export default App;

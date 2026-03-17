import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { AuthModalProvider, useAuthModal } from './context/AuthModalContext';
import { ChatProvider, useChat } from './context/ChatContext';
import { Layout } from './components/Layout';
import { ChatWindow } from './components/ChatWindow';

import { Login } from './pages/Login';
import { Marketplace } from './pages/Marketplace';
import { FarmerDashboard } from './pages/FarmerDashboard';
import { BuyerDashboard } from './pages/BuyerDashboard';
import { Cart } from './pages/Cart';
import { FarmerProfile } from './pages/FarmerProfile';
import { ProductDetails } from './pages/ProductDetails';
import { AdminDashboard } from './pages/AdminDashboard';
import { AnimatePresence } from 'motion/react';

// Pages (to be implemented)
const Home = () => {
  const { openModal } = useAuthModal();
  const navigate = useNavigate();

  return (
    <div className="text-center py-20">
      <h1 className="text-5xl font-bold tracking-tight text-stone-900 mb-6">Direct from Farm to Your Table</h1>
      <p className="text-xl text-stone-600 mb-10 max-w-2xl mx-auto">
        Connect directly with local farmers, get better prices, and ensure the highest quality produce for your business or home.
      </p>
      <div className="flex justify-center gap-4">
        <button 
          onClick={() => navigate('/marketplace')}
          className="bg-emerald-700 text-white px-8 py-3 rounded-full font-bold text-lg hover:bg-emerald-800 transition-all shadow-lg"
        >
          Browse Marketplace
        </button>
        <button 
          onClick={() => openModal('signup')}
          className="bg-white text-stone-900 border border-stone-200 px-8 py-3 rounded-full font-bold text-lg hover:bg-stone-50 transition-all"
        >
          Sell Your Produce
        </button>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { profile, loading } = useAuth();
  
  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-700"></div></div>;
  if (!profile) return <Navigate to="/login" />;

  if (profile.role === 'admin') return <AdminDashboard />;
  if (profile.role === 'farmer') return <FarmerDashboard />;
  return <BuyerDashboard />;
};

const AppContent = () => {
  const { activeChat, closeChat } = useChat();

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/product/:productId" element={<ProductDetails />} />
          <Route path="/farmer/:farmerId" element={<FarmerProfile />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
      <AnimatePresence>
        {activeChat && (
          <ChatWindow
            recipientId={activeChat.recipientId}
            recipientName={activeChat.recipientName}
            onClose={closeChat}
          />
        )}
      </AnimatePresence>
    </Router>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AuthModalProvider>
        <ChatProvider>
          <CartProvider>
            <AppContent />
          </CartProvider>
        </ChatProvider>
      </AuthModalProvider>
    </AuthProvider>
  );
}

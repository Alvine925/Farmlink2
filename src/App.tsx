import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { AuthModalProvider, useAuthModal } from './context/AuthModalContext';
import { ChatProvider, useChat } from './context/ChatContext';
import { Layout } from './components/Layout';
import { ChatWindow } from './components/ChatWindow';
import { db } from './firebase';
import { doc, getDocFromServer } from 'firebase/firestore';

import { Login } from './pages/Login';
import { Marketplace } from './pages/Marketplace';
import { SellerDashboard } from './pages/SellerDashboard';
import { BuyerDashboard } from './pages/BuyerDashboard';
import { Cart } from './pages/Cart';
import { SellerProfile } from './pages/SellerProfile';
import { ProductDetails } from './pages/ProductDetails';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminProductReview } from './pages/AdminProductReview';
import { Messages } from './pages/Messages';
import { OrderDetails } from './pages/OrderDetails';
import { Wishlist } from './pages/Wishlist';
import { HelpCenter } from './pages/HelpCenter';
import { ContactUs } from './pages/ContactUs';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsOfService } from './pages/TermsOfService';
import { Account } from './pages/Account';
import { Guides } from './pages/Guides';
import { AnimatePresence } from 'motion/react';
import { APIProvider } from '@vis.gl/react-google-maps';

const API_KEY = (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY || '';

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
  if (profile.role === 'farmer' || profile.role === 'retailer') return <SellerDashboard />;
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
          <Route path="/farmer/:farmerId" element={<SellerProfile />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/product/:productId" element={<AdminProductReview />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/order/:orderId" element={<OrderDetails />} />
          <Route path="/help" element={<HelpCenter />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/account" element={<Account />} />
          <Route path="/guides" element={<Guides />} />
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
  useEffect(() => {
    async function testConnection() {
      try {
        console.log('Testing Firestore connection...');
        await getDocFromServer(doc(db, 'test', 'connection'));
        console.log('Firestore connection test successful.');
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Firestore connection failed: the client is offline. Please check your Firebase configuration and network.");
        } else {
          console.warn("Firestore connection test finished with expected non-critical error or success:", error);
        }
      }
    }
    testConnection();
  }, []);

  return (
    <APIProvider apiKey={API_KEY}>
      <AuthProvider>
        <AuthModalProvider>
          <ChatProvider>
            <CartProvider>
              <AppContent />
            </CartProvider>
          </ChatProvider>
        </AuthModalProvider>
      </AuthProvider>
    </APIProvider>
  );
}

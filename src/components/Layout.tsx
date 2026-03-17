import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { auth } from '../firebase';
import { LogOut, User, ShoppingCart, Menu, X, Leaf } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthModal } from '../context/AuthModalContext';
import { AuthModal } from './AuthModal';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const { items } = useCart();
  const { isOpen, mode, openModal, closeModal } = useAuthModal();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans">
      <nav className="bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-2 text-emerald-700 font-bold text-xl tracking-tight">
                <Leaf className="w-6 h-6" />
                <span>AgriDirect</span>
              </Link>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <Link to="/marketplace" className="text-stone-600 hover:text-emerald-700 transition-colors font-medium">Marketplace</Link>
              {user ? (
                <>
                  {profile?.role === 'admin' && (
                    <Link to="/admin" className="text-stone-600 hover:text-emerald-700 transition-colors font-medium">Admin</Link>
                  )}
                  <Link to="/dashboard" className="text-stone-600 hover:text-emerald-700 transition-colors font-medium">Dashboard</Link>
                  <div className="flex items-center gap-4 border-l border-stone-200 pl-8">
                    <Link to="/cart" className="p-2 text-stone-600 hover:bg-stone-100 rounded-full transition-all relative">
                      <ShoppingCart className="w-5 h-5" />
                      {items.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                          {items.length}
                        </span>
                      )}
                    </Link>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-semibold leading-none">{profile?.displayName || 'User'}</p>
                        <p className="text-xs text-stone-500 capitalize">{profile?.role || 'Buyer'}</p>
                      </div>
                      <button onClick={handleLogout} className="p-2 text-stone-400 hover:text-red-600 rounded-full transition-all">
                        <LogOut className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => openModal('login')}
                    className="text-stone-600 hover:text-emerald-700 transition-colors font-medium"
                  >
                    Sign In
                  </button>
                  <button 
                    onClick={() => openModal('signup')}
                    className="bg-emerald-700 text-white px-6 py-2 rounded-full font-semibold hover:bg-emerald-800 transition-all shadow-sm"
                  >
                    Get Started
                  </button>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-stone-600">
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white border-t border-stone-100 overflow-hidden"
            >
              <div className="px-4 pt-2 pb-6 space-y-2">
                <Link to="/marketplace" className="block px-3 py-2 text-stone-600 font-medium">Marketplace</Link>
                {user ? (
                  <>
                    {profile?.role === 'admin' && (
                      <Link to="/admin" className="block px-3 py-2 text-stone-600 font-medium">Admin Panel</Link>
                    )}
                    <Link to="/dashboard" className="block px-3 py-2 text-stone-600 font-medium">Dashboard</Link>
                    <Link to="/cart" className="block px-3 py-2 text-stone-600 font-medium">Cart</Link>
                    <button onClick={handleLogout} className="block w-full text-left px-3 py-2 text-red-600 font-medium">Logout</button>
                  </>
                ) : (
                  <div className="px-3 py-2 space-y-2">
                    <button 
                      onClick={() => openModal('login')}
                      className="block w-full text-left py-2 text-stone-600 font-medium"
                    >
                      Sign In
                    </button>
                    <button 
                      onClick={() => openModal('signup')}
                      className="block w-full text-center bg-emerald-700 text-white py-3 rounded-xl font-bold"
                    >
                      Get Started
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <AuthModal 
        isOpen={isOpen} 
        onClose={closeModal} 
        initialMode={mode}
      />

      <footer className="bg-white border-t border-stone-200 mt-20 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 text-emerald-700 font-bold text-xl mb-4">
                <Leaf className="w-6 h-6" />
                <span>AgriDirect</span>
              </div>
              <p className="text-stone-500 max-w-sm">
                Empowering farmers and buyers through a transparent, direct agricultural marketplace.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Platform</h4>
              <ul className="space-y-2 text-stone-500 text-sm">
                <li><Link to="/marketplace">Marketplace</Link></li>
                <li><Link to="/how-it-works">How it Works</Link></li>
                <li><Link to="/pricing">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Support</h4>
              <ul className="space-y-2 text-stone-500 text-sm">
                <li><Link to="/help">Help Center</Link></li>
                <li><Link to="/contact">Contact Us</Link></li>
                <li><Link to="/privacy">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-stone-100 mt-12 pt-8 text-center text-stone-400 text-xs">
            © 2026 AgriDirect Marketplace. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

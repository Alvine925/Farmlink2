import React, { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { User, Tractor, ShoppingBag, Mail, Lock, ArrowRight, X, ShieldCheck } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login' }) => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEmailMode, setIsEmailMode] = useState(false);
  const [isSignup, setIsSignup] = useState(initialMode === 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const navigate = useNavigate();

  const handleAuthSuccess = async (user: any, selectedRole: UserRole) => {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (!userDoc.exists()) {
      const adminEmails = ['okongoalvine@gmail.com', 'otienoalvine925@gmail.com'];
      const finalRole = adminEmails.includes(user.email) ? 'admin' : selectedRole;
      
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || displayName,
        photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`,
        role: finalRole,
        isVerified: finalRole === 'admin',
        createdAt: new Date().toISOString()
      });
    }
    onClose();
    navigate('/dashboard');
  };

  const handleGoogleLogin = async () => {
    if (!role) {
      alert("Please select your role first.");
      return;
    }

    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await handleAuthSuccess(result.user, role);
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.code === 'auth/network-request-failed') {
        alert("Network error: Please check your internet connection or disable any ad-blockers that might be blocking Google services.");
      } else {
        alert("Failed to login. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) {
      alert("Please select your role first.");
      return;
    }

    setLoading(true);
    try {
      if (isSignup) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName });
        await handleAuthSuccess(result.user, role);
      } else {
        const result = await signInWithEmailAndPassword(auth, email, password);
        await handleAuthSuccess(result.user, role);
      }
    } catch (error: any) {
      console.error("Email auth error:", error);
      if (error.code === 'auth/network-request-failed') {
        alert("Network error: Please check your internet connection or disable any ad-blockers that might be blocking Google services.");
      } else {
        alert(error.message || "Authentication failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
      >
        <button 
          onClick={onClose}
          className="absolute right-6 top-6 p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-full transition-all z-10"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="p-8 sm:p-10">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">{isSignup ? 'Create Account' : 'Welcome Back'}</h2>
            <p className="text-stone-500">
              {isSignup ? 'Join our community of farmers and buyers' : 'Sign in to manage your farm or orders'}
            </p>
          </div>

          {!role ? (
            <div className="space-y-6">
              <p className="text-center font-bold text-stone-900">Select your role to continue</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setRole('farmer')}
                  className="p-6 rounded-2xl border-2 border-stone-100 hover:border-emerald-200 hover:bg-emerald-50 transition-all text-left flex flex-col gap-4 group"
                >
                  <div className="p-3 rounded-xl bg-stone-100 text-stone-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                    <Tractor className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">I'm a Farmer</h3>
                    <p className="text-xs text-stone-500">Sell directly to buyers.</p>
                  </div>
                </button>

                <button
                  onClick={() => setRole('buyer')}
                  className="p-6 rounded-2xl border-2 border-stone-100 hover:border-emerald-200 hover:bg-emerald-50 transition-all text-left flex flex-col gap-4 group"
                >
                  <div className="p-3 rounded-xl bg-stone-100 text-stone-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">I'm a Buyer</h3>
                    <p className="text-xs text-stone-500">Source fresh produce.</p>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-stone-50 p-3 rounded-2xl border border-stone-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-600 text-white">
                    {role === 'farmer' ? <Tractor className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
                  </div>
                  <span className="font-bold text-sm capitalize">Continuing as {role}</span>
                </div>
                <button 
                  onClick={() => setRole(null)}
                  className="text-xs text-emerald-700 font-bold hover:underline"
                >
                  Change
                </button>
              </div>

              <AnimatePresence mode="wait">
                {!isEmailMode ? (
                  <motion.div
                    key="social"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4"
                  >
                    <button
                      onClick={handleGoogleLogin}
                      disabled={loading}
                      className="w-full bg-white text-stone-700 border border-stone-200 py-4 rounded-2xl font-bold text-lg hover:bg-stone-50 transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
                      Continue with Google
                    </button>
                    
                    <button
                      onClick={() => setIsEmailMode(true)}
                      className="w-full bg-stone-900 text-white py-4 rounded-2xl font-bold text-lg hover:bg-stone-800 transition-all shadow-lg flex items-center justify-center gap-3"
                    >
                      <Mail className="w-5 h-5" />
                      Continue with Email
                    </button>
                  </motion.div>
                ) : (
                  <motion.form
                    key="email"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    onSubmit={handleEmailAuth}
                    className="space-y-4"
                  >
                    {isSignup && (
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-stone-400 uppercase tracking-wider ml-1">Full Name</label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                          <input 
                            type="text"
                            required
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="John Doe"
                            className="w-full pl-12 pr-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-400 uppercase tracking-wider ml-1">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                        <input 
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="john@example.com"
                          className="w-full pl-12 pr-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-400 uppercase tracking-wider ml-1">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                        <input 
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-12 pr-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-emerald-700 text-white py-4 rounded-2xl font-bold text-lg hover:bg-emerald-800 transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                      {loading ? 'Processing...' : (isSignup ? 'Create Account' : 'Sign In')}
                      <ArrowRight className="w-5 h-5" />
                    </button>

                    <div className="flex flex-col gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsSignup(!isSignup)}
                        className="text-stone-500 text-sm hover:text-emerald-700 transition-colors"
                      >
                        {isSignup ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEmailMode(false)}
                        className="text-stone-400 text-xs hover:text-stone-600 transition-colors"
                      >
                        Go back to social login
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

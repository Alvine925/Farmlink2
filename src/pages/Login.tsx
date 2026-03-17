import React, { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { User, Tractor, ShoppingBag, Mail, Lock, ArrowRight, ShieldCheck } from 'lucide-react';

export const Login: React.FC = () => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEmailMode, setIsEmailMode] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const navigate = useNavigate();

  const handleAuthSuccess = async (user: any, selectedRole: UserRole) => {
    // Check if user profile exists
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (!userDoc.exists()) {
      // Check if this is the designated admin
      const finalRole = user.email === 'otienoalvine925@gmail.com' ? 'admin' : selectedRole;
      
      // Create new profile
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
    } catch (error) {
      console.error("Login error:", error);
      alert("Failed to login. Please try again.");
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
      alert(error.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-6 sm:p-10 rounded-3xl shadow-2xl border border-stone-100"
      >
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-2">Join AgriDirect</h2>
          <p className="text-stone-500">Select how you want to use the platform</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          <button
            onClick={() => setRole('farmer')}
            className={`p-6 rounded-2xl border-2 transition-all text-left flex flex-col gap-4 ${
              role === 'farmer' ? 'border-emerald-600 bg-emerald-50' : 'border-stone-100 hover:border-emerald-200'
            }`}
          >
            <div className={`p-3 rounded-xl w-fit ${role === 'farmer' ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-600'}`}>
              <Tractor className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg">I'm a Farmer</h3>
              <p className="text-xs text-stone-500">I want to list my produce and sell directly to buyers.</p>
            </div>
          </button>

          <button
            onClick={() => setRole('buyer')}
            className={`p-6 rounded-2xl border-2 transition-all text-left flex flex-col gap-4 ${
              role === 'buyer' ? 'border-emerald-600 bg-emerald-50' : 'border-stone-100 hover:border-emerald-200'
            }`}
          >
            <div className={`p-3 rounded-xl w-fit ${role === 'buyer' ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-600'}`}>
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg">I'm a Buyer</h3>
              <p className="text-xs text-stone-500">I want to source fresh produce directly from local farms.</p>
            </div>
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
                disabled={loading || !role}
                className="w-full bg-white text-stone-700 border border-stone-200 py-4 rounded-2xl font-bold text-lg hover:bg-stone-50 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
                Continue with Google
              </button>
              
              <button
                onClick={() => setIsEmailMode(true)}
                disabled={!role}
                className="w-full bg-stone-900 text-white py-4 rounded-2xl font-bold text-lg hover:bg-stone-800 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
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

        <p className="text-center text-stone-400 text-[10px] mt-8 uppercase tracking-widest">
          Secure Authentication by AgriDirect
        </p>
      </motion.div>
    </div>
  );
};

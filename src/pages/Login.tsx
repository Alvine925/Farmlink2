import React, { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '../types';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { motion, AnimatePresence } from 'motion/react';
import { User, Tractor, ShoppingBag, Mail, Lock, ArrowRight, ShieldCheck } from 'lucide-react';

export const Login: React.FC = () => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const navigate = useNavigate();

  const handleAuthSuccess = async (user: any, selectedRole: UserRole | null) => {
    // Check if user profile exists
    let userDoc;
    try {
      userDoc = await getDoc(doc(db, 'users', user.uid));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      return;
    }
    
    if (!userDoc.exists()) {
      // If user doesn't exist and no role was selected (e.g. direct login by new user)
      if (!selectedRole) {
        setIsSignup(true);
        setRole(null);
        alert("Welcome to Tellus! Please select whether you are a Farmer or a Buyer to complete your registration.");
        return;
      }

      // Check if this is the designated admin
      const finalRole = user.email === 'otienoalvine925@gmail.com' ? 'admin' : selectedRole;
      
      // Create new profile
      try {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || displayName || user.email.split('@')[0],
          photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`,
          role: finalRole,
          isVerified: finalRole === 'admin',
          createdAt: new Date().toISOString()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}`);
        return;
      }
    }
    navigate('/dashboard');
  };

  const handleGoogleLogin = async () => {
    if (isSignup && !role) {
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
    if (isSignup && !role) {
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
        await handleAuthSuccess(result.user, null);
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
          <h2 className="text-3xl font-bold mb-2">
            {isSignup ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="text-stone-500">
            {isSignup ? 'Join the direct-from-farm marketplace' : 'Sign in to your Tellus account'}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {isSignup && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-8"
            >
              <label className="text-xs font-bold text-stone-400 uppercase tracking-wider ml-1 mb-3 block">
                I am a...
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setRole('farmer')}
                  className={`p-4 rounded-2xl border-2 transition-all text-left flex flex-col gap-2 ${
                    role === 'farmer' ? 'border-emerald-600 bg-emerald-50' : 'border-stone-100 hover:border-emerald-200'
                  }`}
                >
                  <div className={`p-2 rounded-lg w-fit ${role === 'farmer' ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-600'}`}>
                    <Tractor className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-sm">Farmer</h3>
                </button>

                <button
                  onClick={() => setRole('buyer')}
                  className={`p-4 rounded-2xl border-2 transition-all text-left flex flex-col gap-2 ${
                    role === 'buyer' ? 'border-emerald-600 bg-emerald-50' : 'border-stone-100 hover:border-emerald-200'
                  }`}
                >
                  <div className={`p-2 rounded-lg w-fit ${role === 'buyer' ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-600'}`}>
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-sm">Buyer</h3>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleEmailAuth} className="space-y-4">
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
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-stone-100"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-4 text-stone-400 font-bold tracking-widest">Or continue with</span>
          </div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-white text-stone-700 border border-stone-200 py-4 rounded-2xl font-bold text-lg hover:bg-stone-50 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
          Google Account
        </button>

        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignup(!isSignup);
              setRole(null);
            }}
            className="text-stone-500 text-sm hover:text-emerald-700 transition-colors font-medium"
          >
            {isSignup ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
          </button>
        </div>

        <p className="text-center text-stone-400 text-[10px] mt-8 uppercase tracking-widest">
          Secure Authentication by Tellus
        </p>
      </motion.div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, updateDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { UserProfile } from '../types';
import { ShieldCheck, ShieldAlert, CheckCircle, XCircle, User, Mail, Calendar, Search, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toast } from '../components/Toast';

export const AdminDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [farmers, setFarmers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'verified' | 'unverified'>('all');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type, isVisible: true });
  };

  useEffect(() => {
    if (profile?.role !== 'admin') return;

    const q = query(collection(db, 'users'), where('role', '==', 'farmer'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const farmerData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setFarmers(farmerData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching farmers:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile]);

  const toggleVerification = async (farmerId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', farmerId), {
        isVerified: !currentStatus
      });
      showToast(`Farmer ${!currentStatus ? 'verified' : 'unverified'} successfully`);
    } catch (error) {
      console.error("Error updating verification status:", error);
      showToast('Failed to update verification status', 'error');
    }
  };

  const filteredFarmers = farmers.filter(farmer => {
    const matchesSearch = farmer.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         farmer.farmName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         farmer.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filter === 'verified') return matchesSearch && farmer.isVerified;
    if (filter === 'unverified') return matchesSearch && !farmer.isVerified;
    return matchesSearch;
  });

  if (profile?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-stone-900 mb-2">Access Denied</h1>
        <p className="text-stone-600">You do not have administrative privileges to view this page.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Admin Dashboard</h1>
          <p className="text-stone-500">Manage farmer verifications and platform security</p>
        </div>
        
        <div className="flex items-center gap-4 bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <span className="text-sm font-bold text-emerald-700">Administrator Mode</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
          <p className="text-stone-400 text-sm font-bold uppercase tracking-wider mb-1">Total Farmers</p>
          <p className="text-3xl font-bold text-stone-900">{farmers.length}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
          <p className="text-stone-400 text-sm font-bold uppercase tracking-wider mb-1">Verified</p>
          <p className="text-3xl font-bold text-emerald-600">{farmers.filter(f => f.isVerified).length}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
          <p className="text-stone-400 text-sm font-bold uppercase tracking-wider mb-1">Pending Verification</p>
          <p className="text-3xl font-bold text-amber-500">{farmers.filter(f => !f.isVerified).length}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
          <input 
            type="text"
            placeholder="Search by name, farm, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-2xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-stone-200">
          <button 
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filter === 'all' ? 'bg-stone-900 text-white' : 'text-stone-500 hover:bg-stone-50'}`}
          >
            All
          </button>
          <button 
            onClick={() => setFilter('verified')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filter === 'verified' ? 'bg-emerald-600 text-white' : 'text-stone-500 hover:bg-stone-50'}`}
          >
            Verified
          </button>
          <button 
            onClick={() => setFilter('unverified')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filter === 'unverified' ? 'bg-amber-500 text-white' : 'text-stone-500 hover:bg-stone-50'}`}
          >
            Unverified
          </button>
        </div>
      </div>

      {/* Farmers Table */}
      <div className="bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-bottom border-stone-100">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-400">Farmer</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-400">Contact</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-400">Joined</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-400">Status</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              <AnimatePresence mode="popLayout">
                {filteredFarmers.map((farmer) => (
                  <motion.tr 
                    key={farmer.uid}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="hover:bg-stone-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-stone-100 overflow-hidden flex-shrink-0">
                          {farmer.photoURL ? (
                            <img src={farmer.photoURL} alt={farmer.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-stone-400">
                              <User className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-stone-900">{farmer.displayName}</p>
                          <p className="text-xs text-stone-500">{farmer.farmName || 'No Farm Name'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-stone-600">
                        <Mail className="w-4 h-4" />
                        <span className="text-sm">{farmer.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-stone-600">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">{new Date(farmer.createdAt).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {farmer.isVerified ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Verified
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          Unverified
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => toggleVerification(farmer.uid, !!farmer.isVerified)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                          farmer.isVerified 
                            ? 'bg-stone-100 text-stone-600 hover:bg-red-50 hover:text-red-600' 
                            : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md'
                        }`}
                      >
                        {farmer.isVerified ? 'Revoke Verification' : 'Verify Farmer'}
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {filteredFarmers.length === 0 && !loading && (
            <div className="py-20 text-center">
              <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-stone-300" />
              </div>
              <p className="text-stone-500 font-medium">No farmers found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>
      <Toast 
        message={toast.message} 
        type={toast.type} 
        isVisible={toast.isVisible} 
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} 
      />
    </div>
  );
};

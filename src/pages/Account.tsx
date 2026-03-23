import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Settings, Shield, Bell, CreditCard, MapPin, Camera, Save, LogOut, ChevronRight, Plus, Trash2, Star, Check, Smartphone, Navigation } from 'lucide-react';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Toast } from '../components/Toast';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';
import { useLocation } from 'react-router-dom';
import { MapPicker } from '../components/MapPicker';

type Tab = 'profile' | 'settings' | 'security' | 'notifications' | 'billing' | 'addresses' | 'payments' | 'partners';

export const Account: React.FC = () => {
  const { user, profile } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab') as Tab;
    if (tab && ['profile', 'settings', 'security', 'notifications', 'billing', 'addresses', 'payments', 'partners'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [location]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    displayName: profile?.displayName || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
    farmName: profile?.farmName || '',
    description: profile?.description || '',
    address: profile?.location?.address || '',
    location: profile?.location || null as { lat: number; lng: number; address: string } | null
  });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type, isVisible: true });
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: formData.displayName,
        phone: formData.phone,
        farmName: formData.farmName,
        description: formData.description,
        location: formData.location || { address: formData.address, lat: 0, lng: 0 }
      });
      showToast('Profile updated successfully');
    } catch (error) {
      console.error("Error updating profile:", error);
      showToast('Failed to update profile', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const menuItems = [
    { id: 'profile', label: 'Profile Information', icon: User },
    { id: 'addresses', label: 'Delivery Addresses', icon: MapPin },
    { id: 'payments', label: 'Payment Methods', icon: CreditCard },
    { id: 'partners', label: profile.role === 'farmer' ? 'Preferred Buyers' : 'Preferred Farmers', icon: Star },
    { id: 'settings', label: 'Account Settings', icon: Settings },
    { id: 'security', label: 'Security & Privacy', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  const [newAddress, setNewAddress] = useState({ 
    label: '', 
    address: '',
    estateName: '',
    landmark: '',
    blockOrApartment: '',
    directionsNarrative: '',
    googlePin: null as { lat: number; lng: number; address: string } | null
  });
  const [newPayment, setNewPayment] = useState({ type: 'card' as 'card' | 'mobile_money', provider: '', lastFour: '' });
  const [partners, setPartners] = useState<UserProfile[]>([]);
  const [loadingPartners, setLoadingPartners] = useState(false);

  const fetchPartners = async () => {
    if (!profile.preferredPartners?.length) return;
    setLoadingPartners(true);
    try {
      const partnerDocs = await Promise.all(
        profile.preferredPartners.map(id => getDoc(doc(db, 'users', id)))
      );
      const partnerData = partnerDocs
        .filter(d => d.exists())
        .map(d => ({ uid: d.id, ...d.data() } as UserProfile));
      setPartners(partnerData);
    } catch (error) {
      console.error("Error fetching partners:", error);
    } finally {
      setLoadingPartners(false);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'partners') {
      fetchPartners();
    }
  }, [activeTab]);

  const handleAddAddress = async () => {
    if (!newAddress.label || !newAddress.address || !user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      const addressObj = {
        id: Math.random().toString(36).substr(2, 9),
        label: newAddress.label,
        address: newAddress.address,
        estateName: newAddress.estateName,
        landmark: newAddress.landmark,
        blockOrApartment: newAddress.blockOrApartment,
        directionsNarrative: newAddress.directionsNarrative,
        googlePin: newAddress.googlePin,
        isDefault: (profile.savedAddresses?.length || 0) === 0
      };
      await updateDoc(userRef, {
        savedAddresses: arrayUnion(addressObj)
      });
      setNewAddress({ 
        label: '', 
        address: '',
        estateName: '',
        landmark: '',
        blockOrApartment: '',
        directionsNarrative: '',
        googlePin: null
      });
      showToast('Address added successfully');
    } catch (error) {
      showToast('Failed to add address', 'error');
    }
  };

  const handleRemoveAddress = async (addressId: string) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      const addressToRemove = profile.savedAddresses?.find(a => a.id === addressId);
      if (addressToRemove) {
        await updateDoc(userRef, {
          savedAddresses: arrayRemove(addressToRemove)
        });
        showToast('Address removed');
      }
    } catch (error) {
      showToast('Failed to remove address', 'error');
    }
  };

  const handleAddPayment = async () => {
    if (!newPayment.provider || !user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      const paymentObj = {
        id: Math.random().toString(36).substr(2, 9),
        type: newPayment.type,
        provider: newPayment.provider,
        lastFour: newPayment.lastFour || '****',
        isDefault: (profile.savedPaymentMethods?.length || 0) === 0
      };
      await updateDoc(userRef, {
        savedPaymentMethods: arrayUnion(paymentObj)
      });
      setNewPayment({ type: 'card', provider: '', lastFour: '' });
      showToast('Payment method added');
    } catch (error) {
      showToast('Failed to add payment method', 'error');
    }
  };

  const handleRemovePayment = async (paymentId: string) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      const paymentToRemove = profile.savedPaymentMethods?.find(p => p.id === paymentId);
      if (paymentToRemove) {
        await updateDoc(userRef, {
          savedPaymentMethods: arrayRemove(paymentToRemove)
        });
        showToast('Payment method removed');
      }
    } catch (error) {
      showToast('Failed to remove payment method', 'error');
    }
  };

  const handleRemovePartner = async (partnerId: string) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        preferredPartners: arrayRemove(partnerId)
      });
      setPartners(prev => prev.filter(p => p.uid !== partnerId));
      showToast('Partner removed from preferences');
    } catch (error) {
      showToast('Failed to remove partner', 'error');
    }
  };

  if (!user || !profile) return null;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row gap-12">
        {/* Sidebar */}
        <aside className="w-full md:w-72 space-y-8">
          <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm text-center">
            <div className="relative inline-block mb-4">
              <div className="w-24 h-24 rounded-full bg-stone-100 overflow-hidden border-4 border-white shadow-md">
                <img 
                  src={profile.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.displayName}`} 
                  alt={profile.displayName} 
                  className="w-full h-full object-cover"
                />
              </div>
              <button className="absolute bottom-0 right-0 p-2 bg-emerald-600 text-white rounded-full shadow-lg hover:bg-emerald-700 transition-all">
                <Camera className="w-4 h-4" />
              </button>
            </div>
            <h2 className="text-xl font-bold text-stone-900">{profile.displayName}</h2>
            <p className="text-sm text-stone-500 capitalize">{profile.role}</p>
          </div>

          <nav className="bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as Tab)}
                className={`w-full flex items-center justify-between p-5 text-left transition-all border-b border-stone-50 last:border-none ${
                  activeTab === item.id ? 'bg-emerald-50 text-emerald-700' : 'text-stone-600 hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-emerald-600' : 'text-stone-400'}`} />
                  <span className="font-bold text-sm">{item.label}</span>
                </div>
                <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === item.id ? 'translate-x-1' : 'opacity-0'}`} />
              </button>
            ))}
          </nav>

          <button className="w-full flex items-center gap-3 p-5 text-red-600 font-bold hover:bg-red-50 rounded-3xl transition-all">
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          <AnimatePresence mode="wait">
            {activeTab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white p-10 rounded-3xl border border-stone-100 shadow-sm space-y-8"
              >
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-stone-900">Profile Information</h2>
                  <p className="text-stone-500">Update your personal details and farm information.</p>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-400 uppercase tracking-wider ml-1">Full Name</label>
                      <input 
                        type="text" 
                        value={formData.displayName}
                        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                        className="w-full px-6 py-4 rounded-2xl bg-stone-50 border-none focus:ring-2 focus:ring-emerald-500 text-stone-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-400 uppercase tracking-wider ml-1">Email Address</label>
                      <input 
                        type="email" 
                        disabled
                        value={formData.email}
                        className="w-full px-6 py-4 rounded-2xl bg-stone-100 border-none text-stone-500 cursor-not-allowed"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-400 uppercase tracking-wider ml-1">Phone Number</label>
                      <input 
                        type="tel" 
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-6 py-4 rounded-2xl bg-stone-50 border-none focus:ring-2 focus:ring-emerald-500 text-stone-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-400 uppercase tracking-wider ml-1">Location / Address</label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
                        <input 
                          type="text" 
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          className="w-full pl-12 pr-4 py-4 rounded-2xl bg-stone-50 border-none focus:ring-2 focus:ring-emerald-500 text-stone-900"
                        />
                      </div>
                    </div>
                  </div>

                  {profile.role === 'farmer' && (
                    <div className="space-y-6 pt-6 border-t border-stone-100">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-stone-400 uppercase tracking-wider ml-1">Farm Location Pin</label>
                        <div className="border border-stone-100 rounded-2xl overflow-hidden">
                          <MapPicker 
                            onSelect={(pin) => setFormData({ ...formData, location: pin, address: pin.address })} 
                            initialPos={formData.location?.lat ? { lat: formData.location.lat, lng: formData.location.lng } : undefined}
                          />
                        </div>
                        {formData.location && (
                          <p className="text-xs text-emerald-600 font-medium">Pin selected: {formData.location.address}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-stone-400 uppercase tracking-wider ml-1">Farm Name</label>
                        <input 
                          type="text" 
                          value={formData.farmName}
                          onChange={(e) => setFormData({ ...formData, farmName: e.target.value })}
                          className="w-full px-6 py-4 rounded-2xl bg-stone-50 border-none focus:ring-2 focus:ring-emerald-500 text-stone-900"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-stone-400 uppercase tracking-wider ml-1">Farm Description</label>
                        <textarea 
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          rows={4}
                          className="w-full px-6 py-4 rounded-2xl bg-stone-50 border-none focus:ring-2 focus:ring-emerald-500 text-stone-900 resize-none"
                        />
                      </div>
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-emerald-700 text-white px-10 py-4 rounded-2xl font-bold hover:bg-emerald-800 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        Save Changes
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            )}

            {activeTab === 'addresses' && (
              <motion.div
                key="addresses"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white p-10 rounded-3xl border border-stone-100 shadow-sm space-y-8"
              >
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-stone-900">Delivery Addresses</h2>
                  <p className="text-stone-500">Manage your saved addresses for faster checkout.</p>
                </div>

                <div className="space-y-4">
                  {profile.savedAddresses?.map((addr) => (
                    <div key={addr.id} className="flex items-center justify-between p-6 rounded-2xl bg-stone-50 border border-stone-100 group">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-white rounded-xl shadow-sm">
                          <MapPin className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-stone-900">{addr.label}</p>
                            {addr.isDefault && <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase">Default</span>}
                          </div>
                          <p className="text-sm text-stone-500">{addr.address}</p>
                          {(addr.estateName || addr.blockOrApartment) && (
                            <p className="text-xs text-stone-400 mt-1">
                              {addr.estateName && `Estate: ${addr.estateName}`}
                              {addr.estateName && addr.blockOrApartment && ' • '}
                              {addr.blockOrApartment && `Block/Apt: ${addr.blockOrApartment}`}
                            </p>
                          )}
                          {addr.landmark && (
                            <p className="text-xs text-stone-400">Landmark: {addr.landmark}</p>
                          )}
                          {addr.directionsNarrative && (
                            <p className="text-xs text-stone-400 italic mt-1">"{addr.directionsNarrative}"</p>
                          )}
                          {addr.googlePin && (
                            <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-600 font-medium">
                              <Navigation className="w-3 h-3" />
                              <span>Pin Selected</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <button 
                        onClick={() => handleRemoveAddress(addr.id)}
                        className="p-2 text-stone-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}

                  <div className="p-8 rounded-3xl border-2 border-dashed border-stone-200 space-y-6">
                    <h3 className="font-bold text-stone-900">Add New Address</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-stone-500 uppercase ml-1">Label</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Home, Office"
                          value={newAddress.label}
                          onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-stone-50 border-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-stone-500 uppercase ml-1">Full Address</label>
                        <input 
                          type="text" 
                          placeholder="Street, City"
                          value={newAddress.address}
                          onChange={(e) => setNewAddress({ ...newAddress, address: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-stone-50 border-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-stone-500 uppercase ml-1">Estate Name</label>
                        <input 
                          type="text" 
                          placeholder="Estate Name"
                          value={newAddress.estateName}
                          onChange={(e) => setNewAddress({ ...newAddress, estateName: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-stone-50 border-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-stone-500 uppercase ml-1">Block / Apartment</label>
                        <input 
                          type="text" 
                          placeholder="Block A, Apt 4"
                          value={newAddress.blockOrApartment}
                          onChange={(e) => setNewAddress({ ...newAddress, blockOrApartment: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-stone-50 border-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-bold text-stone-500 uppercase ml-1">Landmark</label>
                        <input 
                          type="text" 
                          placeholder="Near the big oak tree"
                          value={newAddress.landmark}
                          onChange={(e) => setNewAddress({ ...newAddress, landmark: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-stone-50 border-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-bold text-stone-500 uppercase ml-1">Directions Narrative</label>
                        <textarea 
                          placeholder="Describe how to get to your door..."
                          value={newAddress.directionsNarrative}
                          onChange={(e) => setNewAddress({ ...newAddress, directionsNarrative: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-stone-50 border-none focus:ring-2 focus:ring-emerald-500 min-h-[100px]"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-500 uppercase ml-1">Google Pin</label>
                      <div className="border border-stone-100 rounded-2xl overflow-hidden">
                        <MapPicker 
                          onSelect={(pin) => setNewAddress({ ...newAddress, googlePin: pin })} 
                          initialPos={newAddress.googlePin ? { lat: newAddress.googlePin.lat, lng: newAddress.googlePin.lng } : undefined}
                        />
                      </div>
                      {newAddress.googlePin && (
                        <p className="text-xs text-emerald-600 font-medium">Pin selected: {newAddress.googlePin.address}</p>
                      )}
                    </div>

                    <button 
                      onClick={handleAddAddress}
                      className="w-full bg-emerald-700 text-white py-4 rounded-2xl font-bold hover:bg-emerald-800 transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      Add Address
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'payments' && (
              <motion.div
                key="payments"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white p-10 rounded-3xl border border-stone-100 shadow-sm space-y-8"
              >
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-stone-900">Payment Methods</h2>
                  <p className="text-stone-500">Securely manage your payment options.</p>
                </div>

                <div className="space-y-4">
                  {profile.savedPaymentMethods?.map((pm) => (
                    <div key={pm.id} className="flex items-center justify-between p-6 rounded-2xl bg-stone-50 border border-stone-100 group">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-white rounded-xl shadow-sm">
                          {pm.type === 'card' ? <CreditCard className="w-5 h-5 text-blue-600" /> : <Smartphone className="w-5 h-5 text-amber-600" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-stone-900">{pm.provider}</p>
                            {pm.isDefault && <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase">Default</span>}
                          </div>
                          <p className="text-sm text-stone-500">
                            {pm.type === 'card' ? `Ending in ${pm.lastFour}` : 'Mobile Money'}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleRemovePayment(pm.id)}
                        className="p-2 text-stone-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}

                  <div className="p-8 rounded-3xl border-2 border-dashed border-stone-200 space-y-4">
                    <h3 className="font-bold text-stone-900">Add Payment Method</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <select 
                        value={newPayment.type}
                        onChange={(e) => setNewPayment({ ...newPayment, type: e.target.value as 'card' | 'mobile_money' })}
                        className="w-full px-4 py-3 rounded-xl bg-stone-50 border-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="card">Credit/Debit Card</option>
                        <option value="mobile_money">Mobile Money</option>
                      </select>
                      <input 
                        type="text" 
                        placeholder="Provider (e.g. Visa, MTN)"
                        value={newPayment.provider}
                        onChange={(e) => setNewPayment({ ...newPayment, provider: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-stone-50 border-none focus:ring-2 focus:ring-emerald-500"
                      />
                      {newPayment.type === 'card' && (
                        <input 
                          type="text" 
                          placeholder="Last 4 Digits"
                          maxLength={4}
                          value={newPayment.lastFour}
                          onChange={(e) => setNewPayment({ ...newPayment, lastFour: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-stone-50 border-none focus:ring-2 focus:ring-emerald-500"
                        />
                      )}
                    </div>
                    <button 
                      onClick={handleAddPayment}
                      className="flex items-center gap-2 text-emerald-700 font-bold hover:text-emerald-800"
                    >
                      <Plus className="w-5 h-5" />
                      Add Payment Method
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'partners' && (
              <motion.div
                key="partners"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white p-10 rounded-3xl border border-stone-100 shadow-sm space-y-8"
              >
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-stone-900">
                    {profile.role === 'farmer' ? 'Preferred Buyers' : 'Preferred Farmers'}
                  </h2>
                  <p className="text-stone-500">Your saved network of trusted partners.</p>
                </div>

                {loadingPartners ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700"></div>
                  </div>
                ) : partners.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {partners.map((partner) => (
                      <div key={partner.uid} className="flex items-center justify-between p-4 rounded-2xl bg-stone-50 border border-stone-100 group">
                        <div className="flex items-center gap-3">
                          <img 
                            src={partner.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${partner.displayName}`} 
                            alt={partner.displayName}
                            className="w-10 h-10 rounded-full bg-stone-200"
                          />
                          <div>
                            <p className="font-bold text-stone-900 text-sm">{partner.displayName}</p>
                            <p className="text-xs text-stone-500 capitalize">{partner.role}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleRemovePartner(partner.uid)}
                          className="p-2 text-stone-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-stone-50 rounded-3xl border border-dashed border-stone-200">
                    <Star className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                    <p className="text-stone-500">No preferred partners saved yet.</p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white p-10 rounded-3xl border border-stone-100 shadow-sm space-y-8"
              >
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-stone-900">Account Settings</h2>
                  <p className="text-stone-500">Manage your account preferences and regional settings.</p>
                </div>
                <div className="space-y-6">
                  {[
                    { label: 'Language', value: 'English (US)' },
                    { label: 'Currency', value: 'USD ($)' },
                    { label: 'Timezone', value: 'Eastern Time (ET)' }
                  ].map((setting, i) => (
                    <div key={i} className="flex items-center justify-between p-6 rounded-2xl bg-stone-50 border border-stone-100">
                      <span className="font-bold text-stone-700">{setting.label}</span>
                      <button className="text-emerald-700 font-bold hover:underline">{setting.value}</button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'security' && (
              <motion.div
                key="security"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white p-10 rounded-3xl border border-stone-100 shadow-sm space-y-8"
              >
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-stone-900">Security & Privacy</h2>
                  <p className="text-stone-500">Protect your account and manage your privacy data.</p>
                </div>
                <div className="space-y-4">
                  <button className="w-full flex items-center justify-between p-6 rounded-2xl bg-stone-50 border border-stone-100 hover:bg-stone-100 transition-all">
                    <div className="text-left">
                      <p className="font-bold text-stone-900">Change Password</p>
                      <p className="text-xs text-stone-500">Last changed 3 months ago</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-stone-400" />
                  </button>
                  <button className="w-full flex items-center justify-between p-6 rounded-2xl bg-stone-50 border border-stone-100 hover:bg-stone-100 transition-all">
                    <div className="text-left">
                      <p className="font-bold text-stone-900">Two-Factor Authentication</p>
                      <p className="text-xs text-emerald-600 font-bold">Enabled</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-stone-400" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
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

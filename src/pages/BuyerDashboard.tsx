import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, updateDoc, doc, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Order, Product, Notification } from '../types';
import { ShoppingBag, Clock, CheckCircle, Package, MapPin, Star, Edit3, Save, X, Truck, ChevronRight, ChevronDown, CreditCard, User, Heart, TrendingUp, Filter, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { NotificationList } from '../components/NotificationList';
import { useChat } from '../context/ChatContext';

export const BuyerDashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [favoriteProducts, setFavoriteProducts] = useState<Product[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [locationError, setLocationError] = useState('');
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<Order['status'] | 'all'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { openChat } = useChat();

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification)));
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (profile?.location?.address) {
      setNewAddress(profile.location.address);
    }

    if (profile?.favorites && profile.favorites.length > 0) {
      const fetchFavorites = async () => {
        const productsRef = collection(db, 'products');
        // Firestore 'in' query is limited to 10 items, but for now we'll just fetch them
        // In a real app, we'd chunk this or fetch individually
        const q = query(productsRef, where('__name__', 'in', profile.favorites.slice(0, 10)));
        const snapshot = await getDocs(q);
        setFavoriteProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
      };
      fetchFavorites();
    } else {
      setFavoriteProducts([]);
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'orders'), where('buyerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleUpdateLocation = async () => {
    if (!user) return;

    // Validation
    if (!newAddress.trim()) {
      setLocationError('Address cannot be empty');
      return;
    }
    if (newAddress.trim().length < 10) {
      setLocationError('Address must be at least 10 characters long');
      return;
    }

    setLocationError('');
    setUpdatingLocation(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        location: {
          address: newAddress.trim(),
          lat: 0, // Placeholder
          lng: 0  // Placeholder
        }
      });
      setIsEditingLocation(false);
    } catch (error) {
      console.error("Error updating location:", error);
      alert("Failed to update location.");
    } finally {
      setUpdatingLocation(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        // In a real app, we'd reverse geocode here. For now, we'll just set coordinates.
        setNewAddress(`Coordinates: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        if (locationError) setLocationError('');
      });
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };

  const getStatusStep = (status: Order['status']) => {
    switch (status) {
      case 'pending': return 1;
      case 'accepted': return 2;
      case 'fulfilled': return 3;
      case 'completed': return 4;
      default: return 0;
    }
  };

  const activeOrders = orders.filter(order => {
    const isHistory = order.status === 'completed' || order.status === 'declined';
    if (isHistory) return false;
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const orderDate = new Date(order.createdAt);
    const matchesStartDate = !startDate || orderDate >= new Date(startDate);
    const matchesEndDate = !endDate || orderDate <= new Date(endDate + 'T23:59:59');
    return matchesStatus && matchesStartDate && matchesEndDate;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const historyOrders = orders.filter(order => {
    const isHistory = order.status === 'completed' || order.status === 'declined';
    if (!isHistory) return false;

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const orderDate = new Date(order.createdAt);
    const matchesStartDate = !startDate || orderDate >= new Date(startDate);
    const matchesEndDate = !endDate || orderDate <= new Date(endDate + 'T23:59:59');
    return matchesStatus && matchesStartDate && matchesEndDate;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Buyer Dashboard</h1>
          <p className="text-stone-500">Track your orders and manage your favorites</p>
        </div>

        {/* Location Section */}
        <div className="bg-white px-6 py-4 rounded-2xl border border-stone-100 shadow-sm flex items-center gap-4 min-w-[320px]">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <MapPin className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-stone-400 text-[10px] font-bold uppercase tracking-wider">Delivery Location</p>
            <AnimatePresence mode="wait">
              {isEditingLocation ? (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="space-y-2 mt-1"
                >
                    <div className="flex flex-col gap-1">
                      <input
                        type="text"
                        className={`text-sm font-bold bg-stone-50 border rounded-lg px-3 py-1.5 w-full focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                          locationError ? 'border-red-500 focus:border-red-500' : 'border-stone-200 focus:border-emerald-500'
                        }`}
                        value={newAddress}
                        onChange={(e) => {
                          setNewAddress(e.target.value);
                          if (locationError) setLocationError('');
                        }}
                        placeholder="Enter your full address..."
                        autoFocus
                      />
                      {locationError && (
                        <p className="text-[10px] text-red-500 font-bold">{locationError}</p>
                      )}
                    </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleUpdateLocation}
                      disabled={updatingLocation || !newAddress.trim()}
                      className="flex-1 bg-emerald-600 text-white text-xs font-bold py-1.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                    >
                      {updatingLocation ? 'Saving...' : 'Save Address'}
                    </button>
                    <button 
                      onClick={handleUseCurrentLocation}
                      className="p-1.5 text-stone-500 hover:bg-stone-100 rounded-lg transition-colors"
                      title="Use current location"
                    >
                      <TrendingUp className="w-4 h-4 rotate-45" />
                    </button>
                    <button 
                      onClick={() => {
                        setIsEditingLocation(false);
                        setLocationError('');
                        if (profile?.location?.address) {
                          setNewAddress(profile.location.address);
                        }
                      }}
                      className="px-3 py-1.5 text-stone-500 text-xs font-bold hover:bg-stone-100 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="flex items-center justify-between gap-2 mt-1"
                >
                  {profile?.location?.address ? (
                    <>
                      <p className="text-sm font-bold text-stone-900 truncate max-w-[180px]">
                        {profile.location.address}
                      </p>
                      <button 
                        onClick={() => setIsEditingLocation(true)}
                        className="text-emerald-700 text-xs font-bold hover:underline flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        Edit
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-bold text-amber-600 italic">
                        No address set
                      </p>
                      <button 
                        onClick={() => setIsEditingLocation(true)}
                        className="bg-amber-100 text-amber-700 px-3 py-1 rounded-lg text-xs font-bold hover:bg-amber-200 transition-colors"
                      >
                        Set Address
                      </button>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm flex items-center gap-4">
          <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-600">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-stone-500 text-xs font-bold uppercase tracking-wider">Total Orders</p>
            <p className="text-2xl font-bold">{orders.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm flex items-center gap-4">
          <div className="p-4 rounded-2xl bg-blue-50 text-blue-600">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-stone-500 text-xs font-bold uppercase tracking-wider">In Progress</p>
            <p className="text-2xl font-bold">{orders.filter(o => o.status !== 'completed' && o.status !== 'declined').length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm flex items-center gap-4">
          <div className="p-4 rounded-2xl bg-amber-50 text-amber-600">
            <Heart className="w-6 h-6" />
          </div>
          <div>
            <p className="text-stone-500 text-xs font-bold uppercase tracking-wider">Favorite Products</p>
            <p className="text-2xl font-bold">{profile?.favorites?.length || 0}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-stone-100 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg">Active Orders</h2>
                <div className="flex items-center gap-2 text-xs text-stone-400">
                  <Filter className="w-3 h-3" />
                  <span>{activeOrders.length} active orders</span>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4 pt-2">
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Status</label>
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="w-full bg-stone-50 border border-stone-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="accepted">Accepted</option>
                    <option value="fulfilled">Fulfilled</option>
                    <option value="completed">Completed</option>
                    <option value="declined">Declined</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">From Date</label>
                  <input 
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">To Date</label>
                  <input 
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                {(statusFilter !== 'all' || startDate || endDate) && (
                  <div className="flex items-end">
                    <button 
                      onClick={() => {
                        setStatusFilter('all');
                        setStartDate('');
                        setEndDate('');
                      }}
                      className="px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      Clear Filters
                    </button>
                  </div>
                )}
              </div>
            <div className="divide-y divide-stone-50">
              {activeOrders.map(order => (
            <div key={order.id} className="p-6 hover:bg-stone-50 transition-colors">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-stone-100 text-stone-600">
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-stone-900">Order #{order.id.slice(0, 8)}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        order.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                        order.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-sm text-stone-500">
                      {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-stone-400">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(order.createdAt).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {order.deliveryMethod}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                  <p className="text-xl font-bold text-stone-900">${order.totalAmount.toFixed(2)}</p>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => openChat(order.farmerId, order.farmerName)}
                      className="text-emerald-700 text-sm font-bold hover:underline flex items-center gap-1"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Message Farmer
                    </button>
                    <button 
                      onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                      className="text-stone-500 text-sm font-bold hover:underline flex items-center gap-1"
                    >
                      {expandedOrderId === order.id ? 'Hide Details' : 'View Details'}
                      {expandedOrderId === order.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {expandedOrderId === order.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-6 pt-6 border-t border-stone-100 grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">Order Items</h4>
                        <div className="space-y-3">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-sm">
                              <span className="text-stone-600">{item.quantity}x {item.name}</span>
                              <span className="font-bold text-stone-900">${(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                          <div className="pt-2 border-t border-stone-50 flex justify-between font-bold">
                            <span>Total</span>
                            <span className="text-emerald-700">${order.totalAmount.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Delivery Method</h4>
                            <div className="flex items-center gap-2 text-sm text-stone-700">
                              {order.deliveryMethod === 'delivery' ? <Truck className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
                              <span className="capitalize">
                                {order.deliveryMethod}
                                {order.deliveryMethod === 'delivery' && order.deliveryOption && ` (${order.deliveryOption})`}
                              </span>
                            </div>
                            {order.deliveryFee > 0 && (
                              <p className="text-[10px] text-stone-400">Fee: ${order.deliveryFee.toFixed(2)}</p>
                            )}
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Payment Method</h4>
                            <div className="flex items-center gap-2 text-sm text-stone-700">
                              <CreditCard className="w-4 h-4" />
                              <span>{order.paymentMethod}</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Farmer Information</h4>
                          <Link 
                            to={`/farmer/${order.farmerId}`}
                            className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 border border-stone-100 hover:border-emerald-200 transition-all group"
                          >
                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                              <User className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-stone-900 group-hover:text-emerald-700 transition-colors">{order.farmerName}</p>
                              <p className="text-[10px] text-stone-400">View Farm Profile</p>
                            </div>
                            <ChevronRight className="w-4 h-4 ml-auto text-stone-300 group-hover:text-emerald-500 transition-all" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Tracking Progress */}
              {order.status !== 'declined' && (
                <div className="mt-8 pt-8 border-t border-stone-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-6">Order Tracking</h4>
                  <div className="relative">
                    {/* Progress Line Background */}
                    <div className="absolute top-5 left-0 w-full h-1 bg-stone-100 rounded-full" />
                    
                    {/* Active Progress Line */}
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${((getStatusStep(order.status) - 1) / 3) * 100}%` }}
                      className="absolute top-5 left-0 h-1 bg-emerald-500 rounded-full transition-all duration-1000 ease-out"
                    />

                    <div className="relative flex justify-between">
                      {[
                        { step: 1, label: 'Placed', icon: <Clock className="w-5 h-5" />, date: order.createdAt, statusKey: 'pending' },
                        { step: 2, label: 'Accepted', icon: <CheckCircle className="w-5 h-5" />, date: order.acceptedAt, statusKey: 'accepted' },
                        { step: 3, label: 'Fulfilled', icon: <Truck className="w-5 h-5" />, date: order.fulfilledAt, statusKey: 'fulfilled' },
                        { step: 4, label: 'Completed', icon: <Package className="w-5 h-5" />, date: order.completedAt, statusKey: 'completed' },
                      ].map((s) => {
                        const isCompleted = getStatusStep(order.status) >= s.step;
                        const isCurrent = getStatusStep(order.status) === s.step;
                        
                        return (
                          <div key={s.step} className="flex flex-col items-center gap-3 flex-1 relative">
                            <motion.div 
                              initial={false}
                              animate={{ 
                                scale: isCurrent ? 1.2 : 1,
                                backgroundColor: isCompleted ? '#10b981' : '#ffffff',
                                color: isCompleted ? '#ffffff' : '#d1d5db',
                                borderColor: isCompleted ? '#10b981' : '#f3f4f6'
                              }}
                              className={`w-10 h-10 rounded-full flex items-center justify-center border-2 z-10 transition-colors duration-500 ${
                                isCurrent ? 'ring-4 ring-emerald-100' : ''
                              }`}
                            >
                              {s.icon}
                            </motion.div>
                            
                            <div className="text-center px-2">
                              <p className={`text-xs font-bold transition-colors duration-500 ${
                                isCompleted ? 'text-stone-900' : 'text-stone-300'
                              }`}>
                                {s.label}
                              </p>
                              <AnimatePresence>
                                {s.date && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-1"
                                  >
                                    <p className="text-[10px] text-stone-500 font-medium">
                                      {new Date(s.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                    </p>
                                    <p className="text-[9px] text-stone-400">
                                      {new Date(s.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    ))}
          {activeOrders.length === 0 && !loading && (
            <div className="text-center py-20">
              <p className="text-stone-400">No active orders found.</p>
              <Link to="/marketplace" className="mt-4 inline-block text-emerald-700 font-bold hover:underline">Start Shopping</Link>
            </div>
          )}
        </div>
      </div>

        {/* Order History Section */}
        <div className="bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-stone-100 flex items-center justify-between">
            <h2 className="font-bold text-lg">Order History</h2>
            <div className="flex items-center gap-2 text-xs text-stone-400">
              <CheckCircle className="w-3 h-3" />
              <span>{historyOrders.length} completed orders</span>
            </div>
          </div>
          <div className="divide-y divide-stone-50">
            {historyOrders.map(order => (
              <div key={order.id} className="p-6 hover:bg-stone-50 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-stone-100 text-stone-600">
                      <Package className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-stone-900">Order #{order.id.slice(0, 8)}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          order.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                      <p className="text-sm text-stone-500">
                        {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-stone-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> 
                          {order.status === 'completed' 
                            ? `Completed on ${new Date(order.completedAt || order.createdAt).toLocaleDateString()}`
                            : `Declined on ${new Date(order.declinedAt || order.createdAt).toLocaleDateString()}`
                          }
                        </span>
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {order.deliveryMethod}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <p className="text-xl font-bold text-stone-900">${order.totalAmount.toFixed(2)}</p>
                    <button 
                      onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                      className="text-stone-500 text-sm font-bold hover:underline flex items-center gap-1"
                    >
                      {expandedOrderId === order.id ? 'Hide Details' : 'View Details'}
                      {expandedOrderId === order.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {expandedOrderId === order.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-6 pt-6 border-t border-stone-100 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">Order Items</h4>
                          <div className="space-y-3">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center text-sm">
                                <span className="text-stone-600">{item.quantity}x {item.name}</span>
                                <span className="font-bold text-stone-900">${(item.price * item.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                            <div className="pt-2 border-t border-stone-50 flex justify-between font-bold">
                              <span>Total</span>
                              <span className="text-emerald-700">${order.totalAmount.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Delivery Method</h4>
                              <div className="flex items-center gap-2 text-sm text-stone-700">
                                {order.deliveryMethod === 'delivery' ? <Truck className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
                                <span className="capitalize">
                                  {order.deliveryMethod}
                                  {order.deliveryMethod === 'delivery' && order.deliveryOption && ` (${order.deliveryOption})`}
                                </span>
                              </div>
                              {order.deliveryFee > 0 && (
                                <p className="text-[10px] text-stone-400">Fee: ${order.deliveryFee.toFixed(2)}</p>
                              )}
                            </div>
                            <div className="space-y-1">
                              <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Payment Method</h4>
                              <div className="flex items-center gap-2 text-sm text-stone-700">
                                <CreditCard className="w-4 h-4" />
                                <span>{order.paymentMethod}</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Farmer Information</h4>
                            <Link 
                              to={`/farmer/${order.farmerId}`}
                              className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 border border-stone-100 hover:border-emerald-200 transition-all group"
                            >
                              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                                <User className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-stone-900 group-hover:text-emerald-700 transition-colors">{order.farmerName}</p>
                                <p className="text-[10px] text-stone-400">View Farm Profile</p>
                              </div>
                              <ChevronRight className="w-4 h-4 ml-auto text-stone-300 group-hover:text-emerald-500 transition-all" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
            {historyOrders.length === 0 && !loading && (
              <div className="text-center py-12">
                <p className="text-stone-400 text-sm">No order history found.</p>
              </div>
            )}
          </div>
        </div>
      </div>

    {/* Favorites & Notifications Sidebar */}
      <div className="space-y-6">
        {/* Notifications */}
        <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
          <NotificationList notifications={notifications} />
        </div>

        {/* Favorites */}
        <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
          <h2 className="font-bold text-lg mb-6 flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500 fill-current" />
            Favorites
          </h2>
          <div className="space-y-4">
            {favoriteProducts.map(product => (
              <Link 
                key={product.id}
                to={`/product/${product.id}`}
                className="flex items-center gap-4 p-2 rounded-2xl hover:bg-stone-50 transition-all group"
              >
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-stone-100 flex-shrink-0">
                  <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-stone-900 truncate group-hover:text-emerald-700 transition-colors">{product.name}</p>
                  <p className="text-xs text-stone-500">${product.price.toFixed(2)} / {product.unit}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-emerald-500 transition-all" />
              </Link>
            ))}
            {favoriteProducts.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-stone-400">No favorites yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
);
};

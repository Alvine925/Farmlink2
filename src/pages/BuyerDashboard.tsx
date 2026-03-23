import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, updateDoc, doc, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Order, Product, Notification } from '../types';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { ShoppingBag, Clock, CheckCircle, Package, MapPin, Star, Edit3, Save, X, Truck, ChevronRight, ChevronDown, CreditCard, User, Heart, TrendingUp, Filter, MessageSquare, Eye, ExternalLink, Navigation, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { NotificationList } from '../components/NotificationList';
import { useChat } from '../context/ChatContext';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';

export const BuyerDashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const { openChat } = useChat();
  const [orders, setOrders] = useState<Order[]>([]);
  const [favoriteProducts, setFavoriteProducts] = useState<Product[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [locationError, setLocationError] = useState('');
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [updatingPhone, setUpdatingPhone] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [statusFilter, setStatusFilter] = useState<Order['status'] | 'all'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: ShoppingBag },
    { id: 'orders', label: 'My Orders', icon: Package },
    { id: 'favorites', label: 'Favorites', icon: Heart },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: notifications.filter(n => !n.read).length },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (profile?.location?.address) {
      setNewAddress(profile.location.address);
    }
    if (profile?.phone) {
      setNewPhone(profile.phone);
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
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
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
    if (newAddress.trim().length < 5) {
      setLocationError('Address must be at least 5 characters long');
      return;
    }

    setLocationError('');
    setUpdatingLocation(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        location: {
          address: newAddress.trim(),
          lat: profile?.location?.lat || 0,
          lng: profile?.location?.lng || 0
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

  const handleUpdatePhone = async () => {
    if (!user) return;

    // Validation
    const phoneRegex = /^\+?[\d\s-]{10,}$/;
    if (!newPhone.trim()) {
      setPhoneError('Phone number cannot be empty');
      return;
    }
    if (!phoneRegex.test(newPhone.trim())) {
      setPhoneError('Please enter a valid phone number (at least 10 digits)');
      return;
    }

    setPhoneError('');
    setUpdatingPhone(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        phone: newPhone.trim()
      });
      setIsEditingPhone(false);
    } catch (error) {
      console.error("Error updating phone:", error);
      alert("Failed to update phone number.");
    } finally {
      setUpdatingPhone(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        // In a real app, we'd reverse geocode here. For now, we'll just set coordinates.
        setNewAddress(`Coordinates: ${(latitude || 0).toFixed(4)}, ${(longitude || 0).toFixed(4)}`);
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
      case 'shipped': return 3;
      case 'received': return 4;
      case 'fulfilled': return 5;
      case 'completed': return 6;
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
    <div className="flex flex-col lg:flex-row gap-8 min-h-[calc(100vh-12rem)]">
      {/* Sidebar Navigation */}
      <aside className="w-full lg:w-64 flex-shrink-0">
        <nav className="bg-white rounded-3xl border border-stone-100 shadow-sm p-4 sticky top-24">
          <div className="space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all relative ${
                  activeTab === item.id
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                    : 'text-stone-500 hover:bg-stone-50 hover:text-stone-900'
                }`}
              >
                <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-white' : 'text-stone-400'}`} />
                {item.label}
                {item.badge ? (
                  <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    activeTab === item.id ? 'bg-white text-emerald-600' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {item.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 space-y-8">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-stone-900">
              {menuItems.find(m => m.id === activeTab)?.label}
            </h1>
            <p className="text-stone-500">
              {activeTab === 'overview' && "Welcome back! Here's what's happening with your account."}
              {activeTab === 'orders' && "Track and manage all your purchases."}
              {activeTab === 'favorites' && "Products you've saved for later."}
              {activeTab === 'notifications' && "Stay updated with your order status and marketplace activity."}
              {activeTab === 'profile' && "Manage your personal information and delivery settings."}
            </p>
          </div>

          {activeTab === 'overview' && (
            <Link 
              to="/marketplace" 
              className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center gap-2"
            >
              <ShoppingBag className="w-5 h-5" />
              Go to Marketplace
            </Link>
          )}
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Stats Grid */}
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
                      <p className="text-stone-500 text-xs font-bold uppercase tracking-wider">Favorites</p>
                      <p className="text-2xl font-bold">{profile?.favorites?.length || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6">
                    {/* Recent Orders Preview */}
                    <div className="bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden">
                      <div className="p-6 border-b border-stone-100 flex items-center justify-between">
                        <h2 className="font-bold text-lg">Recent Orders</h2>
                        <button 
                          onClick={() => setActiveTab('orders')}
                          className="text-emerald-700 text-sm font-bold hover:underline"
                        >
                          View All
                        </button>
                      </div>
                      <div className="divide-y divide-stone-50">
                        {orders.slice(0, 3).map(order => (
                          <div key={order.id} className="p-6 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="p-3 rounded-xl bg-stone-100 text-stone-600">
                                <Package className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="font-bold text-stone-900">Order #{order.id.slice(0, 8)}</p>
                                <p className="text-xs text-stone-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-stone-900">${(order.totalAmount || 0).toFixed(2)}</p>
                              <span className={`text-[10px] font-bold uppercase tracking-wider ${
                                order.status === 'pending' ? 'text-amber-600' : 
                                order.status === 'completed' ? 'text-emerald-600' : 'text-blue-600'
                              }`}>
                                {order.status}
                              </span>
                            </div>
                          </div>
                        ))}
                        {orders.length === 0 && (
                          <div className="p-12 text-center text-stone-400">No orders yet.</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* Quick Notifications */}
                    <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
                      <NotificationList notifications={notifications.slice(0, 5)} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="space-y-8">
                {/* Filters */}
                <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-bold text-lg flex items-center gap-2">
                      <Filter className="w-5 h-5 text-emerald-600" />
                      Filter Orders
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
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
                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">From Date</label>
                      <input 
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">To Date</label>
                      <input 
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>
                  {(statusFilter !== 'all' || startDate || endDate) && (
                    <div className="flex justify-end">
                      <button 
                        onClick={() => {
                          setStatusFilter('all');
                          setStartDate('');
                          setEndDate('');
                        }}
                        className="px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                      >
                        Clear All Filters
                      </button>
                    </div>
                  )}
                </div>

                {/* Active Orders Section */}
                <div className="bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-stone-100">
                    <h2 className="font-bold text-lg">Active Orders</h2>
                  </div>
                  <div className="divide-y divide-stone-50">
                    {activeOrders.map(order => (
                      <div key={order.id} className="p-6 hover:bg-stone-50 transition-colors">
                        {/* Order Header */}
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
                            <p className="text-xl font-bold text-stone-900">${(order.totalAmount || 0).toFixed(2)}</p>
                            <div className="flex items-center gap-4">
                              <button 
                                onClick={() => openChat(order.farmerId, order.farmerName)}
                                className="text-emerald-700 text-sm font-bold hover:underline flex items-center gap-1"
                              >
                                <MessageSquare className="w-4 h-4" />
                                Message Farmer
                              </button>
                              <Link 
                                to={`/order/${order.id}`}
                                className="text-emerald-700 text-sm font-bold hover:underline flex items-center gap-1"
                              >
                                <Eye className="w-4 h-4" />
                                Full Details
                              </Link>
                              <button 
                                onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                                className="text-stone-500 text-sm font-bold hover:underline flex items-center gap-1"
                              >
                                {expandedOrderId === order.id ? 'Hide' : 'Quick View'}
                                {expandedOrderId === order.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Expanded Details */}
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
                                        <span className="font-bold text-stone-900">${((item.price || 0) * (item.quantity || 0)).toFixed(2)}</span>
                                      </div>
                                    ))}
                                    <div className="pt-2 border-t border-stone-50 flex justify-between font-bold">
                                      <span>Total</span>
                                      <span className="text-emerald-700">${(order.totalAmount || 0).toFixed(2)}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-6">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Delivery Method</h4>
                                      <div className="flex items-center gap-2 text-sm text-stone-700">
                                        {order.deliveryMethod === 'delivery' ? <Truck className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
                                        <span className="capitalize">
                                          {order.deliveryMethod}
                                          {order.deliveryMethod === 'delivery' && order.deliveryOption && ` (${order.deliveryOption})`}
                                        </span>
                                      </div>
                                      {(order.deliveryFee || 0) > 0 && (
                                        <p className="text-[10px] text-stone-400">Fee: ${(order.deliveryFee || 0).toFixed(2)}</p>
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

                                  {order.deliveryMethod === 'delivery' && (
                                    <div className="space-y-4">
                                      <div className="space-y-1">
                                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Delivery Address</h4>
                                        <div className="flex items-start gap-2 text-sm text-stone-700">
                                          <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                                          <div className="space-y-1">
                                            <p className="font-bold">{order.deliveryAddress}</p>
                                            {order.deliveryDetails && (
                                              <div className="text-xs text-stone-500 space-y-1">
                                                {(order.deliveryDetails.estateName || order.deliveryDetails.blockOrApartment) && (
                                                  <p>
                                                    {order.deliveryDetails.estateName && `Estate: ${order.deliveryDetails.estateName}`}
                                                    {order.deliveryDetails.estateName && order.deliveryDetails.blockOrApartment && ' • '}
                                                    {order.deliveryDetails.blockOrApartment && `Block/Apt: ${order.deliveryDetails.blockOrApartment}`}
                                                  </p>
                                                )}
                                                {order.deliveryDetails.landmark && (
                                                  <p>Landmark: {order.deliveryDetails.landmark}</p>
                                                )}
                                                {order.deliveryDetails.directionsNarrative && (
                                                  <p className="italic">"{order.deliveryDetails.directionsNarrative}"</p>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      {order.deliveryDetails?.googlePin && (
                                        <div className="space-y-2">
                                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Pinned Location</h4>
                                          <div className="h-40 rounded-2xl overflow-hidden border border-stone-100 relative group">
                                            <APIProvider apiKey={API_KEY}>
                                              <Map
                                                defaultCenter={{ lat: order.deliveryDetails.googlePin.lat, lng: order.deliveryDetails.googlePin.lng }}
                                                defaultZoom={15}
                                                mapId="DEMO_MAP_ID"
                                                gestureHandling={'none'}
                                                disableDefaultUI={true}
                                                className="w-full h-full"
                                              >
                                                <AdvancedMarker position={{ lat: order.deliveryDetails.googlePin.lat, lng: order.deliveryDetails.googlePin.lng }}>
                                                  <Pin background="#10b981" glyphColor="#fff" />
                                                </AdvancedMarker>
                                              </Map>
                                            </APIProvider>
                                            <a 
                                              href={`https://www.google.com/maps/search/?api=1&query=${order.deliveryDetails.googlePin.lat},${order.deliveryDetails.googlePin.lng}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm p-2 rounded-lg shadow-sm text-emerald-600 hover:text-emerald-700 transition-colors flex items-center gap-1 text-[10px] font-bold"
                                            >
                                              <ExternalLink className="w-3 h-3" />
                                              Open in Maps
                                            </a>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}

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

                              {/* Tracking Progress */}
                              {order.status !== 'declined' && (
                                <div className="mt-8 pt-8 border-t border-stone-100">
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-6">Order Tracking</h4>
                                  <div className="relative">
                                    <div className="absolute top-5 left-0 w-full h-1 bg-stone-100 rounded-full" />
                                    <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: `${((getStatusStep(order.status) - 1) / 5) * 100}%` }}
                                      className="absolute top-5 left-0 h-1 bg-emerald-500 rounded-full transition-all duration-1000 ease-out"
                                    />
                                    <div className="relative flex justify-between">
                                      {[
                                        { step: 1, label: 'Placed', icon: <Clock className="w-5 h-5" />, date: order.createdAt },
                                        { step: 2, label: 'Accepted', icon: <CheckCircle className="w-5 h-5" />, date: order.acceptedAt },
                                        { step: 3, label: 'Shipped', icon: <Truck className="w-5 h-5" />, date: order.shippedAt },
                                        { step: 4, label: 'Received', icon: <Package className="w-5 h-5" />, date: order.receivedAt },
                                        { step: 5, label: 'Fulfilled', icon: <Truck className="w-5 h-5" />, date: order.fulfilledAt },
                                        { step: 6, label: 'Completed', icon: <CheckCircle className="w-5 h-5" />, date: order.completedAt },
                                      ].map((s) => {
                                        const isCompleted = getStatusStep(order.status) >= s.step;
                                        const isCurrent = getStatusStep(order.status) === s.step;
                                        return (
                                          <div key={s.step} className="flex flex-col items-center gap-3 flex-1 relative">
                                            <motion.div 
                                              animate={{ 
                                                scale: isCurrent ? 1.2 : 1,
                                                backgroundColor: isCompleted ? '#10b981' : '#ffffff',
                                                color: isCompleted ? '#ffffff' : '#d1d5db',
                                                borderColor: isCompleted ? '#10b981' : '#f3f4f6'
                                              }}
                                              className={`w-10 h-10 rounded-full flex items-center justify-center border-2 z-10 transition-colors duration-500 ${isCurrent ? 'ring-4 ring-emerald-100' : ''}`}
                                            >
                                              {s.icon}
                                            </motion.div>
                                            <div className="text-center px-2">
                                              <p className={`text-xs font-bold ${isCompleted ? 'text-stone-900' : 'text-stone-300'}`}>{s.label}</p>
                                              {s.date && (
                                                <div className="mt-1">
                                                  <p className="text-[10px] text-stone-500">
                                                    {new Date(s.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                    {' at ' + new Date(s.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                  </p>
                                                </div>
                                              )}
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
                    {activeOrders.length === 0 && (
                      <div className="p-12 text-center text-stone-400">No active orders found matching your filters.</div>
                    )}
                  </div>
                </div>

                {/* Order History Section */}
                <div className="bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-stone-100">
                    <h2 className="font-bold text-lg">Order History</h2>
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
                              </div>
                            </div>
                          </div>
                          <div className="text-right flex flex-col items-end gap-2">
                            <p className="text-xl font-bold text-stone-900">${(order.totalAmount || 0).toFixed(2)}</p>
                            <div className="flex items-center gap-3">
                              <Link 
                                to={`/order/${order.id}`}
                                className="text-emerald-700 text-sm font-bold hover:underline flex items-center gap-1"
                              >
                                <Eye className="w-4 h-4" />
                                Full Details
                              </Link>
                              <button 
                                onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                                className="text-stone-500 text-sm font-bold hover:underline flex items-center gap-1"
                              >
                                {expandedOrderId === order.id ? 'Hide' : 'Quick View'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {historyOrders.length === 0 && (
                      <div className="p-12 text-center text-stone-400">No order history found.</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'favorites' && (
              <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {favoriteProducts.map(product => (
                    <Link 
                      key={product.id}
                      to={`/product/${product.id}`}
                      className="group bg-stone-50 border border-stone-100 rounded-3xl overflow-hidden hover:border-emerald-200 transition-all"
                    >
                      <div className="aspect-square overflow-hidden bg-stone-200">
                        <img 
                          src={product.images[0]} 
                          alt={product.name} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                          referrerPolicy="no-referrer" 
                        />
                      </div>
                      <div className="p-4">
                        <p className="font-bold text-stone-900 group-hover:text-emerald-700 transition-colors">{product.name}</p>
                        <p className="text-sm text-stone-500">${(product.price || 0).toFixed(2)} / {product.unit}</p>
                        <div className="mt-4 flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                            {product.category}
                          </span>
                          <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-emerald-500 transition-all" />
                        </div>
                      </div>
                    </Link>
                  ))}
                  {favoriteProducts.length === 0 && (
                    <div className="col-span-full py-20 text-center">
                      <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Heart className="w-10 h-10 text-stone-200" />
                      </div>
                      <p className="text-stone-400 font-bold">No favorite products yet.</p>
                      <Link to="/marketplace" className="mt-4 inline-block text-emerald-700 font-bold hover:underline">Browse Marketplace</Link>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm">
                <NotificationList notifications={notifications} />
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="max-w-2xl space-y-8">
                {/* Profile Info */}
                <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm space-y-6">
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 rounded-3xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                      <User className="w-12 h-12" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-stone-900">{profile?.name}</h3>
                      <p className="text-stone-500">{user?.email}</p>
                      <span className="mt-2 inline-block px-3 py-1 bg-stone-100 text-stone-600 rounded-full text-xs font-bold uppercase tracking-wider">
                        {profile?.role}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-emerald-600" />
                      Contact Information
                    </h3>
                  </div>
                  
                  <div className="p-6 rounded-2xl bg-stone-50 border border-stone-100 space-y-4">
                    {isEditingPhone ? (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-stone-400 uppercase">Phone Number</label>
                          <input
                            type="tel"
                            className={`w-full bg-white border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                              phoneError ? 'border-red-500' : 'border-stone-200'
                            }`}
                            value={newPhone}
                            onChange={(e) => {
                              setNewPhone(e.target.value);
                              if (phoneError) setPhoneError('');
                            }}
                            placeholder="e.g. +254 712 345 678"
                          />
                          {phoneError && <p className="text-xs text-red-500 font-bold">{phoneError}</p>}
                        </div>
                        <div className="flex gap-3">
                          <button 
                            onClick={handleUpdatePhone}
                            disabled={updatingPhone}
                            className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-all"
                          >
                            {updatingPhone ? 'Saving...' : 'Save Phone'}
                          </button>
                          <button 
                            onClick={() => {
                              setIsEditingPhone(false);
                              setNewPhone(profile?.phone || '');
                            }}
                            className="px-6 py-3 text-stone-50 font-bold bg-stone-400 hover:bg-stone-500 rounded-xl transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <label className="text-[10px] font-bold text-stone-400 uppercase block mb-1">Phone Number</label>
                          {profile?.phone ? (
                            <p className="text-stone-900 font-bold">{profile.phone}</p>
                          ) : (
                            <p className="text-stone-400 italic">No phone number set yet.</p>
                          )}
                        </div>
                        <button 
                          onClick={() => setIsEditingPhone(true)}
                          className="text-emerald-700 font-bold text-sm hover:underline flex items-center gap-1"
                        >
                          <Edit3 className="w-4 h-4" />
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Delivery Location */}
                <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-emerald-600" />
                      Preferred Delivery Address
                    </h3>
                  </div>
                  
                  <div className="p-6 rounded-2xl bg-stone-50 border border-stone-100 space-y-4">
                    {isEditingLocation ? (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-stone-400 uppercase">Street Address</label>
                          <input
                            type="text"
                            className={`w-full bg-white border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                              locationError ? 'border-red-500' : 'border-stone-200'
                            }`}
                            value={newAddress}
                            onChange={(e) => {
                              setNewAddress(e.target.value);
                              if (locationError) setLocationError('');
                            }}
                            placeholder="Enter your full delivery address..."
                          />
                          {locationError && <p className="text-xs text-red-500 font-bold">{locationError}</p>}
                        </div>
                        <div className="flex gap-3">
                          <button 
                            onClick={handleUpdateLocation}
                            disabled={updatingLocation}
                            className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-all"
                          >
                            {updatingLocation ? 'Saving...' : 'Save Address'}
                          </button>
                          <button 
                            onClick={handleUseCurrentLocation}
                            className="px-4 py-3 bg-white border border-stone-200 text-stone-600 rounded-xl hover:bg-stone-50 transition-all"
                            title="Use current location"
                          >
                            <TrendingUp className="w-5 h-5 rotate-45" />
                          </button>
                          <button 
                            onClick={() => {
                              setIsEditingLocation(false);
                              setNewAddress(profile?.location?.address || '');
                            }}
                            className="px-6 py-3 text-stone-50 font-bold bg-stone-400 hover:bg-stone-500 rounded-xl transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <label className="text-[10px] font-bold text-stone-400 uppercase block mb-1">Street Address</label>
                          {profile?.location?.address ? (
                            <p className="text-stone-900 font-bold">{profile.location.address}</p>
                          ) : (
                            <p className="text-stone-400 italic">No delivery address set yet.</p>
                          )}
                        </div>
                        <button 
                          onClick={() => setIsEditingLocation(true)}
                          className="text-emerald-700 font-bold text-sm hover:underline flex items-center gap-1"
                        >
                          <Edit3 className="w-4 h-4" />
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

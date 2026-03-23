import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, onSnapshot, updateDoc, doc, getDocs, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { UserProfile, Product, Order } from '../types';
import { 
  ShieldCheck, ShieldAlert, User, Mail, Calendar, 
  Search, Filter, Users, ShoppingBag, Package, LayoutDashboard, 
  ChevronRight, Trash2, Eye, TrendingUp, DollarSign, FileText,
  Award, CreditCard
} from 'lucide-react';
import { Toast } from '../components/Toast';
import { exportOrderToPDF, exportOrdersToPDF } from '../services/pdfService';

export const AdminDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('farmers');
  const [farmers, setFarmers] = useState<UserProfile[]>([]);
  const [buyers, setBuyers] = useState<UserProfile[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'verified' | 'unverified'>('all');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false
  });

  const menuItems = [
    { id: 'farmers', label: 'Farmers', icon: Users },
    { id: 'buyers', label: 'Buyers', icon: User },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
  ];

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type, isVisible: true });
  };

  useEffect(() => {
    if (profile?.role !== 'admin') return;

    // Fetch Farmers
    const farmersQuery = query(collection(db, 'users'), where('role', '==', 'farmer'));
    const unsubscribeFarmers = onSnapshot(farmersQuery, (snapshot) => {
      setFarmers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
    });

    // Fetch Buyers
    const buyersQuery = query(collection(db, 'users'), where('role', '==', 'buyer'));
    const unsubscribeBuyers = onSnapshot(buyersQuery, (snapshot) => {
      setBuyers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
    });

    // Fetch Products
    const productsQuery = query(collection(db, 'products'));
    const unsubscribeProducts = onSnapshot(productsQuery, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    });

    // Fetch Orders
    const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    });

    setLoading(false);

    return () => {
      unsubscribeFarmers();
      unsubscribeBuyers();
      unsubscribeProducts();
      unsubscribeOrders();
    };
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

  const deleteProduct = async (productId: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await deleteDoc(doc(db, 'products', productId));
      showToast('Product deleted successfully');
    } catch (error) {
      showToast('Failed to delete product', 'error');
    }
  };

  const approveProduct = async (productId: string) => {
    try {
      await updateDoc(doc(db, 'products', productId), {
        status: 'approved'
      });
      showToast('Product approved successfully');
    } catch (error) {
      showToast('Failed to approve product', 'error');
    }
  };

  const rejectProduct = async (productId: string) => {
    try {
      await updateDoc(doc(db, 'products', productId), {
        status: 'rejected'
      });
      showToast('Product rejected');
    } catch (error) {
      showToast('Failed to reject product', 'error');
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

  const filteredBuyers = buyers.filter(buyer => 
    buyer.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    buyer.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredOrders = orders.filter(order => 
    order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)] bg-stone-50 -mx-4 sm:-mx-6 lg:-mx-8 -mt-8">
      {/* Sidebar */}
      <div className="lg:w-64 bg-white border-r border-stone-200 p-6 flex-shrink-0">
        <div className="mb-8">
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">Admin Panel</h2>
          <nav className="space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setSearchTerm('');
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                  activeTab === item.id
                    ? 'bg-emerald-50 text-emerald-700 shadow-sm'
                    : 'text-stone-500 hover:bg-stone-50 hover:text-stone-900'
                }`}
              >
                <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-emerald-600' : ''}`} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto pt-8 border-t border-stone-100">
          <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-emerald-700">Admin Mode</span>
            </div>
            <p className="text-[10px] text-emerald-600 leading-tight">
              You have full access to platform management tools.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-stone-900 capitalize">{activeTab} Management</h1>
              <p className="text-stone-500">Overview and management of platform {activeTab}</p>
            </div>
            
            <div className="relative w-full md:w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input 
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-2xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-white"
              />
            </div>
          </div>

          {activeTab === 'farmers' && (
            <div className="space-y-8">
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
                  <p className="text-stone-400 text-sm font-bold uppercase tracking-wider mb-1">Pending</p>
                  <p className="text-3xl font-bold text-amber-500">{farmers.filter(f => !f.isVerified).length}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-stone-200 w-fit">
                <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filter === 'all' ? 'bg-stone-900 text-white' : 'text-stone-500 hover:bg-stone-50'}`}>All</button>
                <button onClick={() => setFilter('verified')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filter === 'verified' ? 'bg-emerald-600 text-white' : 'text-stone-500 hover:bg-stone-50'}`}>Verified</button>
                <button onClick={() => setFilter('unverified')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filter === 'unverified' ? 'bg-amber-500 text-white' : 'text-stone-500 hover:bg-stone-50'}`}>Unverified</button>
              </div>

              <div className="bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-100">
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-400">Farmer</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-400">Contact</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-400">Status</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-400 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredFarmers.map((farmer) => (
                      <tr key={farmer.uid} className="hover:bg-stone-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-stone-100 overflow-hidden">
                              {farmer.photoURL ? <img src={farmer.photoURL} alt="" className="w-full h-full object-cover" /> : <User className="w-full h-full p-2 text-stone-400" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="font-bold text-stone-900">{farmer.displayName}</p>
                                {farmer.isVerified && (
                                  <ShieldCheck className="w-4 h-4 text-emerald-600" title="Verified Farmer" />
                                )}
                              </div>
                              <p className="text-xs text-stone-500">{farmer.farmName || 'No Farm Name'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-stone-600">{farmer.email}</p>
                        </td>
                        <td className="px-6 py-4">
                          {farmer.isVerified ? (
                            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">Verified</span>
                          ) : (
                            <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold">Unverified</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => toggleVerification(farmer.uid, !!farmer.isVerified)}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                              farmer.isVerified 
                                ? 'bg-stone-100 text-stone-600 hover:bg-stone-200' 
                                : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-md'
                            }`}
                          >
                            {farmer.isVerified ? (
                              <>
                                <ShieldAlert className="w-3.5 h-3.5" />
                                Revoke
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="w-3.5 h-3.5" />
                                Verify Farmer
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'buyers' && (
            <div className="bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-100">
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-400">Buyer</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-400">Contact</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-400">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredBuyers.map((buyer) => (
                    <tr key={buyer.uid} className="hover:bg-stone-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-stone-100 overflow-hidden">
                            {buyer.photoURL ? <img src={buyer.photoURL} alt="" className="w-full h-full object-cover" /> : <User className="w-full h-full p-2 text-stone-400" />}
                          </div>
                          <p className="font-bold text-stone-900">{buyer.displayName}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-stone-600">{buyer.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-stone-600">{new Date(buyer.createdAt).toLocaleDateString()}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'products' && (
            <div className="bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-100">
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-400">Product</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-400">Category</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-400">Price</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-400">Status</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-400 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-stone-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-stone-100 overflow-hidden">
                            {product.images?.[0] && <img src={product.images[0]} alt="" className="w-full h-full object-cover" />}
                          </div>
                          <p className="font-bold text-stone-900">{product.name}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded-lg bg-stone-100 text-stone-600 text-xs font-medium capitalize">{product.category}</span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-stone-900">${product.price}/{product.unit}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                          product.status === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                          product.status === 'rejected' ? 'bg-red-50 text-red-700' :
                          product.status === 'pending_approval' ? 'bg-amber-50 text-amber-700' :
                          'bg-stone-100 text-stone-600'
                        }`}>
                          {product.status?.replace('_', ' ') || 'draft'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Link 
                            to={`/admin/product/${product.id}`}
                            className="p-2 text-stone-400 hover:text-emerald-600 transition-colors"
                            title="Review Product"
                          >
                            <Eye className="w-5 h-5" />
                          </Link>
                          <button onClick={() => deleteProduct(product.id)} className="p-2 text-stone-400 hover:text-red-600 transition-colors">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-stone-900">All Platform Orders</h2>
                <button 
                  onClick={() => exportOrdersToPDF(orders, 'FarmLink Platform Orders')}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  <FileText className="w-4 h-4" />
                  Export All Orders
                </button>
              </div>
              <div className="bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-100">
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-400">Order ID</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-400">Total</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-400">Status</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-400">Date</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-400 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-stone-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-mono font-bold text-stone-900">#{order.id.slice(-8).toUpperCase()}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-stone-900">${(order.totalAmount || 0).toFixed(2)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          order.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                          order.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                          'bg-stone-100 text-stone-600'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-stone-600">{new Date(order.createdAt).toLocaleDateString()}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => exportOrderToPDF(order)}
                            className="p-2 text-stone-400 hover:text-emerald-600 transition-colors"
                            title="Export PDF"
                          >
                            <FileText className="w-5 h-5" />
                          </button>
                          <Link 
                            to={`/order/${order.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-stone-100 text-stone-600 hover:bg-stone-200 text-xs font-bold transition-all"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Details
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Product, Order, Notification } from '../types';
import { Plus, Package, DollarSign, TrendingUp, Trash2, Edit2, X, Camera, Store, Award, Save, CheckCircle, Truck, Clock, Eye, Bell, ShieldCheck, BarChart3, CalendarDays, Filter, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toast } from '../components/Toast';
import { NotificationList } from '../components/NotificationList';
import { useChat } from '../context/ChatContext';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  Legend,
  Cell
} from 'recharts';

export const FarmerDashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type, isVisible: true });
  };
  
  const [farmProfile, setFarmProfile] = useState({
    farmName: '',
    businessType: '',
    certifications: [] as string[]
  });

  const [newCert, setNewCert] = useState('');
  const [chartView, setChartView] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [orderStatusFilter, setOrderStatusFilter] = useState<Order['status'] | 'all'>('all');
  const [orderStartDate, setOrderStartDate] = useState('');
  const [orderEndDate, setOrderEndDate] = useState('');
  const { openChat } = useChat();

  useEffect(() => {
    if (profile) {
      setFarmProfile({
        farmName: profile.farmName || '',
        businessType: profile.businessType || '',
        certifications: profile.certifications || []
      });
    }
  }, [profile]);

  const [newProduct, setNewProduct] = useState({
    name: '',
    category: 'Fruits & Vegetables',
    quantity: 0,
    unit: 'kg',
    price: 0,
    description: '',
    growingMethod: 'Organic',
    harvestDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (!user) return;

    const qProducts = query(collection(db, 'products'), where('farmerId', '==', user.uid));
    const unsubscribeProducts = onSnapshot(qProducts, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    });

    const qOrders = query(collection(db, 'orders'), where('farmerId', '==', user.uid));
    const unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    });

    const qNotifications = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeNotifications = onSnapshot(qNotifications, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification)));
    });

    return () => {
      unsubscribeProducts();
      unsubscribeOrders();
      unsubscribeNotifications();
    };
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files: File[] = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...files]);
      
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setImagePreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeSelectedImage = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    setUploading(true);
    try {
      let imageUrls: string[] = editingProduct ? editingProduct.images : [];
      
      // Upload new images
      if (selectedFiles.length > 0) {
        const uploadPromises = selectedFiles.map(async (file) => {
          const storageRef = ref(storage, `products/${user.uid}/${Date.now()}_${file.name}`);
          const snapshot = await uploadBytes(storageRef, file);
          return getDownloadURL(snapshot.ref);
        });
        const newUrls = await Promise.all(uploadPromises);
        imageUrls = [...imageUrls, ...newUrls];
      }

      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), {
          ...newProduct,
          images: imageUrls,
          updatedAt: new Date().toISOString()
        });
        showToast('Product updated successfully');
      } else {
        await addDoc(collection(db, 'products'), {
          ...newProduct,
          farmerId: user.uid,
          farmerName: profile.displayName,
          createdAt: new Date().toISOString(),
          location: profile.location || { address: 'Local Farm', lat: 0, lng: 0 },
          images: imageUrls
        });
        showToast('Product listed successfully');
      }
      setIsAddModalOpen(false);
      setEditingProduct(null);
      setSelectedFiles([]);
      setImagePreviews([]);
      setNewProduct({
        name: '',
        category: 'Fruits & Vegetables',
        quantity: 0,
        unit: 'kg',
        price: 0,
        description: '',
        growingMethod: 'Organic',
        harvestDate: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      console.error("Error saving product:", error);
      showToast('Failed to save product', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setSelectedFiles([]);
    setImagePreviews([]);
    setNewProduct({
      name: product.name,
      category: product.category,
      quantity: product.quantity,
      unit: product.unit,
      price: product.price,
      description: product.description,
      growingMethod: product.growingMethod,
      harvestDate: product.harvestDate || new Date().toISOString().split('T')[0]
    });
    setIsAddModalOpen(true);
  };

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this listing?")) {
      try {
        await deleteDoc(doc(db, 'products', id));
        showToast('Product deleted');
      } catch (error) {
        showToast('Failed to delete product', 'error');
      }
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        ...farmProfile
      });
      setIsProfileModalOpen(false);
      showToast('Profile updated');
    } catch (error) {
      console.error("Error updating farm profile:", error);
      showToast('Failed to update profile', 'error');
    }
  };

  const addCertification = () => {
    if (newCert && !farmProfile.certifications.includes(newCert)) {
      setFarmProfile({
        ...farmProfile,
        certifications: [...farmProfile.certifications, newCert]
      });
      setNewCert('');
    }
  };

  const removeCertification = (cert: string) => {
    setFarmProfile({
      ...farmProfile,
      certifications: farmProfile.certifications.filter(c => c !== cert)
    });
  };

  const getChartData = () => {
    const now = new Date();
    const data: any[] = [];

    if (chartView === 'daily') {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayOrders = orders.filter(o => o.createdAt.startsWith(dateStr));
        data.push({
          name: d.toLocaleDateString([], { weekday: 'short' }),
          revenue: dayOrders.reduce((acc, curr) => acc + curr.totalAmount, 0),
          orders: dayOrders.length,
          fullDate: dateStr
        });
      }
    } else if (chartView === 'weekly') {
      // Last 4 weeks
      for (let i = 3; i >= 0; i--) {
        const start = new Date(now);
        start.setDate(start.getDate() - (i * 7) - start.getDay());
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        
        const weekOrders = orders.filter(o => {
          const orderDate = new Date(o.createdAt);
          return orderDate >= start && orderDate <= end;
        });
        
        data.push({
          name: `Week ${4-i}`,
          revenue: weekOrders.reduce((acc, curr) => acc + curr.totalAmount, 0),
          orders: weekOrders.length,
          range: `${start.toLocaleDateString([], { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString([], { month: 'short', day: 'numeric' })}`
        });
      }
    } else {
      // Last 6 months
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStr = d.toISOString().slice(0, 7); // YYYY-MM
        const monthOrders = orders.filter(o => o.createdAt.startsWith(monthStr));
        data.push({
          name: d.toLocaleDateString([], { month: 'short' }),
          revenue: monthOrders.reduce((acc, curr) => acc + curr.totalAmount, 0),
          orders: monthOrders.length,
          fullMonth: d.toLocaleDateString([], { month: 'long', year: 'numeric' })
        });
      }
    }
    return data;
  };

  const chartData = getChartData();

  const handleUpdateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      const timestampField = 
        newStatus === 'accepted' ? 'acceptedAt' :
        newStatus === 'fulfilled' ? 'fulfilledAt' :
        newStatus === 'completed' ? 'completedAt' :
        newStatus === 'declined' ? 'declinedAt' : null;

      const updateData: any = { status: newStatus };
      if (timestampField) {
        updateData[timestampField] = new Date().toISOString();
      }

      await updateDoc(doc(db, 'orders', orderId), updateData);
      
      // Create notification for buyer
      await addDoc(collection(db, 'notifications'), {
        userId: order.buyerId,
        title: 'Order Status Update',
        message: `Your order #${orderId.slice(-6)} has been ${newStatus}.`,
        type: 'order_status',
        relatedId: orderId,
        read: false,
        createdAt: new Date().toISOString()
      });

      showToast(`Order marked as ${newStatus}`);
    } catch (error) {
      console.error("Error updating order status:", error);
      showToast('Failed to update order status', 'error');
    }
  };

  const seedSampleProducts = async () => {
    if (!user || !profile) return;
    
    const sampleProducts = [
      { name: 'Organic Red Tomatoes', category: 'Fruits & Vegetables', quantity: 50, unit: 'kg', price: 3.50, description: 'Vine-ripened organic red tomatoes.', growingMethod: 'Organic' },
      { name: 'Fresh Spinach', category: 'Fruits & Vegetables', quantity: 30, unit: 'bunch', price: 2.00, description: 'Crispy and nutrient-rich spinach leaves.', growingMethod: 'Organic' },
      { name: 'Sweet Corn', category: 'Fruits & Vegetables', quantity: 100, unit: 'ear', price: 1.50, description: 'Freshly harvested sweet yellow corn.', growingMethod: 'Conventional' },
      { name: 'Gala Apples', category: 'Fruits & Vegetables', quantity: 40, unit: 'kg', price: 4.00, description: 'Sweet and crunchy Gala apples.', growingMethod: 'Organic' },
      { name: 'Baby Carrots', category: 'Fruits & Vegetables', quantity: 25, unit: 'bag', price: 2.50, description: 'Sweet baby carrots, perfect for snacking.', growingMethod: 'Organic' },
      { name: 'Red Bell Peppers', category: 'Fruits & Vegetables', quantity: 60, unit: 'each', price: 1.80, description: 'Large and sweet red bell peppers.', growingMethod: 'Conventional' },
      { name: 'Hass Avocados', category: 'Fruits & Vegetables', quantity: 45, unit: 'each', price: 2.20, description: 'Creamy and ripe Hass avocados.', growingMethod: 'Organic' },
      { name: 'Organic Strawberries', category: 'Fruits & Vegetables', quantity: 20, unit: 'box', price: 5.00, description: 'Sweet and juicy organic strawberries.', growingMethod: 'Organic' },
      { name: 'Yellow Onions', category: 'Fruits & Vegetables', quantity: 80, unit: 'kg', price: 1.20, description: 'Versatile yellow onions for cooking.', growingMethod: 'Conventional' },
      { name: 'Russet Potatoes', category: 'Fruits & Vegetables', quantity: 150, unit: 'kg', price: 0.80, description: 'Perfect for baking or mashing.', growingMethod: 'Conventional' }
    ];

    try {
      setUploading(true);
      for (const p of sampleProducts) {
        await addDoc(collection(db, 'products'), {
          ...p,
          farmerId: user.uid,
          farmerName: profile.farmName || profile.name,
          images: [`https://picsum.photos/seed/${p.name.replace(/\s/g, '')}/800/600`],
          harvestDate: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString()
        });
      }
      showToast('Successfully added 10 sample products!');
    } catch (error) {
      console.error("Error seeding products:", error);
      showToast('Failed to seed products', 'error');
    } finally {
      setUploading(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesStatus = orderStatusFilter === 'all' || order.status === orderStatusFilter;
    const orderDate = new Date(order.createdAt);
    const matchesStartDate = !orderStartDate || orderDate >= new Date(orderStartDate);
    const matchesEndDate = !orderEndDate || orderDate <= new Date(orderEndDate + 'T23:59:59');
    return matchesStatus && matchesStartDate && matchesEndDate;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Farmer Dashboard</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-stone-500">Manage your farm listings and orders</p>
            {profile?.isVerified && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider border border-emerald-100">
                <ShieldCheck className="w-3 h-3" />
                Verified
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={seedSampleProducts}
            disabled={uploading}
            className="bg-stone-100 text-stone-600 px-6 py-3 rounded-xl font-bold hover:bg-stone-200 transition-all flex items-center gap-2"
          >
            {uploading ? 'Seeding...' : 'Seed Sample Data'}
          </button>
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="bg-white text-stone-900 border border-stone-200 px-6 py-3 rounded-xl font-bold hover:bg-stone-50 transition-all flex items-center gap-2"
          >
            <Store className="w-5 h-5" />
            Farm Profile
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-800 transition-all shadow-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Listing
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard icon={<Package className="w-6 h-6" />} label="Active Listings" value={products.length} color="bg-blue-50 text-blue-600" />
        <StatCard icon={<TrendingUp className="w-6 h-6" />} label="Total Orders" value={orders.length} color="bg-emerald-50 text-emerald-600" />
        <StatCard icon={<DollarSign className="w-6 h-6" />} label="Revenue" value={`$${orders.reduce((acc, curr) => acc + curr.totalAmount, 0).toFixed(2)}`} color="bg-amber-50 text-amber-600" />
        <StatCard icon={<TrendingUp className="w-6 h-6" />} label="Conversion" value="12%" color="bg-purple-50 text-purple-600" />
      </div>

      {/* Analytics Chart */}
      <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              Sales Performance
            </h2>
            <p className="text-sm text-stone-500">Revenue and order volume over time</p>
          </div>
          
          <div className="flex items-center gap-2 bg-stone-50 p-1 rounded-2xl border border-stone-100">
            {(['daily', 'weekly', 'monthly'] as const).map((view) => (
              <button
                key={view}
                onClick={() => setChartView(view)}
                className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                  chartView === view 
                    ? 'bg-white text-emerald-700 shadow-sm border border-stone-100' 
                    : 'text-stone-400 hover:text-stone-600'
                }`}
              >
                {view}
              </button>
            ))}
          </div>
        </div>

        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                dy={10}
              />
              <YAxis 
                yId="left"
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                tickFormatter={(value) => `$${value}`}
              />
              <YAxis 
                yId="right"
                orientation="right"
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#9ca3af', fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  borderRadius: '16px', 
                  border: '1px solid #f3f4f6',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  padding: '12px'
                }}
                itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                labelStyle={{ fontSize: '10px', color: '#9ca3af', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
              />
              <Area 
                yId="left"
                type="monotone" 
                dataKey="revenue" 
                stroke="#10b981" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorRevenue)" 
                name="Revenue ($)"
              />
              <Area 
                yId="right"
                type="monotone" 
                dataKey="orders" 
                stroke="#f59e0b" 
                strokeWidth={3}
                fillOpacity={0}
                name="Orders"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        <div className="flex items-center justify-center gap-8 mt-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-xs font-bold text-stone-600">Total Revenue</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-xs font-bold text-stone-600">Order Volume</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Listings Table */}
          <div className="bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-stone-100 flex justify-between items-center">
              <h2 className="font-bold text-lg">Your Listings</h2>
              <button className="text-emerald-700 text-sm font-bold">View All</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-stone-50 text-stone-400 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Product</th>
                    <th className="px-6 py-4 font-semibold">Price</th>
                    <th className="px-6 py-4 font-semibold">Stock</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {products.map(p => (
                    <tr key={p.id} className="hover:bg-stone-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-stone-100 overflow-hidden">
                            <img src={p.images?.[0] || `https://picsum.photos/seed/${p.id}/100/100`} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                          <div>
                            <p className="font-bold text-stone-900">{p.name}</p>
                            <p className="text-xs text-stone-500">{p.category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-stone-600">${p.price.toFixed(2)}/{p.unit}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${p.quantity > 10 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                          {p.quantity} {p.unit}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleEditProduct(p)}
                            className="p-2 text-stone-400 hover:text-emerald-700 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteProduct(p.id)} className="p-2 text-stone-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-stone-400">No listings yet. Add your first product!</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-stone-100 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg">Orders</h2>
                <div className="flex items-center gap-2 text-xs text-stone-400">
                  <Filter className="w-3 h-3" />
                  <span>{filteredOrders.length} orders found</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 pt-2">
                <div className="flex-1 min-w-[120px]">
                  <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Status</label>
                  <select 
                    value={orderStatusFilter}
                    onChange={(e) => setOrderStatusFilter(e.target.value as any)}
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
                <div className="flex-1 min-w-[120px]">
                  <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">From</label>
                  <input 
                    type="date"
                    value={orderStartDate}
                    onChange={(e) => setOrderStartDate(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div className="flex-1 min-w-[120px]">
                  <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">To</label>
                  <input 
                    type="date"
                    value={orderEndDate}
                    onChange={(e) => setOrderEndDate(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                {(orderStatusFilter !== 'all' || orderStartDate || orderEndDate) && (
                  <div className="flex items-end">
                    <button 
                      onClick={() => {
                        setOrderStatusFilter('all');
                        setOrderStartDate('');
                        setOrderEndDate('');
                      }}
                      className="px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 space-y-4">
              {filteredOrders.map(o => (
                <div key={o.id} className="p-4 rounded-2xl bg-stone-50 border border-stone-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm">Order #{o.id.slice(0, 6)}</p>
                      <p className="text-xs text-stone-500">
                        ${o.totalAmount.toFixed(2)} • {o.items.length} items • 
                        <span className="capitalize"> {o.deliveryMethod}{o.deliveryOption ? ` (${o.deliveryOption})` : ''}</span>
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      o.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                      o.status === 'accepted' ? 'bg-blue-100 text-blue-700' :
                      o.status === 'fulfilled' ? 'bg-emerald-100 text-emerald-700' :
                      o.status === 'completed' ? 'bg-stone-200 text-stone-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {o.status}
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => openChat(o.buyerId, o.buyerName || 'Buyer')}
                      className="flex-1 bg-white text-stone-700 border border-stone-200 py-2 rounded-lg text-xs font-bold hover:bg-stone-50 flex items-center justify-center gap-1"
                    >
                      <MessageSquare className="w-3 h-3" />
                      Message Buyer
                    </button>
                    {o.status === 'pending' && (
                      <>
                        <button 
                          onClick={() => handleUpdateOrderStatus(o.id, 'accepted')}
                          className="flex-1 bg-emerald-700 text-white py-2 rounded-lg text-xs font-bold hover:bg-emerald-800"
                        >
                          Accept
                        </button>
                        <button 
                          onClick={() => handleUpdateOrderStatus(o.id, 'declined')}
                          className="flex-1 bg-white text-red-600 border border-red-100 py-2 rounded-lg text-xs font-bold hover:bg-red-50"
                        >
                          Decline
                        </button>
                      </>
                    )}
                    {o.status === 'accepted' && (
                      <button 
                        onClick={() => handleUpdateOrderStatus(o.id, 'fulfilled')}
                        className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-blue-700"
                      >
                        Mark as Fulfilled
                      </button>
                    )}
                    {o.status === 'fulfilled' && (
                      <button 
                        onClick={() => handleUpdateOrderStatus(o.id, 'completed')}
                        className="flex-1 bg-stone-700 text-white py-2 rounded-lg text-xs font-bold hover:bg-stone-800"
                      >
                        Complete Order
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {orders.length === 0 && (
                <div className="text-center py-12 text-stone-400 text-sm">No orders yet.</div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          <div className="bg-white rounded-3xl p-6 border border-stone-100 shadow-sm">
            <NotificationList notifications={notifications} />
          </div>
        </div>
      </div>

      {/* Add Product Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsAddModalOpen(false);
                setEditingProduct(null);
                setSelectedFiles([]);
                setImagePreviews([]);
                setNewProduct({
                  name: '',
                  category: 'Fruits & Vegetables',
                  quantity: 0,
                  unit: 'kg',
                  price: 0,
                  description: '',
                  growingMethod: 'Organic',
                  harvestDate: new Date().toISOString().split('T')[0]
                });
              }}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-stone-100 flex justify-between items-center">
                <h2 className="text-xl font-bold">{editingProduct ? 'Edit Listing' : 'Add New Listing'}</h2>
                <button 
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingProduct(null);
                    setSelectedFiles([]);
                    setImagePreviews([]);
                    setNewProduct({
                      name: '',
                      category: 'Fruits & Vegetables',
                      quantity: 0,
                      unit: 'kg',
                      price: 0,
                      description: '',
                      growingMethod: 'Organic',
                      harvestDate: new Date().toISOString().split('T')[0]
                    });
                  }} 
                  className="p-2 hover:bg-stone-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleAddProduct} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-stone-700">Product Name</label>
                    <input
                      required
                      type="text"
                      className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="e.g. Organic Red Tomatoes"
                      value={newProduct.name}
                      onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-stone-700">Category</label>
                    <select
                      className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      value={newProduct.category}
                      onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                    >
                      <option>Fruits & Vegetables</option>
                      <option>Grains & Cereals</option>
                      <option>Herbs & Spices</option>
                      <option>Dairy Products</option>
                      <option>Meat & Poultry</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-stone-700">Price per Unit ($)</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      value={newProduct.price}
                      onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-stone-700">Unit</label>
                    <input
                      required
                      type="text"
                      className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="kg, box, bunch"
                      value={newProduct.unit}
                      onChange={e => setNewProduct({...newProduct, unit: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-stone-700">Quantity Available</label>
                    <input
                      required
                      type="number"
                      className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      value={newProduct.quantity}
                      onChange={e => setNewProduct({...newProduct, quantity: parseInt(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-stone-700">Growing Method</label>
                    <select
                      className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      value={newProduct.growingMethod}
                      onChange={e => setNewProduct({...newProduct, growingMethod: e.target.value})}
                    >
                      <option>Organic</option>
                      <option>Conventional</option>
                      <option>Hydroponic</option>
                      <option>Greenhouse</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-stone-700">Harvest Date</label>
                    <input
                      required
                      type="date"
                      className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      value={newProduct.harvestDate}
                      onChange={e => setNewProduct({...newProduct, harvestDate: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-stone-700">Description</label>
                  <textarea
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Tell buyers about your produce..."
                    value={newProduct.description}
                    onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-sm font-bold text-stone-700">Product Images</label>
                  <div className="grid grid-cols-4 gap-4">
                    {/* Existing Images */}
                    {editingProduct?.images.map((url, idx) => (
                      <div key={`existing-${idx}`} className="relative aspect-square rounded-xl overflow-hidden border border-stone-200">
                        <img src={url} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute top-1 right-1 bg-emerald-500 text-white p-1 rounded-full">
                          <CheckCircle className="w-3 h-3" />
                        </div>
                      </div>
                    ))}
                    {/* New Previews */}
                    {imagePreviews.map((url, idx) => (
                      <div key={`new-${idx}`} className="relative aspect-square rounded-xl overflow-hidden border border-stone-200">
                        <img src={url} alt="Preview" className="w-full h-full object-cover" />
                        <button 
                          type="button"
                          onClick={() => removeSelectedImage(idx)}
                          className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <label className="aspect-square rounded-xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-all">
                      <Camera className="w-6 h-6 text-stone-400" />
                      <span className="text-[10px] font-bold text-stone-400 mt-1">Add Photo</span>
                      <input 
                        type="file" 
                        multiple 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleFileChange}
                      />
                    </label>
                  </div>
                </div>
                <button 
                  type="submit" 
                  disabled={uploading}
                  className="w-full bg-emerald-700 text-white py-4 rounded-2xl font-bold text-lg hover:bg-emerald-800 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Uploading...
                    </>
                  ) : (
                    editingProduct ? 'Update Listing' : 'Create Listing'
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Farm Profile Modal */}
      <AnimatePresence>
        {isProfileModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProfileModalOpen(false)}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-stone-100 flex justify-between items-center">
                <h2 className="text-xl font-bold">Edit Farm Profile</h2>
                <button onClick={() => setIsProfileModalOpen(false)} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleUpdateProfile} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-stone-700">Farm Name</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g. Green Valley Organic Farm"
                    value={farmProfile.farmName}
                    onChange={e => setFarmProfile({...farmProfile, farmName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-stone-700">About / Business Type</label>
                  <textarea
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Describe your farm and what you specialize in..."
                    value={farmProfile.businessType}
                    onChange={e => setFarmProfile({...farmProfile, businessType: e.target.value})}
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-sm font-bold text-stone-700">Certifications</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="e.g. USDA Organic"
                      value={newCert}
                      onChange={e => setNewCert(e.target.value)}
                    />
                    <button 
                      type="button"
                      onClick={addCertification}
                      className="bg-stone-100 text-stone-900 px-4 rounded-xl font-bold hover:bg-stone-200 transition-all"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {farmProfile.certifications.map(cert => (
                      <span key={cert} className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2">
                        {cert}
                        <button type="button" onClick={() => removeCertification(cert)} className="hover:text-emerald-900">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                <button type="submit" className="w-full bg-emerald-700 text-white py-4 rounded-2xl font-bold text-lg hover:bg-emerald-800 transition-all shadow-lg flex items-center justify-center gap-2">
                  <Save className="w-5 h-5" />
                  Save Changes
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <Toast 
        message={toast.message} 
        type={toast.type} 
        isVisible={toast.isVisible} 
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} 
      />
    </div>
  );
};

const StatCard = ({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string | number, color: string }) => (
  <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
    <div className={`p-3 rounded-2xl w-fit mb-4 ${color}`}>
      {icon}
    </div>
    <p className="text-stone-500 text-xs font-bold uppercase tracking-wider mb-1">{label}</p>
    <p className="text-2xl font-bold text-stone-900">{value}</p>
  </div>
);

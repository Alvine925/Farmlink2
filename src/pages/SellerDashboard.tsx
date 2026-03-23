import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, orderBy, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Product, Order, Notification, UserProfile } from '../types';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { Plus, Package, DollarSign, TrendingUp, Trash2, Edit2, X, Camera, Video, Store, Award, Save, CheckCircle, Truck, Clock, Eye, Bell, ShieldCheck, BarChart3, CalendarDays, Filter, MessageSquare, ChevronDown, ChevronRight, User, Mail, Phone, ShoppingBag, XCircle, ChevronLeft, MapPin, CreditCard, FileText, Star, Navigation, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toast } from '../components/Toast';
import { NotificationList } from '../components/NotificationList';
import { MapPicker } from '../components/MapPicker';
import { useChat } from '../context/ChatContext';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { exportOrderToPDF, exportOrdersToPDF } from '../services/pdfService';
import { exportOrdersToCSV } from '../services/csvService';
import { sendOrderStatusUpdateToBuyer } from '../services/emailService';
import { arrayUnion, arrayRemove } from 'firebase/firestore';
import { Map, AdvancedMarker, Pin, useMap } from '@vis.gl/react-google-maps';

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

export const SellerDashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const isFarmer = profile?.role === 'farmer';
  const isRetailer = profile?.role === 'retailer';
  
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders' | 'customers' | 'profile'>('overview');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [buyerProfiles, setBuyerProfiles] = useState<Record<string, any>>({});
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
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
    businessName: '',
    businessType: '',
    farmSize: '',
    isRetail: false,
    isWholesale: false,
    certifications: [] as string[],
    description: ''
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
        businessName: profile.businessName || '',
        businessType: profile.businessType || '',
        farmSize: profile.farmSize || '',
        isRetail: profile.isRetail || false,
        isWholesale: profile.isWholesale || false,
        certifications: profile.certifications || [],
        description: profile.description || ''
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
    detailedDescription: '',
    videoUrl: '',
    features: [] as string[],
    qualities: [] as string[],
    bulkPricing: [] as { minQuantity: number; pricePerUnit: number }[],
    paymentMethods: ['on_delivery'] as ('on_delivery' | 'in_app')[],
    status: 'pending_approval' as Product['status'],
    growingMethod: 'Organic',
    harvestDate: new Date().toISOString().split('T')[0],
    location: { lat: 0, lng: 0, address: '' }
  });

  useEffect(() => {
    if (!user) return;

    const qProducts = query(collection(db, 'products'), where('farmerId', '==', user.uid));
    const unsubscribeProducts = onSnapshot(qProducts, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });

    const qOrders = query(collection(db, 'orders'), where('farmerId', '==', user.uid));
    const unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    const qNotifications = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeNotifications = onSnapshot(qNotifications, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    });

    return () => {
      unsubscribeProducts();
      unsubscribeOrders();
      unsubscribeNotifications();
    };
  }, [user]);

  useEffect(() => {
    const fetchBuyerProfiles = async () => {
      const uniqueBuyerIds = Array.from(new Set(orders.map(o => o.buyerId)));
      
      for (const buyerId of uniqueBuyerIds as string[]) {
        if (!buyerProfiles[buyerId]) {
          try {
            const buyerDoc = await getDoc(doc(db, 'users', buyerId as string));
            if (buyerDoc.exists()) {
              setBuyerProfiles(prev => ({
                ...prev,
                [buyerId as string]: buyerDoc.data()
              }));
            }
          } catch (error) {
            console.error("Error fetching buyer profile:", error);
          }
        }
      }
    };

    if (orders.length > 0) {
      fetchBuyerProfiles();
    }
  }, [orders]);

  const getStatusStep = (status: Order['status']) => {
    switch (status) {
      case 'pending': return 1;
      case 'accepted': return 2;
      case 'fulfilled': return 3;
      case 'completed': return 4;
      case 'declined': return 0;
      default: return 1;
    }
  };

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
      let finalVideoUrl = newProduct.videoUrl;
      
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

      // Upload video if selected
      if (selectedVideoFile) {
        const videoRef = ref(storage, `products/${user.uid}/videos/${Date.now()}_${selectedVideoFile.name}`);
        const videoSnapshot = await uploadBytes(videoRef, selectedVideoFile);
        finalVideoUrl = await getDownloadURL(videoSnapshot.ref);
      }

      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), {
          ...newProduct,
          videoUrl: finalVideoUrl,
          images: imageUrls,
          updatedAt: new Date().toISOString()
        });
        showToast('Product updated successfully');
      } else {
        await addDoc(collection(db, 'products'), {
          ...newProduct,
          videoUrl: finalVideoUrl,
          farmerId: user.uid,
          farmerName: profile.farmName || profile.businessName || profile.displayName,
          createdAt: new Date().toISOString(),
          images: imageUrls
        });
        showToast('Product listed successfully');
      }
      setIsAddModalOpen(false);
      setEditingProduct(null);
      setSelectedFiles([]);
      setImagePreviews([]);
      setSelectedVideoFile(null);
      setVideoPreview(null);
      setNewProduct({
        name: '',
        category: 'Fruits & Vegetables',
        quantity: 0,
        unit: 'kg',
        price: 0,
        description: '',
        detailedDescription: '',
        videoUrl: '',
        features: [],
        qualities: [],
        bulkPricing: [],
        paymentMethods: ['on_delivery'],
        status: 'pending_approval',
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
    setSelectedVideoFile(null);
    setVideoPreview(null);
    setNewProduct({
      name: product.name,
      category: product.category,
      quantity: product.quantity,
      unit: product.unit,
      price: product.price,
      description: product.description,
      detailedDescription: product.detailedDescription || '',
      videoUrl: product.videoUrl || '',
      features: product.features || [],
      qualities: product.qualities || [],
      bulkPricing: product.bulkPricing || [],
      paymentMethods: product.paymentMethods || ['on_delivery'],
      status: product.status || 'draft',
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

  const togglePreferredPartner = async (partnerId: string) => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const isPreferred = profile?.preferredPartners?.includes(partnerId);

    try {
      if (isPreferred) {
        await updateDoc(userRef, {
          preferredPartners: arrayRemove(partnerId)
        });
        showToast('Removed from preferred partners');
      } else {
        await updateDoc(userRef, {
          preferredPartners: arrayUnion(partnerId)
        });
        showToast('Added to preferred partners');
      }
    } catch (error) {
      console.error("Error toggling preferred partner:", error);
      showToast('Failed to update preferred partners', 'error');
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
        newStatus === 'shipped' ? 'shippedAt' :
        newStatus === 'received' ? 'receivedAt' :
        newStatus === 'fulfilled' ? 'fulfilledAt' :
        newStatus === 'completed' ? 'completedAt' :
        newStatus === 'declined' ? 'declinedAt' : null;

      const updateData: any = { status: newStatus };
      if (timestampField) {
        updateData[timestampField] = new Date().toISOString();
      }

      await updateDoc(doc(db, 'orders', orderId), updateData);
      
      // Send email notification to buyer
      if (order.buyerEmail) {
        try {
          await sendOrderStatusUpdateToBuyer(order.buyerEmail, orderId, newStatus, order.farmerName);
        } catch (emailError) {
          console.error("Failed to send email to buyer:", emailError);
        }
      }

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
          farmerName: profile.farmName || profile.businessName || profile.displayName,
          images: [`https://picsum.photos/seed/${p.name.replace(/\s/g, '')}/800/600`],
          harvestDate: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          status: 'approved'
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

  const uniqueCustomers = Array.from(new Set(orders.map(o => o.buyerId))).map((id: string) => {
    const customerOrders = orders.filter(o => o.buyerId === id);
    const totalSpent = customerOrders.reduce((acc, curr) => acc + curr.totalAmount, 0);
    const lastOrderDate = customerOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]?.createdAt;
    return {
      id,
      profile: buyerProfiles[id],
      orderCount: customerOrders.length,
      totalSpent,
      lastOrderDate
    };
  }).filter(c => c.profile);

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'customers', label: 'Customers', icon: User },
    { id: 'profile', label: isFarmer ? 'Farm Profile' : 'Business Profile', icon: Store },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Sidebar Menu */}
      <div className="lg:w-64 flex-shrink-0">
        <div className="bg-white rounded-3xl border border-stone-100 shadow-sm p-4 sticky top-24">
          <div className="space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as any);
                  if (item.id === 'orders') setSelectedOrderId(null);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                  activeTab === item.id
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-stone-500 hover:bg-stone-50 hover:text-stone-700'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-stone-900 capitalize">{activeTab} Dashboard</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-stone-500">
                {activeTab === 'overview' && (isFarmer ? 'Manage your farm listings and orders' : 'Manage your business listings and orders')}
                {activeTab === 'products' && 'Manage your product inventory'}
                {activeTab === 'orders' && 'Track and fulfill your customer orders'}
                {activeTab === 'customers' && 'View and interact with your buyers'}
                {activeTab === 'profile' && (isFarmer ? 'Update your farm details and certifications' : 'Update your business details')}
              </p>
              {profile?.isVerified && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider border border-emerald-100">
                  <ShieldCheck className="w-3 h-3" />
                  Verified
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            {activeTab === 'products' && (
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setSelectedFiles([]);
                  setImagePreviews([]);
                  setSelectedVideoFile(null);
                  setVideoPreview(null);
                  setNewProduct({
                    name: '',
                    category: 'Fruits & Vegetables',
                    quantity: 0,
                    unit: 'kg',
                    price: 0,
                    description: '',
                    detailedDescription: '',
                    videoUrl: '',
                    features: [],
                    qualities: [],
                    bulkPricing: [],
                    paymentMethods: ['on_delivery'],
                    status: 'pending_approval',
                    growingMethod: 'Organic',
                    harvestDate: new Date().toISOString().split('T')[0],
                    location: profile.location || { lat: 0.3476, lng: 32.5825, address: isFarmer ? 'Local Farm' : 'Local Business' }
                  });
                  setIsAddModalOpen(true);
                }}
                className="bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-800 transition-all shadow-lg flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Listing
              </button>
            )}
            {activeTab === 'overview' && (
              <button
                onClick={seedSampleProducts}
                disabled={uploading}
                className="bg-stone-100 text-stone-600 px-6 py-3 rounded-xl font-bold hover:bg-stone-200 transition-all flex items-center gap-2"
              >
                {uploading ? 'Seeding...' : 'Seed Sample Data'}
              </button>
            )}
          </div>
        </div>

        {activeTab === 'overview' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatCard icon={<Package className="w-6 h-6" />} label="Active Listings" value={products.length} color="bg-blue-50 text-blue-600" />
              <StatCard icon={<TrendingUp className="w-6 h-6" />} label="Total Orders" value={orders.length} color="bg-emerald-50 text-emerald-600" />
              <StatCard icon={<DollarSign className="w-6 h-6" />} label="Revenue" value={`$${orders.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0).toFixed(2)}`} color="bg-amber-50 text-amber-600" />
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
          </>
        )}

        {activeTab === 'products' && (
          <div className="bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-stone-100 flex justify-between items-center">
              <h2 className="font-bold text-lg">Product Inventory</h2>
              <div className="flex items-center gap-2 text-xs text-stone-400">
                <Package className="w-4 h-4" />
                <span>{products.length} products listed</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-stone-50 text-stone-400 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Product</th>
                    <th className="px-6 py-4 font-semibold">Category</th>
                    <th className="px-6 py-4 font-semibold">Price</th>
                    <th className="px-6 py-4 font-semibold">Stock</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
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
                            <p className="text-[10px] text-stone-400">ID: {p.id.slice(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-stone-600">{p.category}</span>
                      </td>
                      <td className="px-6 py-4 font-medium text-stone-600">${(p.price || 0).toFixed(2)}/{p.unit}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${p.quantity > 10 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                          {p.quantity} {p.unit}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                          p.status === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                          p.status === 'rejected' ? 'bg-red-50 text-red-700' :
                          p.status === 'pending_approval' ? 'bg-amber-50 text-amber-700' :
                          'bg-stone-100 text-stone-600'
                        }`}>
                          {p.status?.replace('_', ' ') || 'draft'}
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
                      <td colSpan={5} className="px-6 py-12 text-center text-stone-400">No listings yet. Add your first product!</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-6">
            {selectedOrderId ? (
              <SellerOrderDetails 
                orderId={selectedOrderId} 
                onBack={() => setSelectedOrderId(null)} 
                showToast={showToast}
                openChat={openChat}
              />
            ) : (
              <div className="bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-stone-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-bold text-lg">Manage Orders</h2>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => exportOrdersToCSV(filteredOrders, `FarmLink_Orders_${new Date().toISOString().split('T')[0]}.csv`)}
                        className="flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-700 rounded-xl text-xs font-bold hover:bg-stone-200 transition-colors"
                        title="Export to CSV"
                      >
                        <FileText className="w-4 h-4" />
                        Export CSV
                      </button>
                      <button 
                        onClick={() => exportOrdersToPDF(filteredOrders, isFarmer ? 'Farmer Orders Report' : 'Retailer Orders Report')}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        Export PDF
                      </button>
                      <div className="flex items-center gap-2 text-xs text-stone-400">
                        <Filter className="w-3 h-3" />
                        <span>{filteredOrders.length} orders found</span>
                      </div>
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
                <div key={o.id} className="p-4 rounded-2xl bg-stone-50 border border-stone-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm">Order #{o.id.slice(0, 6)}</p>
                      <p className="text-xs text-stone-500">
                        ${(o.totalAmount || 0).toFixed(2)} • {o.items.length} items • 
                        <span className="capitalize"> {o.deliveryMethod}{o.deliveryOption ? ` (${o.deliveryOption})` : ''}</span>
                      </p>
                      <p className="text-[10px] mt-1 font-medium text-stone-400">
                        Delivery Date: {(o.status === 'pending' || o.status === 'accepted') ? (
                          <span className="italic">Not yet scheduled</span>
                        ) : (
                          <span className="text-emerald-600 font-bold">
                            {o.fulfilledAt ? new Date(o.fulfilledAt).toLocaleDateString() : 'Processing...'}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        o.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                        o.status === 'accepted' ? 'bg-blue-100 text-blue-700' :
                        o.status === 'shipped' ? 'bg-orange-100 text-orange-700' :
                        o.status === 'received' ? 'bg-purple-100 text-purple-700' :
                        o.status === 'fulfilled' ? 'bg-emerald-100 text-emerald-700' :
                        o.status === 'completed' ? 'bg-stone-200 text-stone-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {o.status}
                      </span>
                      <button 
                        onClick={() => setExpandedOrderId(expandedOrderId === o.id ? null : o.id)}
                        className="p-1 hover:bg-stone-200 rounded-full transition-colors"
                      >
                        {expandedOrderId === o.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setSelectedOrderId(o.id);
                        setActiveTab('orders');
                      }}
                      className="flex-1 bg-white text-emerald-700 border border-emerald-200 py-2 rounded-lg text-xs font-bold hover:bg-emerald-50 flex items-center justify-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      View Details
                    </button>
                    <button 
                      onClick={() => exportOrderToPDF(o)}
                      className="flex-1 bg-white text-stone-700 border border-stone-200 py-2 rounded-lg text-xs font-bold hover:bg-stone-50 flex items-center justify-center gap-1"
                    >
                      <FileText className="w-3 h-3" />
                      Export PDF
                    </button>
                    <button 
                      onClick={() => openChat(o.buyerId, o.buyerName || 'Buyer')}
                      className="flex-1 bg-white text-stone-700 border border-stone-200 py-2 rounded-lg text-xs font-bold hover:bg-stone-50 flex items-center justify-center gap-1"
                    >
                      <MessageSquare className="w-3 h-3" />
                      Message Buyer
                    </button>
                  </div>

                  <div className="flex gap-2">
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
                        onClick={() => handleUpdateOrderStatus(o.id, 'shipped')}
                        className="flex-1 bg-orange-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-orange-700"
                      >
                        Mark as Shipped
                      </button>
                    )}
                    {o.status === 'shipped' && (
                      <div className="flex-1 flex flex-col gap-1">
                        <button 
                          disabled={true}
                          className="w-full bg-stone-100 text-stone-400 py-2 rounded-lg text-xs font-bold cursor-not-allowed"
                          title="Waiting for buyer to confirm receipt"
                        >
                          Waiting for Receipt
                        </button>
                        <p className="text-[9px] text-stone-400 text-center italic">Buyer must confirm receipt first</p>
                      </div>
                    )}
                    {o.status === 'received' && (
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

                  <AnimatePresence>
                    {expandedOrderId === o.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-6 pt-4 border-t border-stone-200"
                      >
                        {/* Buyer Details */}
                        <div className="space-y-3">
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Buyer Information</h4>
                          <div className="bg-white p-3 rounded-xl border border-stone-100 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 overflow-hidden">
                              {buyerProfiles[o.buyerId]?.photoURL ? (
                                <img src={buyerProfiles[o.buyerId].photoURL} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-5 h-5" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-stone-900 truncate">{o.buyerName}</p>
                              <div className="flex items-center gap-3 mt-0.5">
                                <div className="flex items-center gap-1 text-[10px] text-stone-500">
                                  <Mail className="w-3 h-3" />
                                  <span className="truncate">{buyerProfiles[o.buyerId]?.email || 'No email provided'}</span>
                                </div>
                                {buyerProfiles[o.buyerId]?.phone && (
                                  <div className="flex items-center gap-1 text-[10px] text-stone-500">
                                    <Phone className="w-3 h-3" />
                                    <span>{buyerProfiles[o.buyerId].phone}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Order Items */}
                        <div className="space-y-3">
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Order Items</h4>
                          <div className="bg-white p-3 rounded-xl border border-stone-100 space-y-2">
                            {o.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-sm">
                                <span className="text-stone-600">{item.quantity}x {item.name}</span>
                                <span className="font-bold text-stone-900">${((item.price || 0) * (item.quantity || 0)).toFixed(2)}</span>
                              </div>
                            ))}
                            <div className="pt-2 border-t border-stone-50 flex justify-between font-bold text-emerald-700">
                              <span>Total</span>
                              <span>${(o.totalAmount || 0).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Tracking Timeline */}
                        <div className="space-y-3">
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Order Tracking</h4>
                          <div className="bg-white p-4 rounded-xl border border-stone-100 space-y-4">
                            {[
                              { status: 'pending', label: 'Order Placed', icon: ShoppingBag, date: o.createdAt },
                              { status: 'accepted', label: 'Accepted', icon: CheckCircle, date: o.acceptedAt },
                              { status: 'fulfilled', label: 'Fulfilled', icon: Truck, date: o.fulfilledAt },
                              { status: 'completed', label: 'Completed', icon: Award, date: o.completedAt }
                            ].map((step, idx, arr) => {
                              const isCompleted = !!step.date;
                              const isLast = idx === arr.length - 1;
                              
                              return (
                                <div key={step.status} className="flex gap-3">
                                  <div className="flex flex-col items-center">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-stone-100 text-stone-400'}`}>
                                      <step.icon className="w-3.5 h-3.5" />
                                    </div>
                                    {!isLast && (
                                      <div className={`w-0.5 flex-1 my-1 ${isCompleted && arr[idx+1].date ? 'bg-emerald-100' : 'bg-stone-100'}`} />
                                    )}
                                  </div>
                                  <div className="pb-4">
                                    <p className={`text-xs font-bold ${isCompleted ? 'text-stone-900' : 'text-stone-400'}`}>{step.label}</p>
                                    {step.date && (
                                      <p className="text-[10px] text-stone-500">
                                        {new Date(step.date).toLocaleDateString()} at {new Date(step.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
              {filteredOrders.length === 0 && (
                <div className="text-center py-12 text-stone-400">No orders found matching the filters.</div>
              )}
            </div>
          </div>
        )}
      </div>
    )}

        {activeTab === 'customers' && (
          <div className="bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-stone-100 flex justify-between items-center">
              <h2 className="font-bold text-lg">Your Customers</h2>
              <div className="flex items-center gap-2 text-xs text-stone-400">
                <User className="w-4 h-4" />
                <span>{uniqueCustomers.length} unique buyers</span>
              </div>
            </div>
            <div className="divide-y divide-stone-50">
              {uniqueCustomers.map(customer => (
                <div key={customer.id} className="p-6 flex items-center justify-between hover:bg-stone-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 overflow-hidden border border-stone-200">
                      {customer.profile?.photoURL ? (
                        <img src={customer.profile.photoURL} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-stone-900">{customer.profile?.displayName || 'Anonymous Buyer'}</p>
                      <p className="text-xs text-stone-500">{customer.profile?.email}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          {customer.orderCount} Orders
                        </span>
                        <span className="text-[10px] font-bold text-stone-500">
                          Total Spent: ${(customer.totalSpent || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden md:block">
                      <p className="text-[10px] font-bold text-stone-400 uppercase">Last Order</p>
                      <p className="text-xs text-stone-600">
                        {customer.lastOrderDate ? new Date(customer.lastOrderDate).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <button 
                      onClick={() => togglePreferredPartner(customer.id)}
                      className={`p-3 rounded-xl transition-all shadow-sm border ${
                        profile?.preferredPartners?.includes(customer.id)
                          ? 'bg-yellow-50 text-yellow-600 border-yellow-200'
                          : 'bg-white text-stone-400 border-stone-200 hover:text-yellow-600 hover:border-yellow-200'
                      }`}
                      title={profile?.preferredPartners?.includes(customer.id) ? "Remove from Preferred" : "Add to Preferred"}
                    >
                      <Star className={`w-5 h-5 ${profile?.preferredPartners?.includes(customer.id) ? 'fill-current' : ''}`} />
                    </button>
                    <button 
                      onClick={() => openChat(customer.id, customer.profile?.displayName || 'Buyer')}
                      className="p-3 bg-white border border-stone-200 rounded-xl text-stone-600 hover:text-emerald-700 hover:border-emerald-200 transition-all shadow-sm"
                    >
                      <MessageSquare className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
              {uniqueCustomers.length === 0 && (
                <div className="text-center py-20 text-stone-400">
                  <User className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No customers yet. Your buyers will appear here once they place an order.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm">
            <h2 className="text-xl font-bold text-stone-900 mb-6">{isFarmer ? 'Farm Profile Settings' : 'Business Profile Settings'}</h2>
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2">{isFarmer ? 'Farm Name' : 'Business Name'}</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    value={isFarmer ? farmProfile.farmName : farmProfile.businessName}
                    onChange={(e) => setFarmProfile({ ...farmProfile, [isFarmer ? 'farmName' : 'businessName']: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2">Business Type</label>
                  <select
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    value={farmProfile.businessType}
                    onChange={(e) => setFarmProfile({ ...farmProfile, businessType: e.target.value })}
                  >
                    <option value="">Select type...</option>
                    <option value="Family Farm">Family Farm</option>
                    <option value="Cooperative">Cooperative</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Urban Farm">Urban Farm</option>
                  </select>
                </div>
                {isFarmer && (
                  <div>
                    <label className="block text-sm font-bold text-stone-700 mb-2">Farm Size (e.g. 50 Acres)</label>
                    <input
                      type="text"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      placeholder="e.g. 10 Hectares, 5 Acres"
                      value={farmProfile.farmSize}
                      onChange={(e) => setFarmProfile({ ...farmProfile, farmSize: e.target.value })}
                    />
                  </div>
                )}
                <div className="flex flex-col gap-4">
                  <label className="block text-sm font-bold text-stone-700">Business Model</label>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${farmProfile.isRetail ? 'bg-emerald-600 border-emerald-600' : 'bg-white border-stone-300'}`}>
                        {farmProfile.isRetail && <CheckCircle className="w-3 h-3 text-white" />}
                      </div>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={farmProfile.isRetail}
                        onChange={(e) => setFarmProfile({ ...farmProfile, isRetail: e.target.checked })}
                      />
                      <span className="text-sm font-medium text-stone-600">Retail</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${farmProfile.isWholesale ? 'bg-emerald-600 border-emerald-600' : 'bg-white border-stone-300'}`}>
                        {farmProfile.isWholesale && <CheckCircle className="w-3 h-3 text-white" />}
                      </div>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={farmProfile.isWholesale}
                        onChange={(e) => setFarmProfile({ ...farmProfile, isWholesale: e.target.checked })}
                      />
                      <span className="text-sm font-medium text-stone-600">Wholesale</span>
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">{isFarmer ? 'About the Farm (Description)' : 'About the Business'}</label>
                <textarea
                  rows={4}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder={isFarmer ? "Tell your story, your farming philosophy, and what makes your produce special..." : "Tell your story, your business philosophy, and what makes your products special..."}
                  value={farmProfile.description}
                  onChange={(e) => setFarmProfile({ ...farmProfile, description: e.target.value })}
                />
              </div>

              {isFarmer && (
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2">Certifications</label>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      placeholder="e.g. USDA Organic, Fair Trade"
                      value={newCert}
                      onChange={(e) => setNewCert(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={addCertification}
                      className="bg-stone-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-stone-800 transition-all"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {farmProfile.certifications.map((cert) => (
                      <span
                        key={cert}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-100"
                      >
                        {cert}
                        <button
                          type="button"
                          onClick={() => removeCertification(cert)}
                          className="hover:text-emerald-900"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full bg-emerald-700 text-white py-4 rounded-xl font-bold hover:bg-emerald-800 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        )}
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
                setSelectedVideoFile(null);
                setVideoPreview(null);
                setNewProduct({
                  name: '',
                  category: 'Fruits & Vegetables',
                  quantity: 0,
                  unit: 'kg',
                  price: 0,
                  description: '',
                  detailedDescription: '',
                  videoUrl: '',
                  features: [],
                  qualities: [],
                  bulkPricing: [],
                  paymentMethods: ['on_delivery'],
                  status: 'pending_approval',
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
                    setSelectedVideoFile(null);
                    setVideoPreview(null);
                    setNewProduct({
                      name: '',
                      category: 'Fruits & Vegetables',
                      quantity: 0,
                      unit: 'kg',
                      price: 0,
                      description: '',
                      detailedDescription: '',
                      videoUrl: '',
                      features: [],
                      qualities: [],
                      bulkPricing: [],
                      paymentMethods: ['on_delivery'],
                      status: 'pending_approval',
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
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-stone-700">Video URL (YouTube/Vimeo)</label>
                    <input
                      type="url"
                      className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="https://youtube.com/..."
                      value={newProduct.videoUrl}
                      onChange={e => setNewProduct({...newProduct, videoUrl: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-stone-700">Upload Product Video</label>
                    <div className="relative">
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        id="video-upload"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setSelectedVideoFile(file);
                            setVideoPreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                      <label
                        htmlFor="video-upload"
                        className="flex items-center gap-2 w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 cursor-pointer hover:bg-stone-100 transition-colors"
                      >
                        <Video className="w-5 h-5 text-stone-400" />
                        <span className="text-sm text-stone-600">
                          {selectedVideoFile ? selectedVideoFile.name : 'Choose video file...'}
                        </span>
                      </label>
                      {videoPreview && (
                        <div className="mt-2 relative rounded-xl overflow-hidden border border-stone-200 aspect-video bg-black">
                          <video src={videoPreview} className="w-full h-full" controls />
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedVideoFile(null);
                              setVideoPreview(null);
                            }}
                            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-stone-700">Status</label>
                    <select
                      className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      value={newProduct.status}
                      onChange={e => setNewProduct({...newProduct, status: e.target.value as any})}
                    >
                      <option value="draft">Draft</option>
                      <option value="pending_approval">Submit for Approval</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-stone-700">Short Description</label>
                  <textarea
                    rows={2}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Brief summary..."
                    value={newProduct.description}
                    onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-stone-700">Detailed Description</label>
                  <div className="rich-text-editor">
                    <ReactQuill
                      theme="snow"
                      value={newProduct.detailedDescription}
                      onChange={(content) => setNewProduct({ ...newProduct, detailedDescription: content })}
                      placeholder="Full details about your product, how it's grown, etc..."
                      modules={{
                        toolbar: [
                          [{ 'header': [1, 2, false] }],
                          ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                          [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                          ['link', 'clean']
                        ],
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-stone-700">Features (comma separated)</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Organic, Non-GMO, Pesticide-free"
                      value={newProduct.features.join(', ')}
                      onChange={e => setNewProduct({...newProduct, features: e.target.value.split(',').map(s => s.trim())})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-stone-700">Qualities (comma separated)</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Sweet, Juicy, Firm"
                      value={newProduct.qualities.join(', ')}
                      onChange={e => setNewProduct({...newProduct, qualities: e.target.value.split(',').map(s => s.trim())})}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-bold text-stone-700">Product Location (Pin on Map)</label>
                  <div className="border border-stone-200 rounded-2xl overflow-hidden">
                    <MapPicker 
                      mapId="PRODUCT_LOCATION_MAP"
                      initialPos={newProduct.location.lat ? { lat: newProduct.location.lat, lng: newProduct.location.lng } : undefined}
                      onSelect={(pin) => setNewProduct({ ...newProduct, location: pin })} 
                    />
                  </div>
                  {newProduct.location.address && (
                    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                      <Navigation className="w-4 h-4" />
                      <span className="text-xs font-medium">Location: {newProduct.location.address}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-bold text-stone-700">Payment Methods</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        const methods = newProduct.paymentMethods.includes('on_delivery')
                          ? newProduct.paymentMethods.filter(m => m !== 'on_delivery')
                          : [...newProduct.paymentMethods, 'on_delivery'];
                        setNewProduct({...newProduct, paymentMethods: methods as any});
                      }}
                      className={`flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                        newProduct.paymentMethods.includes('on_delivery')
                          ? 'bg-emerald-50 border-emerald-600 text-emerald-700 shadow-sm'
                          : 'bg-stone-50 border-stone-100 text-stone-400 hover:border-stone-200'
                      }`}
                    >
                      <Truck className="w-5 h-5" />
                      <span className="font-bold text-sm">On Delivery</span>
                      {newProduct.paymentMethods.includes('on_delivery') && <CheckCircle className="w-4 h-4 ml-auto" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const methods = newProduct.paymentMethods.includes('in_app')
                          ? newProduct.paymentMethods.filter(m => m !== 'in_app')
                          : [...newProduct.paymentMethods, 'in_app'];
                        setNewProduct({...newProduct, paymentMethods: methods as any});
                      }}
                      className={`flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                        newProduct.paymentMethods.includes('in_app')
                          ? 'bg-emerald-50 border-emerald-600 text-emerald-700 shadow-sm'
                          : 'bg-stone-50 border-stone-100 text-stone-400 hover:border-stone-200'
                      }`}
                    >
                      <CreditCard className="w-5 h-5" />
                      <span className="font-bold text-sm">In-App Payment</span>
                      {newProduct.paymentMethods.includes('in_app') && <CheckCircle className="w-4 h-4 ml-auto" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-bold text-stone-700">Bulk Pricing</label>
                    <button 
                      type="button"
                      onClick={() => setNewProduct({
                        ...newProduct, 
                        bulkPricing: [...newProduct.bulkPricing, { minQuantity: 0, pricePerUnit: 0 }]
                      })}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
                    >
                      + Add Bulk Price
                    </button>
                  </div>
                  {newProduct.bulkPricing.map((bp, idx) => (
                    <div key={idx} className="grid grid-cols-3 gap-4 items-end bg-stone-50 p-4 rounded-xl border border-stone-100">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-stone-400 uppercase">Min Qty</label>
                        <input 
                          type="number"
                          className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm"
                          value={bp.minQuantity}
                          onChange={e => {
                            const newBP = [...newProduct.bulkPricing];
                            newBP[idx].minQuantity = parseInt(e.target.value);
                            setNewProduct({...newProduct, bulkPricing: newBP});
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-stone-400 uppercase">Price/Unit</label>
                        <input 
                          type="number"
                          step="0.01"
                          className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm"
                          value={bp.pricePerUnit}
                          onChange={e => {
                            const newBP = [...newProduct.bulkPricing];
                            newBP[idx].pricePerUnit = parseFloat(e.target.value);
                            setNewProduct({...newProduct, bulkPricing: newBP});
                          }}
                        />
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          const newBP = newProduct.bulkPricing.filter((_, i) => i !== idx);
                          setNewProduct({...newProduct, bulkPricing: newBP});
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
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

const SellerOrderDetails: React.FC<{ 
  orderId: string; 
  onBack: () => void; 
  showToast: (msg: string, type?: 'success' | 'error') => void;
  openChat: (userId: string, userName: string) => void;
}> = ({ orderId, onBack, showToast, openChat }) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [buyerProfile, setBuyerProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'orders', orderId), (docSnap) => {
      if (docSnap.exists()) {
        const orderData = { id: docSnap.id, ...docSnap.data() } as Order;
        setOrder(orderData);
        
        // Fetch buyer profile
        getDoc(doc(db, 'users', orderData.buyerId)).then(profileSnap => {
          if (profileSnap.exists()) {
            setBuyerProfile(profileSnap.data() as UserProfile);
          }
        });
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [orderId]);

  const updateStatus = async (newStatus: Order['status'], additionalData: any = {}) => {
    if (!order) return;
    setUpdating(true);
    try {
      const updateData: any = { status: newStatus, ...additionalData };
      const timestamp = new Date().toISOString();

      if (newStatus === 'accepted') updateData.acceptedAt = timestamp;
      if (newStatus === 'shipped') updateData.shippedAt = timestamp;
      if (newStatus === 'received') updateData.receivedAt = timestamp;
      if (newStatus === 'fulfilled') updateData.fulfilledAt = timestamp;
      if (newStatus === 'completed') updateData.completedAt = timestamp;
      if (newStatus === 'declined') updateData.declinedAt = timestamp;

      await updateDoc(doc(db, 'orders', order.id), updateData);

      await addDoc(collection(db, 'notifications'), {
        userId: order.buyerId,
        title: 'Order Update',
        message: `Your order #${order.id.slice(-8).toUpperCase()} is now ${newStatus}.`,
        type: 'order_status',
        relatedId: order.id,
        read: false,
        createdAt: timestamp
      });

      showToast(`Order marked as ${newStatus}`);
    } catch (error) {
      console.error("Error updating order:", error);
      showToast('Failed to update order status', 'error');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700"></div></div>;
  if (!order) return <div className="text-center py-12 text-stone-400">Order not found.</div>;

  const timeline = [
    { status: 'pending', label: 'Order Placed', date: order.createdAt, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
    { status: 'accepted', label: 'Accepted', date: order.acceptedAt, icon: CheckCircle, color: 'text-blue-500', bg: 'bg-blue-50' },
    { status: 'shipped', label: 'Shipped', date: order.shippedAt, icon: Truck, color: 'text-orange-500', bg: 'bg-orange-50' },
    { status: 'received', label: 'Received by Buyer', date: order.receivedAt, icon: Package, color: 'text-purple-500', bg: 'bg-purple-50' },
    { status: 'fulfilled', label: 'Fulfilled', date: order.fulfilledAt, icon: Truck, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { status: 'completed', label: 'Completed', date: order.completedAt, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  ];

  if (order.status === 'declined') {
    timeline.push({ status: 'declined', label: 'Declined', date: order.declinedAt, icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' });
  }

  const subtotal = order.items.reduce((acc, item) => acc + (item.price || 0) * (item.quantity || 0), 0);
  const total = subtotal + (order.deliveryFee || 0);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors mb-4 group"
      >
        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        <span className="font-medium">Back to Orders List</span>
      </button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Order Details</h1>
          <p className="text-stone-500 font-mono text-sm">#{order.id.toUpperCase()}</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => exportOrderToPDF(order)}
            className="flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-700 rounded-xl text-xs font-bold hover:bg-stone-200 transition-colors"
          >
            <FileText className="w-4 h-4" />
            Export PDF
          </button>
          <div className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider w-fit ${
            order.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
            order.status === 'pending' ? 'bg-amber-50 text-amber-700' :
            order.status === 'shipped' ? 'bg-orange-50 text-orange-700' :
            order.status === 'received' ? 'bg-purple-50 text-purple-700' :
            order.status === 'declined' ? 'bg-red-50 text-red-700' :
            'bg-blue-50 text-blue-700'
          }`}>
            {order.status}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Timeline */}
          <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-600" />
              Order Tracking
            </h2>
            <div className="relative space-y-8">
              {timeline.filter(t => t.date).map((step, index, arr) => (
                <div key={step.status} className="flex gap-4 relative">
                  {index < arr.length - 1 && (
                    <div className="absolute left-5 top-10 bottom-[-2rem] w-0.5 bg-stone-100"></div>
                  )}
                  <div className={`w-10 h-10 rounded-full ${step.bg} ${step.color} flex items-center justify-center flex-shrink-0 z-10`}>
                    <step.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-stone-900">{step.label}</p>
                    <p className="text-sm text-stone-500">
                      {new Date(step.date!).toLocaleDateString()} at {new Date(step.date!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Items */}
          <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-600" />
              Order Items
            </h2>
            <div className="divide-y divide-stone-50">
              {order.items.map((item, idx) => (
                <div key={idx} className="py-4 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-stone-900">{item.name}</p>
                    <p className="text-sm text-stone-500">{item.quantity} units x ${(item.price || 0).toFixed(2)}</p>
                  </div>
                  <p className="font-bold text-stone-900">${((item.quantity || 0) * (item.price || 0)).toFixed(2)}</p>
                </div>
              ))}
              <div className="pt-4 space-y-2">
                <div className="flex justify-between text-stone-500 text-sm">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-stone-500 text-sm">
                  <span>Delivery Fee</span>
                  <span>${(order.deliveryFee || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-stone-900 pt-2 border-t border-stone-50">
                  <span>Total</span>
                  <span className="text-emerald-700">${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          {order.status !== 'completed' && order.status !== 'declined' && (
            <div className="bg-emerald-50 p-8 rounded-3xl border border-emerald-100">
              <h2 className="text-lg font-bold text-emerald-900 mb-4">Update Order Status</h2>
              <div className="flex flex-wrap gap-4">
                {order.status === 'pending' && (
                  <>
                    <button 
                      onClick={() => updateStatus('accepted')}
                      disabled={updating}
                      className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-md flex items-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Accept Order
                    </button>
                    <button 
                      onClick={() => updateStatus('declined')}
                      disabled={updating}
                      className="bg-white text-red-600 border border-red-100 px-6 py-3 rounded-2xl font-bold hover:bg-red-50 transition-all"
                    >
                      Decline Order
                    </button>
                  </>
                )}
                {order.status === 'accepted' && (
                  <button 
                    onClick={() => {
                      const tracking = prompt("Enter tracking number (optional):");
                      const carrier = prompt("Enter carrier name (optional):");
                      updateStatus('shipped', { trackingNumber: tracking || '', carrier: carrier || '' });
                    }}
                    disabled={updating}
                    className="bg-orange-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-orange-700 transition-all shadow-md flex items-center gap-2"
                  >
                    <Truck className="w-5 h-5" />
                    Mark as Shipped
                  </button>
                )}
                {order.status === 'shipped' && (
                  <div className="flex flex-col gap-2">
                    <button 
                      disabled={true}
                      className="bg-stone-100 text-stone-400 px-6 py-3 rounded-2xl font-bold cursor-not-allowed flex items-center gap-2"
                    >
                      <Clock className="w-5 h-5" />
                      Waiting for Buyer Receipt
                    </button>
                    <p className="text-sm text-stone-500 italic">The buyer must confirm they have received the products before you can mark this as fulfilled.</p>
                  </div>
                )}
                {order.status === 'received' && (
                  <button 
                    onClick={() => updateStatus('fulfilled')}
                    disabled={updating}
                    className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-md flex items-center gap-2"
                  >
                    <Truck className="w-5 h-5" />
                    Mark as Fulfilled
                  </button>
                )}
                {order.status === 'fulfilled' && (
                  <button 
                    onClick={() => updateStatus('completed')}
                    disabled={updating}
                    className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-md flex items-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Mark as Completed
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-8">
          {/* Customer Details */}
          <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-600" />
              Customer Details
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0 overflow-hidden border border-stone-50">
                  {buyerProfile?.photoURL ? (
                    <img src={buyerProfile.photoURL} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-6 h-6 text-stone-400" />
                  )}
                </div>
                <div>
                  <p className="font-bold text-stone-900">{buyerProfile?.displayName || order.buyerName}</p>
                  <p className="text-xs text-stone-500">Buyer</p>
                </div>
              </div>
              <div className="space-y-3 pt-4 border-t border-stone-50">
                <div className="flex items-center gap-3 text-stone-600">
                  <Mail className="w-4 h-4" />
                  <span className="text-sm">{buyerProfile?.email || order.buyerEmail}</span>
                </div>
                {(buyerProfile?.phone || order.buyerPhone) && (
                  <div className="flex items-center gap-3 text-stone-600">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">{buyerProfile?.phone || order.buyerPhone}</span>
                  </div>
                )}
                <button 
                  onClick={() => openChat(order.buyerId, buyerProfile?.displayName || order.buyerName)}
                  className="w-full mt-2 bg-stone-50 text-stone-700 py-3 rounded-xl font-bold hover:bg-stone-100 transition-all flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  Message Buyer
                </button>
              </div>
            </div>
          </div>

          {/* Delivery Info */}
          <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Truck className="w-5 h-5 text-emerald-600" />
              Delivery Info
            </h2>
            <div className="space-y-6">
              <div>
                <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Method</p>
                <div className="flex items-center gap-2 text-stone-900 font-bold">
                  {order.deliveryMethod === 'delivery' ? <Truck className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                  <span className="capitalize">{order.deliveryMethod}</span>
                  {order.deliveryOption && (
                    <span className="text-xs font-normal text-stone-500">({order.deliveryOption})</span>
                  )}
                </div>
              </div>

              {order.deliveryMethod === 'delivery' && (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Address</p>
                    <div className="flex items-start gap-2 text-stone-900">
                      <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-1" />
                      <div className="space-y-1">
                        <p className="text-sm font-bold">{order.deliveryAddress || 'No address provided'}</p>
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
                              <div className="mt-2 p-3 bg-stone-50 rounded-xl border border-stone-100 italic">
                                "{order.deliveryDetails.directionsNarrative}"
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {order.deliveryDetails?.googlePin && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">Pinned Location</p>
                      <div className="h-48 rounded-2xl overflow-hidden border border-stone-100 relative group">
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

              <div>
                <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Payment</p>
                <div className="flex items-center gap-2 text-stone-900 font-bold">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm">{order.paymentMethod}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

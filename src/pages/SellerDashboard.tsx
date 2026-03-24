import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, orderBy, getDoc, deleteDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Product, Order, Notification } from '../types';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { Plus, BarChart3, Package, ShoppingBag, User, Store, ShieldCheck } from 'lucide-react';
import { Toast } from '../components/Toast';
import { useChat } from '../context/ChatContext';
import { exportOrdersToPDF } from '../services/pdfService';
import { exportOrdersToCSV } from '../services/csvService';
import { sendOrderStatusUpdateToBuyer } from '../services/emailService';

// Sub-components
import { OverviewTab } from '../components/SellerDashboard/OverviewTab';
import { ProductsTab } from '../components/SellerDashboard/ProductsTab';
import { OrdersTab } from '../components/SellerDashboard/OrdersTab';
import { SellerOrderDetails } from '../components/SellerDashboard/SellerOrderDetails';
import { CustomersTab } from '../components/SellerDashboard/CustomersTab';
import { ProfileTab } from '../components/SellerDashboard/ProfileTab';
import { ProductModal } from '../components/SellerDashboard/ProductModal';

export const SellerDashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const isFarmer = profile?.role === 'farmer';
  
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders' | 'customers' | 'profile'>('overview');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [buyerProfiles, setBuyerProfiles] = useState<Record<string, any>>({});
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
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
      
      if (selectedFiles.length > 0) {
        const uploadPromises = selectedFiles.map(async (file) => {
          const storageRef = ref(storage, `products/${user.uid}/${Date.now()}_${file.name}`);
          const snapshot = await uploadBytes(storageRef, file);
          return getDownloadURL(snapshot.ref);
        });
        const newUrls = await Promise.all(uploadPromises);
        imageUrls = [...imageUrls, ...newUrls];
      }

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
        harvestDate: new Date().toISOString().split('T')[0],
        location: { lat: 0, lng: 0, address: '' }
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
      harvestDate: product.harvestDate || new Date().toISOString().split('T')[0],
      location: product.location || { lat: 0, lng: 0, address: '' }
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
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStr = d.toISOString().slice(0, 7);
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
      
      if (order.buyerEmail) {
        try {
          await sendOrderStatusUpdateToBuyer(order.buyerEmail, orderId, newStatus, order.farmerName);
        } catch (emailError) {
          console.error("Failed to send email to buyer:", emailError);
        }
      }

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
          <OverviewTab 
            products={products} 
            orders={orders} 
            chartView={chartView} 
            setChartView={setChartView} 
            chartData={getChartData()} 
          />
        )}

        {activeTab === 'products' && (
          <ProductsTab 
            products={products} 
            onEdit={handleEditProduct} 
            onDelete={handleDeleteProduct} 
          />
        )}

        {activeTab === 'orders' && !selectedOrderId && (
          <OrdersTab 
            orders={filteredOrders} 
            orderStatusFilter={orderStatusFilter} 
            setOrderStatusFilter={setOrderStatusFilter} 
            orderStartDate={orderStartDate} 
            setOrderStartDate={setOrderStartDate} 
            orderEndDate={orderEndDate} 
            setOrderEndDate={setOrderEndDate} 
            onViewDetails={setSelectedOrderId} 
            onExportCSV={() => exportOrdersToCSV(filteredOrders)} 
            onExportPDF={() => exportOrdersToPDF(filteredOrders)} 
          />
        )}

        {activeTab === 'orders' && selectedOrderId && (
          <SellerOrderDetails 
            orderId={selectedOrderId} 
            onBack={() => setSelectedOrderId(null)} 
            showToast={showToast} 
            openChat={(id, name) => openChat(id, name)} 
          />
        )}

        {activeTab === 'customers' && (
          <CustomersTab 
            customers={uniqueCustomers} 
            onTogglePreferred={togglePreferredPartner} 
            onChat={(id) => {
              const customer = uniqueCustomers.find(c => c.id === id);
              if (customer) openChat(id, customer.profile.displayName);
            }} 
            preferredPartners={profile?.preferredPartners || []} 
          />
        )}

        {activeTab === 'profile' && (
          <ProfileTab 
            farmProfile={farmProfile} 
            setFarmProfile={setFarmProfile} 
            isFarmer={isFarmer} 
            onSubmit={handleUpdateProfile} 
            newCert={newCert} 
            setNewCert={setNewCert} 
            addCertification={addCertification} 
            removeCertification={removeCertification} 
          />
        )}
      </div>

      <ProductModal 
        isOpen={isAddModalOpen} 
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingProduct(null);
        }} 
        editingProduct={editingProduct} 
        newProduct={newProduct} 
        setNewProduct={setNewProduct} 
        handleAddProduct={handleAddProduct} 
        uploading={uploading} 
        handleFileChange={handleFileChange} 
        removeSelectedImage={removeSelectedImage} 
        imagePreviews={imagePreviews} 
        selectedVideoFile={selectedVideoFile} 
        setSelectedVideoFile={setSelectedVideoFile} 
        videoPreview={videoPreview} 
        setVideoPreview={setVideoPreview} 
      />

      <Toast 
        message={toast.message} 
        type={toast.type} 
        isVisible={toast.isVisible} 
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} 
      />
    </div>
  );
};

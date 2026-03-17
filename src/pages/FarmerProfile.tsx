import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Product } from '../types';
import { MapPin, Award, Package, ArrowLeft, ShoppingCart, Check, ExternalLink, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';
import { useCart } from '../context/CartContext';
import { useChat } from '../context/ChatContext';

export const FarmerProfile: React.FC = () => {
  const { farmerId } = useParams<{ farmerId: string }>();
  const [farmer, setFarmer] = useState<UserProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart, items } = useCart();
  const { openChat } = useChat();

  useEffect(() => {
    const fetchFarmerData = async () => {
      if (!farmerId) return;
      
      try {
        // Fetch farmer profile
        const farmerDoc = await getDoc(doc(db, 'users', farmerId));
        if (farmerDoc.exists()) {
          setFarmer(farmerDoc.data() as UserProfile);
        }

        // Fetch farmer products
        const q = query(collection(db, 'products'), where('farmerId', '==', farmerId));
        const productsSnap = await getDocs(q);
        setProducts(productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
      } catch (error) {
        console.error("Error fetching farmer profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFarmerData();
  }, [farmerId]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-700"></div>
      </div>
    );
  }

  if (!farmer) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-4">Farmer not found</h2>
        <Link to="/marketplace" className="text-emerald-700 font-bold hover:underline flex items-center justify-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="relative h-64 md:h-80 rounded-3xl overflow-hidden shadow-2xl">
        <img 
          src={`https://picsum.photos/seed/${farmer.uid}/1200/400?blur=2`} 
          alt="Farm Cover" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 p-8 flex items-end gap-6">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl border-4 border-white overflow-hidden bg-white shadow-lg">
            <img 
              src={farmer.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${farmer.displayName}`} 
              alt={farmer.displayName} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="text-white pb-2">
            <h1 className="text-3xl md:text-4xl font-bold mb-1">{farmer.farmName || farmer.displayName}</h1>
            <div className="flex items-center gap-2 text-emerald-100">
              <MapPin className="w-4 h-4" />
              <span className="text-sm font-medium">{farmer.location?.address || 'Local Farm'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Sidebar Info */}
        <div className="space-y-8">
          <section className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-600" />
              About the Farm
            </h2>
            <p className="text-stone-600 leading-relaxed mb-6">
              {farmer.businessType || 'Passionate local farmer providing fresh, high-quality agricultural products directly to the community.'}
            </p>
            
            {farmer.certifications && farmer.certifications.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-4">Certifications</h3>
                <div className="flex flex-wrap gap-2">
                  {farmer.certifications.map((cert, idx) => (
                    <span key={idx} className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">
                      {cert}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="bg-emerald-900 text-white p-8 rounded-3xl shadow-xl">
            <h2 className="text-xl font-bold mb-4">Contact Information</h2>
            <p className="text-emerald-100 text-sm mb-6">Reach out for bulk orders or farm visits.</p>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-800 rounded-lg">
                  <ExternalLink className="w-4 h-4" />
                </div>
                <span className="text-sm">{farmer.email}</span>
              </div>
              <button 
                onClick={() => openChat(farmer.uid, farmer.farmName || farmer.displayName)}
                className="w-full bg-emerald-800 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                Message Farmer
              </button>
            </div>
          </section>
        </div>

        {/* Products Grid */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Package className="w-6 h-6 text-emerald-600" />
              Available Produce
            </h2>
            <span className="text-stone-400 text-sm font-medium">{products.length} Items</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {products.map(product => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                key={product.id}
                className="bg-white rounded-2xl border border-stone-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden"
              >
                <div className="aspect-video bg-stone-100 relative overflow-hidden">
                  <img
                    src={product.images?.[0] || `https://picsum.photos/seed/${product.id}/400/300`}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-emerald-700 shadow-sm">
                    {product.category}
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-stone-900">{product.name}</h3>
                    <p className="text-emerald-700 font-bold">${product.price.toFixed(2)}<span className="text-xs text-stone-400 font-normal">/{product.unit}</span></p>
                  </div>
                  <p className="text-stone-500 text-sm line-clamp-2 mb-4">{product.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-400 uppercase tracking-tighter">{product.growingMethod}</span>
                    <button
                      onClick={() => addToCart(product, 1)}
                      className={`p-2 rounded-lg transition-all ${
                        items.find(i => i.id === product.id)
                          ? 'bg-emerald-700 text-white'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-700 hover:text-white'
                      }`}
                    >
                      {items.find(i => i.id === product.id) ? <Check className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {products.length === 0 && (
            <div className="text-center py-20 bg-stone-50 rounded-3xl border border-dashed border-stone-200">
              <p className="text-stone-400">No products currently listed by this farm.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

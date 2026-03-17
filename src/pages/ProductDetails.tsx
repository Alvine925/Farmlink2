import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';
import { Product } from '../types';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useChat } from '../context/ChatContext';
import { 
  ShoppingBag, 
  Heart, 
  MapPin, 
  Clock, 
  Calendar, 
  ChevronLeft, 
  Star, 
  ShieldCheck, 
  Truck, 
  Info,
  Plus,
  Minus,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toast } from '../components/Toast';

export const ProductDetails: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const { user, profile } = useAuth();
  const { addToCart } = useCart();
  const { openChat } = useChat();
  const navigate = useNavigate();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type, isVisible: true });
  };

  useEffect(() => {
    const fetchProduct = async () => {
      if (!productId) return;
      try {
        const docSnap = await getDoc(doc(db, 'products', productId));
        if (docSnap.exists()) {
          setProduct({ id: docSnap.id, ...docSnap.data() } as Product);
        } else {
          navigate('/marketplace');
        }
      } catch (error) {
        console.error("Error fetching product:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId, navigate]);

  useEffect(() => {
    if (profile && productId) {
      setIsFavorite(profile.favorites?.includes(productId) || false);
    }
  }, [profile, productId]);

  const handleToggleFavorite = async () => {
    if (!user || !productId) {
      navigate('/login');
      return;
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      if (isFavorite) {
        await updateDoc(userRef, {
          favorites: arrayRemove(productId)
        });
        showToast('Removed from favorites');
      } else {
        await updateDoc(userRef, {
          favorites: arrayUnion(productId)
        });
        showToast('Added to favorites');
      }
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error("Error toggling favorite:", error);
      showToast('Failed to update favorites', 'error');
    }
  };

  const handleAddToCart = () => {
    if (product) {
      addToCart(product, quantity);
      showToast(`${product.name} added to cart`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-700"></div>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors mb-8 group"
      >
        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        <span className="font-medium">Back to Marketplace</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Image Gallery */}
        <div className="space-y-4">
          <div className="aspect-square rounded-3xl overflow-hidden bg-stone-100 border border-stone-100 shadow-sm relative">
            <img 
              src={product.images[activeImage] || `https://picsum.photos/seed/${product.id}/800/800`} 
              alt={product.name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <button 
              onClick={handleToggleFavorite}
              className={`absolute top-6 right-6 p-4 rounded-2xl shadow-xl transition-all ${
                isFavorite ? 'bg-red-500 text-white' : 'bg-white text-stone-400 hover:text-red-500'
              }`}
            >
              <Heart className={`w-6 h-6 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
          </div>
          
          {product.images.length > 1 && (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {product.images.map((img, idx) => (
                <button 
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  className={`w-24 h-24 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${
                    activeImage === idx ? 'border-emerald-500 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider">
                {product.category}
              </span>
              <span className="px-3 py-1 rounded-full bg-stone-100 text-stone-600 text-xs font-bold uppercase tracking-wider">
                {product.growingMethod}
              </span>
            </div>
            <h1 className="text-4xl font-bold text-stone-900 mb-2">{product.name}</h1>
            <div className="flex items-center gap-4 text-stone-500">
              <Link to={`/farmer/${product.farmerId}`} className="flex items-center gap-1 hover:text-emerald-700 transition-colors">
                <Star className="w-4 h-4 text-amber-400 fill-current" />
                <span className="font-medium">{product.farmerName}</span>
              </Link>
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>{product.location?.address || 'Local Farm'}</span>
              </span>
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-emerald-700">${product.price.toFixed(2)}</span>
            <span className="text-stone-400 font-medium">per {product.unit}</span>
          </div>

          <p className="text-stone-600 leading-relaxed text-lg">
            {product.description}
          </p>

          <div className="grid grid-cols-2 gap-6 py-6 border-y border-stone-100">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-stone-50 text-stone-400">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Harvest Date</p>
                <p className="text-sm font-bold text-stone-700">{new Date(product.harvestDate).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-stone-50 text-stone-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Availability</p>
                <p className="text-sm font-bold text-stone-700">{product.quantity} {product.unit} left</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-6">
              <div className="flex items-center border border-stone-200 rounded-2xl p-1">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-3 text-stone-400 hover:text-stone-900 transition-colors"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <span className="w-12 text-center font-bold text-lg">{quantity}</span>
                <button 
                  onClick={() => setQuantity(Math.min(product.quantity, quantity + 1))}
                  className="p-3 text-stone-400 hover:text-stone-900 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-stone-400">
                Total: <span className="font-bold text-stone-900">${(product.price * quantity).toFixed(2)}</span>
              </p>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={handleAddToCart}
                className="flex-1 bg-emerald-700 text-white py-4 rounded-2xl font-bold text-lg hover:bg-emerald-800 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-5 h-5" />
                Add to Cart
              </button>
              <button 
                onClick={() => openChat(product.farmerId, product.farmerName)}
                className="flex-1 bg-white text-emerald-700 border border-emerald-700 py-4 rounded-2xl font-bold text-lg hover:bg-emerald-50 transition-all flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-5 h-5" />
                Message Farmer
              </button>
            </div>
          </div>

          <div className="bg-stone-50 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-sm text-stone-600">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span>Quality guaranteed by AgriDirect Verified Farmers</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-stone-600">
              <Truck className="w-5 h-5 text-emerald-600" />
              <span>Direct delivery from the farm to your location</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-stone-600">
              <Info className="w-5 h-5 text-emerald-600" />
              <span>Support local agriculture and sustainable farming</span>
            </div>
          </div>
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

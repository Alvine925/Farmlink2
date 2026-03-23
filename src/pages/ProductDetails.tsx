import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, query, where, onSnapshot, addDoc, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Product, Review, Order, UserProfile } from '../types';
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
  MessageSquare,
  User,
  Video,
  Play,
  CreditCard,
  Navigation
} from 'lucide-react';
import { Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { motion, AnimatePresence } from 'motion/react';
import { ReviewModal } from '../components/ReviewModal';
import { Toast } from '../components/Toast';

export const ProductDetails: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const { user, profile } = useAuth();
  const { addToCart } = useCart();
  const { openChat } = useChat();
  const navigate = useNavigate();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [farmer, setFarmer] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
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
          const productData = { id: docSnap.id, ...docSnap.data() } as Product;
          setProduct(productData);
          setQuantity(productData.quantity > 0 ? 1 : 0);
          
          // Fetch farmer profile
          const farmerSnap = await getDoc(doc(db, 'users', productData.farmerId));
          if (farmerSnap.exists()) {
            setFarmer({ uid: farmerSnap.id, ...farmerSnap.data() } as UserProfile);
          }
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
    if (!productId) return;
    const q = query(
      collection(db, 'reviews'),
      where('productId', '==', productId),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review)));
    });
    return () => unsubscribe();
  }, [productId]);

  useEffect(() => {
    const checkPurchase = async () => {
      if (!user || !productId) return;
      try {
        const q = query(
          collection(db, 'orders'),
          where('buyerId', '==', user.uid),
          where('status', '==', 'completed')
        );
        const snapshot = await getDocs(q);
        const orders = snapshot.docs.map(doc => doc.data() as Order);
        const purchased = orders.some(order => order.items.some(item => item.productId === productId));
        setHasPurchased(purchased);
      } catch (error) {
        console.error("Error checking purchase status:", error);
      }
    };
    checkPurchase();
  }, [user, productId]);

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

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !productId) return;
    if (!newReview.comment.trim()) {
      showToast('Please enter a comment', 'error');
      return;
    }

    setSubmittingReview(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        productId,
        buyerId: user.uid,
        buyerName: profile.displayName,
        buyerPhoto: profile.photoURL,
        rating: newReview.rating,
        comment: newReview.comment.trim(),
        createdAt: new Date().toISOString()
      });
      setNewReview({ rating: 5, comment: '' });
      showToast('Review submitted successfully');
    } catch (error) {
      console.error("Error submitting review:", error);
      showToast('Failed to submit review', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  const averageRating = reviews.length > 0 
    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length 
    : 0;

  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const getVimeoId = (url: string) => {
    const regExp = /vimeo\.com\/(?:video\/)?(\d+)/;
    const match = url.match(regExp);
    return match ? match[1] : null;
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
              {reviews.length > 0 && (
                <div className="flex items-center gap-1.5 pr-4 border-r border-stone-200">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star} 
                        className={`w-3.5 h-3.5 ${star <= Math.round(averageRating) ? 'text-amber-400 fill-current' : 'text-stone-200'}`} 
                      />
                    ))}
                  </div>
                  <span className="text-sm font-bold text-stone-900">{(averageRating || 0).toFixed(1)}</span>
                  <span className="text-xs text-stone-400">({reviews.length})</span>
                </div>
              )}
              <Link to={`/farmer/${product.farmerId}`} className="flex items-center gap-1 hover:text-emerald-700 transition-colors">
                <span className="font-medium">{product.farmerName}</span>
                {farmer?.isVerified && (
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                )}
              </Link>
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>{product.location?.address || 'Local Farm'}</span>
              </span>
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-emerald-700">${(product.price || 0).toFixed(2)}</span>
            <span className="text-stone-400 font-medium">per {product.unit}</span>
          </div>

          <p className="text-stone-600 leading-relaxed text-lg">
            {product.description}
          </p>

          {product.detailedDescription && (
            <div className="mt-8 pt-8 border-t border-stone-100">
              <h3 className="text-xl font-bold text-stone-900 mb-4">Product Story & Details</h3>
              <div 
                className="prose prose-stone max-w-none text-stone-600 detailed-description"
                dangerouslySetInnerHTML={{ __html: product.detailedDescription }}
              />
            </div>
          )}

          {product.videoUrl && (
            <div className="py-6 border-t border-stone-100">
              <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2 mb-4">
                <Video className="w-5 h-5 text-emerald-600" />
                Product Video
              </h3>
              <div className="aspect-video rounded-3xl overflow-hidden bg-black shadow-lg border border-stone-100 relative group">
                {product.videoUrl.includes('youtube.com') || product.videoUrl.includes('youtu.be') ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${getYouTubeId(product.videoUrl)}`}
                    className="w-full h-full"
                    allowFullScreen
                    title="Product Video"
                  />
                ) : product.videoUrl.includes('vimeo.com') ? (
                  <iframe
                    src={`https://player.vimeo.com/video/${getVimeoId(product.videoUrl)}`}
                    className="w-full h-full"
                    allowFullScreen
                    title="Product Video"
                  />
                ) : (
                  <video src={product.videoUrl} className="w-full h-full" controls />
                )}
              </div>
            </div>
          )}

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
              <div className="flex items-center border border-stone-200 rounded-2xl p-1 bg-white">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1 || product.quantity === 0}
                  className="p-3 text-stone-400 hover:text-stone-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <span className="w-12 text-center font-bold text-lg text-stone-900">
                  {product.quantity === 0 ? 0 : quantity}
                </span>
                <button 
                  onClick={() => setQuantity(Math.min(product.quantity, quantity + 1))}
                  disabled={quantity >= product.quantity || product.quantity === 0}
                  className="p-3 text-stone-400 hover:text-stone-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-col">
                <p className="text-sm text-stone-400">
                  Total: <span className="font-bold text-stone-900">${((product.price || 0) * (quantity || 0)).toFixed(2)}</span>
                </p>
                {product.quantity <= 5 && product.quantity > 0 && (
                  <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider mt-1">
                    Only {product.quantity} left in stock!
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={handleAddToCart}
                disabled={product.quantity === 0}
                className="flex-1 bg-emerald-700 text-white py-4 rounded-2xl font-bold text-lg hover:bg-emerald-800 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:bg-stone-400 disabled:cursor-not-allowed"
              >
                <ShoppingBag className="w-5 h-5" />
                {product.quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
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
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                Farmer's Location
              </h3>
              {farmer?.location?.lat && farmer?.location?.lng && (
                <a 
                  href={`https://www.google.com/maps/dir/?api=1&destination=${farmer.location.lat},${farmer.location.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 transition-colors"
                >
                  <Navigation className="w-3 h-3" />
                  Get Directions
                </a>
              )}
            </div>
            
            {farmer?.location?.lat && farmer?.location?.lng ? (
              <div className="h-64 rounded-2xl overflow-hidden border border-stone-100 shadow-sm">
                <Map
                  defaultCenter={{ lat: farmer.location.lat, lng: farmer.location.lng }}
                  defaultZoom={13}
                  mapId="PRODUCT_VIEW_MAP"
                  gestureHandling={'greedy'}
                  disableDefaultUI={true}
                >
                  <AdvancedMarker position={{ lat: farmer.location.lat, lng: farmer.location.lng }}>
                    <Pin background="#10b981" glyphColor="#fff" borderColor="#065f46" />
                  </AdvancedMarker>
                </Map>
              </div>
            ) : (
              <div className="h-64 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400 border border-dashed border-stone-200">
                <p className="text-sm">Location coordinates not available</p>
              </div>
            )}

            <div className="flex items-center gap-3 text-sm text-stone-600 pt-4 border-t border-stone-200">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span>Quality guaranteed by FarmLink Verified Farmers</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-stone-600">
              <Truck className="w-5 h-5 text-emerald-600" />
              <span>Direct delivery from the farm to your location</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-stone-600">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              <span>Accepted Payments: {product.paymentMethods?.map(m => m === 'on_delivery' ? 'On Delivery' : 'In-App').join(', ') || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-stone-600">
              <Info className="w-5 h-5 text-emerald-600" />
              <span>Support local agriculture and sustainable farming</span>
            </div>
          </div>

          {/* Farmer Card */}
          {farmer && (
            <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-stone-900 uppercase tracking-wider">Meet the Farmer</h4>
                <Link 
                  to={`/farmer/${product.farmerId}`}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  View Profile
                </Link>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-stone-100 overflow-hidden border-2 border-white shadow-sm">
                  {farmer.photoURL ? (
                    <img src={farmer.photoURL} alt={farmer.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-400">
                      <User className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h5 className="font-bold text-stone-900">{farmer.displayName}</h5>
                    {farmer.isVerified && (
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    )}
                  </div>
                  <p className="text-xs text-stone-500 line-clamp-1">{farmer.description || 'Passionate local farmer dedicated to sustainable agriculture.'}</p>
                  <div className="flex items-center gap-1 mt-1 text-stone-400">
                    <MapPin className="w-3 h-3" />
                    <span className="text-[10px] font-medium">{farmer.location?.address || 'Local Farm'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reviews Section */}
      <div className="mt-16 pt-16 border-t border-stone-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
          <div>
            <h2 className="text-3xl font-bold text-stone-900 mb-2">Customer Reviews</h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star 
                    key={star} 
                    className={`w-5 h-5 ${star <= Math.round(averageRating) ? 'text-amber-400 fill-current' : 'text-stone-200'}`} 
                  />
                ))}
              </div>
              <span className="text-lg font-bold text-stone-900">{(averageRating || 0).toFixed(1)}</span>
              <span className="text-stone-400 font-medium">({reviews.length} reviews)</span>
            </div>
          </div>

          {hasPurchased && !reviews.some(r => r.buyerId === user?.uid) && (
            <div className="bg-emerald-50 p-8 rounded-3xl flex-1 max-w-md border border-emerald-100 shadow-sm">
              <h3 className="font-bold text-emerald-900 mb-2 text-lg">Share your experience</h3>
              <p className="text-emerald-700 text-sm mb-6">Your feedback helps other buyers and supports our local sellers.</p>
              <button
                onClick={() => setShowReviewModal(true)}
                className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
              >
                <Star className="w-4 h-4 fill-current" />
                Write a Review
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {reviews.map((review) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              key={review.id} 
              className="bg-stone-50 p-6 rounded-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-stone-200 overflow-hidden">
                    {review.buyerPhoto ? (
                      <img src={review.buyerPhoto} alt={review.buyerName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-400">
                        <User className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-stone-900 text-sm">{review.buyerName}</p>
                    <p className="text-[10px] text-stone-400 font-medium">{new Date(review.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star} 
                        className={`w-3 h-3 ${star <= review.rating ? 'text-amber-400 fill-current' : 'text-stone-200'}`} 
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 rounded-full">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Verified</span>
                  </div>
                </div>
              </div>
              <p className="text-stone-600 text-sm italic leading-relaxed">
                "{review.comment}"
              </p>
            </motion.div>
          ))}
          {reviews.length === 0 && (
            <div className="col-span-full text-center py-16 bg-stone-50 rounded-3xl border border-dashed border-stone-200">
              <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-stone-300" />
              </div>
              <p className="text-stone-400 font-medium">No reviews yet. Be the first to share your experience!</p>
            </div>
          )}
        </div>
      </div>
      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        targetId={productId!}
        targetType="product"
        targetName={product.name}
        onSuccess={() => {
          // The onSnapshot will handle the update automatically
        }}
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

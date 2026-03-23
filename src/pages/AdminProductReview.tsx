import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Product, UserProfile } from '../types';
import { 
  ArrowLeft, CheckCircle, XCircle, Package, Eye, 
  Award, CreditCard, Clock, MapPin, Tag, User, ShieldCheck
} from 'lucide-react';
import { motion } from 'motion/react';
import { Toast } from '../components/Toast';

export const AdminProductReview: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [farmer, setFarmer] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
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
        const docRef = doc(db, 'products', productId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const productData = { id: docSnap.id, ...docSnap.data() } as Product;
          setProduct(productData);
          
          // Fetch farmer profile
          if (productData.farmerId) {
            const farmerSnap = await getDoc(doc(db, 'users', productData.farmerId));
            if (farmerSnap.exists()) {
              setFarmer({ uid: farmerSnap.id, ...farmerSnap.data() } as UserProfile);
            }
          }
        } else {
          showToast('Product not found', 'error');
          setTimeout(() => navigate('/admin'), 2000);
        }
      } catch (error) {
        console.error("Error fetching product:", error);
        showToast('Error loading product', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId, navigate]);

  const approveProduct = async () => {
    if (!product) return;
    try {
      await updateDoc(doc(db, 'products', product.id), {
        status: 'approved'
      });
      showToast('Product approved successfully');
      setTimeout(() => navigate('/admin'), 1500);
    } catch (error) {
      showToast('Failed to approve product', 'error');
    }
  };

  const rejectProduct = async () => {
    if (!product) return;
    try {
      await updateDoc(doc(db, 'products', product.id), {
        status: 'rejected'
      });
      showToast('Product rejected');
      setTimeout(() => navigate('/admin'), 1500);
    } catch (error) {
      showToast('Failed to reject product', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="min-h-screen bg-stone-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={() => navigate('/admin')}
          className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors mb-8 group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-bold">Back to Dashboard</span>
        </button>

        <div className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden">
          {/* Header */}
          <div className="p-8 border-b border-stone-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  product.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                  product.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {product.status?.replace('_', ' ') || 'pending'}
                </span>
                <span className="text-stone-400 text-xs font-medium">#{product.id.slice(-8).toUpperCase()}</span>
              </div>
              <h1 className="text-3xl font-bold text-stone-900">{product.name}</h1>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={approveProduct}
                className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg flex items-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Approve
              </button>
              <button 
                onClick={rejectProduct}
                className="px-6 py-3 bg-white text-red-600 border border-red-100 rounded-2xl font-bold hover:bg-red-50 transition-all flex items-center gap-2"
              >
                <XCircle className="w-5 h-5" />
                Reject
              </button>
            </div>
          </div>

          <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Left Column: Images & Media */}
            <div className="space-y-6">
              <div className="aspect-video rounded-2xl bg-stone-100 overflow-hidden border border-stone-100 shadow-inner">
                {product.images?.[0] ? (
                  <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-300">
                    <Package className="w-16 h-16" />
                  </div>
                )}
              </div>
              
              {product.images && product.images.length > 1 && (
                <div className="grid grid-cols-4 gap-3">
                  {product.images.slice(1).map((img, i) => (
                    <div key={i} className="aspect-square rounded-xl bg-stone-100 overflow-hidden border border-stone-100">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}

              {product.videoUrl && (
                <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-100">
                  <h4 className="text-sm font-bold text-emerald-900 uppercase tracking-wider mb-4">Video Presentation</h4>
                  <a 
                    href={product.videoUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex items-center justify-between p-4 rounded-xl bg-white border border-emerald-200 text-emerald-700 hover:shadow-md transition-all group"
                  >
                    <span className="text-sm font-bold">Watch Video Tour</span>
                    <Eye className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </a>
                </div>
              )}

              {/* Farmer Info */}
              {farmer && (
                <div className="p-6 rounded-2xl bg-stone-50 border border-stone-100 space-y-4">
                  <h4 className="text-sm font-bold text-stone-900 uppercase tracking-wider">Farmer Information</h4>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-stone-200 overflow-hidden border-2 border-white shadow-sm">
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
                      <p className="text-xs text-stone-500">{farmer.email}</p>
                      <Link 
                        to={`/farmer/${farmer.id}`}
                        className="text-xs font-bold text-emerald-600 hover:text-emerald-700 mt-1 inline-block"
                      >
                        View Public Profile
                      </Link>
                    </div>
                  </div>
                  {farmer.location && (
                    <div className="flex items-start gap-2 text-stone-600 bg-white p-3 rounded-xl border border-stone-100">
                      <MapPin className="w-4 h-4 mt-0.5 text-stone-400" />
                      <span className="text-xs leading-relaxed">{farmer.location.address}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Column: Details */}
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100">
                  <div className="flex items-center gap-2 text-stone-400 mb-1">
                    <Tag className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Price</span>
                  </div>
                  <p className="text-xl font-bold text-stone-900">${product.price}<span className="text-sm text-stone-400 font-medium">/{product.unit}</span></p>
                </div>
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100">
                  <div className="flex items-center gap-2 text-stone-400 mb-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Stock</span>
                  </div>
                  <p className="text-xl font-bold text-stone-900">{product.quantity} <span className="text-sm text-stone-400 font-medium">{product.unit}</span></p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-stone-900 uppercase tracking-wider">Product Description</h4>
                <div className="prose prose-stone prose-sm max-w-none">
                  <p className="text-stone-600 leading-relaxed bg-stone-50 p-6 rounded-2xl border border-stone-100">
                    {product.description}
                  </p>
                </div>
              </div>

              {product.detailedDescription && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-stone-900 uppercase tracking-wider">Detailed Information</h4>
                  <div 
                    className="prose prose-sm prose-stone max-w-none text-stone-600 bg-stone-50 p-6 rounded-2xl border border-stone-100 detailed-description"
                    dangerouslySetInnerHTML={{ __html: product.detailedDescription }}
                  />
                </div>
              )}

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-stone-900 uppercase tracking-wider">Features & Qualities</h4>
                <div className="flex flex-wrap gap-2">
                  {product.features?.map((f, i) => (
                    <span key={i} className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider border border-emerald-100">{f}</span>
                  ))}
                  {product.qualities?.map((q, i) => (
                    <span key={i} className="px-4 py-2 rounded-xl bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider border border-blue-100">{q}</span>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-stone-900 uppercase tracking-wider">Logistics & Payments</h4>
                <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-stone-500">Accepted Payments</span>
                    <span className="text-sm font-bold text-stone-900">{product.paymentMethods?.map(m => m.replace('_', ' ')).join(', ') || 'Standard'}</span>
                  </div>
                  {product.bulkPricing && product.bulkPricing.length > 0 && (
                    <div className="pt-4 border-t border-stone-200">
                      <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">Bulk Pricing Tiers</p>
                      <div className="space-y-2">
                        {product.bulkPricing.map((bp, i) => (
                          <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-white border border-stone-100">
                            <span className="text-sm text-stone-600">Min {bp.minQuantity} {product.unit}</span>
                            <span className="text-sm font-bold text-emerald-700">${bp.pricePerUnit}/{product.unit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
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

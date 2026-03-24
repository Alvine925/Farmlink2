import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Video, CheckCircle, Navigation, Truck, CreditCard, Trash2, Camera } from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { MapPicker } from '../MapPicker';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingProduct: any;
  newProduct: any;
  setNewProduct: (product: any) => void;
  handleAddProduct: (e: React.FormEvent) => void;
  uploading: boolean;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeSelectedImage: (index: number) => void;
  imagePreviews: string[];
  selectedVideoFile: File | null;
  setSelectedVideoFile: (file: File | null) => void;
  videoPreview: string | null;
  setVideoPreview: (preview: string | null) => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  editingProduct,
  newProduct,
  setNewProduct,
  handleAddProduct,
  uploading,
  handleFileChange,
  removeSelectedImage,
  imagePreviews,
  selectedVideoFile,
  setSelectedVideoFile,
  videoPreview,
  setVideoPreview
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-stone-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold">{editingProduct ? 'Edit Listing' : 'Add New Listing'}</h2>
              <button 
                onClick={onClose} 
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
                        ? newProduct.paymentMethods.filter((m: string) => m !== 'on_delivery')
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
                        ? newProduct.paymentMethods.filter((m: string) => m !== 'in_app')
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
                {newProduct.bulkPricing.map((bp: any, idx: number) => (
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
                        const newBP = newProduct.bulkPricing.filter((_: any, i: number) => i !== idx);
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
                  {editingProduct?.images?.map((url: string, idx: number) => (
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
  );
};

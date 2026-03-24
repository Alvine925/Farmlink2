import React from 'react';
import { Package, Edit2, Trash2 } from 'lucide-react';
import { Product } from '../../types';

interface ProductsTabProps {
  products: Product[];
  handleEditProduct: (product: Product) => void;
  handleDeleteProduct: (id: string) => void;
}

export const ProductsTab: React.FC<ProductsTabProps> = ({
  products,
  handleEditProduct,
  handleDeleteProduct
}) => {
  return (
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
                      <img 
                        src={p.images?.[0] || `https://picsum.photos/seed/${p.id}/100/100`} 
                        alt={p.name} 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer" 
                      />
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
                    <button 
                      onClick={() => handleDeleteProduct(p.id)} 
                      className="p-2 text-stone-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-stone-400">No listings yet. Add your first product!</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

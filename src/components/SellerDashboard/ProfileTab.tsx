import React from 'react';
import { CheckCircle, X, Save } from 'lucide-react';

interface ProfileTabProps {
  isFarmer: boolean;
  farmProfile: any;
  setFarmProfile: (profile: any) => void;
  handleUpdateProfile: (e: React.FormEvent) => void;
  newCert: string;
  setNewCert: (cert: string) => void;
  addCertification: () => void;
  removeCertification: (cert: string) => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  isFarmer,
  farmProfile,
  setFarmProfile,
  handleUpdateProfile,
  newCert,
  setNewCert,
  addCertification,
  removeCertification
}) => {
  return (
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
              {farmProfile.certifications.map((cert: string) => (
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
  );
};

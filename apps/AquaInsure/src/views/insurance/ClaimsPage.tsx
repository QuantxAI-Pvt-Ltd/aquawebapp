'use client';

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
  Camera,
  X,
  IndianRupee,
  Calendar,
  Waves,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import axios from '@/lib/api';
import BottomNav from '@/components/BottomNav';
import { fileToBase64, uploadToSeaweedFS, resolveMediaUrl } from '@/lib/fileUtils';

const EASE = [0.16, 1, 0.3, 1] as const;

interface ClaimPolicy {
  _id: string;
  insuranceType: string;
  species: string;
  stockingDate: string;
  stockingDensity: number;
  insurancePeriodDays: number;
  status: string;
  pondId?: {
    _id: string;
    name: string;
    pondNumber: number;
    dimensionAcres?: number;
    address?: { district?: string; taluk?: string; village?: string };
  };
  farmId?: {
    _id: string;
    name: string;
    state?: string;
    district?: string;
  };
  claim?: {
    claimedAt: string;
    reason: string;
    description: string;
    estimatedLossPercent: number;
    evidencePhoto?: { url: string } | string;
    status: 'pending' | 'under_review' | 'approved' | 'rejected';
    reviewedAt?: string;
    reviewerNotes?: string;
    settlementAmount?: number;
  };
}

const REASON_LABELS: Record<string, string> = {
  disease_outbreak: 'Disease Outbreak (WSSV / EHP / EMS)',
  mass_mortality: 'Sudden Mass Mortality',
  flooding_calamity: 'Flooding / Calamity',
  water_toxicity: 'Water Toxicity / Crash',
  other: 'Other Incident',
};

export default function ClaimsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [claims, setClaims] = useState<ClaimPolicy[]>([]);
  const [activePolicies, setActivePolicies] = useState<ClaimPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPolicyId, setSelectedPolicyId] = useState('');
  const [claimReason, setClaimReason] = useState('mass_mortality');
  const [lossPercent, setLossPercent] = useState(50);
  const [description, setDescription] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [farmerId, setFarmerId] = useState<string>('');

  const loadData = async (fId: string) => {
    try {
      setLoading(true);
      const [claimsRes, policiesRes] = await Promise.all([
        axios.get(`/api/insurances/claims?farmerId=${fId}`),
        axios.get(`/api/insurances?farmerId=${fId}`),
      ]);

      setClaims(claimsRes.data.data || []);
      const policies = policiesRes.data.data || [];
      setActivePolicies(policies.filter((p: ClaimPolicy) => p.status === 'active'));
    } catch (err) {
      console.error('Error fetching claims:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem('aqua-session') || '{}');
    if (!session.farmerId) {
      navigate('/login', { replace: true });
      return;
    }
    setFarmerId(session.farmerId);
    loadData(session.farmerId);
  }, [navigate]);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
    }
  };

  const handleFileClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPolicyId) {
      toast.error('Please select an active policy to file a claim on.');
      return;
    }

    try {
      setSubmitting(true);
      toast.loading('Submitting insurance claim...', { id: 'claim-save' });

      let evidencePhotoUrl: string | null = null;
      if (photoFile) {
        const uploaded = await uploadToSeaweedFS(photoFile, `farmers/${farmerId}/claims`);
        evidencePhotoUrl = uploaded?.key || uploaded?.url || null;
      } else if (photoPreview) {
        evidencePhotoUrl = photoPreview;
      }

      const res = await axios.post(`/api/insurances/${selectedPolicyId}/claim`, {
        reason: claimReason,
        description,
        estimatedLossPercent: lossPercent,
        evidencePhoto: evidencePhotoUrl,
      });

      if (res.data.success) {
        toast.dismiss('claim-save');
        toast.success('Insurance claim submitted successfully!');
        setIsModalOpen(false);
        setSelectedPolicyId('');
        setDescription('');
        setPhotoFile(null);
        setPhotoPreview(null);
        setLossPercent(50);
        await loadData(farmerId);
      }
    } catch (err: unknown) {
      toast.dismiss('claim-save');
      console.error('Claim submission failed:', err);
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : (err as Error).message;
      toast.error(msg || 'Failed to submit claim. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredClaims = claims.filter((c) => {
    const cStatus = c.claim?.status || 'pending';
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return cStatus === 'pending' || cStatus === 'under_review';
    if (activeTab === 'approved') return cStatus === 'approved';
    if (activeTab === 'rejected') return cStatus === 'rejected';
    return true;
  });

  return (
    <div className="min-h-[100dvh] bg-stone-50 pb-0 overflow-x-clip flex flex-col" style={{ fontFamily: "'Sora', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');`}</style>

      {/* Header */}
      <div
        className="px-5 pt-8 pb-7 rounded-b-[2.5rem] relative overflow-hidden"
        style={{
          background: 'linear-gradient(140deg,#1c4a3e 0%,#1c6b5a 45%,#2d9b7f 100%)',
          boxShadow: '0 8px 32px -6px rgba(28,74,62,0.28)',
        }}
      >
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/15 text-white border border-white/20 hover:bg-white/25 transition-all touch-manipulation"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">Insurance Claims</h1>
              <p className="text-xs text-white/70">File and monitor claim status</p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-white/85 px-2.5 py-1 bg-white/12 rounded-lg border border-white/15">
            Aqua <span className="text-amber-300">AI</span>nsure
          </span>
        </div>
      </div>

      <div className="px-4 mt-4">
        {/* Quick Action: File New Claim */}
        <div className="flex items-center justify-between bg-white rounded-2xl p-4 border border-stone-100 shadow-sm mb-4">
          <div>
            <h2 className="text-sm font-bold text-stone-800">Experienced a loss?</h2>
            <p className="text-xs text-stone-500">File an incident claim on your active policy</p>
          </div>
          <button
            onClick={() => {
              if (activePolicies.length > 0) {
                setSelectedPolicyId(activePolicies[0]._id);
              }
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition shadow-sm touch-manipulation"
          >
            <Plus size={16} />
            <span>File Claim</span>
          </button>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex bg-stone-200/70 p-1 rounded-xl mb-4 text-xs font-semibold text-stone-600">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-lg capitalize transition-all touch-manipulation ${
                activeTab === tab
                  ? 'bg-white text-teal-800 shadow-sm font-bold'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              {tab === 'pending' ? 'Under Review' : tab}
            </button>
          ))}
        </div>

        {/* Claims List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-stone-400">
            <Clock className="w-8 h-8 animate-spin text-teal-600 mb-2" />
            <p className="text-sm">Loading claims...</p>
          </div>
        ) : filteredClaims.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-stone-100 text-center shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-6 h-6 text-teal-600" />
            </div>
            <h3 className="text-stone-800 font-bold text-sm mb-1">No Claims in this Category</h3>
            <p className="text-xs text-stone-500 max-w-xs mx-auto mb-4">
              {activeTab === 'all'
                ? "You haven't filed any insurance claims. Your active policies are protected."
                : `There are currently no claims marked as "${activeTab}".`}
            </p>
            {activePolicies.length > 0 && activeTab === 'all' && (
              <button
                onClick={() => {
                  setSelectedPolicyId(activePolicies[0]._id);
                  setIsModalOpen(true);
                }}
                className="px-4 py-2 bg-teal-600 text-white text-xs font-semibold rounded-xl shadow-sm hover:bg-teal-700 transition"
              >
                File Claim Now
              </button>
            )}
          </div>
        ) : (
          filteredClaims.map((item, idx) => {
            const claim = item.claim;
            const cStatus = claim?.status || 'pending';
            const evidenceUrl = resolveMediaUrl(claim?.evidencePhoto);

            return (
              <motion.div
                key={item._id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ease: EASE, duration: 0.4, delay: idx * 0.05 }}
                className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm mb-3.5 relative overflow-hidden"
              >
                {/* Status bar accent */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1 ${
                    cStatus === 'approved'
                      ? 'bg-emerald-500'
                      : cStatus === 'rejected'
                      ? 'bg-rose-500'
                      : 'bg-amber-500'
                  }`}
                />

                <div className="flex items-start justify-between gap-2 mb-3 pt-1">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        cStatus === 'approved'
                          ? 'bg-emerald-50 border border-emerald-200 text-emerald-600'
                          : cStatus === 'rejected'
                          ? 'bg-rose-50 border border-rose-200 text-rose-600'
                          : 'bg-amber-50 border border-amber-200 text-amber-600'
                      }`}
                    >
                      {cStatus === 'approved' ? (
                        <CheckCircle2 size={20} />
                      ) : cStatus === 'rejected' ? (
                        <XCircle size={20} />
                      ) : (
                        <Clock size={20} />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-stone-800">
                        {item.pondId?.name || `Pond ${item.pondId?.pondNumber || ''}`}
                      </h4>
                      <p className="text-[11px] text-stone-400 flex items-center gap-1">
                        <Waves size={12} />
                        {item.farmId?.name || 'Farm'} · {item.species}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                      cStatus === 'approved'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : cStatus === 'rejected'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {cStatus === 'approved'
                      ? 'Approved'
                      : cStatus === 'rejected'
                      ? 'Rejected'
                      : 'Under Review'}
                  </span>
                </div>

                {/* Claim Highlights */}
                <div className="bg-stone-50 rounded-xl p-3 border border-stone-100 text-xs mb-3 grid grid-cols-2 gap-2.5">
                  <div>
                    <span className="text-[9px] uppercase font-bold tracking-wider text-stone-400 block mb-0.5">
                      Reported Cause
                    </span>
                    <span className="font-semibold text-stone-800">
                      {REASON_LABELS[claim?.reason || ''] || claim?.reason || 'Incident Reported'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold tracking-wider text-stone-400 block mb-0.5">
                      Estimated Loss
                    </span>
                    <span className="font-bold text-rose-600">
                      {claim?.estimatedLossPercent || 0}% Mortality
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold tracking-wider text-stone-400 block mb-0.5">
                      Filing Date
                    </span>
                    <span className="text-stone-700">
                      {claim?.claimedAt ? new Date(claim.claimedAt).toLocaleDateString() : 'Recent'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold tracking-wider text-stone-400 block mb-0.5">
                      Policy Plan
                    </span>
                    <span className="text-stone-700 capitalize">
                      {item.insuranceType} Coverage
                    </span>
                  </div>
                </div>

                {/* Settlement Banner for Approved Claims */}
                {cStatus === 'approved' && (
                  <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                        ₹
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">
                          Settlement Approved
                        </p>
                        <p className="text-xs text-emerald-700">Direct credit to registered bank account</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-extrabold text-emerald-900">
                        ₹{Number(claim?.settlementAmount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                )}

                {/* Description & Reviewer Notes */}
                {claim?.description && (
                  <div className="mb-2">
                    <p className="text-[10px] uppercase font-bold text-stone-400 tracking-wider mb-0.5">
                      Farmer Observation
                    </p>
                    <p className="text-xs text-stone-700 bg-stone-50/50 p-2 rounded-lg border border-stone-100">
                      {claim.description}
                    </p>
                  </div>
                )}

                {claim?.reviewerNotes && (
                  <div className="mb-2">
                    <p className="text-[10px] uppercase font-bold text-stone-400 tracking-wider mb-0.5">
                      Insurance Inspector Notes
                    </p>
                    <p className="text-xs text-stone-800 bg-amber-50/60 p-2 rounded-lg border border-amber-100">
                      {claim.reviewerNotes}
                    </p>
                  </div>
                )}

                {/* Photo Evidence Preview */}
                {evidenceUrl && (
                  <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-stone-600 flex items-center gap-1.5">
                      <FileText size={14} className="text-teal-600" />
                      Incident Evidence Photo
                    </span>
                    <button
                      onClick={() => setPreviewImage(evidenceUrl)}
                      className="text-xs text-teal-700 font-bold hover:underline"
                    >
                      View Photo
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </div>

      {/* Claim Submission Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ ease: EASE, duration: 0.3 }}
              className="bg-white rounded-t-[2rem] sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 pb-[max(1.5rem,calc(1rem+env(safe-area-inset-bottom,0px)))] shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                    <ShieldAlert size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-800">File Insurance Claim</h3>
                    <p className="text-[11px] text-stone-400">Step 1 of 1 · Incident Notice</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-stone-100 text-stone-500 flex items-center justify-center hover:bg-stone-200"
                >
                  <X size={16} />
                </button>
              </div>

              {activePolicies.length === 0 ? (
                <div className="text-center py-6">
                  <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-stone-800">No Active Policies</p>
                  <p className="text-xs text-stone-500 mt-1 mb-4">
                    You do not currently have any active insurance policies eligible for filing a claim.
                  </p>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <form onSubmit={handleFileClaim} className="space-y-4">
                  {/* Select Insured Policy */}
                  <div>
                    <label className="text-[11px] uppercase font-bold text-stone-500 tracking-wider block mb-1.5">
                      Select Insured Pond Policy
                    </label>
                    <select
                      value={selectedPolicyId}
                      onChange={(e) => setSelectedPolicyId(e.target.value)}
                      required
                      className="w-full text-base sm:text-xs font-medium bg-stone-50 border border-stone-200 rounded-xl p-3 focus:outline-none focus:border-teal-600"
                    >
                      {activePolicies.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.pondId?.name || `Pond ${p.pondId?.pondNumber || ''}`} ({p.insuranceType.toUpperCase()} · {p.species})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Primary Cause */}
                  <div>
                    <label className="text-[11px] uppercase font-bold text-stone-500 tracking-wider block mb-1.5">
                      Primary Cause of Loss
                    </label>
                    <select
                      value={claimReason}
                      onChange={(e) => setClaimReason(e.target.value)}
                      className="w-full text-base sm:text-xs font-medium bg-stone-50 border border-stone-200 rounded-xl p-3 focus:outline-none focus:border-teal-600"
                    >
                      <option value="mass_mortality">Sudden Mass Mortality</option>
                      <option value="disease_outbreak">Disease Outbreak (WSSV / EHP / EMS)</option>
                      <option value="water_toxicity">Water Quality Crash / Toxic Spike</option>
                      <option value="flooding_calamity">Flooding / Heavy Storm Influx</option>
                      <option value="other">Other Accidental Loss</option>
                    </select>
                  </div>

                  {/* Estimated Loss % */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[11px] uppercase font-bold text-stone-500 tracking-wider">
                        Estimated Mortality / Crop Loss
                      </label>
                      <span className="text-xs font-extrabold text-teal-700">{lossPercent}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="5"
                      value={lossPercent}
                      onChange={(e) => setLossPercent(Number(e.target.value))}
                      className="w-full accent-teal-600"
                    />
                    <div className="flex justify-between text-[10px] text-stone-400 font-semibold px-0.5">
                      <span>10% (Partial)</span>
                      <span>50%</span>
                      <span>100% (Total)</span>
                    </div>
                  </div>

                  {/* Observations */}
                  <div>
                    <label className="text-[11px] uppercase font-bold text-stone-500 tracking-wider block mb-1.5">
                      Incident Observations
                    </label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe what you observed in the pond (e.g. erratic swimming, check-tray mortality count, color change)..."
                      className="w-full text-base sm:text-xs bg-stone-50 border border-stone-200 rounded-xl p-3 focus:outline-none focus:border-teal-600"
                    />
                  </div>

                  {/* Photo Evidence */}
                  <div>
                    <label className="text-[11px] uppercase font-bold text-stone-500 tracking-wider block mb-1.5">
                      Photo Evidence (Check Tray / Shrimp / Pond)
                    </label>
                    {photoPreview ? (
                      <div className="relative rounded-xl overflow-hidden border border-stone-200 h-32 bg-stone-100 flex items-center justify-center">
                        <img src={resolveMediaUrl(photoPreview) || photoPreview} alt="Evidence Preview" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setPhotoPreview(null)}
                          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center gap-1.5 p-4 border-2 border-dashed border-stone-300 rounded-xl bg-stone-50 hover:bg-stone-100 cursor-pointer transition touch-manipulation">
                        <Camera size={22} className="text-teal-600" />
                        <span className="text-xs font-semibold text-stone-700">Take Photo or Upload Evidence</span>
                        <span className="text-[10px] text-stone-400">JPG, PNG up to 10MB</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handlePhotoSelect}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full h-12 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs uppercase tracking-wider transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2 touch-manipulation"
                    >
                      {submitting ? (
                        <>
                          <Clock size={16} className="animate-spin" />
                          <span>Submitting Claim...</span>
                        </>
                      ) : (
                        <span>Submit Claim for Inspection</span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Image Zoom Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={() => setPreviewImage(null)}
          >
            <div className="relative max-w-xl max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl bg-black">
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black z-10"
              >
                <X size={18} />
              </button>
              <img src={resolveMediaUrl(previewImage) || previewImage} alt="Evidence" className="max-h-[80vh] w-auto object-contain mx-auto" />
            </div>
          </div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}

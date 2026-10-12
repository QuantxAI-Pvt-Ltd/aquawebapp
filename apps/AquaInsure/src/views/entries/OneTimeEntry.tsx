import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronLeft, Upload, Waves, Eye, CheckCircle2, 
  ExternalLink, FileText, X, Trash2, ShieldCheck 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { uploadToSeaweedFS, resolveMediaUrl } from "@/lib/fileUtils";
import axios from "@/lib/api";

const YesNo = ({ 
  label, 
  field, 
  value, 
  onChange,
  disabled = false 
}: { 
  label: string; 
  field: string; 
  value: any; 
  onChange: (key: string, v: any) => void;
  disabled?: boolean;
}) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-sm text-stone-600 font-medium pr-4 flex-1">{label}</span>
      <div className="flex gap-1.5 shrink-0">
        {["yes", "no"].map((v) => (
          <button
            key={v}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onChange(field, v)}
            className={`w-14 py-2 rounded-lg text-xs font-bold transition-all ${
              disabled ? "pointer-events-none cursor-default" : ""
            } ${value === v
              ? "text-white shadow-sm"
              : "bg-stone-100 text-stone-400 hover:bg-stone-200"
              }`}
            style={value === v ? {
              background: 'linear-gradient(110deg, #1c6b5a, #2d9b7f)',
              boxShadow: '0 3px 10px -2px rgba(28,107,90,0.30)',
            } : {}}
          >
            {t(`common.${v}`)}
          </button>
        ))}
      </div>
    </div>
  );
};

const OneTimeEntry = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasPonds, setHasPonds] = useState(false);
  const [ponds, setPonds] = useState<any[]>([]);
  const [selectedPondIndex, setSelectedPondIndex] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [viewerModal, setViewerModal] = useState<{ title: string; url: string } | null>(null);

  const [data, setData] = useState<Record<string, any>>({});

  const loadPondEntry = async (pId: string) => {
    try {
      const entryRes = await axios.get(`/api/entries/one-time?pondId=${pId}`);
      if (entryRes.data?.success && entryRes.data?.data) {
        const e = entryRes.data.data;
        // Check if any one-time documents have been uploaded / saved
        const hasSavedDocs = Boolean(
          e.registrationCertificate ||
          e.pondPreparation?.pondPrepBills ||
          e.seedSelection?.seedBills ||
          e.seedSelection?.pcrCertificate
        );
        setIsLocked(hasSavedDocs);
        setData({
          followedPractices: e.pondPreparation?.followedPractices ? 'yes' : 'no',
          pondPrepBills: e.pondPreparation?.pondPrepBills || null,
          pcrTesting: e.seedSelection?.pcrTesting ? 'yes' : 'no',
          pcrCertificate: e.seedSelection?.pcrCertificate || null,
          seedBills: e.seedSelection?.seedBills || null,
          regCertificate: e.registrationCertificate || null,
        });
        return;
      }
    } catch (err) {
      console.warn("Failed to load existing one-time entry:", err);
    }
    setIsLocked(false);
    setData({
      followedPractices: 'no',
      pondPrepBills: null,
      pcrTesting: 'no',
      pcrCertificate: null,
      seedBills: null,
      regCertificate: null,
    });
  };

  useEffect(() => {
    const regComplete = localStorage.getItem('aqua-reg-complete');
    if (regComplete !== '1') {
      axios.get('/api/auth/status')
        .then(res => {
          if (res.data?.success && !res.data.isProfileComplete && res.data.onboardingStep) {
            switch (res.data.onboardingStep) {
              case 'farmer_registration':
                navigate('/farmer-registration', { replace: true });
                return;
              case 'farmer_address':
                navigate('/farmer-address', { replace: true });
                return;
              case 'farmer_kyc':
                navigate('/farmer-kyc', { replace: true });
                return;
              case 'farm_registration':
                navigate('/farm-registration', { replace: true });
                return;
              case 'farm_setup':
                navigate('/farm-setup', { replace: true });
                return;
              case 'insured_ponds':
                navigate('/insured-ponds', { replace: true });
                return;
              case 'insurance_registration':
                navigate('/insurance-registration', { replace: true });
                return;
              default:
                navigate('/farmer-registration', { replace: true });
                return;
            }
          }
        })
        .catch(() => {});
    }

    const session = JSON.parse(localStorage.getItem('aqua-session') || '{}');
    if (session.farmerId) {
      // Concurrently fetch all ponds and insurances for this farmer to filter down to ONLY INSURED ponds
      Promise.all([
        axios.get(`/api/farms/ponds?farmerId=${session.farmerId}`).catch(() => ({ data: { success: false, data: [] } })),
        axios.get(`/api/insurances?farmerId=${session.farmerId}`).catch(() => ({ data: { success: false, data: [] } }))
      ]).then(async ([pondsRes, insRes]) => {
        const rawPonds = pondsRes.data?.data || [];
        const insurances = insRes.data?.data || [];

        // Build set of all active insured pond IDs
        const insuredPondIds = new Set<string>();
        insurances.forEach((ins: any) => {
          if (ins.status && ins.status === 'expired') return;
          const pId = ins.pondId?._id || ins.pondId;
          if (pId) insuredPondIds.add(String(pId));
          if (Array.isArray(ins.insuredPondIds)) {
            ins.insuredPondIds.forEach((pid: any) => {
              const id = pid?._id || pid;
              if (id) insuredPondIds.add(String(id));
            });
          }
        });

        // Filter ponds so ONLY insured ponds are accessible
        const insuredPonds = rawPonds.filter((p: any) => {
          const pid = String(p._id || p.pondId || '');
          return insuredPondIds.has(pid);
        });

        if (insuredPonds.length > 0) {
          setHasPonds(true);
          setPonds(insuredPonds);
          const firstPondId = insuredPonds[0]._id || insuredPonds[0].pondId;
          await loadPondEntry(firstPondId);
        } else {
          setHasPonds(false);
          setPonds([]);
        }
      }).catch((err) => {
        console.error("Error fetching ponds or insurances:", err);
        setHasPonds(false);
        setPonds([]);
      }).finally(() => {
        setLoading(false);
      });
    } else {
      // Local storage fallback
      const farmData = JSON.parse(localStorage.getItem('aqua-farm') || '{}');
      const insData = JSON.parse(localStorage.getItem('aqua-insurance') || '{}');
      const rawPonds = farmData.ponds || [];
      const insuredIds = new Set<string>();
      if (insData.pondId) insuredIds.add(String(insData.pondId));
      if (Array.isArray(insData.insuredPondIds)) {
        insData.insuredPondIds.forEach((id: any) => insuredIds.add(String(id)));
      }

      const insuredPonds = rawPonds.filter((p: any) => {
        const pid = String(p._id || p.pondId || '');
        return insuredIds.has(pid);
      });

      if (insuredPonds.length > 0) {
        setHasPonds(true);
        setPonds(insuredPonds);
        const firstPId = insuredPonds[0]._id || insuredPonds[0].pondId;
        loadPondEntry(firstPId);
      } else {
        setHasPonds(false);
        setPonds([]);
      }
      setLoading(false);
    }
  }, [navigate]);

  const handlePondSelect = (idx: number) => {
    setSelectedPondIndex(idx);
    const p = ponds[idx];
    const pId = p?._id || p?.pondId;
    if (pId) {
      loadPondEntry(pId);
    }
  };

  const updateField = (key: string, value: any) => {
    if (isLocked) return;
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const getMediaUrl = (val: any): string | null => {
    if (!val) return null;
    if (val instanceof File) return URL.createObjectURL(val);
    if (typeof val === 'string' && val.trim().length > 0) return resolveMediaUrl(val);
    if (typeof val === 'object' && (val.url || val.key)) return resolveMediaUrl(val);
    return null;
  };

  const MediaField = ({
    label,
    value,
    accept = "image/*,.pdf",
    onChange,
    onRemove,
  }: {
    label: string;
    value: any;
    accept?: string;
    onChange: (file: File | undefined) => void;
    onRemove?: () => void;
  }) => {
    const activeUrl = getMediaUrl(value);
    const fileName = value instanceof File ? value.name : (activeUrl ? 'Attached Document' : null);

    // If locked (already submitted), render a subtle, compact row with a small "Show" button on the side
    if (isLocked) {
      if (activeUrl) {
        return (
          <div className="w-full rounded-xl border border-stone-200/70 bg-white/80 p-2.5 flex items-center justify-between gap-3 shadow-xs mt-1.5">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                <FileText size={14} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-stone-500 font-medium truncate">{label}</p>
                <p className="text-xs text-stone-800 font-medium truncate">{fileName || 'Attached Document'}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setViewerModal({ title: label, url: activeUrl })}
              className="h-7 px-2.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200/60 text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors shadow-2xs"
            >
              <Eye size={12} />
              <span>Show</span>
            </button>
          </div>
        );
      }

      return (
        <div className="py-1 px-1 text-[11px] text-stone-400 italic">
          No document attached
        </div>
      );
    }

    // Editable mode: Active file uploaded
    if (activeUrl) {
      return (
        <div className="w-full rounded-2xl border border-teal-200 bg-teal-50/70 p-3 flex flex-col gap-2.5 transition-all shadow-xs mt-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <CheckCircle2 size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-teal-700 font-bold uppercase tracking-wider truncate">{label}</p>
                <p className="text-xs text-stone-700 font-medium truncate">{fileName || 'Uploaded File'}</p>
              </div>
            </div>
            {onRemove && (
              <button
                type="button"
                onClick={onRemove}
                className="w-7 h-7 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors"
                title="Remove document"
                aria-label="Remove document"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-teal-100">
            <button
              type="button"
              onClick={() => setViewerModal({ title: label, url: activeUrl })}
              className="flex-1 h-8 rounded-xl bg-teal-700 hover:bg-teal-800 active:scale-[0.98] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
            >
              <Eye size={13} />
              <span>Show Document</span>
            </button>

            <label className="h-8 px-3 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-600 active:scale-[0.98] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all shrink-0">
              <Upload size={13} className="text-stone-500" />
              <span>Change</span>
              <input
                type="file"
                accept={accept}
                className="hidden"
                onChange={(e) => {
                  onChange(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </label>

            {onRemove && (
              <button
                type="button"
                onClick={onRemove}
                className="h-8 px-3 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 active:scale-[0.98] text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-all shrink-0"
                title="Remove document"
              >
                <Trash2 size={13} className="text-red-500" />
                <span>Remove</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    // Editable mode: No file uploaded yet
    return (
      <label className="w-full h-12 rounded-xl border border-stone-200 bg-stone-50 flex items-center justify-center gap-2 text-sm cursor-pointer hover:bg-stone-100 transition-colors mt-2">
        <Upload size={16} className="text-teal-600" />
        <span className="truncate text-stone-500 font-medium">{label}</span>
        <input 
          type="file" 
          accept={accept} 
          className="hidden" 
          onChange={(e) => {
            onChange(e.target.files?.[0]);
            e.target.value = '';
          }} 
        />
      </label>
    );
  };

  const save = async () => {
    if (isLocked) {
      toast.info("This entry is submitted and locked in view-only mode.");
      return;
    }

    const activePond = ponds[selectedPondIndex];
    const targetPondId = activePond?._id || activePond?.pondId;
    if (!targetPondId || String(targetPondId).length < 24) {
      toast.error("Invalid Pond ID. Please ensure pond is properly registered.");
      return;
    }

    setSaving(true);
    try {
      const uploadField = async (val: any) => {
        if (!val) return null;
        if (val instanceof File) {
          return await uploadToSeaweedFS(val, `ponds/${targetPondId}/onetime`);
        }
        return val;
      };

      const [pondPrepBillsMedia, pcrCertMedia, seedBillsMedia, regCertMedia] = await Promise.all([
        uploadField(data.pondPrepBills),
        uploadField(data.pcrCertificate),
        uploadField(data.seedBills),
        uploadField(data.regCertificate),
      ]);

      const payload = {
        pondId: targetPondId,
        pondPreparation: {
          followedPractices: data.followedPractices === "yes",
          pondPrepBills: pondPrepBillsMedia
        },
        seedSelection: {
          pcrTesting: data.pcrTesting === "yes",
          pcrCertificate: pcrCertMedia,
          seedBills: seedBillsMedia
        },
        registrationCertificate: regCertMedia
      };

      const res = await axios.post("/api/entries/one-time", payload);

      if (res.data.success) {
        toast.success(t("entries.saved"));
        setIsLocked(true);
        setTimeout(() => navigate("/entries/daily"), 1200);
      }
    } catch (error: any) {
      console.error('OneTimeEntry submission error:', error);
      toast.error(error.response?.data?.error || t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-stone-50 relative text-stone-800 font-sans"
      style={{ fontFamily: "'Sora', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');`}</style>

      {/* SCROLLABLE INNER BODY */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col pb-8">
        {/* HEADER */}
        <div className="px-5 pt-8 pb-7 rounded-b-[2.5rem] relative overflow-hidden shrink-0"
        style={{
          background: 'linear-gradient(140deg, #1c4a3e 0%, #1c6b5a 45%, #2d9b7f 100%)',
          boxShadow: '0 8px 32px -6px rgba(28,74,62,0.28)',
        }}>
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full -mr-10 -mt-10 opacity-10"
          style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/15 text-white border border-white/20 hover:bg-white/25 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-white tracking-tight">
              {t("entries.oneTime")}
            </h1>
          </div>
          <span className="text-[10px] font-bold text-white/85 px-2.5 py-1 bg-white/12 rounded-lg border border-white/15">
            Aqua <span className="text-amber-300">AI</span>nsure
          </span>
        </div>
      </div>

      <div className="px-4 mt-5 space-y-4">
        {loading ? (
          <div className="bg-white rounded-3xl p-8 border border-stone-100 shadow-sm flex flex-col items-center justify-center gap-3 mt-2">
            <div className="w-8 h-8 rounded-full border-2 border-teal-600 border-t-transparent animate-spin" />
            <p className="text-xs text-stone-400 font-medium">Checking insured ponds...</p>
          </div>
        ) : !hasPonds ? (
          <div className="text-center py-10 flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shadow-inner mb-4">
              <Waves className="w-8 h-8" />
            </div>
            <div className="space-y-1 mb-6">
              <h3 className="text-base font-bold text-stone-800">
                No Insured Ponds Found
              </h3>
              <p className="text-xs text-stone-500 max-w-xs mx-auto leading-relaxed">
                One-Time Entry is strictly restricted to ponds with active insurance. Please insure your ponds before uploading setup records.
              </p>
            </div>
            <Button
              onClick={() => navigate('/insurance-registration')}
              className="w-full max-w-xs h-11 rounded-xl bg-gradient-to-r from-teal-700 to-teal-600 hover:from-teal-800 hover:to-teal-700 text-white font-semibold text-xs shadow-md shadow-teal-700/20"
            >
              Insure Your Ponds →
            </Button>
          </div>
        ) : (
          <>
            {/* Pond Switcher */}
            {ponds.length > 1 && (
              <div className="bg-white rounded-2xl p-3 border border-stone-100 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Select Insured Pond</p>
                  <span className="text-[10px] text-teal-600 font-bold flex items-center gap-1">
                    <ShieldCheck size={12} />
                    {ponds.length} Insured
                  </span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {ponds.map((p, idx) => {
                    const isSelected = selectedPondIndex === idx;
                    return (
                      <button
                        key={p._id || idx}
                        type="button"
                        onClick={() => handlePondSelect(idx)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-teal-700 text-white shadow-xs'
                            : 'bg-stone-50 text-stone-600 border border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        <ShieldCheck size={12} className={isSelected ? 'text-teal-200' : 'text-stone-400'} />
                        <span>{p.name || `Pond ${p.pondNumber || idx + 1}`}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Farm Registration */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
                {t("entries.farmRegistration")}
              </h3>
              <MediaField
                label={t("entries.uploadRegCertificate")}
                value={data.regCertificate}
                accept="image/*,.pdf"
                onChange={(file) => updateField("regCertificate", file)}
                onRemove={() => updateField("regCertificate", null)}
              />
            </div>

            {/* Pond Preparation */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
                {t("entries.pondPrep")}
              </h3>
              <YesNo 
                label={t("entries.followedPractices")} 
                field="followedPractices" 
                value={data.followedPractices} 
                onChange={updateField}
                disabled={isLocked}
              />
              <MediaField
                label={t("entries.uploadBills") + " (Pond Prep Bills)"}
                value={data.pondPrepBills}
                accept="image/*,.pdf"
                onChange={(file) => updateField("pondPrepBills", file)}
                onRemove={() => updateField("pondPrepBills", null)}
              />
            </div>

            {/* Seed Selection */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
                {t("entries.seedSelection")}
              </h3>
              <YesNo 
                label={t("entries.pcrTesting")} 
                field="pcrTesting" 
                value={data.pcrTesting} 
                onChange={updateField}
                disabled={isLocked}
              />
              <div className="space-y-2">
                <MediaField
                  label={t("entries.uploadPCR")}
                  value={data.pcrCertificate}
                  accept="image/*,.pdf"
                  onChange={(file) => updateField("pcrCertificate", file)}
                  onRemove={() => updateField("pcrCertificate", null)}
                />
                <MediaField
                  label={t("entries.uploadBills") + " (Seed Bills)"}
                  value={data.seedBills}
                  accept="image/*,.pdf"
                  onChange={(file) => updateField("seedBills", file)}
                  onRemove={() => updateField("seedBills", null)}
                />
              </div>
            </div>

            {isLocked ? (
              <Button
                onClick={() => navigate('/entries/daily')}
                className="w-full h-12 rounded-xl text-white font-bold mt-2"
                style={{
                  background: 'linear-gradient(110deg, #1c6b5a 20%, #2d9b7f 55%, #1c6b5a 80%)',
                  boxShadow: '0 6px 24px -4px rgba(28,107,90,0.28)',
                }}
              >
                Proceed to Daily Entries →
              </Button>
            ) : (
              <Button
                onClick={save}
                disabled={saving}
                className="w-full h-12 rounded-xl text-white font-bold disabled:opacity-50 mt-2"
                style={{
                  background: 'linear-gradient(110deg, #1c6b5a 20%, #2d9b7f 55%, #1c6b5a 80%)',
                  boxShadow: '0 6px 24px -4px rgba(28,107,90,0.28)',
                }}
              >
                {saving ? 'Saving...' : t("common.save")}
              </Button>
            )}
          </>
        )}
      </div>
      </div>

      {/* ── UNIVERSAL MEDIA PREVIEW LIGHTBOX MODAL ── */}
      <AnimatePresence>
        {viewerModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewerModal(null)}
              className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm"
            />

            {/* Modal Dialog */}
            <div className="fixed inset-0 z-[125] flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 10 }}
                className="w-full max-w-4xl w-[94vw] bg-stone-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10 pointer-events-auto flex flex-col max-h-[90vh]"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3.5 bg-stone-900/90 border-b border-white/10 text-white shrink-0">
                  <div className="min-w-0 flex-1 pr-3">
                    <p className="text-[10px] text-teal-400 font-bold uppercase tracking-wider">Preview Document</p>
                    <h3 className="text-sm font-bold truncate text-stone-100">{viewerModal.title}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={viewerModal.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
                      title="Open in new window"
                    >
                      <ExternalLink size={14} />
                    </a>
                    <button
                      onClick={() => setViewerModal(null)}
                      className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Media Container */}
                <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/40 min-h-[320px]">
                  {viewerModal.url.toLowerCase().includes('.pdf') || viewerModal.url.startsWith('data:application/pdf') ? (
                    <iframe
                      src={viewerModal.url}
                      className="w-full h-[70vh] rounded-2xl border-0 bg-white"
                      title={viewerModal.title}
                    />
                  ) : (
                    <img
                      src={viewerModal.url}
                      alt={viewerModal.title}
                      className="max-h-[72vh] w-full rounded-2xl object-contain shadow-md"
                    />
                  )}
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
};

export default OneTimeEntry;

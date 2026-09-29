import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronLeft, Upload, Waves, Eye, CheckCircle2, 
  ExternalLink, FileText, X 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { uploadToSeaweedFS, resolveMediaUrl } from "@/lib/fileUtils";
import axios from "@/lib/api";

const YesNo = ({ label, field, value, onChange }: { label: string; field: string; value: any; onChange: (key: string, v: any) => void }) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-sm text-stone-600 font-medium pr-4 flex-1">{label}</span>
      <div className="flex gap-1.5 shrink-0">
        {["yes", "no"].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(field, v)}
            className={`w-14 py-2 rounded-lg text-xs font-bold transition-all ${value === v
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
  const [firstPondId, setFirstPondId] = useState<string | null>(null);
  const [viewerModal, setViewerModal] = useState<{ title: string; url: string } | null>(null);

  const [data, setData] = useState<Record<string, any>>({});

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
      axios.get(`/api/farms/ponds?farmerId=${session.farmerId}`)
        .then(async res => {
          const ponds = res.data?.data || [];
          setHasPonds(ponds.length > 0);
          if (ponds.length > 0) {
            const pId = ponds[0]._id || ponds[0].pondId;
            setFirstPondId(pId);
            try {
              const entryRes = await axios.get(`/api/entries/one-time?pondId=${pId}`);
              if (entryRes.data?.success && entryRes.data?.data) {
                const e = entryRes.data.data;
                setData({
                  followedPractices: e.pondPreparation?.followedPractices ? 'yes' : 'no',
                  pondPrepBills: e.pondPreparation?.pondPrepBills || null,
                  pcrTesting: e.seedSelection?.pcrTesting ? 'yes' : 'no',
                  pcrCertificate: e.seedSelection?.pcrCertificate || null,
                  seedBills: e.seedSelection?.seedBills || null,
                  regCertificate: e.registrationCertificate || null,
                });
              }
            } catch (err) {
              // Ignore initial load error if no entry exists
            }
          }
        })
        .catch(() => {
          const farmData = JSON.parse(localStorage.getItem('aqua-farm') || '{}');
          const hasP = Boolean(farmData.ponds?.length);
          setHasPonds(hasP);
          if (hasP) {
            setFirstPondId(farmData.ponds[0]._id || farmData.ponds[0].pondId);
          }
        })
        .finally(() => setLoading(false));
    } else {
      const farmData = JSON.parse(localStorage.getItem('aqua-farm') || '{}');
      const hasP = Boolean(farmData.ponds?.length);
      setHasPonds(hasP);
      if (hasP) {
        setFirstPondId(farmData.ponds[0]._id || farmData.ponds[0].pondId);
      }
      setLoading(false);
    }
  }, [navigate]);

  const updateField = (key: string, value: any) => {
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
  }: {
    label: string;
    value: any;
    accept?: string;
    onChange: (file: File | undefined) => void;
  }) => {
    const activeUrl = getMediaUrl(value);
    const fileName = value instanceof File ? value.name : (activeUrl ? 'Attached Document' : null);

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
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-teal-100">
            <button
              type="button"
              onClick={() => setViewerModal({ title: label, url: activeUrl })}
              className="flex-1 h-9 rounded-xl bg-teal-700 hover:bg-teal-800 active:scale-[0.98] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
            >
              <Eye size={14} />
              <span>Show Document</span>
            </button>

            <label className="h-9 px-3 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-600 active:scale-[0.98] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all shrink-0">
              <Upload size={13} className="text-stone-500" />
              <span>Change</span>
              <input
                type="file"
                accept={accept}
                className="hidden"
                onChange={(e) => onChange(e.target.files?.[0])}
              />
            </label>
          </div>
        </div>
      );
    }

    return (
      <label className="w-full h-12 rounded-xl border border-stone-200 bg-stone-50 flex items-center justify-center gap-2 text-sm cursor-pointer hover:bg-stone-100 transition-colors mt-2">
        <Upload size={16} className="text-teal-600" />
        <span className="truncate text-stone-500 font-medium">{label}</span>
        <input type="file" accept={accept} className="hidden" onChange={(e) => onChange(e.target.files?.[0])} />
      </label>
    );
  };

  const save = async () => {
    if (!firstPondId || String(firstPondId).length < 24) {
      toast.error("Invalid Pond ID. Please complete Farm Registration first.");
      return;
    }

    setSaving(true);
    try {
      const uploadField = async (val: any) => {
        if (!val) return null;
        if (val instanceof File) {
          return await uploadToSeaweedFS(val, `ponds/${firstPondId}/onetime`);
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
        pondId: firstPondId,
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
        setTimeout(() => navigate("/entries/daily"), 1000);
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
            <p className="text-xs text-stone-400 font-medium">Loading pond data...</p>
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
                You must register your farm and insure your ponds before logging one-time documentation.
              </p>
            </div>
            <Button
              onClick={() => navigate('/farm-registration')}
              className="w-full max-w-xs h-11 rounded-xl bg-gradient-to-r from-teal-700 to-teal-600 hover:from-teal-800 hover:to-teal-700 text-white font-semibold text-xs shadow-md shadow-teal-700/20"
            >
              Complete Farm Registration →
            </Button>
          </div>
        ) : (
          <>
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
              />
            </div>

            {/* Pond Preparation */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
                {t("entries.pondPrep")}
              </h3>
              <YesNo label={t("entries.followedPractices")} field="followedPractices" value={data.followedPractices} onChange={updateField} />
              <MediaField
                label={t("entries.uploadBills") + " (Pond Prep Bills)"}
                value={data.pondPrepBills}
                accept="image/*,.pdf"
                onChange={(file) => updateField("pondPrepBills", file)}
              />
            </div>

            {/* Seed Selection */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
                {t("entries.seedSelection")}
              </h3>
              <YesNo label={t("entries.pcrTesting")} field="pcrTesting" value={data.pcrTesting} onChange={updateField} />
              <div className="space-y-2">
                <MediaField
                  label={t("entries.uploadPCR")}
                  value={data.pcrCertificate}
                  accept="image/*,.pdf"
                  onChange={(file) => updateField("pcrCertificate", file)}
                />
                <MediaField
                  label={t("entries.uploadBills") + " (Seed Bills)"}
                  value={data.seedBills}
                  accept="image/*,.pdf"
                  onChange={(file) => updateField("seedBills", file)}
                />
              </div>
            </div>

            <Button
              onClick={save}
              disabled={saving}
              className="w-full h-12 rounded-xl text-white font-bold disabled:opacity-50"
              style={{
                background: 'linear-gradient(110deg, #1c6b5a 20%, #2d9b7f 55%, #1c6b5a 80%)',
                boxShadow: '0 6px 24px -4px rgba(28,107,90,0.28)',
              }}
            >
              {saving ? 'Saving...' : t("common.save")}
            </Button>
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
                className="w-full max-w-lg bg-stone-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10 pointer-events-auto flex flex-col max-h-[85vh]"
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
                <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/40 min-h-[260px]">
                  {viewerModal.url.toLowerCase().includes('.pdf') || viewerModal.url.startsWith('data:application/pdf') ? (
                    <div className="flex flex-col items-center justify-center gap-4 py-8 text-center px-4">
                      <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                        <FileText size={32} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white mb-1">PDF Document</p>
                        <p className="text-xs text-stone-400 max-w-xs">This PDF document can be viewed or downloaded in a new browser tab.</p>
                      </div>
                      <a
                        href={viewerModal.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md inline-flex items-center gap-2 transition-all"
                      >
                        <ExternalLink size={14} />
                        <span>Open PDF Document</span>
                      </a>
                    </div>
                  ) : (
                    <img
                      src={viewerModal.url}
                      alt={viewerModal.title}
                      className="max-h-[65vh] w-full rounded-2xl object-contain shadow-md"
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

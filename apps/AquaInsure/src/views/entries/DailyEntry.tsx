import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Upload, Activity, Utensils, Users, Droplets, HeartPulse, PieChart, BarChart3, X, MapPin, Maximize2, Waves } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import BottomNav from "@/components/BottomNav";
import SyncIndicator from "@/components/SyncIndicator";
import { useAutoSave } from "@/hooks/useAutoSave";
import { fileToBase64, uploadToSeaweedFS, resolveMediaUrl } from "@/lib/fileUtils";
import axios from "@/lib/api";
import CameraCapture from "@/components/CameraCapture";

const DailyEntry = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [ponds, setPonds] = useState<any[]>([]);
  const [pondIndex, setPondIndex] = useState(0);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [pondPreviewOpen, setPondPreviewOpen] = useState(false);
  const [data, setData] = useState<Record<string, any>>({});
  const [dbEntries, setDbEntries] = useState<any[]>([]); // entries for current pond from DB
  const [insurances, setInsurances] = useState<any[]>([]);

  const [loadingPonds, setLoadingPonds] = useState(true);

  const update = (k: string, v: any) => setData(prev => ({ ...prev, [k]: v }));

  const session = JSON.parse(localStorage.getItem('aqua-session') || '{}');

  // Fetch insured ponds + insurances together so insuredPondIds
  // always comes from the server — never from stale localStorage
  useEffect(() => {
    if (!session.farmerId) { navigate('/login', { replace: true }); return; }

    const regComplete = localStorage.getItem('aqua-reg-complete');
    if (regComplete !== '1') {
      axios.get('/api/auth/status')
        .then((res) => {
          if (res.data.success && !res.data.isProfileComplete) {
            const step = res.data.onboardingStep;
            switch (step) {
              case 'farmer_registration':
                navigate('/farmer-registration', { replace: true });
                return;
              case 'farm_registration':
                navigate('/farm-registration', { replace: true });
                return;
              case 'insurance_registration':
                navigate('/insurance-registration', { replace: true });
                return;
              case 'insured_ponds':
                navigate('/insured-ponds', { replace: true });
                return;
              default:
                navigate('/farmer-registration', { replace: true });
                return;
            }
          }
        })
        .catch(() => {});
    }

    setLoadingPonds(true);
    Promise.all([
      axios.get(`/api/farms/ponds?farmerId=${session.farmerId}`),
      axios.get(`/api/insurances?farmerId=${session.farmerId}`),
    ]).then(([pondsRes, insRes]) => {
      const allPonds: any[] = pondsRes.data.data || [];
      const insData: any[] = insRes.data.data || [];
      setInsurances(insData);

      // Derive insured pond IDs from insurance records (works after logout/re-login)
      const insuredIds = new Set<string>(
        insData.flatMap((ins: any) =>
          ins.insuredPondIds?.length
            ? ins.insuredPondIds
            : ins.pondId ? [ins.pondId] : []
        )
      );

      const filtered = insuredIds.size > 0
        ? allPonds.filter((p: any) => insuredIds.has(p._id || p.pondId))
        : allPonds; // fallback: show all if no insurance exists yet

      setPonds(filtered);
    }).catch(() => toast.error('Could not load pond data'))
      .finally(() => setLoadingPonds(false));
  }, []);

  // Fetch entries for the currently selected pond from DB (for day colors)
  useEffect(() => {
    const pond = ponds[pondIndex];
    const pid = pond?._id || pond?.pondId;
    if (!pid) { setDbEntries([]); return; }
    axios.get(`/api/entries/daily?pondId=${pid}`)
      .then(r => setDbEntries(r.data.data || []))
      .catch(() => setDbEntries([]));
  }, [pondIndex, ponds]);

  // When a day is selected, pre-fill form with existing DB entry if available
  useEffect(() => {
    if (selectedDay === null) return;
    const pond = ponds[pondIndex];
    if (!pond) return;

    const existing = dbEntries.find((e: any) => e.dayNumber === selectedDay && e.pondId === (pond._id || pond.pondId));
    if (existing) {
      // flatten nested structure back to flat form state
      setData({
        survival: existing.sampling?.survival,
        biomass: existing.sampling?.biomass,
        proportionateGrowth: existing.sampling?.proportionateGrowth ? 'yes' : 'no',
        feedQuantity: existing.feedManagement?.feedQuantity,
        feedCost: existing.feedManagement?.feedCost,
        labourCost: existing.financials?.labourCost,
        otherExpenses: existing.financials?.otherExpenses,
        waterCost: existing.financials?.waterCost,
        do: existing.waterQuality?.do,
        ph: existing.waterQuality?.ph,
        temperature: existing.waterQuality?.temperature,
        ammonia: existing.waterQuality?.ammonia,
        hardness: existing.waterQuality?.hardness,
        alkalinity: existing.waterQuality?.alkalinity,
        health: existing.shrimpHealth?.status,
        measures: existing.shrimpHealth?.measures,
        expectedCop: existing.productionEstimation?.expectedCop,
        expectedProduction: existing.productionEstimation?.expectedProduction,
        expectedAbw: existing.productionEstimation?.expectedAbw,
      });
    } else {
      const draftStr = localStorage.getItem(`draft_daily_${pond._id || pond.pondId}_${selectedDay}`);
      if (draftStr) {
        try { setData(JSON.parse(draftStr)); } catch (e) { setData({}); }
      } else {
        setData({});
      }
    }
  }, [selectedDay, pondIndex, ponds, dbEntries]);

  // Autosave current active day data to localStorage
  useEffect(() => {
    if (selectedDay !== null && ponds[pondIndex]) {
      const pond = ponds[pondIndex];
      if (!pond._id) return;
      const draftToSave = { ...data };
      delete draftToSave.samplingVideo;
      delete draftToSave.feedBills;
      delete draftToSave.miscBills;
      delete draftToSave.electricityBills;
      delete draftToSave.waterReport;
      delete draftToSave.shrimpPhoto;
      delete draftToSave.labReport;
      localStorage.setItem(`draft_daily_${pond._id || pond.pondId}_${selectedDay}`, JSON.stringify(draftToSave));
    }
  }, [data, selectedDay, pondIndex, ponds]);

  const { syncStatus } = useAutoSave([data, selectedDay, pondIndex, ponds], async () => {
    if (selectedDay === null) return;
    const pondId = ponds[pondIndex]?._id || ponds[pondIndex]?.pondId;
    if (!pondId || String(pondId).length < 24) return;
    
    // Check if there is actual input data (not empty) before hitting the DB continually
    const hasData = Object.entries(data).some(([k, v]) => {
      if (v === undefined || v === null || v === '' || v === false) return false;
      if (k === 'proportionateGrowth' && v === 'no') return false;
      return true;
    });
    if (!hasData) return;

    const payload = {
        pondId: pondId,
        dayNumber: selectedDay,
        date: new Date().toISOString(),
        sampling: {
          survival: data.survival ? Number(data.survival) : undefined,
          biomass: data.biomass ? Number(data.biomass) : undefined,
          proportionateGrowth: data.proportionateGrowth === "yes",
        },
        feedManagement: {
          feedQuantity: data.feedQuantity ? Number(data.feedQuantity) : undefined,
          feedCost: data.feedCost ? Number(data.feedCost) : undefined,
        },
        financials: {
          labourCost: data.labourCost ? Number(data.labourCost) : undefined,
          otherExpenses: data.otherExpenses ? Number(data.otherExpenses) : undefined,
          waterCost: data.waterCost ? Number(data.waterCost) : undefined,
        },
        waterQuality: {
          do: data.do ? Number(data.do) : undefined,
          ph: data.ph ? Number(data.ph) : undefined,
          temperature: data.temperature ? Number(data.temperature) : undefined,
          ammonia: data.ammonia ? Number(data.ammonia) : undefined,
          hardness: data.hardness ? Number(data.hardness) : undefined,
          alkalinity: data.alkalinity ? Number(data.alkalinity) : undefined,
        },
        shrimpHealth: {
          status: data.health,
          measures: data.measures,
        },
        productionEstimation: {
          expectedCop: data.expectedCop ? Number(data.expectedCop) : undefined,
          expectedProduction: data.expectedProduction ? Number(data.expectedProduction) : undefined,
          expectedAbw: data.expectedAbw ? Number(data.expectedAbw) : undefined
        }
    };
    
    const res = await axios.post("/api/entries/daily", payload);
    
    // Synchronize the local dbEntries so that leaving the day and returning hydrates fresh data
    if (res.data?.success) {
      setDbEntries(prev => {
        const idx = prev.findIndex(e => e.dayNumber === selectedDay && e.pondId === pondId);
        if (idx !== -1) {
          const newEntries = [...prev];
          newEntries[idx] = res.data.data;
          return newEntries;
        }
        return [...prev, res.data.data];
      });
    }
  });

  // Day color: green=completed, amber=partial, grey=pending — based on DB
  const getDayStatus = (day: number) => {
    const pond = ponds[pondIndex];
    const pondId = pond?._id || pond?.pondId;
    const entry = dbEntries.find((e: any) => e.dayNumber === day && (!pondId || e.pondId === pondId));
    if (!entry) return 'pending';
    const filled = [entry.sampling, entry.feedManagement, entry.financials, entry.waterQuality, entry.shrimpHealth]
      .filter(s => s && Object.values(s).some(v => v != null && v !== '' && v !== false)).length;
    if (filled === 0) return 'pending';
    return filled >= 4 ? 'completed' : 'partial';
  };


  const save = async () => {
    if (!selectedDay) { toast.error(t("entries.selectDay")); return; }

    try {
      toast.loading(t("common.saving"), { id: 'daily-save' });

      const pondId = ponds[pondIndex]._id || ponds[pondIndex].pondId;

      if (!pondId || String(pondId).length < 24) {
        toast.dismiss('daily-save');
        toast.error("Invalid Pond ID. Please re-register your Farm to generate valid database IDs.");
        return;
      }

      const session = JSON.parse(localStorage.getItem('aqua-session') || '{}');
      const farmData = JSON.parse(localStorage.getItem('aqua-farm') || '{}');
      const farmerId = session.farmerId || 'unknown';
      const farmId = farmData.farmId || 'unknown';
      const dateStr = new Date().toISOString().split('T')[0];
      const dailyFolder = `farmers/${farmerId}/farms/${farmId}/ponds/${pondId}/daily/day_${selectedDay}_${dateStr}`;

      // Upload media files to SeaweedFS distributed storage under specific farmer hierarchy
      const samplingVideoData = await uploadToSeaweedFS(data.samplingVideo, `${dailyFolder}/sampling-videos`);
      const feedBillsData = await uploadToSeaweedFS(data.feedBills, `${dailyFolder}/feed-bills`);
      const miscBillsData = await uploadToSeaweedFS(data.miscBills, `${dailyFolder}/misc-bills`);
      const electricityBillsData = await uploadToSeaweedFS(data.electricityBills, `${dailyFolder}/electricity-bills`);
      const waterReportData = await uploadToSeaweedFS(data.waterReport, `${dailyFolder}/water-reports`);
      const shrimpPhotoData = await uploadToSeaweedFS(data.shrimpPhoto, `${dailyFolder}/shrimp-photos`);
      const labReportData = await uploadToSeaweedFS(data.labReport, `${dailyFolder}/lab-reports`);

      const payload = {
        pondId: pondId,
        dayNumber: selectedDay,
        date: new Date().toISOString(),

        sampling: {
          survival: data.survival ? Number(data.survival) : undefined,
          biomass: data.biomass ? Number(data.biomass) : undefined,
          proportionateGrowth: data.proportionateGrowth === "yes",
          samplingVideo: samplingVideoData
        },

        feedManagement: {
          feedQuantity: data.feedQuantity ? Number(data.feedQuantity) : undefined,
          feedCost: data.feedCost ? Number(data.feedCost) : undefined,
          feedBills: feedBillsData
        },

        financials: {
          labourCost: data.labourCost ? Number(data.labourCost) : undefined,
          otherExpenses: data.otherExpenses ? Number(data.otherExpenses) : undefined,
          miscBills: miscBillsData,
          waterCost: data.waterCost ? Number(data.waterCost) : undefined,
          electricityBills: electricityBillsData,
          electricityUnits: data.electricityUnits ? Number(data.electricityUnits) : undefined
        },

        waterQuality: {
          do: data.do ? Number(data.do) : undefined,
          ph: data.ph ? Number(data.ph) : undefined,
          temperature: data.temperature ? Number(data.temperature) : undefined,
          ammonia: data.ammonia ? Number(data.ammonia) : undefined,
          hardness: data.hardness ? Number(data.hardness) : undefined,
          alkalinity: data.alkalinity ? Number(data.alkalinity) : undefined,
          waterReport: waterReportData
        },

        shrimpHealth: {
          status: data.health || undefined,
          measures: data.measures,
          shrimpPhoto: shrimpPhotoData,
          labReport: labReportData
        },

        productionEstimation: {
          expectedCop: data.expectedCop ? Number(data.expectedCop) : undefined,
          expectedProduction: data.expectedProduction ? Number(data.expectedProduction) : undefined,
          expectedAbw: data.expectedAbw ? Number(data.expectedAbw) : undefined
        }
      };

      const res = await axios.post("/api/entries/daily", payload);

      if (res.data.success) {
        toast.dismiss('daily-save');
        toast.success(t("entries.saved"));
        localStorage.removeItem(`draft_daily_${pondId}_${selectedDay}`);
        
        // Refresh entries
        axios.get(`/api/entries/daily?pondId=${pondId}`)
          .then(r => setDbEntries(r.data.data || []));
        
        setData({});
        setSelectedDay(null);
      }
    } catch (error: any) {
      toast.dismiss('daily-save');
      console.error("Daily entry save error", error);
      toast.error(error.response?.data?.error || t('common.error'));
    }
  };

  const pond = ponds[pondIndex];
  const pondIdToMatch = pond?._id || pond?.pondId;
  const pondInsurance = insurances.find((ins: any) => 
    ins.pondId === pondIdToMatch || (ins.insuredPondIds && ins.insuredPondIds.includes(pondIdToMatch))
  );
  const maxDays = pondInsurance?.insurancePeriodDays ? Number(pondInsurance.insurancePeriodDays) : (pond ? 120 : 0);

  const renderSectionCard = (Icon: any, title: string, children: React.ReactNode) => (
    <div className="bg-white rounded-2xl p-4 space-y-3 border border-stone-100 shadow-sm">
      <h3 className="text-sm font-bold flex items-center gap-2 text-stone-700">
        <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center">
          <Icon size={14} className="text-teal-600" />
        </div>
        {title}
      </h3>
      {children}
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-stone-50 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] text-stone-800 font-sans">
      <SyncIndicator status={syncStatus} />
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');`}</style>
      
      {isCameraOpen && (
        <CameraCapture 
          onCapture={(file) => update("shrimpPhoto", file)}
          onClose={() => setIsCameraOpen(false)}
          title={t("entries.uploadPhoto")}
          facingMode="environment"
        />
      )}

      {/* HEADER */}
      <div className="px-5 pt-8 pb-7 rounded-b-[2.5rem] relative overflow-hidden"
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
              {t("entries.daily")}
            </h1>
          </div>
          <span className={`text-[10px] font-bold text-white/85 px-2.5 py-1 bg-white/12 rounded-lg border border-white/15 transition-opacity duration-200 ${syncStatus !== 'idle' ? 'opacity-0' : 'opacity-100'}`}>
            Aqua <span className="text-amber-300">AI</span>nsure
          </span>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {loadingPonds ? (
          <div className="space-y-4">
            <div className="flex gap-2 overflow-hidden py-1">
              <Skeleton className="h-16 w-36 rounded-2xl shrink-0 bg-stone-200/80" />
              <Skeleton className="h-16 w-36 rounded-2xl shrink-0 bg-stone-200/80" />
            </div>
            <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm space-y-3">
              <Skeleton className="h-4 w-32 bg-stone-200/80" />
              <div className="grid grid-cols-10 gap-1.5">
                {Array.from({ length: 40 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-lg bg-stone-100" />
                ))}
              </div>
            </div>
          </div>
        ) : ponds.length === 0 ? (
          <div className="bg-white rounded-3xl p-6 border border-stone-100 shadow-sm text-center flex flex-col items-center gap-4 mt-2">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shadow-inner">
              <Waves className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-stone-800">
                No Insured Ponds Found
              </h3>
              <p className="text-xs text-stone-500 max-w-xs mx-auto leading-relaxed">
                You must register your farm and insure your ponds before logging daily water quality and feeding records.
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
            {/* POND SELECTOR — photo cards */}
            {(() => {
              const farmData = JSON.parse(localStorage.getItem('aqua-farm') || '{}');
              const localPonds: any[] = farmData.ponds || [];

              return (
                <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
              {ponds.map((p, i) => {
                const localPond = localPonds.find((lp: any) =>
                  (lp._id || lp.pondId) === (p._id || p.pondId)
                );
                // Photos are stored on the server — never in localStorage
                const photo = p.photo || null;
                const acres = localPond?.dimensionAcres ?? p.dimensionAcres ?? null;
                const isActive = pondIndex === i;

                return (
                  <button
                    key={p._id || p.pondId || i}
                    onClick={() => { setPondIndex(i); setSelectedDay(null); }}
                    className={`relative flex-shrink-0 w-24 rounded-2xl overflow-hidden border-2 transition-all focus:outline-none ${
                      isActive
                        ? 'border-teal-500 shadow-lg shadow-teal-500/20'
                        : 'border-stone-200 hover:border-teal-300'
                    }`}
                    style={{ minHeight: '88px' }}
                  >
                    {photo ? (
                      <img
                        src={resolveMediaUrl(photo) || ''}
                        alt={`Pond ${p.pondNumber || i + 1}`}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className="absolute inset-0 w-full h-full flex items-center justify-center"
                        style={{
                          background: isActive
                            ? 'linear-gradient(135deg, #1c6b5a, #2d9b7f)'
                            : 'linear-gradient(135deg, #e7e5e4, #d6d3d1)',
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={isActive ? 'text-white/70' : 'text-stone-400'}>
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>
                        </svg>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                    {isActive && (
                      <div className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full bg-teal-400 border-2 border-white shadow-sm" />
                    )}
                    <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5">
                      <p className="text-white text-[11px] font-bold leading-tight drop-shadow">
                        {t('entries.pond')} {p.pondNumber || i + 1}
                      </p>
                      {acres != null && (
                        <p className="text-white/75 text-[9px] font-medium leading-tight">
                          {acres} ac
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })()}

        {/* ACTIVE POND BANNER — tap to preview */}
        {(() => {
          const farmData = JSON.parse(localStorage.getItem('aqua-farm') || '{}');
          const localPonds: any[] = farmData.ponds || [];
          const activePond = ponds[pondIndex];
          if (!activePond) return null;
          const localPond = localPonds.find((lp: any) =>
            (lp._id || lp.pondId) === (activePond._id || activePond.pondId)
          );
          // Photos are stored on the server — never in localStorage
          const photo = activePond.photo || null;
          const acres = localPond?.dimensionAcres ?? activePond.dimensionAcres ?? null;

          return photo ? (
            <button
              onClick={() => setPondPreviewOpen(true)}
              className="w-full relative rounded-2xl overflow-hidden border border-stone-100 shadow-sm text-left focus:outline-none active:scale-[0.98] transition-transform"
              style={{ height: '88px' }}
            >
              <img
                src={resolveMediaUrl(photo) || ''}
                alt={`Pond ${activePond.pondNumber || pondIndex + 1}`}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-transparent" />
              <div className="relative z-10 flex items-center gap-3 px-4 py-3.5">
                <div className="w-11 h-11 rounded-xl border-2 border-white/30 overflow-hidden shrink-0">
                  <img
                    src={resolveMediaUrl(photo) || ''}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-white/60 font-semibold uppercase tracking-wider">Selected Pond</p>
                  <p className="text-white text-sm font-bold leading-tight">
                    {t('entries.pond')} {activePond.pondNumber || pondIndex + 1}
                  </p>
                  {acres != null && (
                    <p className="text-white/70 text-[10px] font-medium mt-0.5">{acres} acres</p>
                  )}
                </div>
                {/* tap hint */}
                <div className="flex items-center gap-1 bg-white/15 backdrop-blur-sm rounded-lg px-2.5 py-1.5 border border-white/20">
                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white">
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                  </svg>
                  <span className="text-[9px] text-white font-bold uppercase tracking-wide">View</span>
                </div>
              </div>
            </button>
          ) : (
            <button
              onClick={() => setPondPreviewOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl border border-stone-100 shadow-sm text-left focus:outline-none active:scale-[0.98] transition-transform"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white shrink-0"
                style={{ background: 'linear-gradient(135deg, #1c6b5a, #2d9b7f)' }}
              >
                {activePond.pondNumber || pondIndex + 1}
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider">Selected Pond</p>
                <p className="text-stone-700 text-sm font-bold leading-tight">
                  {t('entries.pond')} {activePond.pondNumber || pondIndex + 1}
                </p>
                {acres != null && (
                  <p className="text-teal-600 text-[10px] font-medium mt-0.5">{acres} acres</p>
                )}
              </div>
              <span className="text-[10px] text-teal-500 font-bold">View details →</span>
            </button>
          );
        })()}

        {/* DAY GRID */}
        {selectedDay === null ? (
          <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">
              {t("entries.selectDay").replace('200', String(maxDays))}
            </h3>
            <div className="grid grid-cols-10 gap-1.5">
              {Array.from({ length: maxDays }, (_, i) => {
                const day = i + 1;
                const status = getDayStatus(day);
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`aspect-square rounded-lg text-[9px] font-bold transition-all ${status === 'completed'
                      ? 'bg-teal-500 text-white shadow-sm'
                      : status === 'partial'
                        ? 'bg-amber-400 text-amber-900'
                        : 'bg-stone-100 text-stone-400 hover:bg-stone-200'
                      }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            {/* Legend */}
            <div className="flex gap-4 mt-3 pt-3 border-t border-stone-100">
              {[
                { color: 'bg-teal-500', label: 'Completed' },
                { color: 'bg-amber-400', label: 'Partial' },
                { color: 'bg-stone-100', label: 'Pending' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-sm ${color}`} />
                  <span className="text-[10px] text-stone-400 font-medium">{label}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (

          /* ENTRY FORM */
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold">Daily Entry</p>
                <h3 className="font-bold text-stone-700">{t("entries.day")} {selectedDay}</h3>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelectedDay(null)}
                className="text-stone-500 hover:text-stone-700 text-xs h-8 px-3 rounded-lg border-stone-200">
                ← {t("common.back")}
              </Button>
            </div>

            {/* SAMPLING */}
            {renderSectionCard(PieChart, t("entries.sampling"), (
              <>
                <Select onValueChange={(v) => update("survival", v)} value={data.survival ? String(data.survival) : ""}>
                  <SelectTrigger className="h-12 rounded-xl border-stone-200 bg-stone-50 text-sm">
                    <SelectValue placeholder={t("entries.survival")} />
                  </SelectTrigger>
                  <SelectContent>
                    {[60, 65, 70, 75, 80, 85, 90, 95, 100].map(v => (
                      <SelectItem key={v} value={String(v)}>{v}%</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input placeholder={t("entries.biomass")} type="number" className="h-12 rounded-xl border-stone-200 bg-stone-50 text-sm" value={data.biomass || ""} onChange={(e) => update("biomass", e.target.value)} />
                <label className="w-full h-12 rounded-xl border border-stone-200 bg-stone-50 flex items-center justify-center gap-2 text-sm cursor-pointer hover:bg-stone-100 transition-colors">
                  <Upload size={16} className="text-teal-600" />
                  <span className="truncate text-stone-500 font-medium">
                    {data.samplingVideo ? (data.samplingVideo as File).name : t("entries.samplingVideo")}
                  </span>
                  <input type="file" accept="video/*" className="hidden" onChange={(e) => update("samplingVideo", e.target.files?.[0])} />
                </label>
                <div className="flex items-center justify-between py-2 border-t border-stone-100 mt-1">
                  <span className="text-sm font-medium text-stone-600">{t("entries.proportionateGrowth")}</span>
                  <div className="flex bg-stone-100 rounded-lg p-0.5">
                    {['yes', 'no'].map((v) => (
                      <button key={v} type="button"
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${data.proportionateGrowth === v ? "bg-white text-teal-700 shadow-sm" : "text-stone-400"
                          }`}
                        onClick={() => update("proportionateGrowth", v)}
                      >
                        {t(`common.${v}`)}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ))}

            {/* FEED MANAGEMENT */}
            {renderSectionCard(Utensils, t("entries.feedManagement"), (
              <>
                <Input placeholder={t("entries.feedQuantity")} type="number" className="h-12 rounded-xl border-stone-200 bg-stone-50 text-sm" value={data.feedQuantity || ""} onChange={(e) => update("feedQuantity", e.target.value)} />
                <Input placeholder={t("entries.feedCost")} type="number" className="h-12 rounded-xl border-stone-200 bg-stone-50 text-sm" value={data.feedCost || ""} onChange={(e) => update("feedCost", e.target.value)} />
                <label className="w-full h-12 rounded-xl border border-stone-200 bg-stone-50 flex items-center justify-center gap-2 text-sm cursor-pointer hover:bg-stone-100 transition-colors">
                  <Upload size={16} className="text-teal-600" />
                  <span className="truncate text-stone-500 font-medium">
                    {data.feedBills ? (data.feedBills as File).name : t("entries.uploadBills") + " (Img/PDF)"}
                  </span>
                  <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => update("feedBills", e.target.files?.[0])} />
                </label>
              </>
            ))}

            {/* LABOUR & MISC */}
            {renderSectionCard(Users, `${t("entries.labourCost")} & ${t("entries.miscellaneous")}`, (
              <>
                <Input placeholder={t("entries.labourCostInput")} type="number" className="h-12 rounded-xl border-stone-200 bg-stone-50 text-sm" value={data.labourCost || ""} onChange={(e) => update("labourCost", e.target.value)} />
                <div className="space-y-2 pt-2 border-t border-stone-100">
                  <Input placeholder={t("entries.otherExpenses")} type="number" className="h-12 rounded-xl border-stone-200 bg-stone-50 text-sm" value={data.otherExpenses || ""} onChange={(e) => update("otherExpenses", e.target.value)} />
                  <label className="w-full h-12 rounded-xl border border-stone-200 bg-stone-50 flex items-center justify-center gap-2 text-sm cursor-pointer hover:bg-stone-100 transition-colors">
                    <Upload size={16} className="text-teal-600" />
                    <span className="truncate text-stone-500 font-medium">
                      {data.miscBills ? (data.miscBills as File).name : t("entries.uploadBills")}
                    </span>
                    <input type="file" className="hidden" onChange={(e) => update("miscBills", e.target.files?.[0])} />
                  </label>
                </div>
              </>
            ))}

            {/* WATER QUALITY */}
            {renderSectionCard(Droplets, t("entries.waterQuality"), (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { placeholder: 'DO (mg/L)', key: 'do' },
                    { placeholder: 'pH', key: 'ph' },
                    { placeholder: t("entries.temperature"), key: 'temperature' },
                    { placeholder: t("entries.ammonia"), key: 'ammonia' },
                    { placeholder: t("entries.hardness"), key: 'hardness' },
                    { placeholder: t("entries.alkalinity"), key: 'alkalinity' },
                  ].map(({ placeholder, key }) => (
                    <Input key={key} placeholder={placeholder} type="number"
                      className="h-12 rounded-xl border-stone-200 bg-stone-50 text-sm"
                      value={data[key] || ""}
                      onChange={(e) => update(key, e.target.value)} />
                  ))}
                </div>
                <div className="space-y-2 pt-2 border-t border-stone-100">
                  <Input
                    placeholder="Electricity Units Consumed (kWh)"
                    type="number"
                    className="h-12 rounded-xl border-stone-200 bg-stone-50 text-sm"
                    value={data.electricityUnits || ""}
                    onChange={(e) => update("electricityUnits", e.target.value)}
                  />
                  {[
                    { key: 'waterReport', label: t("entries.waterQualityReport"), accept: undefined },
                    { key: 'electricityBills', label: t("entries.electricityBills"), accept: undefined },
                  ].map(({ key, label, accept }) => (
                    <label key={key} className="w-full h-12 rounded-xl border border-stone-200 bg-stone-50 flex items-center justify-center gap-2 text-sm cursor-pointer hover:bg-stone-100 transition-colors">
                      <Upload size={16} className="text-teal-600" />
                      <span className="truncate text-stone-500 font-medium">
                        {data[key] ? (data[key] as File).name : label}
                      </span>
                      <input type="file" accept={accept} className="hidden" onChange={(e) => update(key, e.target.files?.[0])} />
                    </label>
                  ))}
                  <Input placeholder={t("entries.waterCost")} type="number" className="h-12 rounded-xl border-stone-200 bg-stone-50 text-sm" value={data.waterCost || ""} onChange={(e) => update("waterCost", e.target.value)} />
                </div>
              </>
            ))}

            {/* SHRIMP HEALTH */}
            {renderSectionCard(HeartPulse, t("entries.shrimpHealth"), (
              <>
                <Select onValueChange={(v) => update("health", v)} value={data.health || ""}>
                  <SelectTrigger className="h-12 rounded-xl border-stone-200 bg-stone-50 text-sm">
                    <SelectValue placeholder={t("entries.healthStatus")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">{t("entries.normal")}</SelectItem>
                    <SelectItem value="deficiency">{t("entries.deficiency")}</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder={t("entries.measures")} className="h-12 rounded-xl border-stone-200 bg-stone-50 text-sm" value={data.measures || ""} onChange={(e) => update("measures", e.target.value)} />
                <label className="w-full h-12 rounded-xl border border-stone-200 bg-stone-50 flex items-center justify-center gap-2 text-sm cursor-pointer hover:bg-stone-100 transition-colors">
                  <Upload size={16} className="text-teal-600" />
                  <span className="truncate text-stone-500 font-medium">
                    {data.labReport ? (data.labReport as File).name : t("entries.labReport")}
                  </span>
                  <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => update("labReport", e.target.files?.[0])} />
                </label>
                <div className="flex gap-2">
                  <label className="flex-1 h-12 rounded-xl border border-stone-200 bg-stone-50 flex items-center justify-center gap-2 text-sm cursor-pointer hover:bg-stone-100 transition-colors">
                    <Upload size={16} className="text-teal-600" />
                    <span className="truncate text-stone-500 font-medium">
                      {data.shrimpPhoto ? (data.shrimpPhoto as File).name : t("entries.uploadPhoto")}
                    </span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => update("shrimpPhoto", e.target.files?.[0])} />
                  </label>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setIsCameraOpen(true)}
                    className="w-12 h-12 rounded-xl border-stone-200 bg-stone-50 p-0 text-teal-600"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                  </Button>
                </div>
              </>
            ))}

            {/* PRODUCTION ESTIMATION */}
            {renderSectionCard(BarChart3, t("entries.productionEstimation"), (
              <>
                <Input placeholder={t("entries.expectedCop")} type="number" className="h-12 rounded-xl border-stone-200 bg-stone-50 text-sm" value={data.expectedCop || ""} onChange={(e) => update("expectedCop", e.target.value)} />
                <Select onValueChange={(v) => update("expectedProduction", v)} value={data.expectedProduction ? String(data.expectedProduction) : ""}>
                  <SelectTrigger className="h-12 rounded-xl border-stone-200 bg-stone-50 text-sm">
                    <SelectValue placeholder={t("entries.expectedProduction")} />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(v => (
                      <SelectItem key={v} value={String(v)}>{v} tonnes/ha</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select onValueChange={(v) => update("expectedAbw", v)} value={data.expectedAbw ? String(data.expectedAbw) : ""}>
                  <SelectTrigger className="h-12 rounded-xl border-stone-200 bg-stone-50 text-sm">
                    <SelectValue placeholder={t("entries.expectedAbw")} />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 21 }, (_, i) => i + 10).map(v => (
                      <SelectItem key={v} value={String(v)}>{v}g</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            ))}

            <Button
              onClick={save}
              className="w-full h-12 rounded-xl text-white font-bold"
              style={{
                background: 'linear-gradient(110deg, #1c6b5a 20%, #2d9b7f 55%, #1c6b5a 80%)',
                boxShadow: '0 6px 24px -4px rgba(28,107,90,0.28)',
              }}
            >
              {t("common.save")}
            </Button>
          </div>
        )}
      </>
    )}
  </div>

      {/* ── POND PREVIEW MODAL (mobile bottom-sheet) ── */}
      {pondPreviewOpen && (() => {
        const farmData = JSON.parse(localStorage.getItem('aqua-farm') || '{}');
        const localPonds: any[] = farmData.ponds || [];
        const activePond = ponds[pondIndex];
        if (!activePond) return null;
        const localPond = localPonds.find((lp: any) =>
          (lp._id || lp.pondId) === (activePond._id || activePond.pondId)
        );
        // Photos are stored on the server — never in localStorage
        const photo = activePond.photo || null;
        const acres = localPond?.dimensionAcres ?? activePond.dimensionAcres ?? null;
        const addr = localPond?.address || activePond.address || {};
        const srcUrl = resolveMediaUrl(photo);

        return (
          <>
            {/* Backdrop */}
            <div
              onClick={() => setPondPreviewOpen(false)}
              className="fixed inset-0 z-[55]"
              style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            />

            {/* Positioning shell — fixed, aligned to app container */}
            <div
              className="fixed bottom-0 left-0 right-0 z-[60] flex justify-center items-end pointer-events-none"
            >
              {/* Sheet */}
              <div
                className="w-full max-w-[480px] flex flex-col rounded-t-3xl overflow-hidden pointer-events-auto shadow-2xl"
                style={{ maxHeight: '80vh', background: '#fff' }}
              >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 rounded-full bg-stone-200" />
              </div>

              {/* Header row */}
              <div className="flex items-center justify-between px-5 pt-1 pb-3 shrink-0">
                <div>
                  <p className="text-[10px] text-stone-400 font-semibold uppercase tracking-widest">
                    Pond Details
                  </p>
                  <h2 className="text-stone-800 text-base font-bold leading-tight">
                    {t('entries.pond')} {activePond.pondNumber || pondIndex + 1}
                  </h2>
                </div>
                <button
                  onClick={() => setPondPreviewOpen(false)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-stone-100 text-stone-500 hover:bg-stone-200 transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Photo — padded wrapper ensures clip works on all browsers */}
              <div className="px-4 shrink-0">
                <div className="w-full rounded-2xl overflow-hidden" style={{ height: '160px' }}>
                  {srcUrl ? (
                    <img
                      src={srcUrl}
                      alt={`Pond ${activePond.pondNumber || pondIndex + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex flex-col items-center justify-center gap-2"
                      style={{ background: 'linear-gradient(135deg, #1c6b5a, #2d9b7f)' }}
                    >
                      <Waves size={36} className="text-white/30" />
                      <p className="text-white/50 text-xs font-semibold">No photo added</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Scrollable details */}
              <div className="overflow-y-auto flex-1 px-4 pt-3 pb-6 space-y-3">

                {/* Size card */}
                <div className="flex items-center gap-3 bg-teal-50 border border-teal-100 rounded-2xl px-4 py-3.5">
                  <div className="w-9 h-9 rounded-xl bg-white border border-teal-100 flex items-center justify-center shrink-0">
                    <Maximize2 size={16} className="text-teal-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-teal-600 font-bold uppercase tracking-wider">Pond Size</p>
                    <p className="text-teal-900 text-sm font-bold">
                      {acres != null ? `${acres} acres` : 'Not specified'}
                    </p>
                    {acres != null && (
                      <p className="text-teal-500 text-[10px] font-medium">
                        ≈ {(parseFloat(String(acres)) * 4046.86).toLocaleString('en-IN', { maximumFractionDigits: 0 })} m²
                      </p>
                    )}
                  </div>
                </div>

                {/* Address card */}
                <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3.5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-white border border-amber-100 flex items-center justify-center">
                      <MapPin size={13} className="text-amber-500" />
                    </div>
                    <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">Pond Address</p>
                  </div>
                  {addr.village || addr.taluk || addr.district || addr.state || addr.pinCode ? (
                    <div className="space-y-1 pl-1">
                      {addr.village && (
                        <p className="text-stone-800 text-sm font-bold">{addr.village}</p>
                      )}
                      {(addr.taluk || addr.district) && (
                        <p className="text-stone-600 text-xs">
                          {[addr.taluk, addr.district].filter(Boolean).join(', ')}
                        </p>
                      )}
                      {addr.state && (
                        <p className="text-stone-500 text-xs">{addr.state}</p>
                      )}
                      {addr.pinCode && (
                        <p className="text-teal-600 text-xs font-bold tracking-wider mt-0.5">
                          PIN: {addr.pinCode}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-amber-400 text-sm pl-1">Address not added yet</p>
                  )}
                </div>

                {/* Close */}
                <button
                  onClick={() => setPondPreviewOpen(false)}
                  className="w-full h-12 rounded-2xl text-white text-sm font-bold mt-2"
                  style={{
                    background: 'linear-gradient(110deg, #1c6b5a 20%, #2d9b7f 55%, #1c6b5a 80%)',
                    boxShadow: '0 6px 20px -4px rgba(28,107,90,0.30)',
                  }}
                >
                  Close
                </button>
              </div>
              </div>
            </div>
          </>
        );
      })()}

      <BottomNav />
    </div>
  );
};

export default DailyEntry;
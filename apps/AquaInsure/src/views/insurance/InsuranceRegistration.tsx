import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { ChevronLeft, ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import BottomNav from '@/components/BottomNav';
import SyncIndicator from '@/components/SyncIndicator';
import { useAutoSave } from '@/hooks/useAutoSave';
import { addDays, format } from 'date-fns';
import axios from "@/lib/api";

const insuranceSchema = z.object({
  stockingDate: z.string().min(1, 'insurance.errors.date'),
  stockingDensity: z.string().min(1, 'insurance.errors.density'),
  insuranceType: z.string().min(1, 'insurance.errors.type'),
  insurancePeriod: z.string().min(1, 'insurance.errors.period'),
  species: z.string().min(1, 'insurance.errors.species'),
});

type InsuranceForm = z.infer<typeof insuranceSchema>;

const InsuranceRegistration = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<InsuranceForm>({
    resolver: zodResolver(insuranceSchema as any),
    defaultValues: (() => {
      const draftStr = typeof window !== 'undefined' ? localStorage.getItem("draft_insurance_form") : null;
      if (draftStr) {
        try { return JSON.parse(draftStr); } catch(e) {}
      }
      return {};
    })(),
  });

  const formValues = watch();

  // Guard: if registration is already complete, skip back to daily entry
  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('aqua-reg-complete') === '1') {
      navigate('/entries/daily', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem("draft_insurance_form", JSON.stringify(formValues));
    }
  }, [formValues]);

  const stockingDate = watch('stockingDate');

  // Load ponds from farm data saved in localStorage
  const farmData = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('aqua-farm') || '{}') : {};
  const allPonds: any[] = farmData.ponds || [];
  const totalPonds = allPonds.length;

  // Track which ponds are selected for insurance
  const [selectedPonds, setSelectedPonds] = useState<string[]>(() => {
    const draftStr = typeof window !== 'undefined' ? localStorage.getItem("draft_insurance_ponds") : null;
    if (draftStr) {
      try { return JSON.parse(draftStr); } catch(e) {}
    }
    // Auto-select all available ponds if no previous draft exists
    return allPonds.map((p: any) => p._id || p.pondId).filter(Boolean);
  });

  // Auto-select ponds if list was empty and ponds become available
  useEffect(() => {
    if (selectedPonds.length === 0 && allPonds.length > 0) {
      const allIds = allPonds.map((p: any) => p._id || p.pondId).filter(Boolean);
      if (allIds.length > 0) {
        setSelectedPonds(allIds);
      }
    }
  }, [allPonds.length]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem("draft_insurance_ponds", JSON.stringify(selectedPonds));
    }
  }, [selectedPonds]);

  const { syncStatus } = useAutoSave([formValues, selectedPonds]);

  const togglePond = (pondId: string) => {
    setSelectedPonds(prev =>
      prev.includes(pondId) ? prev.filter(id => id !== pondId) : [...prev, pondId]
    );
  };

  const maxHarvestDate =
    stockingDate ? format(addDays(new Date(stockingDate), 200), 'yyyy-MM-dd') : '';

  const plannedHarvestDate =
    stockingDate ? format(addDays(new Date(stockingDate), 180), 'yyyy-MM-dd') : '';

  const onError = (formErrors: any) => {
    console.warn("Insurance form validation errors:", formErrors);
    const firstKey = Object.keys(formErrors)[0];
    if (firstKey) {
      const errorKey = formErrors[firstKey]?.message;
      toast.error(t(errorKey) || "Please fill in all required fields.");
    }
  };

  const onSubmit = async (data: InsuranceForm) => {
    try {
      const session = JSON.parse(localStorage.getItem('aqua-session') || '{}');
      const farmerId = session.farmerId;
      const farmDataStr = localStorage.getItem("aqua-farm");

      if (!farmerId || !farmDataStr) {
        toast.error("Session expired or farm missing. Please login again.");
        return;
      }

      const parsedFarm = JSON.parse(farmDataStr);
      let farmId = parsedFarm.farmId;
      const ponds = parsedFarm.ponds;

      if (!farmId || farmId.length < 24) {
        toast.error("Invalid Farm ID. Please go back to Farm Registration and Save it again.");
        return;
      }

      if (!ponds || ponds.length === 0) {
        toast.error("No ponds registered for this farm. Please complete Farm Registration first.");
        return;
      }

      if (selectedPonds.length === 0) {
        toast.error("Please select at least one pond to insure.");
        return;
      }

      toast.loading(t("common.saving"), { id: 'insurance-save' });

      const firstPondId = selectedPonds[0] || ponds[0]._id || ponds[0].pondId;

      if (!firstPondId || String(firstPondId).length < 24) {
        toast.dismiss('insurance-save');
        toast.error("Invalid Pond ID. Please go back to Farm Registration and Save it again.");
        return;
      }

      const payload = {
        ...data,
        stockingDensity: Number(data.stockingDensity),
        insurancePeriodDays: Number(data.insurancePeriod),
        pondId: firstPondId,
        farmerId,
        farmId,
        plannedHarvestDate,
        maxHarvestDate,
        insuredPondIds: selectedPonds,
      };

      const res = await axios.post("/api/insurances", payload);

      if (res.data.success) {
        // Save selected ponds in localStorage under aqua-farm for Daily Entry display
        parsedFarm.insuredPondIds = selectedPonds;
        localStorage.setItem("aqua-farm", JSON.stringify(parsedFarm));

        toast.dismiss('insurance-save');
        toast.success(t("insurance.saved"));

        localStorage.removeItem("draft_insurance_form");
        localStorage.removeItem("draft_insurance_ponds");

        navigate('/insured-ponds');
      }
    } catch (error: any) {
      toast.dismiss('insurance-save');
      console.error('Insurance submission error:', error);
      toast.error(error.response?.data?.error || t('common.error'));
    }
  };

  return (
    <div className="min-h-[100dvh] bg-stone-50 pb-0 overflow-x-clip flex flex-col text-stone-800 font-sans">
      <SyncIndicator status={syncStatus} />
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');`}</style>

      {/* HEADER */}
      <div className="px-5 pt-8 pb-8 rounded-b-[2.5rem] relative overflow-hidden"
        style={{
          background: 'linear-gradient(140deg, #1c4a3e 0%, #1c6b5a 45%, #2d9b7f 100%)',
          boxShadow: '0 8px 32px -6px rgba(28,74,62,0.28)',
        }}>
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full -mr-10 -mt-10 opacity-10"
          style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/15 text-white border border-white/20 hover:bg-white/25 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-white tracking-tight">
              {t('insurance.title')}
            </h1>
          </div>
          <span className={`text-[10px] font-bold text-white/85 px-2.5 py-1 bg-white/12 rounded-lg border border-white/15 transition-opacity duration-200 ${syncStatus !== 'idle' ? 'opacity-0' : 'opacity-100'}`}>
            Aqua <span className="text-amber-300">AI</span>nsure
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit, onError)} className="px-4 mt-5 space-y-4">

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-5 space-y-4 border border-stone-100 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center">
              <ShieldCheck size={16} className="text-teal-600" />
            </div>
            <h2 className="text-sm font-bold text-stone-700">
              {t('insurance.title')}
            </h2>
          </div>

          {/* STOCKING DATE */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-500 pl-0.5">
              {t('insurance.stockingDate')}
            </label>
            <Input
              {...register('stockingDate')}
              type="date"
              className={`h-12 rounded-xl text-sm border-stone-200 bg-stone-50 focus-visible:ring-teal-500/30 focus-visible:border-teal-500 ${errors.stockingDate ? 'border-red-400 bg-red-50/20' : ''}`}
            />
            {errors.stockingDate && (
              <p className="text-xs text-red-500 font-medium pl-0.5">{t(errors.stockingDate.message as string)}</p>
            )}
          </div>

          {/* STOCKING DENSITY */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-500 pl-0.5">
              {t('insurance.stockingDensity')}
            </label>
            <Input
              {...register('stockingDensity')}
              placeholder={t('insurance.stockingDensity')}
              type="number"
              className={`h-12 rounded-xl text-sm border-stone-200 bg-stone-50 focus-visible:ring-teal-500/30 focus-visible:border-teal-500 ${errors.stockingDensity ? 'border-red-400 bg-red-50/20' : ''}`}
            />
            {errors.stockingDensity && (
              <p className="text-xs text-red-500 font-medium pl-0.5">{t(errors.stockingDensity.message as string)}</p>
            )}
          </div>

          {/* HARVEST DATE AUTO CALC */}
          {plannedHarvestDate && (
            <div className="bg-teal-50 border border-teal-100 rounded-xl p-3.5 text-sm">
              <div>
                <span className="text-teal-600 font-medium">
                  {t('insurance.harvestDate')} :
                </span>
                <span className="font-bold text-teal-800 ml-1">
                  {plannedHarvestDate}
                </span>
              </div>
              <p className="text-xs text-teal-500 mt-1">
                {t('insurance.maxDays')} : {maxHarvestDate}
              </p>
            </div>
          )}

          {/* INSURANCE TYPE */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-500 pl-0.5">
              {t('insurance.type')}
            </label>
            <Select
              onValueChange={(v) => setValue('insuranceType', v, { shouldValidate: true, shouldDirty: true })}
              value={watch('insuranceType')}
            >
              <SelectTrigger className={`h-12 rounded-xl text-sm border-stone-200 bg-stone-50 ${errors.insuranceType ? 'border-red-400 bg-red-50/20' : ''}`}>
                <SelectValue placeholder={t('insurance.type')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">{t('insurance.basic')}</SelectItem>
                <SelectItem value="comprehensive">{t('insurance.comprehensive')}</SelectItem>
              </SelectContent>
            </Select>
            {errors.insuranceType && (
              <p className="text-xs text-red-500 font-medium pl-0.5">{t(errors.insuranceType.message as string)}</p>
            )}
          </div>

          {/* INSURANCE PERIOD */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-500 pl-0.5">
              {t('insurance.period')}
            </label>
            <Select
              onValueChange={(v) => setValue('insurancePeriod', v, { shouldValidate: true, shouldDirty: true })}
              value={watch('insurancePeriod')}
            >
              <SelectTrigger className={`h-12 rounded-xl text-sm border-stone-200 bg-stone-50 ${errors.insurancePeriod ? 'border-red-400 bg-red-50/20' : ''}`}>
                <SelectValue placeholder={t('insurance.period')} />
              </SelectTrigger>
              <SelectContent>
                {[30, 60, 90, 120, 150, 180, 200].map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {d} {t('insurance.days')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.insurancePeriod && (
              <p className="text-xs text-red-500 font-medium pl-0.5">{t(errors.insurancePeriod.message as string)}</p>
            )}
          </div>

          {/* PONDS UNDER INSURANCE */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-500 pl-0.5">
              Ponds Under Insurance
            </label>
            {totalPonds === 0 ? (
              <p className="text-xs text-red-400 pl-1 font-medium">No ponds found. Please complete Farm Registration first.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {allPonds.map((p: any, i: number) => {
                  const id = p._id || p.pondId;
                  const selected = selectedPonds.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => togglePond(id)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                        selected
                          ? 'text-white border-transparent shadow-sm'
                          : 'bg-stone-50 text-stone-500 border-stone-200 hover:border-teal-300'
                      }`}
                      style={selected ? {
                        background: 'linear-gradient(110deg, #1c6b5a, #2d9b7f)',
                        boxShadow: '0 4px 12px -2px rgba(28,107,90,0.25)',
                      } : {}}
                    >
                      Pond {p.pondNumber || i + 1}
                    </button>
                  );
                })}
              </div>
            )}
            {selectedPonds.length > 0 ? (
              <p className="text-[10px] text-teal-600 pl-1 font-medium">
                {selectedPonds.length} pond{selectedPonds.length > 1 ? 's' : ''} selected for insurance
              </p>
            ) : (
              <p className="text-[10px] text-amber-600 pl-1 font-medium">
                Please select at least one pond to insure
              </p>
            )}
          </div>

          {/* SPECIES */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-500 pl-0.5">
              {t('insurance.species')}
            </label>
            <Select
              onValueChange={(v) => setValue('species', v, { shouldValidate: true, shouldDirty: true })}
              value={watch('species')}
            >
              <SelectTrigger className={`h-12 rounded-xl text-sm border-stone-200 bg-stone-50 ${errors.species ? 'border-red-400 bg-red-50/20' : ''}`}>
                <SelectValue placeholder={t('insurance.species')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vannamei">{t('insurance.vannamei')}</SelectItem>
                <SelectItem value="tiger">{t('insurance.tiger')}</SelectItem>
              </SelectContent>
            </Select>
            {errors.species && (
              <p className="text-xs text-red-500 font-medium pl-0.5">{t(errors.species.message as string)}</p>
            )}
          </div>
        </motion.div>

        {/* SAVE BUTTON */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-12 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
          style={{
            background: 'linear-gradient(110deg, #1c6b5a 20%, #2d9b7f 55%, #1c6b5a 80%)',
            boxShadow: '0 6px 24px -4px rgba(28,107,90,0.30)',
          }}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{t('common.saving')}</span>
            </>
          ) : (
            t('insurance.save')
          )}
        </Button>

      </form>

      <BottomNav />
    </div>
  );
};

export default InsuranceRegistration;
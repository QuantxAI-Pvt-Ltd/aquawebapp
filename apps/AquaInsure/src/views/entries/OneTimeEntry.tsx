import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ChevronLeft, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { fileToBase64 } from "@/lib/fileUtils";
import axios from "axios";

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

  // Start with clean state — file fields (File objects) cannot be serialized
  // to localStorage, so we never persist or load them from there.
  const [data, setData] = useState<Record<string, any>>({});

  const updateField = (key: string, value: any) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    try {
      const farmDataStr = localStorage.getItem("aqua-farm");
      if (!farmDataStr) {
        toast.error("Farm data missing. Please complete registration first.");
        return;
      }

      const farmData = JSON.parse(farmDataStr);
      const ponds = farmData.ponds;

      if (!ponds || ponds.length === 0) {
        toast.error("No ponds registered for this farm.");
        return;
      }

      toast.loading(t("common.saving"), { id: 'onetime-save' });

      // Apply to first pond by default in this wizard flow
      const firstPondId = ponds[0]._id || ponds[0].pondId;

      if (!firstPondId || String(firstPondId).length < 24) {
        toast.dismiss('onetime-save');
        toast.error("Invalid Pond ID. Please go back to Farm Registration and Save it to generate valid MongoDB ObjectIds.");
        return;
      }

      const pondPrepBillsBase64 = await fileToBase64(data.pondPrepBills);
      const pcrCertificateBase64 = await fileToBase64(data.pcrCertificate);
      const seedBillsBase64 = await fileToBase64(data.seedBills);
      const regCertificateBase64 = await fileToBase64(data.regCertificate);

      const payload = {
        pondId: firstPondId,
        pondPreparation: {
          followedPractices: data.followedPractices === "yes",
          pondPrepBills: pondPrepBillsBase64
        },
        seedSelection: {
          pcrTesting: data.pcrTesting === "yes",
          pcrCertificate: pcrCertificateBase64,
          seedBills: seedBillsBase64
        },
        registrationCertificate: regCertificateBase64
      };

      const res = await axios.post("/api/entries/one-time", payload);

      if (res.data.success) {
        toast.dismiss('onetime-save');
        toast.success(t("entries.saved"));
        setTimeout(() => navigate("/entries/daily"), 1000);
      }
    } catch (error: any) {
      toast.dismiss('onetime-save');
      console.error('OneTimeEntry submission error:', error);
      toast.error(error.response?.data?.error || t('common.error'));
    }
  };



  return (
    <div className="min-h-screen bg-stone-50 pb-32 overflow-x-hidden"
      style={{ fontFamily: "'Sora', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');`}</style>

      {/* HEADER */}
      <div className="px-5 pt-14 pb-9 rounded-b-[2.5rem] relative overflow-hidden"
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

        {/* Farm Registration */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-5 space-y-1 border border-stone-100 shadow-sm"
        >
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
            {t("entries.farmRegistration")}
          </h3>
          <label className="w-full h-12 rounded-xl border border-stone-200 bg-stone-50 flex items-center justify-center gap-2 text-sm cursor-pointer hover:bg-stone-100 transition-colors mt-2">
            <Upload size={16} className="text-teal-600" />
            <span className="truncate text-stone-500 font-medium">
              {data.regCertificate ? (data.regCertificate as File).name : t("entries.uploadRegCertificate")}
            </span>
            <input type="file" className="hidden" onChange={(e) => updateField("regCertificate", e.target.files?.[0])} />
          </label>
        </motion.div>

        {/* Pond Preparation */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-5 space-y-1 border border-stone-100 shadow-sm"
        >
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
            {t("entries.pondPrep")}
          </h3>
          <YesNo label={t("entries.followedPractices")} field="followedPractices" value={data.followedPractices} onChange={updateField} />
          <label className="w-full h-12 rounded-xl border border-stone-200 bg-stone-50 flex items-center justify-center gap-2 text-sm cursor-pointer hover:bg-stone-100 transition-colors mt-2">
            <Upload size={16} className="text-teal-600" />
            <span className="truncate text-stone-500 font-medium">
              {data.pondPrepBills ? (data.pondPrepBills as File).name : t("entries.uploadBills")}
            </span>
            <input type="file" className="hidden" onChange={(e) => updateField("pondPrepBills", e.target.files?.[0])} />
          </label>
        </motion.div>

        {/* Seed Selection */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-2xl p-5 space-y-1 border border-stone-100 shadow-sm"
        >
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
            {t("entries.seedSelection")}
          </h3>
          <YesNo label={t("entries.pcrTesting")} field="pcrTesting" value={data.pcrTesting} onChange={updateField} />
          {[
            { key: 'pcrCertificate', label: t("entries.uploadPCR") },
            { key: 'seedBills', label: t("entries.uploadBills") },
          ].map(({ key, label }) => (
            <label key={key} className="w-full h-12 rounded-xl border border-stone-200 bg-stone-50 flex items-center justify-center gap-2 text-sm cursor-pointer hover:bg-stone-100 transition-colors mt-2">
              <Upload size={16} className="text-teal-600" />
              <span className="truncate text-stone-500 font-medium">
                {data[key] ? (data[key] as File).name : label}
              </span>
              <input type="file" className="hidden" onChange={(e) => updateField(key, e.target.files?.[0])} />
            </label>
          ))}
        </motion.div>

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

      <BottomNav />
    </div>
  );
};

export default OneTimeEntry;
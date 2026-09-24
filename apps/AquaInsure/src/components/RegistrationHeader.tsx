import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";
import { SyncStatus } from "@/components/SyncIndicator";

export interface RegistrationHeaderProps {
  currentStep: number; // 0: Farmer, 1: Farm, 2: Insurance, 3: Ponds
  title?: string;
  isEditMode?: boolean;
  onBack?: () => void;
  syncStatus?: SyncStatus;
}

export const REGISTRATION_STEPS = [
  { id: 0, title: "Farmer", route: "/farmer-registration" },
  { id: 1, title: "Farm", route: "/farm-registration" },
  { id: 2, title: "Insurance", route: "/insurance-registration" },
  { id: 3, title: "Ponds", route: "/insured-ponds" },
];

export default function RegistrationHeader({
  currentStep,
  title,
  isEditMode = false,
  onBack,
  syncStatus = "idle",
}: RegistrationHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (isEditMode) {
      navigate("/settings");
      return;
    }
    if (currentStep === 0) {
      navigate(-1);
    } else {
      const prevStep = REGISTRATION_STEPS[currentStep - 1];
      if (prevStep) navigate(prevStep.route);
      else navigate(-1);
    }
  };

  const handleStepClick = (targetStep: number) => {
    if (targetStep === currentStep) return;
    // Allow jumping to any previously visited step or immediate next step
    const target = REGISTRATION_STEPS[targetStep];
    if (target) {
      navigate(target.route);
    }
  };

  const defaultTitles = ["Farmer Registration", "Farm Details", "Insurance Setup", "Insured Ponds"];
  const displayTitle = title || (isEditMode ? "Edit Profile" : defaultTitles[currentStep] || "Registration");

  return (
    <div
      className="px-5 pt-8 pb-6 rounded-b-[2.5rem] relative overflow-hidden shrink-0"
      style={{
        background: "linear-gradient(140deg, #1c4a3e 0%, #1c6b5a 45%, #2d9b7f 100%)",
        boxShadow: "0 8px 32px -6px rgba(28,74,62,0.28)",
      }}
    >
      {/* Ambient background decoration */}
      <div
        className="absolute top-0 right-0 w-36 h-36 rounded-full -mr-12 -mt-12 opacity-10"
        style={{ background: "radial-gradient(circle, #fff 0%, transparent 70%)" }}
      />

      {/* Top row: Back button, Title & Badge */}
      <div className="flex items-center justify-between relative z-10 mb-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/15 text-white border border-white/20 hover:bg-white/25 transition-all active:scale-95"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight leading-tight">
              {displayTitle}
            </h1>
            <p className="text-[10px] text-white/70 font-medium">
              Step {currentStep + 1} of 4 · {REGISTRATION_STEPS[currentStep]?.title} Details
            </p>
          </div>
        </div>
        <span
          className={`text-[10px] font-bold text-white/85 px-2.5 py-1 bg-white/12 rounded-lg border border-white/15 transition-opacity duration-200 ${
            syncStatus !== "idle" ? "opacity-0" : "opacity-100"
          }`}
        >
          Aqua <span className="text-amber-300">AI</span>nsure
        </span>
      </div>

      {/* 4-Step Interactive Progress Bar */}
      <div className="flex items-center gap-1.5 relative z-10 px-0.5">
        {REGISTRATION_STEPS.map((s, i) => {
          const isDone = i < currentStep;
          const isCurrent = i === currentStep;
          const isClickable = i <= currentStep;

          return (
            <div key={s.id} className="flex items-center gap-1.5 flex-1">
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => handleStepClick(i)}
                className={`flex flex-col items-center gap-1 flex-1 group transition-all text-left ${
                  isClickable ? "cursor-pointer active:scale-95" : "cursor-not-allowed opacity-50"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                    isDone
                      ? "bg-amber-400 text-amber-950 shadow-sm ring-2 ring-amber-300/40"
                      : isCurrent
                      ? "bg-white text-teal-800 shadow-md ring-2 ring-white/60"
                      : "bg-white/15 text-white/50 border border-white/15"
                  }`}
                >
                  {isDone ? "✓" : i + 1}
                </div>
                <p
                  className={`text-[9px] uppercase font-bold tracking-wider whitespace-nowrap transition-colors ${
                    isCurrent ? "text-white" : isDone ? "text-amber-300/90" : "text-white/40"
                  }`}
                >
                  {s.title}
                </p>
              </button>
              {i < REGISTRATION_STEPS.length - 1 && (
                <div
                  className={`h-[2px] flex-1 mb-4 rounded-full transition-all ${
                    i < currentStep ? "bg-amber-400/80" : "bg-white/15"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Continuous progress line */}
      <div className="mt-3.5 h-1 bg-white/15 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-300"
          initial={{ width: `${((currentStep + 1) / 4) * 100}%` }}
          animate={{ width: `${((currentStep + 1) / 4) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  );
}

import { useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";
import { SyncStatus } from "@/components/SyncIndicator";

export interface RegistrationHeaderProps {
  currentStep: number; // 0 to 6
  title?: string;
  isEditMode?: boolean;
  onBack?: () => void;
  syncStatus?: SyncStatus;
}

export const REGISTRATION_STEPS = [
  { id: 0, title: "Farmer Personal", shortTitle: "Personal", route: "/farmer-registration" },
  { id: 1, title: "Farmer Address", shortTitle: "Address", route: "/farmer-address" },
  { id: 2, title: "Identity & Bank", shortTitle: "KYC & Bank", route: "/farmer-kyc" },
  { id: 3, title: "Farm Location", shortTitle: "Location", route: "/farm-registration" },
  { id: 4, title: "Farm Setup & Infra", shortTitle: "Setup", route: "/farm-setup" },
  { id: 5, title: "Insurance Policy", shortTitle: "Insurance", route: "/insurance-registration" },
  { id: 6, title: "Insured Ponds", shortTitle: "Ponds", route: "/insured-ponds" },
];

export default function RegistrationHeader({
  currentStep,
  title,
  isEditMode = false,
  onBack,
  syncStatus = "idle",
}: RegistrationHeaderProps) {
  const navigate = useNavigate();
  const stepperRef = useRef<HTMLDivElement>(null);

  // Auto-scroll active step into view
  useEffect(() => {
    if (stepperRef.current) {
      const activeEl = stepperRef.current.children[currentStep] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
  }, [currentStep]);

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
      navigate("/dashboard");
    } else {
      const prev = REGISTRATION_STEPS[currentStep - 1];
      if (prev) navigate(prev.route);
      else navigate(-1);
    }
  };

  const handleStepClick = (targetStep: number) => {
    if (targetStep === currentStep) return;
    // Allow jumping to any visited/completed step or immediate next step
    const target = REGISTRATION_STEPS[targetStep];
    if (target) {
      navigate(target.route);
    }
  };

  const displayTitle =
    title ||
    (isEditMode
      ? "Edit Profile"
      : `Step ${currentStep + 1}: ${REGISTRATION_STEPS[currentStep]?.shortTitle || "Registration"}`);

  return (
    <div
      className="px-4 pt-7 pb-5 rounded-b-[2rem] relative overflow-hidden shrink-0"
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
      <div className="flex items-center justify-between relative z-10 mb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/15 text-white border border-white/20 hover:bg-white/25 transition-all active:scale-95"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight leading-tight">
              {displayTitle}
            </h1>
            <p className="text-[10px] text-white/70 font-medium">
              Step {currentStep + 1} of 7 · {REGISTRATION_STEPS[currentStep]?.title}
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

      {/* 7-Step Interactive Scrollable Stepper */}
      <div
        ref={stepperRef}
        className="flex items-center gap-1.5 overflow-x-auto no-scrollbar relative z-10 py-1 px-0.5 scroll-smooth"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {REGISTRATION_STEPS.map((s, i) => {
          const isDone = i < currentStep;
          const isCurrent = i === currentStep;
          const isClickable = i <= currentStep;

          return (
            <div key={s.id} className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => handleStepClick(i)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all ${
                  isCurrent
                    ? "bg-white text-teal-900 shadow-md ring-2 ring-white/60 font-bold"
                    : isDone
                    ? "bg-amber-400 text-amber-950 font-bold hover:bg-amber-300 active:scale-95 cursor-pointer"
                    : "bg-white/15 text-white/50 border border-white/15 cursor-not-allowed opacity-60"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-extrabold ${
                    isCurrent
                      ? "bg-teal-700 text-white"
                      : isDone
                      ? "bg-amber-900 text-amber-100"
                      : "bg-white/20 text-white/70"
                  }`}
                >
                  {isDone ? "✓" : i + 1}
                </span>
                <span className="text-[10px] whitespace-nowrap tracking-tight">
                  {s.shortTitle}
                </span>
              </button>

              {i < REGISTRATION_STEPS.length - 1 && (
                <div
                  className={`w-2 h-[2px] rounded-full shrink-0 transition-all ${
                    i < currentStep ? "bg-amber-400/80" : "bg-white/20"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Progress Line */}
      <div className="mt-3 h-1 bg-white/15 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-300"
          initial={{ width: `${((currentStep + 1) / 7) * 100}%` }}
          animate={{ width: `${((currentStep + 1) / 7) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  );
}

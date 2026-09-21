import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  User,
  Landmark,
  ShieldCheck,
  BarChart3,
  ClipboardList,
  CalendarDays,
  Waves,
  ShieldAlert,
  ArrowUpRight
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import axios from "@/lib/api";

const dashboardCards = [
  // — Farmer Registration section (warm amber / gold theme) —
  {
    icon: User,
    labelKey: "dashboard.farmer",
    descKey: "dashboard.descFarmer",
    path: "/profile",
    accent: "#b5813a",
    iconBg: "linear-gradient(135deg, #fff9f0 0%, #fef3c7 100%)",
    iconBorder: "#fde68a",
    glow: "rgba(181,129,58,0.12)",
  },
  {
    icon: Landmark,
    labelKey: "dashboard.farm",
    descKey: "dashboard.descFarm",
    path: "/farm-detail",
    accent: "#c9922a",
    iconBg: "linear-gradient(135deg, #fffbeb 0%, #fef08a 100%)",
    iconBorder: "#fde047",
    glow: "rgba(201,146,42,0.12)",
  },
  {
    icon: ShieldCheck,
    labelKey: "dashboard.insurance",
    descKey: "dashboard.descInsurance",
    path: "/insurance-detail",
    accent: "#a67030",
    iconBg: "linear-gradient(135deg, #fffbf0 0%, #fed7aa 100%)",
    iconBorder: "#fdba74",
    glow: "rgba(166,112,48,0.10)",
  },
  {
    icon: ShieldAlert,
    labelKey: "dashboard.claims",
    descKey: "dashboard.descClaims",
    path: "/claims",
    accent: "#c2410c",
    iconBg: "linear-gradient(135deg, #fff5f0 0%, #ffedd5 100%)",
    iconBorder: "#fed7aa",
    glow: "rgba(194,65,12,0.12)",
  },
  // — Record Keeping section (teal / emerald theme) —
  {
    icon: Waves,
    labelKey: "dashboard.insuredPonds",
    descKey: "dashboard.descInsuredPonds",
    path: "/insured-ponds",
    accent: "#0d9488",
    iconBg: "linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)",
    iconBorder: "#99f6e4",
    glow: "rgba(13,148,136,0.12)",
  },
  {
    icon: ClipboardList,
    labelKey: "dashboard.oneTime",
    descKey: "dashboard.descOneTime",
    path: "/entries/one-time",
    accent: "#1c6b5a",
    iconBg: "linear-gradient(135deg, #f0faf6 0%, #d1fae5 100%)",
    iconBorder: "#a7f3d0",
    glow: "rgba(28,107,90,0.12)",
  },
  {
    icon: CalendarDays,
    labelKey: "dashboard.daily",
    descKey: "dashboard.descDaily",
    path: "/entries/daily",
    accent: "#059669",
    iconBg: "linear-gradient(135deg, #ecfdf5 0%, #a7f3d0 100%)",
    iconBorder: "#6ee7b7",
    glow: "rgba(5,150,105,0.14)",
  },
  {
    icon: BarChart3,
    labelKey: "dashboard.reports",
    descKey: "dashboard.descReports",
    path: "/reports",
    accent: "#0f766e",
    iconBg: "linear-gradient(135deg, #f0fdfa 0%, #99f6e4 100%)",
    iconBorder: "#5eead4",
    glow: "rgba(15,118,110,0.12)",
  },
];

const EASE = [0.16, 1, 0.3, 1] as const;

const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    const sessionStr = localStorage.getItem('aqua-session');
    if (!sessionStr) {
      navigate('/login', { replace: true });
      return;
    }

    const regComplete = localStorage.getItem('aqua-reg-complete');
    if (regComplete !== '1') {
      axios.get('/api/auth/status')
        .then((res) => {
          if (res.data.success) {
            const { isProfileComplete, onboardingStep, farmData, name } = res.data;
            if (name) localStorage.setItem('shrimpguard-farmer', JSON.stringify({ name }));
            if (farmData) localStorage.setItem('aqua-farm', JSON.stringify(farmData));
            localStorage.setItem('aqua-reg-complete', isProfileComplete ? '1' : '0');

            if (!isProfileComplete) {
              switch (onboardingStep) {
                case 'farmer_registration':
                  navigate('/farmer-registration', { replace: true });
                  break;
                case 'farm_registration':
                  navigate('/farm-registration', { replace: true });
                  break;
                case 'insurance_registration':
                  navigate('/insurance-registration', { replace: true });
                  break;
                case 'insured_ponds':
                  navigate('/insured-ponds', { replace: true });
                  break;
                default:
                  navigate('/farmer-registration', { replace: true });
              }
            }
          }
        })
        .catch(() => {
          navigate('/farmer-registration', { replace: true });
        });
    }
  }, [navigate]);

  const farmer = JSON.parse(localStorage.getItem("shrimpguard-farmer") || "{}");
  const displayName = farmer?.name || t("dashboard.farmerDefault");

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=DM+Serif+Display:ital@0;1&display=swap');
        * { -webkit-font-smoothing: antialiased; box-sizing: border-box; }

        .dash-card {
          transition: transform .22s cubic-bezier(.16,1,.3,1), box-shadow .22s;
          cursor: pointer;
        }
        .dash-card:hover  { transform: translateY(-3px); }
        .dash-card:active { transform: scale(0.97); }

        .header-clip {
          border-radius: 0 0 2.5rem 2.5rem;
        }
      `}</style>

      <div
        className="min-h-[100dvh] bg-stone-50 dark:bg-stone-950 flex flex-col relative overflow-x-clip pb-0"
        style={{ fontFamily: "'Sora', sans-serif" }}
      >
        {/* HEADER */}
        <div
          className="header-clip relative overflow-hidden z-10 px-5 sm:px-6 pt-7 sm:pt-8 pb-7 sm:pb-8"
          style={{
            background: "linear-gradient(140deg, #1c4a3e 0%, #1c6b5a 45%, #2d9b7f 100%)",
            boxShadow: "0 8px 32px -6px rgba(28,74,62,0.28)",
          }}
        >
          <div className="flex items-start justify-between relative z-10">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.85, delay: 0.15, ease: EASE }}
            >
              <p className="text-white/65 text-[11px] font-semibold uppercase tracking-[0.22em] mb-1">
                {t("dashboard.welcome")}
              </p>
              <h1
                className="leading-tight text-white"
                style={{
                  fontFamily: "'DM Serif Display', serif",
                  fontSize: "clamp(1.65rem, 7vw, 2.35rem)",
                  fontWeight: 400,
                  letterSpacing: "-0.01em",
                }}
              >
                {displayName}
              </h1>
            </motion.div>

            <span className="text-[10px] font-bold text-white/90 px-3 py-1.5 bg-white/15 backdrop-blur-sm rounded-xl border border-white/20 shrink-0 mt-1 shadow-sm">
              Aqua <span className="text-amber-300">AI</span>nsure
            </span>
          </div>
        </div>

        {/* SECTIONS */}
        <div className="relative z-10 flex-1 px-4 sm:px-5 pt-5 pb-6 space-y-6">

          {[
            {
              title: "Farmer Registration",
              cards: dashboardCards.slice(0, 4),
              sectionBg: "rgba(181,129,58,0.05)",
              sectionBorder: "rgba(181,129,58,0.16)",
              titleColor: "#b5813a",
              badgeBg: "bg-amber-50 text-amber-900 border-amber-200/80",
            },
            {
              title: "Record Keeping",
              cards: dashboardCards.slice(4, 8),
              sectionBg: "rgba(28,107,90,0.05)",
              sectionBorder: "rgba(28,107,90,0.16)",
              titleColor: "#1c6b5a",
              badgeBg: "bg-teal-50 text-teal-900 border-teal-200/80",
            },
          ].map((section, sIdx) => (
            <div key={section.title}
              className="rounded-3xl p-3.5 sm:p-4 transition-all"
              style={{ background: section.sectionBg, border: `1.5px solid ${section.sectionBorder}` }}
            >
              {/* Section Header */}
              <div className="flex items-center justify-between mb-3.5 px-1">
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + sIdx * 0.15, ease: EASE }}
                  className="flex items-center gap-2"
                >
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: section.titleColor }} />
                  <span className="text-[11px] uppercase font-bold tracking-[0.16em]" style={{ color: section.titleColor }}>
                    {section.title}
                  </span>
                </motion.div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${section.badgeBg}`}>
                  {section.cards.length} modules
                </span>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-2 gap-3 sm:gap-3.5">
                {section.cards.map((card, idx) => (
                  <motion.div
                    key={card.path}
                    className="dash-card group"
                    onClick={() => navigate(card.path)}
                    initial={{ opacity: 0, y: 22 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 + sIdx * 0.15 + idx * 0.06, duration: 0.5, ease: EASE }}
                  >
                    <div
                      className="rounded-2xl p-4 flex flex-col justify-between bg-white dark:bg-stone-900 h-full min-h-[142px] sm:min-h-[152px] relative overflow-hidden transition-all duration-200 border border-stone-200/80 dark:border-stone-800"
                      style={{
                        boxShadow: `0 4px 18px -4px ${card.glow}, 0 2px 5px rgba(0,0,0,0.03)`,
                      }}
                    >
                      {/* Top row: Icon Badge + Micro Arrow */}
                      <div className="flex items-center justify-between w-full mb-3">
                        <div
                          className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shadow-sm shrink-0"
                          style={{
                            background: card.iconBg,
                            border: `1.5px solid ${card.iconBorder}`,
                          }}
                        >
                          <card.icon size={22} style={{ color: card.accent }} strokeWidth={2.2} />
                        </div>

                        <div className="w-7 h-7 rounded-full bg-stone-50 dark:bg-stone-800 border border-stone-200/70 dark:border-stone-700 flex items-center justify-center text-stone-400 group-hover:text-teal-700 group-hover:bg-teal-50 group-hover:border-teal-200 transition-all duration-200">
                          <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
                        </div>
                      </div>

                      {/* Bottom row: Title + Description */}
                      <div className="flex flex-col justify-end mt-auto">
                        <h3 className="text-[13px] sm:text-sm font-bold text-stone-800 dark:text-stone-100 tracking-tight leading-snug group-hover:text-teal-800 transition-colors">
                          {t(card.labelKey)}
                        </h3>
                        <p className="text-[11px] font-medium text-stone-500 dark:text-stone-400 leading-snug mt-0.5 line-clamp-1">
                          {t(card.descKey)}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* COPYRIGHT */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.8 }}
          className="relative z-10 text-center text-[9px] font-medium py-3 tracking-wide text-stone-400 dark:text-stone-600"
        >
          {t("auth.copyright")}
        </motion.p>

        <BottomNav />
      </div>
    </>
  );
};

export default Dashboard;
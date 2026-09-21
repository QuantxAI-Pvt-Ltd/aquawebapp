import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  User,
  Landmark,
  ShieldCheck,
  BarChart3,
  ClipboardList,
  CalendarDays,
  Waves,
  ShieldAlert
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import axios from "@/lib/api";

const dashboardCards = [
  // — Farmer Registration section (warm amber / beige) —
  {
    icon: User,
    labelKey: "dashboard.farmer",
    descKey: "dashboard.descFarmer",
    path: "/profile",
    accent: "#b5813a",
    bg: "rgba(181,129,58,0.08)",
    border: "rgba(181,129,58,0.20)",
    glow: "rgba(181,129,58,0.12)",
    iconBg: "#fffdf9",
  },
  {
    icon: Landmark,
    labelKey: "dashboard.farm",
    descKey: "dashboard.descFarm",
    path: "/farm-detail",
    accent: "#c9922a",
    bg: "rgba(201,146,42,0.08)",
    border: "rgba(201,146,42,0.20)",
    glow: "rgba(201,146,42,0.12)",
    iconBg: "#fffdf5",
  },
  {
    icon: ShieldCheck,
    labelKey: "dashboard.insurance",
    descKey: "dashboard.descInsurance",
    path: "/insurance-detail",
    accent: "#a67030",
    bg: "rgba(166,112,48,0.08)",
    border: "rgba(166,112,48,0.20)",
    glow: "rgba(166,112,48,0.10)",
    iconBg: "#fef9ee",
  },
  {
    icon: ShieldAlert,
    labelKey: "dashboard.claims",
    descKey: "dashboard.descClaims",
    path: "/claims",
    accent: "#b54d2a",
    bg: "rgba(181,77,42,0.08)",
    border: "rgba(181,77,42,0.20)",
    glow: "rgba(181,77,42,0.12)",
    iconBg: "#fff8f5",
  },
  {
    icon: Waves,
    labelKey: "dashboard.insuredPonds",
    descKey: "dashboard.descInsuredPonds",
    path: "/insured-ponds",
    accent: "#1c6b5a",
    bg: "rgba(28,107,90,0.08)",
    border: "rgba(28,107,90,0.20)",
    glow: "rgba(28,107,90,0.12)",
    iconBg: "#f4fbf9",
  },
  {
    icon: CalendarDays,
    labelKey: "dashboard.daily",
    descKey: "dashboard.descDaily",
    path: "/entries/daily",
    accent: "#1c6b5a",
    bg: "rgba(28,107,90,0.08)",
    border: "rgba(28,107,90,0.20)",
    glow: "rgba(28,107,90,0.12)",
    iconBg: "#f4fbf9",
  },
  {
    icon: ClipboardList,
    labelKey: "dashboard.oneTime",
    descKey: "dashboard.descOneTime",
    path: "/entries/one-time",
    accent: "#245749",
    bg: "rgba(36,87,73,0.08)",
    border: "rgba(36,87,73,0.20)",
    glow: "rgba(36,87,73,0.10)",
    iconBg: "#f6faf9",
  },
  {
    icon: BarChart3,
    labelKey: "dashboard.reports",
    descKey: "dashboard.descReports",
    path: "/reports",
    accent: "#2d9b7f",
    bg: "rgba(45,155,127,0.08)",
    border: "rgba(45,155,127,0.20)",
    glow: "rgba(45,155,127,0.12)",
    iconBg: "#f4fbf9",
  },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Guard: if user is logged in, check profile completion status.
  // Resume multi-stage onboarding if profile is incomplete.
  useEffect(() => {
    const session = JSON.parse(localStorage.getItem('aqua-session') || '{}');
    if (!session.token && !session.farmerId) {
      navigate('/login', { replace: true });
      return;
    }

    if (session.farmerId) {
      axios.get(`/api/farmers/${session.farmerId}/profile-status`)
        .then((res) => {
          if (res.data?.success) {
            const { isProfileComplete, onboardingStep, name, farmData } = res.data.data;
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
          cursor: pointer;
        }
        .dash-card:active { transform: scale(0.98); }

        .header-clip {
          border-radius: 0 0 2.5rem 2.5rem;
        }
      `}</style>

      <div
        className="min-h-[100dvh] bg-stone-50 flex flex-col relative overflow-x-clip pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]"
        style={{ fontFamily: "'Sora', sans-serif" }}
      >
        {/* HEADER */}
        <div
          className="header-clip relative overflow-hidden z-10 px-5 sm:px-6 pt-7 sm:pt-8 pb-6 sm:pb-7"
          style={{
            background: "linear-gradient(140deg, #1c4a3e 0%, #1c6b5a 45%, #2d9b7f 100%)",
            boxShadow: "0 8px 32px -6px rgba(28,74,62,0.28)",
          }}
        >
          <div className="flex items-start justify-between relative z-10">
            <div>
              <p className="text-white/60 text-[10px] font-semibold uppercase tracking-[0.22em] mb-1">
                {t("dashboard.welcome")}
              </p>
              <h1
                className="leading-tight text-white"
                style={{
                  fontFamily: "'DM Serif Display', serif",
                  fontSize: "clamp(1.5rem, 6.5vw, 2.2rem)",
                  fontWeight: 400,
                  letterSpacing: "-0.01em",
                }}
              >
                {displayName}
              </h1>
            </div>

            <span className="text-[10px] font-bold text-white/85 px-2.5 py-1 bg-white/12 rounded-lg border border-white/15 shrink-0 mt-1">
              Aqua <span className="text-amber-300">AI</span>nsure
            </span>
          </div>
        </div>

        {/* SECTIONS */}
        <div className="relative z-10 flex-1 px-3.5 sm:px-5 pt-4 sm:pt-5 pb-2 space-y-4 sm:space-y-5">

          {[
            {
              title: "Farmer Registration",
              cards: dashboardCards.slice(0, 4),
              sectionBg: "rgba(181,129,58,0.06)",
              sectionBorder: "rgba(181,129,58,0.18)",
              titleColor: "#b5813a",
              gridCols: "grid-cols-2",
            },
            {
              title: "Record Keeping",
              cards: dashboardCards.slice(4, 8),
              sectionBg: "rgba(28,107,90,0.06)",
              sectionBorder: "rgba(28,107,90,0.18)",
              titleColor: "#1c6b5a",
              gridCols: "grid-cols-2",
            },
          ].map((section) => (
            <div key={section.title}
              className="rounded-2xl p-3"
              style={{ background: section.sectionBg, border: `1.5px solid ${section.sectionBorder}` }}
            >
              {/* Section title */}
              <p
                className="text-[10px] uppercase font-bold tracking-[0.18em] mb-3 pl-1"
                style={{ color: section.titleColor }}
              >
                {section.title}
              </p>

              {/* 2-card row */}
              <div className={`grid ${section.gridCols} gap-3`}>
                {section.cards.map((card) => (
                  <div
                    key={card.path}
                    className="dash-card"
                    onClick={() => navigate(card.path)}
                  >
                    <div
                      className="rounded-2xl p-3 sm:p-4 flex flex-col items-start gap-2.5 bg-white h-full"
                      style={{
                        border: `1px solid ${card.border}`,
                        boxShadow: `0 2px 16px -4px ${card.glow}, 0 1px 4px rgba(0,0,0,0.04)`,
                      }}
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{
                          background: card.iconBg,
                          border: `1px solid ${card.border}`,
                        }}
                      >
                        <card.icon size={17} style={{ color: card.accent }} />
                      </div>

                      <span className="text-[10px] sm:text-[11px] font-bold leading-snug tracking-wide text-stone-700">
                        {t(card.labelKey)}
                      </span>

                      <p className="text-[9px] font-medium leading-snug mt-auto" style={{ color: card.accent, opacity: 0.75 }}>
                        {t(card.descKey)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* COPYRIGHT */}
        <p className="relative z-10 text-center text-[8px] sm:text-[9px] font-medium py-3 tracking-wide text-stone-300">
          {t("auth.copyright")}
        </p>

        <BottomNav />
      </div>
    </>
  );
};

export default Dashboard;
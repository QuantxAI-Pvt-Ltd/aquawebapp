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
  ShieldAlert
} from "lucide-react";
import BottomNav from "@/components/BottomNav";

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
    glow: "rgba(28,107,90,0.10)",
    iconBg: "#f0faf6",
  },
  // — Record Keeping section (teal / green) —
  {
    icon: ClipboardList,
    labelKey: "dashboard.oneTime",
    descKey: "dashboard.descOneTime",
    path: "/entries/one-time",
    accent: "#1c6b5a",
    bg: "rgba(28,107,90,0.08)",
    border: "rgba(28,107,90,0.20)",
    glow: "rgba(28,107,90,0.12)",
    iconBg: "#f0faf6",
  },
  {
    icon: CalendarDays,
    labelKey: "dashboard.daily",
    descKey: "dashboard.descDaily",
    path: "/entries/daily",
    accent: "#2d9b7f",
    bg: "rgba(45,155,127,0.08)",
    border: "rgba(45,155,127,0.20)",
    glow: "rgba(45,155,127,0.12)",
    iconBg: "#edfaf4",
  },
  {
    icon: BarChart3,
    labelKey: "dashboard.reports",
    descKey: "dashboard.descReports",
    path: "/reports",
    accent: "#0f766e",
    bg: "rgba(15,118,110,0.08)",
    border: "rgba(15,118,110,0.20)",
    glow: "rgba(15,118,110,0.10)",
    iconBg: "#f0f9f7",
  },
];

const EASE = [0.16, 1, 0.3, 1] as const;

const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const farmer = JSON.parse(localStorage.getItem("shrimpguard-farmer") || "{}");
  const displayName = farmer?.name || t("dashboard.farmerDefault");

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=DM+Serif+Display:ital@0;1&display=swap');
        * { -webkit-font-smoothing: antialiased; box-sizing: border-box; }

        .dash-card {
          transition: transform .2s cubic-bezier(.16,1,.3,1), box-shadow .2s;
          cursor: pointer;
        }
        .dash-card:hover  { transform: translateY(-2px); }
        .dash-card:active { transform: scale(0.96); }

        .header-clip {
          border-radius: 0 0 2.5rem 2.5rem;
        }
      `}</style>

      <div
        className="min-h-screen bg-stone-50 flex flex-col relative overflow-hidden"
        style={{ fontFamily: "'Sora', sans-serif", paddingBottom: "96px" }}
      >
        {/* HEADER */}
        <div
          className="header-clip relative overflow-hidden z-10 px-6 pt-8 pb-7"
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
              <p className="text-white/55 text-[10px] font-semibold uppercase tracking-[0.22em] mb-1">
                {t("dashboard.welcome")}
              </p>
              <h1
                className="leading-tight text-white"
                style={{
                  fontFamily: "'DM Serif Display', serif",
                  fontSize: "clamp(1.7rem, 7vw, 2.3rem)",
                  fontWeight: 400,
                  letterSpacing: "-0.01em",
                }}
              >
                {displayName}
              </h1>
            </motion.div>

            <span className="text-[10px] font-bold text-white/85 px-2.5 py-1 bg-white/12 rounded-lg border border-white/15 shrink-0 mt-1">
              Aqua <span className="text-amber-300">AI</span>nsure
            </span>
          </div>
        </div>

        {/* SECTIONS */}
        <div className="relative z-10 flex-1 px-4 sm:px-5 pt-5 pb-2 space-y-5">

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
              cards: dashboardCards.slice(4, 7),
              sectionBg: "rgba(28,107,90,0.06)",
              sectionBorder: "rgba(28,107,90,0.18)",
              titleColor: "#1c6b5a",
              gridCols: "grid-cols-3",
            },
          ].map((section, sIdx) => (
            <div key={section.title}
              className="rounded-2xl p-3"
              style={{ background: section.sectionBg, border: `1.5px solid ${section.sectionBorder}` }}
            >
              {/* Section title */}
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.30 + sIdx * 0.15, ease: EASE }}
                className="text-[10px] uppercase font-bold tracking-[0.18em] mb-3 pl-1"
                style={{ color: section.titleColor }}
              >
                {section.title}
              </motion.p>

              {/* 3-card row */}
              <div className={`grid ${section.gridCols} gap-3`}>
                {section.cards.map((card, idx) => (
                  <motion.div
                    key={card.path}
                    className="dash-card"
                    onClick={() => navigate(card.path)}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.42 + sIdx * 0.18 + idx * 0.07, duration: 0.55, ease: EASE }}
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
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* COPYRIGHT — FIX: was t("app.copyright") which doesn't exist in any JSON */}
        {/* Now uses t("auth.copyright") which exists in all language files         */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="relative z-10 text-center text-[8px] sm:text-[9px] font-medium py-3 tracking-wide text-stone-300"
        >
          {t("auth.copyright")}
        </motion.p>

        <BottomNav />
      </div>
    </>
  );
};

export default Dashboard;
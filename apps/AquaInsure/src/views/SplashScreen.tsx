import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const SPRING = [0.16, 1, 0.3, 1] as const;
const fadeUp = (delay = 0, y = 20) => ({
  initial: { opacity: 0, y },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 1.0, delay, ease: SPRING },
});

const SplashScreen = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    const timer = setTimeout(() => {
      const user = localStorage.getItem('shrimpguard-user');
      navigate(user ? '/dashboard' : '/language', { replace: true });
    }, 5500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="relative min-h-screen w-full bg-white flex flex-col items-center justify-between overflow-hidden select-none"
      style={{ fontFamily: "'Sora', sans-serif" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Serif+Display:ital@0;1&display=swap');
        * { -webkit-font-smoothing: antialiased; box-sizing: border-box; }

        /* Waves — GPU translateX only */
        @keyframes w1 { from{transform:translateX(0)}    to{transform:translateX(-50%)} }
        @keyframes w2 { from{transform:translateX(-50%)} to{transform:translateX(0)}   }
        @keyframes w3 { from{transform:translateX(0)}    to{transform:translateX(-50%)} }
        .wave1 { animation: w1 10s linear infinite; will-change:transform; }
        .wave2 { animation: w2 15s linear infinite; will-change:transform; }
        .wave3 { animation: w3  8s linear infinite; will-change:transform; }

        /* Progress bar — scaleX GPU */
        @keyframes grow { from{transform:scaleX(0)} to{transform:scaleX(1)} }
        .bar { transform-origin:left; animation:grow 5.4s cubic-bezier(0.4,0,0.2,1) forwards; will-change:transform; }

        /* Live dot */
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.22} }
        .blink { animation:blink 2s ease-in-out infinite; will-change:opacity; }

        /* Logo halo breathe */
        @keyframes halo { 0%,100%{transform:scale(1);opacity:.32} 50%{transform:scale(1.12);opacity:.68} }
        .halo { animation:halo 3.8s ease-in-out infinite; will-change:transform,opacity; }

        /* Bounce dots */
        @keyframes bd { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} }
        .b0{animation:bd 1.4s ease-in-out infinite 0.00s; will-change:transform;}
        .b1{animation:bd 1.4s ease-in-out infinite 0.18s; will-change:transform;}
        .b2{animation:bd 1.4s ease-in-out infinite 0.36s; will-change:transform;}
      `}</style>

      {/* ── BACKGROUND BLOBS — amber + teal + emerald, matching Login ── */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        {/* Amber — top left */}
        <div style={{
          position:'absolute', top:'-6%', left:'-10%',
          width:'62vw', height:'62vw', maxWidth:320, maxHeight:320,
          borderRadius:'50%',
          background:'radial-gradient(circle, rgba(251,191,36,0.13) 0%, transparent 68%)'
        }}/>
        {/* Teal — top right */}
        <div style={{
          position:'absolute', top:'-4%', right:'-10%',
          width:'55vw', height:'55vw', maxWidth:290, maxHeight:290,
          borderRadius:'50%',
          background:'radial-gradient(circle, rgba(20,184,166,0.12) 0%, transparent 68%)'
        }}/>
        {/* Emerald — mid left */}
        <div style={{
          position:'absolute', top:'35%', left:'-12%',
          width:'50vw', height:'50vw', maxWidth:260, maxHeight:260,
          borderRadius:'50%',
          background:'radial-gradient(circle, rgba(52,211,153,0.09) 0%, transparent 68%)'
        }}/>
        {/* Dot grid */}
        <div style={{
          position:'absolute', inset:0,
          backgroundImage:'radial-gradient(circle, rgba(15,118,110,0.05) 1px, transparent 1px)',
          backgroundSize:'26px 26px'
        }}/>
      </div>

      {/* ── SAFE AREA TOP ── */}
      <div className="h-10 sm:h-14 w-full shrink-0"/>

      

      {/* ── CENTRE CONTENT ── */}
      <div className="z-10 flex flex-1 flex-col items-center justify-center gap-6 px-6 w-full max-w-xs">

        {/* LOGO */}
        <motion.div
          className="relative"
          initial={{ opacity:0, scale:0.68, y:28 }}
          animate={{ opacity:1, scale:1,   y:0  }}
          transition={{ duration:1.2, delay:0.4, ease:SPRING }}
        >
          {/* Teal halo */}
         

          {/* Logo — no border, no card */}
          <img
            src="/aquainsure/logo.jpeg"
            alt="Aqua AInsure"
            className="relative w-56 h-56 sm:w-44 sm:h-44 object-contain"
            style={{ display:'block' }}
          />

          {/* Badge: AI Powered — amber */}
          <motion.div
            initial={{ opacity:0, scale:0.7, x:12 }}
            animate={{ opacity:1, scale:1,   x:0  }}
            transition={{ delay:1.55, duration:0.6, ease:SPRING }}
            className="absolute -bottom-3 -right-5 flex items-center gap-1.5 rounded-2xl bg-white px-3 py-1.5"
            style={{
              border:'1px solid rgba(251,191,36,0.30)',
              boxShadow:'0 4px 16px rgba(217,119,6,0.14)',
              fontFamily:"'Sora',sans-serif"
            }}
          >
            <span style={{ color:'#f59e0b', fontSize:12 }}>✦</span>
            <span className="text-[10px] font-bold tracking-wide" style={{ color:'#92400e' }}>AI Powered</span>
          </motion.div>

          {/* Badge: Insured — emerald */}
          <motion.div
            initial={{ opacity:0, scale:0.7, x:-12 }}
            animate={{ opacity:1, scale:1,   x:0   }}
            transition={{ delay:1.75, duration:0.6, ease:SPRING }}
            className="absolute -top-3 -left-5 flex items-center gap-1.5 rounded-2xl bg-white px-3 py-1.5"
            style={{
              border:'1px solid rgba(52,211,153,0.28)',
              boxShadow:'0 4px 16px rgba(16,185,129,0.12)',
              fontFamily:"'Sora',sans-serif"
            }}
          >
            <span style={{ fontSize:14, lineHeight:1 }}>🛡</span>
            <span className="text-[10px] font-bold tracking-wide" style={{ color:'#065f46' }}>Insured</span>
          </motion.div>
        </motion.div>

        {/* TITLE — DM Serif Display, charcoal + amber+teal gradient like Login */}
        
        {/* TAGLINE */}
        <motion.div {...fadeUp(1.65, 8)} className="flex items-center gap-3">
          <div className="h-px w-8" style={{ background:'linear-gradient(to right, transparent, rgba(20,184,166,0.35))' }}/>
          <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.38em]"
            style={{ color:'#94a3b8' }}>
            {t("app.tagline")}
          </p>
          <div className="h-px w-8" style={{ background:'linear-gradient(to left, transparent, rgba(20,184,166,0.35))' }}/>
        </motion.div>

        {/* FEATURE PILLS */}
        <motion.div {...fadeUp(2.0, 8)} className="flex flex-wrap justify-center gap-2">
          {[
            { label:'🦐 Shrimp Guard',    bg:'rgba(20,184,166,0.08)',  border:'rgba(20,184,166,0.22)',  color:'#0f766e' },
            { label:'📊 Risk Analytics',  bg:'rgba(251,191,36,0.09)',  border:'rgba(251,191,36,0.26)',  color:'#92400e' },
            { label:'💧 Water Health',    bg:'rgba(52,211,153,0.08)',  border:'rgba(52,211,153,0.22)',  color:'#065f46' },
          ].map(({ label, bg, border, color }, i) => (
            <motion.span key={label}
              initial={{ opacity:0, scale:0.82 }}
              animate={{ opacity:1, scale:1   }}
              transition={{ delay:2.05 + i*0.1, duration:0.5, ease:SPRING }}
              className="rounded-full px-3 py-1.5 text-[10px] sm:text-xs font-semibold"
              style={{ background:bg, border:`1px solid ${border}`, color, fontFamily:"'Sora',sans-serif" }}
            >
              {label}
            </motion.span>
          ))}
        </motion.div>
        <motion.div
        initial={{ opacity:0 }} animate={{ opacity:1 }}
        transition={{ delay:1.3, duration:0.9 }}
        className="z-20 mb-14 flex flex-col items-center gap-3"
      >
        {/* Bounce dots — teal / amber / emerald */}
       

        {/* Progress bar — teal→amber gradient */}
        <div className="relative h-[3px] w-44 sm:w-56 overflow-hidden rounded-full"
          style={{ background:'rgba(20,184,166,0.12)' }}>
          <div className="bar absolute inset-0 rounded-full" style={{
            background:'linear-gradient(90deg, #14b8a6, #f59e0b, #0f766e)'
          }}/>
        </div>

        
        
      </motion.div>
        
      </div>

      {/* ── PROGRESS + COPYRIGHT ── */}
      
<p className="text-[8px] sm:text-[9px] font-medium tracking-wide" style={{ color:'#cbd5e1' }}>
          © 2025 Aqua AInsure · All rights reserved
        </p>
      {/* ── WAVES — teal + amber + deep teal, matching Login palette ── */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute bottom-0 z-10 w-full overflow-hidden"
        style={{ height:'42vh' }}
        initial={{ opacity:0, y:60 }}
        animate={{ opacity:1, y:0  }}
        transition={{ duration:1.8, delay:0.7, ease:[0.25,1,0.5,1] }}
      >
        {/* Layer 1 — amber, lightest */}
        <div className="wave1 absolute bottom-0 w-[200%]" style={{ opacity:0.13 }}>
          <svg viewBox="0 0 1440 320" preserveAspectRatio="none" width="100%" height="100%">
            <path fill="#f59e0b"
              d="M0,192L80,181C160,171,320,149,480,154.7C640,160,800,192,960,202.7C1120,213,1280,192,1360,181.3L1440,171L1440,320L0,320Z"/>
          </svg>
        </div>

        {/* Layer 2 — mid teal */}
        <div className="wave2 absolute bottom-0 w-[200%]" style={{ opacity:0.26 }}>
          <svg viewBox="0 0 1440 280" preserveAspectRatio="none" width="100%" height="100%">
            <path fill="#14b8a6"
              d="M0,224L80,208C160,192,320,160,480,165.3C640,171,800,213,960,218.7C1120,224,1280,197,1360,186.7L1440,176L1440,280L0,280Z"/>
          </svg>
        </div>

        {/* Layer 3 — solid deep teal, front */}
        <div className="wave3 absolute bottom-0 w-[200%]" style={{ opacity:1 }}>
          <svg viewBox="0 0 1440 240" preserveAspectRatio="none" width="100%" height="100%">
            <path fill="#0f766e"
              d="M0,160L80,149C160,139,320,117,480,122.7C640,128,800,160,960,170.7C1120,181,1280,160,1360,149.3L1440,139L1440,240L0,240Z"/>
          </svg>
        </div>
      </motion.div>

    </div>
  );
};

export default SplashScreen;
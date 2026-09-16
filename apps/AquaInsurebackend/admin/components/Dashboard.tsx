import React, { useEffect } from 'react';
import { Box } from '@adminjs/design-system';

const Dashboard: React.FC = () => {
  const [stats, setStats] = React.useState({
    totalFarmers: 0,
    activePonds: 0,
  });

  useEffect(() => {
    // Fetch real stats
    fetch('/dashboard/stats')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStats(data.data);
        }
      })
      .catch(err => console.error('Failed to fetch dashboard stats', err));

    // Inject Tailwind CSS
    if (!document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com?plugins=forms,container-queries';
      document.head.appendChild(script);

      script.onload = () => {
        // @ts-ignore
        window.tailwind.config = {
          darkMode: "class",
          theme: {
            extend: {
              colors: {
                "surface": "#ffffff",
                "surface-container-low": "#f8f9fa",
                "on-surface": "#111827", 
                "on-surface-variant": "#4b5563",
                "primary": "#006876",
                "primary-container": "#e0f2fe",
                "on-primary-container": "#0369a1",
                "background": "#ffffff",
                "surface-bright": "#ffffff",
                "outline-variant": "#e5e7eb"
              },
              fontFamily: {
                "headline": ["Manrope"],
                "body": ["Inter"],
                "label": ["Inter"]
              },
              borderRadius: { "DEFAULT": "0.25rem", "lg": "0.5rem", "xl": "0.75rem", "full": "9999px" },
            },
          },
        };
      };
    }

    // Inject Google Fonts
    if (!document.getElementById('google-fonts-dashboard')) {
      const link = document.createElement('link');
      link.id = 'google-fonts-dashboard';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;700;800&family=Inter:wght@300;400;500;600&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  return (
    <Box className="bg-[#f8f9fc] min-h-screen text-slate-800 font-body p-6 md:p-10" style={{ margin: '-20px' }}>
      <div className="max-w-[1400px] mx-auto space-y-6">
        
        {/* Banner */}
        <section className="relative overflow-hidden bg-[#4a7296] rounded-2xl p-6 md:p-8 shadow-sm">
          <div className="relative z-10 flex items-center mb-3">
            <div className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-2xl mr-4 shadow-sm border border-slate-200 overflow-hidden flex items-center justify-center isolation-auto">
              <img 
                src="/public/logo.jpeg" 
                alt="AquaAInsure Logo" 
                className="w-full h-full object-contain p-1" 
              />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white font-headline tracking-tight mb-1">AquaAInsure</h1>
              <p className="text-[#c1d6ea] text-sm font-medium tracking-wide">Admin</p>
            </div>
          </div>
          {/* Abstract circles */}
          <div className="absolute right-0 top-0 h-full w-1/3 pointer-events-none">
            <div className="absolute top-1/2 left-[60%] -translate-y-1/2 w-[400px] h-[400px] border-[40px] border-white/5 rounded-full"></div>
            <div className="absolute top-1/2 left-[30%] -translate-y-1/2 w-[250px] h-[250px] border-[25px] border-white/5 rounded-full"></div>
          </div>
        </section>

        {/* Stats Row */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Active Ponds */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs font-bold tracking-widest uppercase mb-2">Active Ponds</p>
              <h2 className="text-3xl font-bold text-[#1f2937]">{stats.activePonds}</h2>
            </div>
            <div className="flex flex-col items-end">
              <span className="bg-[#bbf7d0] text-[#166534] text-xs font-bold px-3 py-1.5 rounded-full mb-4 flex items-center shadow-sm shadow-green-100">
                <span className="w-2 h-2 bg-[#166534] rounded-full mr-2"></span>
                Live Monitoring
              </span>
              <svg width="120" height="30" viewBox="0 0 120 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 25 C 20 25, 30 5, 50 20 C 70 35, 80 5, 100 5 C 110 5, 115 25, 120 25" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          {/* Total Farmers */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
               <p className="text-slate-400 text-xs font-bold tracking-widest uppercase mb-2">Total Farmers</p>
               <h2 className="text-3xl font-bold text-[#1f2937]">{stats.totalFarmers}</h2>
            </div>
            <div className="w-8 h-8 bg-[#bae6fd] rounded-lg flex items-center justify-center">
               <span className="material-symbols-outlined text-[#0369a1]" style={{ fontSize: '18px' }}>groups</span>
            </div>
          </div>
        </section>

        {/* Grid Row 2 */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Insurance Management */}
          <div className="md:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100 cursor-pointer relative group transition-all hover:shadow-md hover:-translate-y-1" onClick={() => window.location.href = '/resources/Insurance'}>
            <div className="w-8 h-8 bg-[#e0f2fe] rounded-md flex items-center justify-center mb-4">
               <span className="material-symbols-outlined text-[#0369a1]" style={{ fontSize: '18px' }}>local_police</span>
            </div>
            <h3 className="text-lg font-bold text-[#1f2937] mb-1 font-headline">Insurance Management</h3>
            <p className="text-slate-500 text-sm">Review active policies and claims risk analysis.</p>
            <span className="material-symbols-outlined absolute top-8 right-8 text-slate-300 group-hover:text-slate-600 transition-colors text-2xl">arrow_outward</span>
          </div>
          {/* Farmers Directory */}
          <div className="md:col-span-1 bg-white rounded-2xl p-6 shadow-sm border border-slate-100 cursor-pointer relative group transition-all hover:shadow-md hover:-translate-y-1" onClick={() => window.location.href = '/resources/Farmer'}>
            <div className="w-8 h-8 bg-[#dcfce7] rounded-md flex items-center justify-center mb-4">
               <span className="material-symbols-outlined text-[#166534]" style={{ fontSize: '18px' }}>person_search</span>
            </div>
            <h3 className="text-lg font-bold text-[#1f2937] mb-1 font-headline">Farmers Directory</h3>
            <p className="text-slate-500 text-sm">Manage stakeholder database and performance.</p>
          </div>
        </section>

        {/* Grid Row 3 */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pond Assets */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 cursor-pointer transition-all hover:shadow-md hover:-translate-y-1" onClick={() => window.location.href = '/resources/Pond'}>
            <div className="w-8 h-8 bg-[#e0f2fe] rounded-md flex items-center justify-center mb-4">
               <span className="material-symbols-outlined text-[#0ea5e9]" style={{ fontSize: '18px' }}>waves</span>
            </div>
            <h3 className="text-lg font-bold text-[#1f2937] mb-1 font-headline">Pond Assets</h3>
            <p className="text-slate-500 text-sm">Real-time inventory of aquatic stock and structures.</p>
          </div>
          {/* Daily Entries */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 cursor-pointer transition-all hover:shadow-md hover:-translate-y-1" onClick={() => window.location.href = '/resources/DailyEntry'}>
            <div className="w-8 h-8 bg-[#ffedd5] rounded-md flex items-center justify-center mb-4">
               <span className="material-symbols-outlined text-[#ea580c]" style={{ fontSize: '18px' }}>menu_book</span>
            </div>
            <h3 className="text-lg font-bold text-[#1f2937] mb-1 font-headline">Daily Entries</h3>
            <p className="text-slate-500 text-sm">Feeding logs and water chemistry journals.</p>
          </div>
          {/* OCR Export */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 cursor-pointer transition-all hover:shadow-md hover:-translate-y-1" onClick={() => window.location.href = '/pages/ocr-export'}>
            <div className="w-8 h-8 bg-[#f3e8ff] rounded-md flex items-center justify-center mb-4">
               <span className="material-symbols-outlined text-[#a21caf]" style={{ fontSize: '18px' }}>upload_file</span>
            </div>
            <h3 className="text-lg font-bold text-[#1f2937] mb-1 font-headline">OCR Export</h3>
            <p className="text-slate-500 text-sm">Digitize physical reports with AI processing.</p>
          </div>
        </section>

      </div>
    </Box>
  );
};

export default Dashboard;

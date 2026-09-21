import { motion, AnimatePresence } from "framer-motion";
import { Cloud, Loader2, HardDriveDownload } from "lucide-react";
import { useTranslation } from "react-i18next";

export type SyncStatus = 'idle' | 'saving' | 'saved_local' | 'saved_cloud';

interface SyncIndicatorProps {
  status: SyncStatus;
}

export default function SyncIndicator({ status }: SyncIndicatorProps) {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {status !== 'idle' && (
        <motion.div
          layout
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed top-[max(2.25rem,calc(env(safe-area-inset-top,0px)+1.25rem))] right-4 sm:right-6 z-50 pointer-events-none select-none flex items-center px-3 py-1 rounded-full bg-stone-900/85 text-white shadow-lg shadow-black/15 backdrop-blur-md border border-white/15"
        >
          <AnimatePresence mode="wait">
            {status === 'saving' && (
              <motion.div
                key="saving"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1.5"
              >
                <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin flex-shrink-0" />
                <span className="text-[11px] font-semibold tracking-tight text-stone-200">
                  {t('common.saving', 'Saving...')}
                </span>
              </motion.div>
            )}

            {status === 'saved_local' && (
              <motion.div
                key="saved_local"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1.5"
              >
                <HardDriveDownload className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span className="text-[11px] font-semibold tracking-tight text-stone-200">
                  {t('common.savedToDevice', 'Saved to device')}
                </span>
              </motion.div>
            )}

            {status === 'saved_cloud' && (
              <motion.div
                key="saved_cloud"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1.5"
              >
                <Cloud className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                <span className="text-[11px] font-semibold tracking-tight text-stone-200">
                  {t('common.savedToCloud', 'Saved to cloud')}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


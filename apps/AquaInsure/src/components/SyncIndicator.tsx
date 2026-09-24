import { Cloud, Loader2, HardDriveDownload, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";

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
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed top-3 right-3 z-50 pointer-events-none"
        >
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-900/90 backdrop-blur-md border border-white/15 shadow-xl text-white">
            {status === 'saving' && (
              <>
                <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0" />
                <span className="text-[11px] font-semibold text-stone-200">
                  {t('common.saving', 'Saving to Database…')}
                </span>
              </>
            )}

            {status === 'saved_cloud' && (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span className="text-[11px] font-semibold text-teal-300">
                  {t('common.savedToCloud', 'Saved to Database ✓')}
                </span>
              </>
            )}

            {status === 'saved_local' && (
              <>
                <HardDriveDownload className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="text-[11px] font-semibold text-sky-200">
                  {t('common.savedToDevice', 'Syncing…')}
                </span>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

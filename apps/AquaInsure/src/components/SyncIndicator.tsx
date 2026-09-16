import { motion, AnimatePresence } from "framer-motion";
import { Cloud, CloudUpload, CheckCircle2, Loader2, HardDriveDownload } from "lucide-react";
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
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] bg-white/90 backdrop-blur-md shadow-sm border border-stone-100 rounded-full py-1.5 px-4 flex items-center gap-2"
        >
          {status === 'saving' && (
            <>
              <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
              <span className="text-xs font-medium text-stone-600">Saving...</span>
            </>
          )}
          
          {status === 'saved_local' && (
            <>
              <HardDriveDownload className="w-4 h-4 text-teal-600" />
              <span className="text-xs font-medium text-stone-600">Saved to device</span>
            </>
          )}

          {status === 'saved_cloud' && (
            <>
              <Cloud className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-medium text-stone-600">Saved to cloud</span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

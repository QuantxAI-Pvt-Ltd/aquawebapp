import { Cloud, Loader2, HardDriveDownload } from "lucide-react";
import { useTranslation } from "react-i18next";

export type SyncStatus = 'idle' | 'saving' | 'saved_local' | 'saved_cloud';

interface SyncIndicatorProps {
  status: SyncStatus;
}

export default function SyncIndicator({ status }: SyncIndicatorProps) {
  const { t } = useTranslation();

  if (status === 'idle') return null;

  return (
    <div className="fixed top-3 right-3 z-50 pointer-events-none">
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-900/90 text-white backdrop-blur-md shadow-lg border border-white/10">
        {status === 'saving' && (
          <div className="flex items-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin flex-shrink-0" />
            <span className="text-[11px] font-semibold tracking-tight text-stone-200">
              {t('common.saving', 'Saving...')}
            </span>
          </div>
        )}

        {status === 'saved_local' && (
          <div className="flex items-center gap-1.5">
            <HardDriveDownload className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span className="text-[11px] font-semibold tracking-tight text-stone-200">
              {t('common.savedToDevice', 'Saved to device')}
            </span>
          </div>
        )}

        {status === 'saved_cloud' && (
          <div className="flex items-center gap-1.5">
            <Cloud className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
            <span className="text-[11px] font-semibold tracking-tight text-stone-200">
              {t('common.savedToCloud', 'Saved to cloud')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

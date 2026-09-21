import { Cloud, Loader2, HardDriveDownload } from "lucide-react";
import { useTranslation } from "react-i18next";

export type SyncStatus = 'idle' | 'saving' | 'saved_local' | 'saved_cloud';

interface SyncIndicatorProps {
  status: SyncStatus;
}

export default function SyncIndicator({ status }: SyncIndicatorProps) {
  const { t } = useTranslation();

  return (
    <>
      {status !== 'idle' && (
        <div>
          
            {status === 'saving' && (
              <div>
                <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin flex-shrink-0" />
                <span className="text-[11px] font-semibold tracking-tight text-stone-200">
                  {t('common.saving', 'Saving...')}
                </span>
              </div>
            )}

            {status === 'saved_local' && (
              <div>
                <HardDriveDownload className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span className="text-[11px] font-semibold tracking-tight text-stone-200">
                  {t('common.savedToDevice', 'Saved to device')}
                </span>
              </div>
            )}

            {status === 'saved_cloud' && (
              <div>
                <Cloud className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                <span className="text-[11px] font-semibold tracking-tight text-stone-200">
                  {t('common.savedToCloud', 'Saved to cloud')}
                </span>
              </div>
            )}
          
        </div>
      )}
    </>
  );
}



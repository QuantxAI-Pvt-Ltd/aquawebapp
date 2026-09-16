import { useState, useEffect, useRef } from "react";
import { SyncStatus } from "@/components/SyncIndicator";

export function useAutoSave(
  dependency: any,
  cloudSaveCallback?: () => Promise<void>
) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const isFirstRender = useRef(true);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cloudTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep callback in a ref so it never causes the effect to re-run
  const callbackRef = useRef(cloudSaveCallback);
  useEffect(() => {
    callbackRef.current = cloudSaveCallback;
  }, [cloudSaveCallback]);

  // Serialize dependency so the effect only fires on genuine value changes
  const dependencyStr = JSON.stringify(dependency);

  useEffect(() => {
    // Skip first mount — no need to show "Saving..." on page load
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // User typed something — show "Saving..." immediately
    setSyncStatus('saving');

    // Clear all previous pending timers
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (cloudTimeoutRef.current) clearTimeout(cloudTimeoutRef.current);
    if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);

    // After 1 second of no changes → "Saved locally"
    typingTimeoutRef.current = setTimeout(() => {
      setSyncStatus('saved_local');

      if (callbackRef.current) {
        // 1.5s later → fire cloud save
        cloudTimeoutRef.current = setTimeout(async () => {
          setSyncStatus('saving');
          try {
            await callbackRef.current!();
            setSyncStatus('saved_cloud');
          } catch (e) {
            console.error("Cloud autosave failed:", e);
            setSyncStatus('saved_local');
          } finally {
            // Auto-hide after 3s
            idleTimeoutRef.current = setTimeout(() => setSyncStatus('idle'), 3000);
          }
        }, 1500);
      } else {
        // No cloud — just show "Saved locally" then hide after 3s
        idleTimeoutRef.current = setTimeout(() => setSyncStatus('idle'), 3000);
      }
    }, 1000);

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (cloudTimeoutRef.current) clearTimeout(cloudTimeoutRef.current);
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dependencyStr]);

  return { syncStatus, setSyncStatus };
}

import { Cloud, Loader2, HardDriveDownload, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";

export type SyncStatus = 'idle' | 'saving' | 'saved_local' | 'saved_cloud';

interface SyncIndicatorProps {
  status?: SyncStatus;
}

export default function SyncIndicator({ status }: SyncIndicatorProps) {
  // Pill removed across the app per design specification
  return null;
}

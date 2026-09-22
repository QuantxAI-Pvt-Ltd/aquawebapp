import React from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Lock,
  FileQuestion,
  ServerCrash,
  RefreshCw,
  Home,
  Clock,
  HardDrive,
  ShieldAlert,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export type ErrorCode = 400 | 401 | 403 | 404 | 413 | 429 | 500 | 503 | number;

interface ErrorDisplayProps {
  statusCode?: ErrorCode;
  title?: string;
  message?: string;
  onRetry?: () => void;
  showHomeButton?: boolean;
  showBackButton?: boolean;
}

const ERROR_CONFIGS: Record<
  number,
  {
    title: string;
    description: string;
    icon: React.ElementType;
    badgeColor: string;
    iconBg: string;
    iconColor: string;
    primaryActionLabel?: string;
    primaryActionHref?: string;
  }
> = {
  400: {
    title: 'Invalid Request',
    description: 'We could not process the submitted data. Please review your entries and try again.',
    icon: AlertTriangle,
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    iconBg: 'bg-amber-500/10 border-amber-500/20',
    iconColor: 'text-amber-600',
  },
  401: {
    title: 'Session Expired',
    description: 'Your login session has ended or is invalid. Please sign in to securely access your farm.',
    icon: Lock,
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
    iconBg: 'bg-teal-500/10 border-teal-500/20',
    iconColor: 'text-teal-600',
    primaryActionLabel: 'Sign In Again',
    primaryActionHref: '/aquainsure/login/',
  },
  403: {
    title: 'Access Restricted',
    description: 'You do not have permission to view this farm, pond, or insurance policy record.',
    icon: ShieldAlert,
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    iconBg: 'bg-rose-500/10 border-rose-500/20',
    iconColor: 'text-rose-600',
  },
  404: {
    title: 'Page Not Found',
    description: 'The screen or document you are looking for does not exist or has been relocated.',
    icon: FileQuestion,
    badgeColor: 'bg-stone-100 text-stone-700 border-stone-200',
    iconBg: 'bg-stone-500/10 border-stone-500/20',
    iconColor: 'text-stone-600',
    primaryActionLabel: 'Go to Dashboard',
    primaryActionHref: '/aquainsure/dashboard/',
  },
  413: {
    title: 'File Too Large',
    description: 'The uploaded photo, document, or sampling video exceeds the maximum allowed upload limit (25MB).',
    icon: HardDrive,
    badgeColor: 'bg-orange-100 text-orange-800 border-orange-200',
    iconBg: 'bg-orange-500/10 border-orange-500/20',
    iconColor: 'text-orange-600',
  },
  429: {
    title: 'Too Many Requests',
    description: 'You have performed too many actions in a short period. Please wait a moment and try again.',
    icon: Clock,
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    iconBg: 'bg-amber-500/10 border-amber-500/20',
    iconColor: 'text-amber-600',
  },
  500: {
    title: 'Internal Server Error',
    description: 'Our servers encountered an unexpected issue while processing your request. Please try again shortly.',
    icon: ServerCrash,
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    iconBg: 'bg-rose-500/10 border-rose-500/20',
    iconColor: 'text-rose-600',
  },
  503: {
    title: 'Service Unavailable',
    description: 'The AquaInsure services or storage engine are undergoing maintenance or temporarily unreachable.',
    icon: ServerCrash,
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    iconBg: 'bg-indigo-500/10 border-indigo-500/20',
    iconColor: 'text-indigo-600',
  },
};

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  statusCode = 500,
  title,
  message,
  onRetry,
  showHomeButton = true,
  showBackButton = true,
}) => {
  const config = ERROR_CONFIGS[statusCode] || ERROR_CONFIGS[500];
  const IconComponent = config.icon;
  const displayTitle = title || config.title;
  const displayDesc = message || config.description;

  const handleNavigateHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = config.primaryActionHref || '/aquainsure/dashboard/';
    }
  };

  const handleGoBack = () => {
    if (typeof window !== 'undefined') {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = '/aquainsure/dashboard/';
      }
    }
  };

  return (
    <div
      className="min-h-[100dvh] bg-stone-50 flex flex-col items-center justify-center p-5 text-center select-none"
      style={{ fontFamily: "'Sora', sans-serif" }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');`}</style>

      {/* Decorative backdrop glow */}
      <div
        className="w-72 h-72 rounded-full absolute pointer-events-none opacity-40 blur-3xl -z-10"
        style={{ background: 'radial-gradient(circle, #2d9b7f 0%, #1c4a3e 70%, transparent 100%)' }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-sm bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xl shadow-stone-900/5 relative overflow-hidden"
      >
        {/* Top subtle bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-700 via-teal-500 to-amber-400" />

        {/* Status Code Pill */}
        <div className="flex justify-center mb-5">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider border ${config.badgeColor}`}
          >
            HTTP {statusCode}
          </span>
        </div>

        {/* Icon Circle */}
        <div className="flex justify-center mb-5">
          <div
            className={`w-20 h-20 rounded-2xl flex items-center justify-center border shadow-inner ${config.iconBg}`}
          >
            <IconComponent className={`w-10 h-10 ${config.iconColor}`} />
          </div>
        </div>

        {/* Title & Description */}
        <h2 className="text-xl font-extrabold text-stone-800 tracking-tight mb-2">
          {displayTitle}
        </h2>
        <p className="text-xs text-stone-500 leading-relaxed font-medium mb-6">
          {displayDesc}
        </p>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          {onRetry && (
            <Button
              onClick={onRetry}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-teal-700 to-teal-600 hover:from-teal-800 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-teal-700/20 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
          )}

          {showHomeButton && (
            <Button
              onClick={handleNavigateHome}
              variant={onRetry ? 'outline' : 'default'}
              className={`w-full h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-2 ${
                onRetry
                  ? 'border-stone-200 text-stone-700 hover:bg-stone-50'
                  : 'bg-gradient-to-r from-teal-700 to-teal-600 hover:from-teal-800 hover:to-teal-700 text-white shadow-md shadow-teal-700/20'
              }`}
            >
              <Home className="w-4 h-4" />
              {config.primaryActionLabel || 'Return to Dashboard'}
            </Button>
          )}

          {showBackButton && (
            <button
              onClick={handleGoBack}
              className="w-full text-center text-[11px] font-semibold text-stone-400 hover:text-stone-600 py-1.5 flex items-center justify-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Go Back to Previous Screen
            </button>
          )}
        </div>
      </motion.div>

      {/* Brand water mark */}
      <p className="text-[10px] font-semibold text-stone-400 mt-6 tracking-wide">
        Aqua <span className="text-teal-600">AI</span>nsure · Farm Protection Platform
      </p>
    </div>
  );
};

export default ErrorDisplay;

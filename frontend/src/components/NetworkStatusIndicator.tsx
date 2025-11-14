import React, { useEffect } from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useToast } from '@/hooks/useToast';

export const NetworkStatusIndicator: React.FC = () => {
  const { isOnline, wasOffline } = useNetworkStatus();
  const { showError, showSuccess } = useToast();

  useEffect(() => {
    if (!isOnline) {
      showError('💀 Connection lost - the spirits cannot reach you', 0); // 0 = don't auto-dismiss
    } else if (wasOffline) {
      showSuccess('✨ Connection restored - the spirits are with you again');
    }
  }, [isOnline, wasOffline, showError, showSuccess]);

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50">
      <div className="bg-blood-red/20 border-2 border-blood-red rounded-lg p-4 backdrop-blur-sm shadow-lg animate-pulse">
        <div className="flex items-center gap-3">
          <span className="text-3xl">💀</span>
          <div className="flex-1">
            <p className="text-blood-red font-bold">No Network Connection</p>
            <p className="text-ghostly-white/70 text-sm">
              Waiting for the spirits to return...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

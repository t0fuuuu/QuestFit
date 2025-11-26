import { useState, useCallback } from 'react';
import { polarOAuthService } from '@/src/services/polarOAuthService';

interface UseConsentFlowReturn {
  showConsentModal: boolean;
  setShowConsentModal: (visible: boolean) => void;
  consentLoading: boolean;
  handleConsentAccept: () => Promise<void>;
  handleConsentDecline: () => void;
}

export const useConsentFlow = (userId: string | undefined): UseConsentFlowReturn => {
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentLoading, setConsentLoading] = useState(false);

  const handleConsentAccept = useCallback(async () => {
    if (!userId) return;

    try {
      setConsentLoading(true);
      await polarOAuthService.setConsentGiven(userId);
      setShowConsentModal(false);
      console.log('✅ User consent recorded');
    } catch (error) {
      console.error('Error recording consent:', error);
      throw error;
    } finally {
      setConsentLoading(false);
    }
  }, [userId]);

  const handleConsentDecline = useCallback(() => {
    if (!userId) return;

    // Disconnect polar account if user declines consent
    polarOAuthService
      .disconnectPolarAccount(userId)
      .then(() => {
        console.log('✅ Polar account disconnected due to consent decline');
        setShowConsentModal(false);
      })
      .catch((error) => {
        console.error('Error disconnecting Polar account:', error);
      });
  }, [userId]);

  return {
    showConsentModal,
    setShowConsentModal,
    consentLoading,
    handleConsentAccept,
    handleConsentDecline,
  };
};

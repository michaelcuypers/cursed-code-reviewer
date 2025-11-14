import React, { useState, useRef } from 'react';
import { CryptHistory, HistoricalScan } from '@/components/CryptHistory';
import { ScanDetailModal } from '@/components/ScanDetailModal';

export const History: React.FC = () => {
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);
  const scansListRef = useRef<HistoricalScan[]>([]);
  const [currentScanIndex, setCurrentScanIndex] = useState<number>(-1);

  const handleScanSelect = (scanId: string) => {
    setSelectedScanId(scanId);
    // Find the index of the selected scan in the current list
    const index = scansListRef.current.findIndex(scan => scan.scanId === scanId);
    setCurrentScanIndex(index);
  };

  const handleCloseModal = () => {
    setSelectedScanId(null);
    setCurrentScanIndex(-1);
  };

  const handleNavigateNext = () => {
    if (currentScanIndex < scansListRef.current.length - 1) {
      const nextIndex = currentScanIndex + 1;
      const nextScan = scansListRef.current[nextIndex];
      setSelectedScanId(nextScan.scanId);
      setCurrentScanIndex(nextIndex);
    }
  };

  const handleNavigatePrevious = () => {
    if (currentScanIndex > 0) {
      const prevIndex = currentScanIndex - 1;
      const prevScan = scansListRef.current[prevIndex];
      setSelectedScanId(prevScan.scanId);
      setCurrentScanIndex(prevIndex);
    }
  };

  const handleScansUpdate = (scans: HistoricalScan[]) => {
    scansListRef.current = scans;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold cursed-title mb-2">
          Crypt History ⚰️
        </h1>
        <p className="text-ghostly-white/70">
          Review your past spectral scans
        </p>
      </div>

      <CryptHistory 
        onScanSelect={handleScanSelect}
        onScansUpdate={handleScansUpdate}
      />

      {selectedScanId && (
        <ScanDetailModal
          scanId={selectedScanId}
          onClose={handleCloseModal}
          onNavigateNext={handleNavigateNext}
          onNavigatePrevious={handleNavigatePrevious}
          hasNext={currentScanIndex < scansListRef.current.length - 1}
          hasPrevious={currentScanIndex > 0}
        />
      )}
    </div>
  );
};

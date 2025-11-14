import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Spinner } from '@/components/ui';
import { CryptHistory, HistoricalScan } from '@/components/CryptHistory';
import { ScanDetailModal } from '@/components/ScanDetailModal';
import { useScanHistory } from '@/hooks/useScanHistory';

export const Dashboard: React.FC = () => {
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);
  const [recentScans, setRecentScans] = useState<HistoricalScan[]>([]);

  // Fetch recent scans for statistics
  const { data: historyData, isLoading } = useScanHistory({
    page: 1,
    pageSize: 10,
  });

  // Calculate statistics from recent scans
  const totalScans = historyData?.pagination.totalScans || 0;
  const avgCurseLevel = recentScans.length > 0
    ? Math.round(recentScans.reduce((sum, scan) => sum + scan.overallCurseLevel, 0) / recentScans.length)
    : 0;
  
  // For patches applied, we'll show total issues found (as a proxy for potential patches)
  const totalIssues = recentScans.reduce((sum, scan) => sum + scan.issueCount, 0);

  const handleScanSelect = (scanId: string) => {
    setSelectedScanId(scanId);
  };

  const handleCloseModal = () => {
    setSelectedScanId(null);
  };

  const handleScansUpdate = (scans: HistoricalScan[]) => {
    setRecentScans(scans);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold cursed-title mb-2">
          Welcome to the Crypt 💀
        </h1>
        <p className="text-ghostly-white/70">
          Your cursed code reviews await...
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Total Scans</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Spinner size="md" />
            ) : (
              <>
                <p className="text-3xl font-bold text-phantom-purple">{totalScans}</p>
                <p className="text-sm text-ghostly-white/60 mt-2">Spectral analyses performed</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Curse Level</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Spinner size="md" />
            ) : (
              <>
                <p className="text-3xl font-bold text-haunted-orange">{avgCurseLevel}%</p>
                <p className="text-sm text-ghostly-white/60 mt-2">Average code darkness</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Issues Found</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Spinner size="md" />
            ) : (
              <>
                <p className="text-3xl font-bold text-toxic-green">{totalIssues}</p>
                <p className="text-sm text-ghostly-white/60 mt-2">Cursed code detected</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <CryptHistory 
        onScanSelect={handleScanSelect}
        onScansUpdate={handleScansUpdate}
      />

      {selectedScanId && (
        <ScanDetailModal
          scanId={selectedScanId}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Spinner } from '@/components/ui';
import { useScanHistory } from '@/hooks/useScanHistory';

export interface HistoricalScan {
  scanId: string;
  timestamp: string;
  language: string;
  overallCurseLevel: number;
  severityLevel: 'minor' | 'moderate' | 'critical';
  issueCount: number;
  scanDuration: number;
  submissionType: 'file' | 'text' | 'pr';
}

export interface HistoryResponse {
  scans: HistoricalScan[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalScans: number;
    pageSize: number;
  };
}

interface CryptHistoryProps {
  onScanSelect?: (scanId: string) => void;
  onScansUpdate?: (scans: HistoricalScan[]) => void;
}

export const CryptHistory: React.FC<CryptHistoryProps> = ({ onScanSelect, onScansUpdate }) => {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Use React Query for data fetching with caching
  const { data, isLoading: loading, error: queryError, refetch } = useScanHistory({
    page: currentPage,
    pageSize,
    severity: 'all',
    startDate: '',
    endDate: '',
    language: 'all',
  });

  const scans = data?.scans || [];
  const totalPages = data?.pagination.totalPages || 1;
  const totalScans = data?.pagination.totalScans || 0;
  const error = queryError ? (queryError instanceof Error ? queryError.message : 'Failed to fetch scan history') : null;

  // Notify parent component of scans update
  useEffect(() => {
    if (data?.scans && onScansUpdate) {
      onScansUpdate(data.scans);
    }
  }, [data?.scans, onScansUpdate]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleScanClick = (scanId: string) => {
    if (onScanSelect) {
      onScanSelect(scanId);
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCurseLevelColor = (level: number) => {
    if (level >= 80) return 'text-blood-red';
    if (level >= 50) return 'text-haunted-orange';
    return 'text-toxic-green';
  };

  const getCurseLevelEmoji = (level: number) => {
    if (level >= 80) return '💀';
    if (level >= 50) return '👻';
    return '🕷️';
  };

  const getSeverityBadgeVariant = (severity: string): 'minor' | 'moderate' | 'critical' => {
    return severity as 'minor' | 'moderate' | 'critical';
  };

  return (
    <div className="space-y-6">
      {/* Scan History List */}
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>⚰️ Scan History</CardTitle>
            <div className="text-sm text-ghostly-white/60">
              {totalScans} total scan{totalScans !== 1 ? 's' : ''}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <Spinner size="lg" className="mx-auto mb-4" />
              <p className="text-ghostly-white/60">
                Excavating the crypt...
              </p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">💀</div>
              <p className="text-blood-red font-medium mb-2">
                {error}
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => refetch()}
                className="mt-4"
              >
                Try Again
              </Button>
            </div>
          ) : scans.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👻</div>
              <p className="text-ghostly-white/60 mb-2">
                No scans found in the crypt
              </p>
              <p className="text-ghostly-white/40 text-sm">
                Try adjusting your filters or submit a new scan
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {scans.map((scan) => (
                <button
                  key={scan.scanId}
                  onClick={() => handleScanClick(scan.scanId)}
                  className="w-full text-left p-4 bg-graveyard-gray rounded-lg border border-phantom-purple/30 hover:border-phantom-purple hover:bg-phantom-purple/10 transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left side - Main info */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {scan.submissionType === 'pr' && '🕸️'}
                          {scan.submissionType === 'file' && '⚰️'}
                          {scan.submissionType === 'text' && '📜'}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-ghostly-white font-medium">
                              {scan.language.charAt(0).toUpperCase() + scan.language.slice(1)} Scan
                            </span>
                            <Badge variant={getSeverityBadgeVariant(scan.severityLevel)}>
                              {scan.severityLevel}
                            </Badge>
                          </div>
                          <div className="text-sm text-ghostly-white/60 mt-1">
                            {formatDate(scan.timestamp)}
                          </div>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <span className="text-ghostly-white/60">Issues:</span>
                          <span className="text-ghostly-white font-medium">
                            {scan.issueCount}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right side - Curse level */}
                    <div className="text-center">
                      <div className={`text-3xl ${getCurseLevelColor(scan.overallCurseLevel)}`}>
                        {getCurseLevelEmoji(scan.overallCurseLevel)}
                      </div>
                      <div className={`text-lg font-bold ${getCurseLevelColor(scan.overallCurseLevel)}`}>
                        {scan.overallCurseLevel}%
                      </div>
                      <div className="text-xs text-ghostly-white/60">
                        Curse Level
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {!loading && scans.length > 0 && totalPages > 1 && (
        <Card variant="elevated">
          <CardContent>
            <div className="flex items-center justify-between">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                ← Previous
              </Button>

              <div className="flex items-center gap-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`
                        w-10 h-10 rounded-lg font-medium transition-all duration-200
                        ${currentPage === pageNum
                          ? 'bg-phantom-purple text-ghostly-white shadow-lg'
                          : 'bg-graveyard-gray text-ghostly-white/70 hover:bg-phantom-purple/20 border border-phantom-purple/30'
                        }
                      `}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next →
              </Button>
            </div>

            <div className="text-center text-sm text-ghostly-white/60 mt-4">
              Page {currentPage} of {totalPages}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

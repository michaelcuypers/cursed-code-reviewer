import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Spinner } from '@/components/ui';
import { apiClient } from '@/lib/api-client';
import { CursedFeedback } from './CursedFeedback';

interface CursedIssue {
  id: string;
  severity: 'minor' | 'moderate' | 'critical';
  lineNumber: number;
  columnNumber: number;
  demonicMessage: string;
  technicalExplanation: string;
  ruleId: string;
}

interface ScanDetail {
  scanId: string;
  timestamp: string;
  language: string;
  overallCurseLevel: number;
  scanDuration: number;
  submissionType: 'file' | 'text' | 'pr';
  status: string;
  issues?: CursedIssue[];
  code?: string;
  message?: string;
}

interface ScanDetailModalProps {
  scanId: string;
  onClose: () => void;
  onNavigateNext?: () => void;
  onNavigatePrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

export const ScanDetailModal: React.FC<ScanDetailModalProps> = ({
  scanId,
  onClose,
  onNavigateNext,
  onNavigatePrevious,
  hasNext = false,
  hasPrevious = false,
}) => {
  const [scanDetail, setScanDetail] = useState<ScanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchScanDetail();
  }, [scanId]);

  const fetchScanDetail = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<ScanDetail>(`/spectral-scan/${scanId}`);
      setScanDetail(response);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch scan details';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
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

  const getSeverityBadge = (level: number) => {
    if (level >= 80) return <Badge variant="critical">Critical</Badge>;
    if (level >= 50) return <Badge variant="moderate">Moderate</Badge>;
    return <Badge variant="minor">Minor</Badge>;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cursed-black/90 backdrop-blur-sm">
      <div className="w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col bg-graveyard-gray rounded-lg border-2 border-phantom-purple shadow-2xl shadow-phantom-purple/50">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-phantom-purple/30">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold cursed-title">
              Scan Details 🔮
            </h2>
            {scanDetail && getSeverityBadge(scanDetail.overallCurseLevel)}
          </div>
          <div className="flex items-center gap-2">
            {hasPrevious && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onNavigatePrevious}
                title="Previous scan"
              >
                ← Previous
              </Button>
            )}
            {hasNext && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onNavigateNext}
                title="Next →"
              >
                Next →
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              ✕ Close
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <Spinner size="lg" className="mx-auto mb-4" />
              <p className="text-ghostly-white/60">
                Summoning scan details from the crypt...
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
                onClick={fetchScanDetail}
                className="mt-4"
              >
                Try Again
              </Button>
            </div>
          ) : scanDetail ? (
            <div className="space-y-6">
              {/* Scan Overview */}
              <Card variant="elevated">
                <CardHeader>
                  <CardTitle>Scan Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-graveyard-gray rounded-lg border border-phantom-purple/30">
                      <div className="text-3xl mb-2">📅</div>
                      <div className="text-sm text-ghostly-white/60 mb-1">Date</div>
                      <div className="text-ghostly-white font-medium text-sm">
                        {formatDate(scanDetail.timestamp)}
                      </div>
                    </div>

                    <div className="text-center p-4 bg-graveyard-gray rounded-lg border border-phantom-purple/30">
                      <div className="text-3xl mb-2">🗣️</div>
                      <div className="text-sm text-ghostly-white/60 mb-1">Language</div>
                      <div className="text-ghostly-white font-medium">
                        {scanDetail.language.charAt(0).toUpperCase() + scanDetail.language.slice(1)}
                      </div>
                    </div>

                    <div className="text-center p-4 bg-graveyard-gray rounded-lg border border-phantom-purple/30">
                      <div className={`text-3xl mb-2 ${getCurseLevelColor(scanDetail.overallCurseLevel)}`}>
                        {getCurseLevelEmoji(scanDetail.overallCurseLevel)}
                      </div>
                      <div className="text-sm text-ghostly-white/60 mb-1">Curse Level</div>
                      <div className={`font-bold text-xl ${getCurseLevelColor(scanDetail.overallCurseLevel)}`}>
                        {scanDetail.overallCurseLevel}%
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Issues Section */}
              <div>
                {scanDetail.issues && scanDetail.issues.length > 0 ? (
                  <CursedFeedback
                    issues={scanDetail.issues}
                    code={scanDetail.code || ""}
                    language={scanDetail.language}
                    overallCurseLevel={scanDetail.overallCurseLevel}
                  />
                ) : (
                  <Card variant="elevated">
                    <CardContent>
                      <div className="text-center py-12">
                        <div className="text-6xl mb-4">✨</div>
                        <p className="text-toxic-green font-medium text-lg">
                          No issues found! Your code is blessed! 🎉
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

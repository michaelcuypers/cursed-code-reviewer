import React, { useState, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '@/components/ui';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/useToast';

interface HauntedPatch {
  id: string;
  issueId: string;
  originalCode: string;
  cursedCode: string;
  explanation: string;
  confidence: number;
  severity?: 'minor' | 'moderate' | 'critical';
  lineNumber?: number;
  accepted?: boolean;
}

interface PatchGraveyardProps {
  patches: HauntedPatch[];
  language?: string;
  onPatchAccepted?: (patchId: string) => void;
  onPatchRejected?: (patchId: string) => void;
}

type SortOption = 'severity' | 'confidence' | 'lineNumber';
type FilterOption = 'all' | 'pending' | 'accepted' | 'high-confidence' | 'medium-confidence' | 'low-confidence';

export const PatchGraveyard: React.FC<PatchGraveyardProps> = ({
  patches,
  language = 'javascript',
  onPatchAccepted,
  onPatchRejected,
}) => {
  const { showError, showSuccess } = useToast();
  const [acceptedPatches, setAcceptedPatches] = useState<Set<string>>(new Set());
  const [rejectedPatches, setRejectedPatches] = useState<Set<string>>(new Set());
  const [processingPatches, setProcessingPatches] = useState<Set<string>>(new Set());
  const [copiedPatchId, setCopiedPatchId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('severity');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');

  // Get confidence level category
  const getConfidenceLevel = (confidence: number): 'high' | 'medium' | 'low' => {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.5) return 'medium';
    return 'low';
  };

  // Filter patches based on selected filter
  const filteredPatches = useMemo(() => {
    return patches.filter((patch) => {
      if (filterBy === 'all') return true;
      if (filterBy === 'pending') return !acceptedPatches.has(patch.id) && !rejectedPatches.has(patch.id);
      if (filterBy === 'accepted') return acceptedPatches.has(patch.id);
      
      const confidenceLevel = getConfidenceLevel(patch.confidence);
      if (filterBy === 'high-confidence') return confidenceLevel === 'high';
      if (filterBy === 'medium-confidence') return confidenceLevel === 'medium';
      if (filterBy === 'low-confidence') return confidenceLevel === 'low';
      
      return true;
    });
  }, [patches, filterBy, acceptedPatches, rejectedPatches]);

  // Sort patches based on selected sort option
  const sortedPatches = useMemo(() => {
    const sorted = [...filteredPatches];
    
    sorted.sort((a, b) => {
      if (sortBy === 'severity') {
        const severityOrder = { critical: 3, moderate: 2, minor: 1 };
        const aSeverity = severityOrder[a.severity || 'minor'];
        const bSeverity = severityOrder[b.severity || 'minor'];
        return bSeverity - aSeverity;
      }
      
      if (sortBy === 'confidence') {
        return b.confidence - a.confidence;
      }
      
      if (sortBy === 'lineNumber') {
        return (a.lineNumber || 0) - (b.lineNumber || 0);
      }
      
      return 0;
    });
    
    return sorted;
  }, [filteredPatches, sortBy]);

  const handleAcceptPatch = async (patch: HauntedPatch) => {
    // Optimistic UI update
    setAcceptedPatches((prev) => new Set(prev).add(patch.id));
    setProcessingPatches((prev) => new Set(prev).add(patch.id));
    
    try {
      // Call API to accept patch
      await apiClient.post('/haunted-patch/accept', {
        patchId: patch.id,
        issueId: patch.issueId,
      });
      
      // Call callback if provided
      if (onPatchAccepted) {
        onPatchAccepted(patch.id);
      }
      
      // Show success toast
      showSuccess('✨ Haunted patch accepted! The curse has been lifted.');
      
      // Show success animation
      setTimeout(() => {
        setProcessingPatches((prev) => {
          const newSet = new Set(prev);
          newSet.delete(patch.id);
          return newSet;
        });
      }, 1000);
    } catch (error) {
      console.error('Failed to accept patch:', error);
      
      // Rollback optimistic update on error
      setAcceptedPatches((prev) => {
        const newSet = new Set(prev);
        newSet.delete(patch.id);
        return newSet;
      });
      
      setProcessingPatches((prev) => {
        const newSet = new Set(prev);
        newSet.delete(patch.id);
        return newSet;
      });
      
      // Show error toast
      const errorMessage = error instanceof Error ? error.message : 'Failed to accept patch';
      showError(errorMessage);
    }
  };

  const handleRejectPatch = (patch: HauntedPatch) => {
    setRejectedPatches((prev) => new Set(prev).add(patch.id));
    
    if (onPatchRejected) {
      onPatchRejected(patch.id);
    }
  };

  const handleCopyToClipboard = async (patch: HauntedPatch) => {
    try {
      await navigator.clipboard.writeText(patch.cursedCode);
      setCopiedPatchId(patch.id);
      showSuccess('📋 Code copied to clipboard!');
      
      setTimeout(() => {
        setCopiedPatchId(null);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      showError('Failed to copy code to clipboard');
    }
  };

  const getConfidenceBadgeVariant = (confidence: number) => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.5) return 'moderate';
    return 'minor';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return '✨';
    if (confidence >= 0.5) return '🔮';
    return '⚠️';
  };

  if (patches.length === 0) {
    return (
      <Card variant="elevated">
        <CardContent>
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🪦</div>
            <h3 className="text-2xl font-bold text-ghostly-white/70 mb-2">
              The Graveyard is Empty
            </h3>
            <p className="text-ghostly-white/50">
              No haunted patches have been conjured yet...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>🪦 Patch Graveyard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-phantom-purple">{patches.length}</div>
                <div className="text-sm text-ghostly-white/60">Total Patches</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-toxic-green">{acceptedPatches.size}</div>
                <div className="text-sm text-ghostly-white/60">Accepted</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blood-red">{rejectedPatches.size}</div>
                <div className="text-sm text-ghostly-white/60">Rejected</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters and Sorting */}
      <Card variant="elevated">
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sort Options */}
            <div>
              <label className="block text-sm font-medium text-ghostly-white mb-2">
                Sort By
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSortBy('severity')}
                  className={`
                    px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                    ${sortBy === 'severity'
                      ? 'bg-phantom-purple text-ghostly-white'
                      : 'bg-graveyard-gray text-ghostly-white/70 hover:bg-phantom-purple/20 border border-phantom-purple/30'
                    }
                  `}
                >
                  💀 Severity
                </button>
                <button
                  onClick={() => setSortBy('confidence')}
                  className={`
                    px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                    ${sortBy === 'confidence'
                      ? 'bg-phantom-purple text-ghostly-white'
                      : 'bg-graveyard-gray text-ghostly-white/70 hover:bg-phantom-purple/20 border border-phantom-purple/30'
                    }
                  `}
                >
                  ✨ Confidence
                </button>
                <button
                  onClick={() => setSortBy('lineNumber')}
                  className={`
                    px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                    ${sortBy === 'lineNumber'
                      ? 'bg-phantom-purple text-ghostly-white'
                      : 'bg-graveyard-gray text-ghostly-white/70 hover:bg-phantom-purple/20 border border-phantom-purple/30'
                    }
                  `}
                >
                  📍 Line Number
                </button>
              </div>
            </div>

            {/* Filter Options */}
            <div>
              <label className="block text-sm font-medium text-ghostly-white mb-2">
                Filter By
              </label>
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value as FilterOption)}
                className="w-full px-3 py-2 bg-graveyard-gray text-ghostly-white rounded-lg border border-phantom-purple/30 focus:outline-none focus:ring-2 focus:ring-haunted-orange"
              >
                <option value="all">👻 All Patches</option>
                <option value="pending">⏳ Pending</option>
                <option value="accepted">✅ Accepted</option>
                <option value="high-confidence">✨ High Confidence (≥80%)</option>
                <option value="medium-confidence">🔮 Medium Confidence (50-79%)</option>
                <option value="low-confidence">⚠️ Low Confidence (&lt;50%)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Patches List */}
      {sortedPatches.length === 0 ? (
        <Card variant="elevated">
          <CardContent>
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-ghostly-white/60">
                No patches match your current filter
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedPatches.map((patch) => {
            const isAccepted = acceptedPatches.has(patch.id);
            const isRejected = rejectedPatches.has(patch.id);
            const isProcessing = processingPatches.has(patch.id);
            const isCopied = copiedPatchId === patch.id;

            return (
              <Card
                key={patch.id}
                variant="elevated"
                className={`
                  transition-all duration-300
                  ${isAccepted ? 'border-2 border-toxic-green shadow-lg shadow-toxic-green/30' : ''}
                  ${isRejected ? 'opacity-50' : ''}
                `}
              >
                <CardContent className="space-y-4">
                  {/* Patch Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">🔧</span>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {patch.severity && (
                            <Badge variant={patch.severity}>
                              {patch.severity.toUpperCase()}
                            </Badge>
                          )}
                          <Badge variant={getConfidenceBadgeVariant(patch.confidence)}>
                            {getConfidenceIcon(patch.confidence)} {Math.round(patch.confidence * 100)}% Confidence
                          </Badge>
                          {patch.lineNumber && (
                            <span className="text-ghostly-white/60 text-sm">
                              Line {patch.lineNumber}
                            </span>
                          )}
                        </div>
                        <p className="text-ghostly-white/80 text-sm">
                          {patch.explanation}
                        </p>
                      </div>
                    </div>

                    {isAccepted && (
                      <div className="flex items-center gap-2 text-toxic-green animate-fadeIn">
                        <span className="text-2xl">✓</span>
                        <span className="font-medium">Accepted</span>
                      </div>
                    )}
                  </div>

                  {/* Side-by-side Code Comparison */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Original Code */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-blood-red">
                        <span>💀</span>
                        <span>Cursed Code</span>
                      </div>
                      <div className="border-2 border-blood-red/30 rounded-lg overflow-hidden bg-cursed-black/50">
                        <Editor
                          height="200px"
                          language={language}
                          value={patch.originalCode}
                          theme="vs-dark"
                          options={{
                            readOnly: true,
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            lineNumbers: 'on',
                            folding: false,
                            renderLineHighlight: 'none',
                            scrollbar: {
                              vertical: 'auto',
                              horizontal: 'auto',
                            },
                            fontSize: 13,
                          }}
                        />
                      </div>
                    </div>

                    {/* Fixed Code */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-toxic-green">
                        <span>✨</span>
                        <span>Blessed Code</span>
                      </div>
                      <div className="border-2 border-toxic-green/30 rounded-lg overflow-hidden bg-cursed-black/50">
                        <Editor
                          height="200px"
                          language={language}
                          value={patch.cursedCode}
                          theme="vs-dark"
                          options={{
                            readOnly: true,
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            lineNumbers: 'on',
                            folding: false,
                            renderLineHighlight: 'none',
                            scrollbar: {
                              vertical: 'auto',
                              horizontal: 'auto',
                            },
                            fontSize: 13,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {!isAccepted && !isRejected && (
                    <div className="flex gap-3 pt-2">
                      <Button
                        variant="primary"
                        size="md"
                        onClick={() => handleAcceptPatch(patch)}
                        disabled={isProcessing}
                        className="flex-1"
                      >
                        {isProcessing ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="animate-spin">⚡</span>
                            <span>Accepting...</span>
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            <span>✓</span>
                            <span>Accept Patch</span>
                          </span>
                        )}
                      </Button>
                      
                      <Button
                        variant="secondary"
                        size="md"
                        onClick={() => handleCopyToClipboard(patch)}
                        className="flex-1"
                      >
                        <span className="flex items-center justify-center gap-2">
                          <span>{isCopied ? '✓' : '📋'}</span>
                          <span>{isCopied ? 'Copied!' : 'Copy Code'}</span>
                        </span>
                      </Button>
                      
                      <Button
                        variant="danger"
                        size="md"
                        onClick={() => handleRejectPatch(patch)}
                        disabled={isProcessing}
                      >
                        <span className="flex items-center justify-center gap-2">
                          <span>✗</span>
                          <span>Reject</span>
                        </span>
                      </Button>
                    </div>
                  )}

                  {isAccepted && (
                    <div className="flex gap-3 pt-2">
                      <Button
                        variant="secondary"
                        size="md"
                        onClick={() => handleCopyToClipboard(patch)}
                        className="flex-1"
                      >
                        <span className="flex items-center justify-center gap-2">
                          <span>{isCopied ? '✓' : '📋'}</span>
                          <span>{isCopied ? 'Copied!' : 'Copy Fixed Code'}</span>
                        </span>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

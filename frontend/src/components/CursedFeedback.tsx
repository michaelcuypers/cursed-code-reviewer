import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Spinner } from '@/components/ui';
import { apiClient } from '@/lib/api-client';

interface CursedIssue {
  id: string;
  severity: 'minor' | 'moderate' | 'critical';
  lineNumber: number;
  columnNumber: number;
  demonicMessage: string;
  technicalExplanation: string;
  ruleId: string;
  hauntedPatch?: HauntedPatch;
}

interface HauntedPatch {
  id: string;
  issueId: string;
  originalCode: string;
  cursedCode: string;
  explanation: string;
  confidence: number;
}

interface SpectralScanResult {
  scanId: string;
  timestamp: string;
  issues: CursedIssue[];
  overallCurseLevel: number;
  scanDuration: number;
  language: string;
  status: 'completed' | 'failed' | 'processing';
}

interface CursedFeedbackProps {
  issues?: CursedIssue[];
  code?: string;
  language?: string;
  overallCurseLevel?: number;
  scanId?: string;
  onScanLoaded?: (result: SpectralScanResult) => void;
}

export const CursedFeedback: React.FC<CursedFeedbackProps> = ({
  issues: propIssues,
  code: propCode,
  language: propLanguage,
  overallCurseLevel: propCurseLevel,
  scanId,
  onScanLoaded,
}) => {
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<SpectralScanResult | null>(null);

  // Fetch scan results if scanId is provided
  useEffect(() => {
    if (scanId && !propIssues) {
      fetchScanResults();
    }
  }, [scanId]);

  const fetchScanResults = async () => {
    if (!scanId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await apiClient.get<SpectralScanResult>(`/spectral-scan/${scanId}`);
      
      // If scan is still processing, poll for completion
      if (result.status === 'processing') {
        await pollForCompletion(scanId);
      } else {
        setScanResult(result);
        if (onScanLoaded) {
          onScanLoaded(result);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch scan results';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const pollForCompletion = async (id: string, maxAttempts = 30) => {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const result = await apiClient.get<SpectralScanResult>(`/spectral-scan/${id}`);
        
        if (result.status === 'completed') {
          setScanResult(result);
          if (onScanLoaded) {
            onScanLoaded(result);
          }
          return;
        }
        
        if (result.status === 'failed') {
          throw new Error('Scan failed during processing');
        }
        
        // Wait 1 second before next poll
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      } catch (err) {
        if (attempts >= maxAttempts - 1) {
          throw err;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
    }
    
    throw new Error('Scan timed out');
  };

  // Use props if provided, otherwise use fetched scan result
  const issues = propIssues || scanResult?.issues || [];
  const code = propCode || '';
  const language = propLanguage || scanResult?.language || 'javascript';
  const overallCurseLevel = propCurseLevel ?? scanResult?.overallCurseLevel ?? 0;

  const toggleExpanded = (issueId: string) => {
    setExpandedIssues((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(issueId)) {
        newSet.delete(issueId);
      } else {
        newSet.add(issueId);
      }
      return newSet;
    });
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'minor':
        return '👻';
      case 'moderate':
        return '🕷️';
      case 'critical':
        return '💀';
      default:
        return '🔮';
    }
  };

  const getCurseLevelMessage = () => {
    if (overallCurseLevel === 0) {
      return '✨ Your code is blessed! No curses detected.';
    } else if (overallCurseLevel < 30) {
      return '😊 Minor hauntings detected. Nothing too scary.';
    } else if (overallCurseLevel < 70) {
      return '😰 Moderate curses found. Time to exorcise some demons!';
    } else {
      return '💀 CRITICAL POSSESSION! Your code is severely cursed!';
    }
  };

  const getCodeSnippet = (issue: CursedIssue) => {
    const lines = code.split('\n');
    const startLine = Math.max(0, issue.lineNumber - 3);
    const endLine = Math.min(lines.length, issue.lineNumber + 2);
    const snippet = lines.slice(startLine, endLine).join('\n');
    return {
      snippet,
      startLine: startLine + 1,
    };
  };

  if (loading) {
    return (
      <Card variant="elevated">
        <CardContent>
          <div className="text-center py-12">
            <div className="inline-block mb-4">
              <Spinner size="lg" />
            </div>
            <p className="text-ghostly-white text-lg font-medium animate-pulse">
              🔮 Retrieving cursed feedback from the void...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card variant="elevated">
        <CardContent>
          <div className="text-center py-12">
            <div className="text-6xl mb-4">💀</div>
            <h3 className="text-2xl font-bold text-blood-red mb-2">
              Failed to Retrieve Scan
            </h3>
            <p className="text-ghostly-white/70 mb-4">
              {error}
            </p>
            <Button variant="secondary" size="sm" onClick={fetchScanResults}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (issues.length === 0) {
    return (
      <Card variant="elevated">
        <CardContent>
          <div className="text-center py-12">
            <div className="text-6xl mb-4">✨</div>
            <h3 className="text-2xl font-bold text-toxic-green mb-2">
              No Curses Detected!
            </h3>
            <p className="text-ghostly-white/70">
              Your code is clean and blessed by the spirits. Well done, mortal!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Curse Level Meter */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>🔮 Overall Curse Level</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Progress Bar */}
            <div className="relative w-full h-8 bg-graveyard-gray rounded-full overflow-hidden border-2 border-phantom-purple/50">
              <div
                className={`
                  absolute top-0 left-0 h-full transition-all duration-1000 ease-out
                  ${overallCurseLevel < 30 ? 'bg-toxic-green' : ''}
                  ${overallCurseLevel >= 30 && overallCurseLevel < 70 ? 'bg-haunted-orange' : ''}
                  ${overallCurseLevel >= 70 ? 'bg-blood-red animate-pulse' : ''}
                `}
                style={{ width: `${overallCurseLevel}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-ghostly-white font-bold text-sm drop-shadow-lg">
                  {overallCurseLevel}%
                </span>
              </div>
            </div>

            {/* Message */}
            <p className={`
              text-center font-medium text-lg
              ${overallCurseLevel < 30 ? 'text-toxic-green' : ''}
              ${overallCurseLevel >= 30 && overallCurseLevel < 70 ? 'text-haunted-orange' : ''}
              ${overallCurseLevel >= 70 ? 'text-blood-red' : ''}
            `}>
              {getCurseLevelMessage()}
            </p>

            {/* Issue Count Summary */}
            <div className="flex justify-center gap-4 pt-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">👻</span>
                <span className="text-ghostly-white/70">
                  {issues.filter(i => i.severity === 'minor').length} Minor
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🕷️</span>
                <span className="text-ghostly-white/70">
                  {issues.filter(i => i.severity === 'moderate').length} Moderate
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">💀</span>
                <span className="text-ghostly-white/70">
                  {issues.filter(i => i.severity === 'critical').length} Critical
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Issues List */}
      <div className="space-y-4">
        {issues.map((issue) => {
          const isExpanded = expandedIssues.has(issue.id);
          const { snippet, startLine } = getCodeSnippet(issue);

          return (
            <Card
              key={issue.id}
              variant="elevated"
              className="transition-all duration-300"
            >
              <CardContent className="space-y-4">
                {/* Issue Header */}
                <div className="flex items-start gap-4">
                  <div className="text-4xl flex-shrink-0">
                    {getSeverityIcon(issue.severity)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant={issue.severity}>
                        {issue.severity.toUpperCase()}
                      </Badge>
                      <span className="text-ghostly-white/60 text-sm">
                        Line {issue.lineNumber}:{issue.columnNumber}
                      </span>
                      <span className="text-ghostly-white/40 text-xs">
                        {issue.ruleId}
                      </span>
                    </div>
                    
                    {/* Demonic Message */}
                    <p className={`
                      text-lg font-medium mb-2
                      ${issue.severity === 'minor' ? 'text-toxic-green' : ''}
                      ${issue.severity === 'moderate' ? 'text-haunted-orange' : ''}
                      ${issue.severity === 'critical' ? 'text-blood-red' : ''}
                    `}>
                      {issue.demonicMessage}
                    </p>
                  </div>
                </div>

                {/* Code Snippet with Monaco Editor */}
                <div className="relative">
                  <div className="absolute top-2 left-2 z-10 bg-graveyard-gray/90 px-2 py-1 rounded text-xs text-ghostly-white/60">
                    Lines {startLine}-{startLine + snippet.split('\n').length - 1}
                  </div>
                  <div className="border-2 border-phantom-purple/30 rounded-lg overflow-hidden">
                    <Editor
                      height="150px"
                      language={language}
                      value={snippet}
                      theme="vs-dark"
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        lineNumbers: 'on',
                        glyphMargin: true,
                        folding: false,
                        lineDecorationsWidth: 10,
                        lineNumbersMinChars: 3,
                        renderLineHighlight: 'line',
                        scrollbar: {
                          vertical: 'hidden',
                          horizontal: 'auto',
                        },
                        overviewRulerLanes: 0,
                        hideCursorInOverviewRuler: true,
                        overviewRulerBorder: false,
                      }}
                    />
                  </div>
                </div>

                {/* Technical Explanation Toggle */}
                <div>
                  <button
                    onClick={() => toggleExpanded(issue.id)}
                    className="flex items-center gap-2 text-phantom-purple hover:text-haunted-orange transition-colors duration-200"
                  >
                    <span className={`
                      transform transition-transform duration-200
                      ${isExpanded ? 'rotate-90' : ''}
                    `}>
                      ▶
                    </span>
                    <span className="font-medium">
                      {isExpanded ? 'Hide' : 'Show'} Technical Explanation
                    </span>
                  </button>

                  {/* Expandable Technical Details */}
                  <div
                    className={`
                      overflow-hidden transition-all duration-300 ease-in-out
                      ${isExpanded ? 'max-h-96 opacity-100 mt-4' : 'max-h-0 opacity-0'}
                    `}
                  >
                    <div className="p-4 bg-cursed-black/50 rounded-lg border border-phantom-purple/30">
                      <h4 className="text-sm font-bold text-ghostly-white mb-2 flex items-center gap-2">
                        <span>📚</span>
                        <span>Technical Details</span>
                      </h4>
                      <p className="text-ghostly-white/80 text-sm leading-relaxed">
                        {issue.technicalExplanation}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Haunted Patch Preview (if available) */}
                {issue.hauntedPatch && (
                  <div className="pt-4 border-t border-phantom-purple/30">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">🔧</span>
                      <span className="text-ghostly-white font-medium">
                        Haunted Patch Available
                      </span>
                      <Badge variant="success">
                        {Math.round(issue.hauntedPatch.confidence * 100)}% Confidence
                      </Badge>
                    </div>
                    <p className="text-ghostly-white/60 text-sm">
                      {issue.hauntedPatch.explanation}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { SpectralScanner, SpectralScanResult, ScanSubmission } from '@/components/SpectralScanner';
import { CursedFeedback } from '@/components/CursedFeedback';
import { PatchGraveyard } from '@/components/PatchGraveyard';

export const Scanner: React.FC = () => {
  const [scanResult, setScanResult] = useState<SpectralScanResult | null>(null);
  const [submittedCode, setSubmittedCode] = useState<string>('');
  const [submittedLanguage, setSubmittedLanguage] = useState<string>('javascript');

  const handleScanSubmit = (submission: ScanSubmission) => {
    setSubmittedCode(submission.content);
    setSubmittedLanguage(submission.language);
  };

  const handleScanComplete = (result: SpectralScanResult) => {
    console.log('Scan complete:', result);
    setScanResult(result);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold cursed-title mb-2">
          Spectral Scanner 👻
        </h1>
        <p className="text-ghostly-white/70">
          Submit your code for demonic review
        </p>
      </div>

      <SpectralScanner 
        onScanSubmit={handleScanSubmit}
        onScanComplete={handleScanComplete} 
      />

      {scanResult && (
        <div className="mt-8 space-y-8">
          <div>
            <div className="mb-6">
              <h2 className="text-3xl font-bold cursed-title mb-2">
                Cursed Feedback 💀
              </h2>
              <p className="text-ghostly-white/70">
                The demonic oracle has spoken...
              </p>
            </div>
            
            <CursedFeedback
              issues={scanResult.issues}
              code={submittedCode}
              language={submittedLanguage}
              overallCurseLevel={scanResult.overallCurseLevel}
            />
          </div>

          {/* Show PatchGraveyard if there are patches available */}
          {(() => {
            const patchesFromIssues = scanResult.issues
              .filter((issue: any) => issue.hauntedPatch)
              .map((issue: any) => ({
                ...issue.hauntedPatch,
                severity: issue.severity,
                lineNumber: issue.lineNumber,
              }));
            
            return patchesFromIssues.length > 0 && (
              <div>
                <div className="mb-6">
                  <h2 className="text-3xl font-bold cursed-title mb-2">
                    Patch Graveyard 🪦
                  </h2>
                  <p className="text-ghostly-white/70">
                    Haunted patches conjured by the spirits...
                  </p>
                </div>
                
                <PatchGraveyard
                  patches={patchesFromIssues}
                  language={submittedLanguage}
                  onPatchAccepted={(patchId) => {
                    console.log('Patch accepted:', patchId);
                  }}
                  onPatchRejected={(patchId) => {
                    console.log('Patch rejected:', patchId);
                  }}
                />
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

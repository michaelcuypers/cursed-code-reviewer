import React, { useState, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, TextArea, Spinner } from '@/components/ui';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/useToast';

type SubmissionType = 'file' | 'text' | 'pr';
type SeverityLevel = 'minor' | 'moderate' | 'critical';

interface SpectralScannerProps {
  onScanSubmit?: (data: ScanSubmission) => void;
  onScanComplete?: (result: SpectralScanResult) => void;
}

export interface ScanSubmission {
  type: SubmissionType;
  content: string;
  language: string;
  severityLevel: SeverityLevel;
  ruleCategories?: string[];
}

export interface CursedIssue {
  id: string;
  severity: 'minor' | 'moderate' | 'critical';
  lineNumber: number;
  columnNumber: number;
  demonicMessage: string;
  technicalExplanation: string;
  ruleId: string;
  hauntedPatch?: HauntedPatch;
}

export interface HauntedPatch {
  id: string;
  issueId: string;
  originalCode: string;
  cursedCode: string;
  explanation: string;
  confidence: number;
}

export interface SpectralScanResult {
  scanId: string;
  timestamp: string;
  issues: CursedIssue[];
  overallCurseLevel: number;
  scanDuration: number;
  language: string;
  status: 'completed' | 'failed' | 'processing';
}

interface ScanPreferences {
  severityLevel: SeverityLevel;
  ruleCategories: string[];
}

const STORAGE_KEY = 'cursed-scanner-preferences';

export const SpectralScanner: React.FC<SpectralScannerProps> = ({ onScanSubmit, onScanComplete }) => {
  const { showError, showSuccess } = useToast();
  const [submissionType, setSubmissionType] = useState<SubmissionType>('text');
  const [codeText, setCodeText] = useState('');
  const [prUrl, setPrUrl] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);

  // Configuration state
  const [severityLevel, setSeverityLevel] = useState<SeverityLevel>('moderate');
  const [ruleCategories, setRuleCategories] = useState<string[]>([
    'code-quality',
    'security',
    'performance',
    'best-practices',
  ]);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const savedPreferences = localStorage.getItem(STORAGE_KEY);
    if (savedPreferences) {
      try {
        const prefs: ScanPreferences = JSON.parse(savedPreferences);
        setSeverityLevel(prefs.severityLevel);
        setRuleCategories(prefs.ruleCategories);
      } catch (error) {
        console.error('Failed to load preferences:', error);
      }
    }
  }, []);

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    const preferences: ScanPreferences = {
      severityLevel,
      ruleCategories,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [severityLevel, ruleCategories]);

  const supportedLanguages = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'go', label: 'Go' },
    { value: 'rust', label: 'Rust' },
    { value: 'cpp', label: 'C++' },
    { value: 'csharp', label: 'C#' },
  ];

  const availableRuleCategories = [
    { id: 'code-quality', label: 'Code Quality', icon: '✨' },
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'performance', label: 'Performance', icon: '⚡' },
    { id: 'best-practices', label: 'Best Practices', icon: '📚' },
  ];

  const toggleRuleCategory = (categoryId: string) => {
    setRuleCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const validateSubmission = (): string | null => {
    if (submissionType === 'pr') {
      if (!prUrl.trim()) {
        return '💀 The spirits demand a PR URL!';
      }
      if (!prUrl.match(/github\.com\/[\w-]+\/[\w-]+\/pull\/\d+/)) {
        return '💀 That doesn\'t look like a valid GitHub PR URL...';
      }
    } else {
      if (!codeText.trim()) {
        return '💀 You must offer code to the cursed reviewer!';
      }
      if (codeText.length < 10) {
        return '💀 Your code is too short to be cursed properly...';
      }
    }
    return null;
  };

  const pollScanStatus = async (scanId: string, maxAttempts = 30): Promise<SpectralScanResult> => {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const result = await apiClient.get<SpectralScanResult>(`/spectral-scan/${scanId}`);
        
        if (result.status === 'completed') {
          return result;
        }
        
        if (result.status === 'failed') {
          throw new Error('Scan failed during processing');
        }
        
        // Update progress based on status
        if (result.status === 'processing') {
          const progressPercent = Math.min(90, 30 + (attempts * 2));
          setProgress(progressPercent);
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
    
    throw new Error('Scan timed out - please try again');
  };

  const handleSubmit = async () => {
    setError(null);
    
    const validationError = validateSubmission();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setProgress(0);
    
    // Estimate time based on code length
    const codeLength = submissionType === 'pr' ? 1000 : codeText.length;
    const estimatedSeconds = Math.max(5, Math.min(30, Math.ceil(codeLength / 100)));
    setEstimatedTime(estimatedSeconds);

    try {
      const submission: ScanSubmission = {
        type: submissionType,
        content: submissionType === 'pr' ? prUrl : codeText,
        language: selectedLanguage,
        severityLevel,
        ruleCategories,
      };

      // Call the onScanSubmit callback if provided
      if (onScanSubmit) {
        onScanSubmit(submission);
      }

      setProgress(10);

      // Submit to API
      const initialResult = await apiClient.post<SpectralScanResult>('/spectral-scan', submission);
      
      setProgress(30);

      // If scan is still processing, poll for completion
      let finalResult = initialResult;
      if (initialResult.status === 'processing') {
        finalResult = await pollScanStatus(initialResult.scanId);
      }
      
      setProgress(100);

      // Call the onScanComplete callback if provided
      if (onScanComplete) {
        onScanComplete(finalResult);
      }

      // Show success toast
      showSuccess('✨ Spectral scan complete! The spirits have spoken.');

      // Reset form after successful submission
      setTimeout(() => {
        setIsSubmitting(false);
        setProgress(0);
        setEstimatedTime(null);
      }, 500);

    } catch (err) {
      setIsSubmitting(false);
      setProgress(0);
      setEstimatedTime(null);
      
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`💀 ${errorMessage}`);
      showError(errorMessage);
    }
  };

  const getCursedLoadingMessage = () => {
    if (progress < 30) return '🔮 Summoning the demonic oracle...';
    if (progress < 60) return '👻 Analyzing your cursed code...';
    if (progress < 90) return '🕷️ Conjuring haunted patches...';
    return '💀 Finalizing the spectral scan...';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCodeText(content);
      setUploadedFileName(file.name);
      setSubmissionType('file');
      
      // Auto-detect language from file extension
      const extension = file.name.split('.').pop()?.toLowerCase();
      const languageMap: Record<string, string> = {
        'js': 'javascript',
        'jsx': 'javascript',
        'ts': 'typescript',
        'tsx': 'typescript',
        'py': 'python',
        'java': 'java',
        'go': 'go',
        'rs': 'rust',
        'cpp': 'cpp',
        'cc': 'cpp',
        'cs': 'csharp',
      };
      if (extension && languageMap[extension]) {
        setSelectedLanguage(languageMap[extension]);
      }
    };
    reader.readAsText(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
      {/* Submission Type Selector */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Choose Your Doom 💀</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button
              variant={submissionType === 'text' ? 'primary' : 'secondary'}
              onClick={() => setSubmissionType('text')}
              className="flex-1"
            >
              📝 Paste Code
            </Button>
            <Button
              variant={submissionType === 'file' ? 'primary' : 'secondary'}
              onClick={() => setSubmissionType('file')}
              className="flex-1"
            >
              📁 Upload File
            </Button>
            <Button
              variant={submissionType === 'pr' ? 'primary' : 'secondary'}
              onClick={() => setSubmissionType('pr')}
              className="flex-1"
            >
              🔗 GitHub PR
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Code Input Area */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>
            {submissionType === 'text' && '📝 Paste Your Cursed Code'}
            {submissionType === 'file' && '📁 Upload Your Haunted File'}
            {submissionType === 'pr' && '🔗 Enter Pull Request URL'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {submissionType === 'text' && (
            <TextArea
              placeholder="// Paste your code here and let the spirits judge it...
function example() {
  console.log('Hello, darkness my old friend');
}"
              value={codeText}
              onChange={(e) => setCodeText(e.target.value)}
              rows={15}
              className="font-mono text-sm"
            />
          )}

          {submissionType === 'file' && (
            <div>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                  border-2 border-dashed rounded-lg p-12 text-center
                  transition-all duration-200 cursor-pointer
                  ${isDragging 
                    ? 'border-haunted-orange bg-haunted-orange/10' 
                    : 'border-phantom-purple/50 hover:border-phantom-purple hover:bg-phantom-purple/5'
                  }
                `}
                onClick={handleBrowseClick}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileInputChange}
                  className="hidden"
                  accept=".js,.jsx,.ts,.tsx,.py,.java,.go,.rs,.cpp,.cc,.cs,.c,.h"
                />
                <div className="space-y-4">
                  <div className="text-6xl">👻</div>
                  {uploadedFileName ? (
                    <div>
                      <p className="text-toxic-green font-medium">
                        File captured: {uploadedFileName}
                      </p>
                      <p className="text-ghostly-white/60 text-sm mt-2">
                        Click or drag another file to replace
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-ghostly-white font-medium">
                        Drag & drop your cursed file here
                      </p>
                      <p className="text-ghostly-white/60 text-sm mt-2">
                        or click to browse from the crypt
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {uploadedFileName && codeText && (
                <div className="mt-4">
                  <TextArea
                    value={codeText}
                    onChange={(e) => setCodeText(e.target.value)}
                    rows={10}
                    className="font-mono text-sm"
                  />
                </div>
              )}
            </div>
          )}

          {submissionType === 'pr' && (
            <div className="space-y-4">
              <Input
                placeholder="https://github.com/username/repo/pull/123"
                value={prUrl}
                onChange={(e) => setPrUrl(e.target.value)}
                icon={<span>🔗</span>}
              />
              <p className="text-ghostly-white/60 text-sm">
                💀 Enter a GitHub pull request URL to summon its cursed diff
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Language Selection */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>🗣️ Speak the Tongue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {supportedLanguages.map((lang) => (
              <button
                key={lang.value}
                onClick={() => setSelectedLanguage(lang.value)}
                className={`
                  px-4 py-3 rounded-lg font-medium transition-all duration-200
                  ${selectedLanguage === lang.value
                    ? 'bg-phantom-purple text-ghostly-white shadow-lg shadow-phantom-purple/50'
                    : 'bg-graveyard-gray text-ghostly-white/70 hover:bg-phantom-purple/20 border border-phantom-purple/30'
                  }
                `}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Configuration Options */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>⚙️ Curse Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Severity Level Selector */}
          <div>
            <label className="block text-sm font-medium text-ghostly-white mb-3">
              Severity Level
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setSeverityLevel('minor')}
                className={`
                  px-4 py-3 rounded-lg font-medium transition-all duration-200 text-center
                  ${severityLevel === 'minor'
                    ? 'bg-toxic-green text-cursed-black shadow-lg shadow-toxic-green/50'
                    : 'bg-graveyard-gray text-ghostly-white/70 hover:bg-toxic-green/20 border border-toxic-green/30'
                  }
                `}
              >
                <div className="text-2xl mb-1">😊</div>
                <div className="text-sm">Minor Curses</div>
              </button>
              <button
                onClick={() => setSeverityLevel('moderate')}
                className={`
                  px-4 py-3 rounded-lg font-medium transition-all duration-200 text-center
                  ${severityLevel === 'moderate'
                    ? 'bg-haunted-orange text-ghostly-white shadow-lg shadow-haunted-orange/50'
                    : 'bg-graveyard-gray text-ghostly-white/70 hover:bg-haunted-orange/20 border border-haunted-orange/30'
                  }
                `}
              >
                <div className="text-2xl mb-1">😰</div>
                <div className="text-sm">Moderate Hauntings</div>
              </button>
              <button
                onClick={() => setSeverityLevel('critical')}
                className={`
                  px-4 py-3 rounded-lg font-medium transition-all duration-200 text-center
                  ${severityLevel === 'critical'
                    ? 'bg-blood-red text-ghostly-white shadow-lg shadow-blood-red/50'
                    : 'bg-graveyard-gray text-ghostly-white/70 hover:bg-blood-red/20 border border-blood-red/30'
                  }
                `}
              >
                <div className="text-2xl mb-1">💀</div>
                <div className="text-sm">Critical Possessions</div>
              </button>
            </div>
          </div>

          {/* Rule Categories */}
          <div>
            <label className="block text-sm font-medium text-ghostly-white mb-3">
              Rule Categories
            </label>
            <div className="grid grid-cols-2 gap-3">
              {availableRuleCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => toggleRuleCategory(category.id)}
                  className={`
                    px-4 py-3 rounded-lg font-medium transition-all duration-200 text-left
                    ${ruleCategories.includes(category.id)
                      ? 'bg-phantom-purple text-ghostly-white shadow-lg shadow-phantom-purple/50'
                      : 'bg-graveyard-gray text-ghostly-white/70 hover:bg-phantom-purple/20 border border-phantom-purple/30'
                    }
                  `}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{category.icon}</span>
                    <span>{category.label}</span>
                    {ruleCategories.includes(category.id) && (
                      <span className="ml-auto text-toxic-green">✓</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button and Loading State */}
      <Card variant="elevated">
        <CardContent>
          {error && (
            <div className="mb-4 p-4 bg-blood-red/20 border-2 border-blood-red rounded-lg">
              <p className="text-blood-red font-medium">{error}</p>
            </div>
          )}

          {isSubmitting ? (
            <div className="space-y-4">
              <div className="text-center py-8">
                <div className="inline-block mb-4">
                  <Spinner size="lg" />
                </div>
                <p className="text-ghostly-white text-lg font-medium mb-2 animate-pulse">
                  {getCursedLoadingMessage()}
                </p>
                {estimatedTime && (
                  <p className="text-ghostly-white/60 text-sm">
                    Estimated time: ~{estimatedTime} seconds
                  </p>
                )}
              </div>

              {/* Progress Bar */}
              <div className="relative w-full h-3 bg-graveyard-gray rounded-full overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-phantom-purple to-haunted-orange transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                </div>
              </div>
              <p className="text-center text-ghostly-white/60 text-sm">
                {progress}% complete
              </p>
            </div>
          ) : (
            <Button
              variant="primary"
              size="lg"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full text-xl py-4 glow-purple"
            >
              <span className="flex items-center justify-center gap-3">
                <span>🔮</span>
                <span>Summon the Cursed Review</span>
                <span>💀</span>
              </span>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

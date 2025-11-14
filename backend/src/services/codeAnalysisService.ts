// Code analysis service for detecting issues and calculating curse levels

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import type { CodeIssue } from '../types/spectral';

const bedrockClient = new BedrockRuntimeClient({ 
  region: process.env.BEDROCK_REGION || 'eu-west-1' 
});

export class CodeAnalysisService {
  /**
   * Detect programming language from code content
   */
  detectLanguage(code: string, filename?: string): string {
    // Check filename extension first
    if (filename) {
      const ext = filename.split('.').pop()?.toLowerCase();
      const extensionMap: Record<string, string> = {
        'ts': 'typescript',
        'tsx': 'typescript',
        'js': 'javascript',
        'jsx': 'javascript',
        'py': 'python',
        'java': 'java',
        'go': 'go',
        'rs': 'rust',
        'cpp': 'cpp',
        'c': 'c',
        'cs': 'csharp',
        'rb': 'ruby',
        'php': 'php',
        'swift': 'swift',
        'kt': 'kotlin',
      };
      
      if (ext && extensionMap[ext]) {
        return extensionMap[ext];
      }
    }

    // Fallback to content-based detection
    const patterns = [
      { pattern: /import\s+.*\s+from\s+['"]/, language: 'javascript' },
      { pattern: /export\s+(default|const|function|class)/, language: 'javascript' },
      { pattern: /interface\s+\w+\s*{/, language: 'typescript' },
      { pattern: /type\s+\w+\s*=/, language: 'typescript' },
      { pattern: /def\s+\w+\s*\(/, language: 'python' },
      { pattern: /import\s+\w+/, language: 'python' },
      { pattern: /public\s+class\s+\w+/, language: 'java' },
      { pattern: /package\s+\w+/, language: 'go' },
      { pattern: /func\s+\w+\s*\(/, language: 'go' },
      { pattern: /fn\s+\w+\s*\(/, language: 'rust' },
    ];

    for (const { pattern, language } of patterns) {
      if (pattern.test(code)) {
        return language;
      }
    }

    return 'unknown';
  }

  /**
   * Analyze code using AWS Bedrock (Claude)
   */
  async analyzeCodeWithBedrock(code: string, language: string, severityLevel: string): Promise<CodeIssue[]> {
    try {
      const prompt = this.buildAnalysisPrompt(code, language, severityLevel);
      
      const command = new InvokeModelCommand({
        modelId: process.env.BEDROCK_MODEL_ID || 'arn:aws:bedrock:eu-west-1:493651073710:inference-profile/eu.anthropic.claude-3-7-sonnet-20250219-v1:0',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 4096,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3,
        }),
      });

      const response = await bedrockClient.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      
      // Parse Claude's response to extract issues
      return this.parseBedrockResponse(responseBody.content[0].text, code);
    } catch (error) {
      console.error('Bedrock analysis failed, falling back to basic analysis:', error);
      // Fallback to basic analysis if Bedrock fails
      return this.analyzeCodeBasic(code, language, severityLevel);
    }
  }

  /**
   * Build prompt for Bedrock analysis
   */
  private buildAnalysisPrompt(code: string, language: string, severityLevel: string): string {
    return `You are a spooky code reviewer called the "Cursed Code Reviewer" 🦇. Analyze the following ${language} code and identify ALL code quality issues, bugs, and bad practices.

For each issue found, provide:
1. Line number (count from 1)
2. Severity (minor, moderate, or critical)
3. A brief, spooky message describing the issue
4. The rule/pattern violated
5. The problematic code snippet

Focus on:
- Bugs and errors (division by zero, null/undefined access, array bounds)
- Type safety issues (use of 'any', missing types)
- Code smells (duplicate code, magic numbers, god methods)
- Bad practices (callback hell, no error handling, global scope pollution)
- Style issues (inconsistent naming, == vs ===, unused variables)
- Security issues (hardcoded credentials, eval usage)

Minimum severity level: ${severityLevel}

Code to analyze:
\`\`\`${language}
${code}
\`\`\`

Respond ONLY with a JSON array of issues in this exact format:
[
  {
    "lineNumber": 5,
    "severity": "critical",
    "message": "Division by zero detected",
    "ruleId": "no-division-by-zero",
    "context": "const result = x / 0;"
  }
]

If no issues found, return an empty array: []`;
  }

  /**
   * Parse Bedrock response to extract issues
   */
  private parseBedrockResponse(responseText: string, code: string): CodeIssue[] {
    try {
      // Extract JSON from response (Claude might wrap it in markdown)
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.warn('No JSON array found in Bedrock response');
        return [];
      }

      const issues = JSON.parse(jsonMatch[0]);
      const lines = code.split('\n');

      // Convert to CodeIssue format and add column numbers
      return issues.map((issue: any) => {
        const line = lines[issue.lineNumber - 1] || '';
        const columnNumber = line.indexOf(issue.context?.substring(0, 20) || '') || 0;

        return {
          severity: issue.severity as 'minor' | 'moderate' | 'critical',
          lineNumber: issue.lineNumber,
          columnNumber: Math.max(0, columnNumber),
          message: issue.message,
          ruleId: issue.ruleId,
          context: issue.context || line.trim(),
        };
      });
    } catch (error) {
      console.error('Failed to parse Bedrock response:', error);
      return [];
    }
  }

  /**
   * Basic static analysis (fallback)
   */
  analyzeCodeBasic(code: string, language: string, severityLevel: string): CodeIssue[] {
    const issues: CodeIssue[] = [];
    const lines = code.split('\n');

    // Basic static analysis rules
    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      // Check for console.log statements
      if (/console\.(log|debug|info|warn|error)/.test(line)) {
        issues.push({
          severity: 'minor',
          lineNumber,
          columnNumber: line.indexOf('console'),
          message: 'Console statement detected',
          ruleId: 'no-console',
          context: line.trim(),
        });
      }

      // Check for TODO comments
      if (/\/\/\s*TODO|#\s*TODO/.test(line)) {
        issues.push({
          severity: 'minor',
          lineNumber,
          columnNumber: line.indexOf('TODO'),
          message: 'TODO comment found',
          ruleId: 'no-todo',
          context: line.trim(),
        });
      }

      // Check for long lines
      if (line.length > 120) {
        issues.push({
          severity: 'minor',
          lineNumber,
          columnNumber: 0,
          message: `Line too long (${line.length} characters)`,
          ruleId: 'max-line-length',
          context: line.substring(0, 50) + '...',
        });
      }

      // Check for var usage in JavaScript/TypeScript
      if ((language === 'javascript' || language === 'typescript') && /\bvar\s+/.test(line)) {
        issues.push({
          severity: 'moderate',
          lineNumber,
          columnNumber: line.indexOf('var'),
          message: 'Use of var instead of let or const',
          ruleId: 'no-var',
          context: line.trim(),
        });
      }

      // Check for == instead of ===
      if ((language === 'javascript' || language === 'typescript') && /[^=!]==[^=]/.test(line)) {
        issues.push({
          severity: 'moderate',
          lineNumber,
          columnNumber: line.indexOf('=='),
          message: 'Use === instead of ==',
          ruleId: 'eqeqeq',
          context: line.trim(),
        });
      }

      // Check for empty catch blocks
      if (/catch\s*\(\s*\w*\s*\)\s*{\s*}/.test(line)) {
        issues.push({
          severity: 'critical',
          lineNumber,
          columnNumber: line.indexOf('catch'),
          message: 'Empty catch block',
          ruleId: 'no-empty-catch',
          context: line.trim(),
        });
      }

      // Check for eval usage
      if (/\beval\s*\(/.test(line)) {
        issues.push({
          severity: 'critical',
          lineNumber,
          columnNumber: line.indexOf('eval'),
          message: 'Use of eval is dangerous',
          ruleId: 'no-eval',
          context: line.trim(),
        });
      }

      // Check for hardcoded credentials patterns
      if (/(password|secret|api[_-]?key|token)\s*=\s*['"][^'"]+['"]/.test(line.toLowerCase())) {
        issues.push({
          severity: 'critical',
          lineNumber,
          columnNumber: 0,
          message: 'Potential hardcoded credential',
          ruleId: 'no-hardcoded-credentials',
          context: line.trim().substring(0, 30) + '...',
        });
      }
    });

    // Filter by severity level if specified
    if (severityLevel !== 'minor') {
      const severityOrder = { minor: 1, moderate: 2, critical: 3 };
      const minSeverity = severityOrder[severityLevel as keyof typeof severityOrder];
      return issues.filter(issue => severityOrder[issue.severity] >= minSeverity);
    }

    return issues;
  }

  /**
   * Calculate overall curse level based on issues
   */
  calculateCurseLevel(issues: CodeIssue[]): number {
    if (issues.length === 0) return 0;

    const severityWeights = {
      minor: 1,
      moderate: 3,
      critical: 10,
    };

    const totalWeight = issues.reduce((sum, issue) => {
      return sum + severityWeights[issue.severity];
    }, 0);

    // Normalize to 0-100 scale
    const maxPossibleWeight = issues.length * 10; // All critical
    return Math.min(100, Math.round((totalWeight / maxPossibleWeight) * 100));
  }
}

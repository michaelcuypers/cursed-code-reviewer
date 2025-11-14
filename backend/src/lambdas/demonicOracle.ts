// DemonicOracle Lambda - AI-powered demonic feedback generation using AWS Bedrock

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import type { CodeIssue, HauntedPatch } from '../types/spectral';

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.BEDROCK_REGION || 'us-east-1',
});

const BEDROCK_MODEL_ID = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0';

/**
 * Personality configurations based on severity
 */
interface PersonalityConfig {
  tone: string;
  phraseBank: string[];
  intensityLevel: number;
}

const PERSONALITIES: Record<string, PersonalityConfig> = {
  minor: {
    tone: 'sarcastic and mildly annoyed',
    phraseBank: [
      '👻 A minor spirit haunts this line',
      '🕷️ The spiders whisper of a small curse',
      '🦇 The bats notice something amiss',
      '🕸️ A tiny web of issues forms here',
      '💀 Even the dead would raise an eyebrow',
      '🎃 This pumpkin has a small bruise',
    ],
    intensityLevel: 1,
  },
  moderate: {
    tone: 'disappointed and stern',
    phraseBank: [
      '💀 The dead are displeased with this code',
      '🕸️ A moderate curse has been cast upon this',
      '👹 The demons frown upon this transgression',
      '⚰️ This code is halfway to the coffin',
      '🔮 The crystal ball shows troubling visions',
      '🧛 Even vampires would drain this code of life',
    ],
    intensityLevel: 2,
  },
  critical: {
    tone: 'furious and dramatic',
    phraseBank: [
      '🔥 THE FLAMES OF HELL CONSUME THIS CODE',
      '☠️ CRITICAL CURSE DETECTED - IMMEDIATE EXORCISM REQUIRED',
      '⚰️ THIS CODE BELONGS IN A COFFIN, BURIED DEEP',
      '👿 THE DEVIL HIMSELF RECOILS FROM THIS ABOMINATION',
      '💀 THE GRIM REAPER HAS MARKED THIS FOR DELETION',
      '🌋 VOLCANIC RAGE ERUPTS AT THE SIGHT OF THIS',
    ],
    intensityLevel: 3,
  },
};

/**
 * Select personality configuration based on severity
 */
export function selectCursedPersonality(severity: string): PersonalityConfig {
  return PERSONALITIES[severity] || PERSONALITIES.moderate;
}

/**
 * Generate prompt for demonic feedback
 */
export function generateDemonicFeedbackPrompt(
  issue: CodeIssue,
  personality: PersonalityConfig
): string {
  const phraseIntro = personality.phraseBank[
    Math.floor(Math.random() * personality.phraseBank.length)
  ];

  return `You are a cursed senior developer with a demonic, Halloween-themed personality. Your tone is ${personality.tone}.

Code Issue Details:
- Severity: ${issue.severity}
- Line: ${issue.lineNumber}
- Technical Issue: ${issue.message}
- Code Context: ${issue.context}

Your task:
1. Start with this Halloween phrase: "${phraseIntro}"
2. Explain the technical issue in a ${personality.tone} demonic voice
3. Use dark humor and Halloween references (ghosts, demons, curses, graves, etc.)
4. Be technically accurate while maintaining the spooky theme
5. Keep it concise (2-3 sentences max)
6. Use emojis sparingly for emphasis

Generate the demonic feedback message:`;
}

/**
 * Generate prompt for positive feedback (no issues found)
 */
export function generatePositiveFeedbackPrompt(): string {
  return `You are a cursed senior developer with a demonic, Halloween-themed personality. The code you reviewed is actually clean and has no issues.

Your task:
1. Provide encouraging feedback in your demonic voice
2. Express surprise or grudging respect that the code is clean
3. Use Halloween-themed compliments (e.g., "pure as a ghost", "untainted by curses")
4. Keep it brief (1-2 sentences)
5. Use emojis sparingly

Generate the positive demonic feedback:`;
}

/**
 * Generate prompt for haunted patch suggestion
 */
export function generateHauntedPatchPrompt(
  issue: CodeIssue,
  originalCode: string
): string {
  return `You are a cursed senior developer fixing code issues. Generate a corrected version of the code.

Original Code:
\`\`\`
${originalCode}
\`\`\`

Issue to Fix:
- Severity: ${issue.severity}
- Line: ${issue.lineNumber}
- Problem: ${issue.message}

Your task:
1. Provide ONLY the corrected code without any explanation
2. Fix the specific issue mentioned
3. Maintain the original code structure and style
4. Ensure the fix is syntactically correct
5. Do not add comments or explanations in the code

Return ONLY the fixed code block:`;
}

/**
 * Generate prompt for patch explanation
 */
export function generatePatchExplanationPrompt(
  originalCode: string,
  fixedCode: string,
  issue: CodeIssue
): string {
  return `You are a cursed senior developer explaining a code fix in a demonic, Halloween-themed voice.

Original Code:
\`\`\`
${originalCode}
\`\`\`

Fixed Code:
\`\`\`
${fixedCode}
\`\`\`

Issue Fixed: ${issue.message}

Your task:
1. Explain what was changed and why in 1-2 sentences
2. Use your demonic, Halloween-themed voice
3. Be technically accurate
4. Keep it concise

Generate the explanation:`;
}

/**
 * Invoke Bedrock model with a prompt
 */
async function invokeBedrockModel(prompt: string): Promise<string> {
  try {
    const payload = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 500,
      temperature: 0.8,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    };

    const command = new InvokeModelCommand({
      modelId: BEDROCK_MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload),
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    if (responseBody.content && responseBody.content.length > 0) {
      return responseBody.content[0].text.trim();
    }

    throw new Error('Empty response from Bedrock');
  } catch (error: any) {
    console.error('Bedrock invocation error:', error);
    throw error;
  }
}

/**
 * Generate demonic feedback for a code issue
 */
export async function conjureDemonicFeedback(
  issue: CodeIssue
): Promise<string> {
  try {
    const personality = selectCursedPersonality(issue.severity);
    const prompt = generateDemonicFeedbackPrompt(issue, personality);
    
    const demonicMessage = await invokeBedrockModel(prompt);
    return demonicMessage;
  } catch (error: any) {
    console.error('Error generating demonic feedback:', error);
    // Fallback to rule-based message
    return generateFallbackDemonicMessage(issue);
  }
}

/**
 * Generate positive feedback for clean code
 */
export async function conjurePositiveFeedback(): Promise<string> {
  try {
    const prompt = generatePositiveFeedbackPrompt();
    const positiveFeedback = await invokeBedrockModel(prompt);
    return positiveFeedback;
  } catch (error: any) {
    console.error('Error generating positive feedback:', error);
    // Fallback to rule-based message
    return '✨ Your code is pure! No curses detected! Even the demons are impressed by this clean work!';
  }
}

/**
 * Fallback demonic message generator (rule-based)
 */
function generateFallbackDemonicMessage(issue: CodeIssue): string {
  const personality = selectCursedPersonality(issue.severity);
  const phraseIntro = personality.phraseBank[
    Math.floor(Math.random() * personality.phraseBank.length)
  ];

  return `${phraseIntro}: ${issue.message}`;
}

/**
 * Parse Bedrock response and extract demonic message
 */
export function parseDemonicResponse(response: string): string {
  // Clean up the response
  let cleaned = response.trim();
  
  // Remove markdown code blocks if present
  cleaned = cleaned.replace(/```[\s\S]*?```/g, '');
  
  // Remove extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

/**
 * Ensure technical accuracy in demonic feedback
 */
export function validateDemonicFeedback(
  feedback: string,
  originalIssue: CodeIssue
): boolean {
  // Check if feedback contains key technical terms from the original issue
  const technicalTerms = originalIssue.message
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 4); // Filter meaningful words
  
  const feedbackLower = feedback.toLowerCase();
  
  // At least some technical terms should be present
  const hasRelevantTerms = technicalTerms.some(term => 
    feedbackLower.includes(term)
  );
  
  // Feedback should not be too short
  const hasMinimumLength = feedback.length > 20;
  
  return hasRelevantTerms && hasMinimumLength;
}

/**
 * Generate a haunted patch for a code issue
 */
export async function summonHauntedPatch(
  issue: CodeIssue,
  originalCode: string
): Promise<HauntedPatch | null> {
  try {
    // Generate the fixed code
    const patchPrompt = generateHauntedPatchPrompt(issue, originalCode);
    const fixedCodeResponse = await invokeBedrockModel(patchPrompt);
    const fixedCode = extractCodeFromResponse(fixedCodeResponse);

    // Validate the patch
    if (!validatePatchSyntax(fixedCode, originalCode)) {
      console.warn('Generated patch failed syntax validation');
      return null;
    }

    // Generate explanation for the patch
    const explanationPrompt = generatePatchExplanationPrompt(
      originalCode,
      fixedCode,
      issue
    );
    const explanation = await invokeBedrockModel(explanationPrompt);

    // Calculate confidence based on various factors
    const confidence = calculatePatchConfidence(
      originalCode,
      fixedCode,
      issue.severity
    );

    const patch: HauntedPatch = {
      id: '', // Will be set by caller
      issueId: '', // Will be set by caller
      originalCode,
      cursedCode: fixedCode,
      explanation: parseDemonicResponse(explanation),
      confidence,
    };

    return patch;
  } catch (error: any) {
    console.error('Error generating haunted patch:', error);
    return null;
  }
}

/**
 * Extract code from Bedrock response
 */
function extractCodeFromResponse(response: string): string {
  // Try to extract code from markdown code blocks
  const codeBlockMatch = response.match(/```(?:\w+)?\n?([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // If no code block, return the response as-is (cleaned)
  return response.trim();
}

/**
 * Validate patch syntax
 */
function validatePatchSyntax(fixedCode: string, originalCode: string): boolean {
  // Basic validation checks
  
  // 1. Fixed code should not be empty
  if (!fixedCode || fixedCode.trim().length === 0) {
    return false;
  }

  // 2. Fixed code should be different from original
  if (fixedCode.trim() === originalCode.trim()) {
    return false;
  }

  // 3. Check for balanced brackets/braces/parentheses
  const brackets = { '(': ')', '[': ']', '{': '}' };
  const stack: string[] = [];
  
  for (const char of fixedCode) {
    if (char in brackets) {
      stack.push(brackets[char as keyof typeof brackets]);
    } else if (Object.values(brackets).includes(char)) {
      if (stack.length === 0 || stack.pop() !== char) {
        return false;
      }
    }
  }

  // Stack should be empty if all brackets are balanced
  if (stack.length !== 0) {
    return false;
  }

  // 4. Check for common syntax errors
  const syntaxErrors = [
    /\)\s*\(/,  // Missing operator between parentheses
    /\}\s*\{/,  // Missing operator between braces
    /;;+/,      // Multiple semicolons
  ];

  for (const pattern of syntaxErrors) {
    if (pattern.test(fixedCode)) {
      return false;
    }
  }

  return true;
}

/**
 * Calculate confidence score for a patch
 */
function calculatePatchConfidence(
  originalCode: string,
  fixedCode: string,
  severity: string
): number {
  let confidence = 0.7; // Base confidence

  // Adjust based on severity (simpler fixes for minor issues = higher confidence)
  if (severity === 'minor') {
    confidence += 0.15;
  } else if (severity === 'critical') {
    confidence -= 0.1;
  }

  // Adjust based on code change size
  const changeRatio = Math.abs(fixedCode.length - originalCode.length) / originalCode.length;
  if (changeRatio < 0.2) {
    // Small changes = higher confidence
    confidence += 0.1;
  } else if (changeRatio > 0.5) {
    // Large changes = lower confidence
    confidence -= 0.15;
  }

  // Ensure confidence is between 0 and 1
  return Math.max(0.3, Math.min(0.95, confidence));
}

/**
 * Retry configuration
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
};

/**
 * Invoke Bedrock with retry logic
 */
async function invokeBedrockWithRetry(
  prompt: string,
  retryCount = 0
): Promise<string> {
  try {
    return await invokeBedrockModel(prompt);
  } catch (error: any) {
    // Check if error is retryable
    const isThrottling = error.name === 'ThrottlingException' || 
                        error.$metadata?.httpStatusCode === 429;
    const isTimeout = error.name === 'TimeoutError' ||
                     error.code === 'ETIMEDOUT';
    const isServiceError = error.$metadata?.httpStatusCode >= 500;

    const shouldRetry = (isThrottling || isTimeout || isServiceError) && 
                       retryCount < RETRY_CONFIG.maxRetries;

    if (shouldRetry) {
      // Calculate delay with exponential backoff
      const delay = Math.min(
        RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, retryCount),
        RETRY_CONFIG.maxDelayMs
      );

      console.log(`Retrying Bedrock invocation after ${delay}ms (attempt ${retryCount + 1}/${RETRY_CONFIG.maxRetries})`);
      
      await sleep(delay);
      return invokeBedrockWithRetry(prompt, retryCount + 1);
    }

    // Not retryable or max retries reached
    throw error;
  }
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate demonic feedback with fallback
 */
export async function conjureDemonicFeedbackWithFallback(
  issue: CodeIssue,
  timeoutMs = 25000
): Promise<string> {
  try {
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Bedrock timeout')), timeoutMs);
    });

    // Race between Bedrock call and timeout
    const personality = selectCursedPersonality(issue.severity);
    const prompt = generateDemonicFeedbackPrompt(issue, personality);
    
    const demonicMessage = await Promise.race([
      invokeBedrockWithRetry(prompt),
      timeoutPromise,
    ]);

    return parseDemonicResponse(demonicMessage);
  } catch (error: any) {
    console.error('Bedrock failed, using fallback:', error.message);
    // Fallback to rule-based analysis
    return generateFallbackDemonicMessage(issue);
  }
}

/**
 * Generate haunted patch with fallback
 */
export async function summonHauntedPatchWithFallback(
  issue: CodeIssue,
  originalCode: string,
  timeoutMs = 25000
): Promise<HauntedPatch | null> {
  try {
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Bedrock timeout')), timeoutMs);
    });

    // Race between patch generation and timeout
    const patchPromise = (async () => {
      // Generate the fixed code
      const patchPrompt = generateHauntedPatchPrompt(issue, originalCode);
      const fixedCodeResponse = await invokeBedrockWithRetry(patchPrompt);
      const fixedCode = extractCodeFromResponse(fixedCodeResponse);

      // Validate the patch
      if (!validatePatchSyntax(fixedCode, originalCode)) {
        console.warn('Generated patch failed syntax validation');
        return null;
      }

      // Generate explanation for the patch
      const explanationPrompt = generatePatchExplanationPrompt(
        originalCode,
        fixedCode,
        issue
      );
      const explanation = await invokeBedrockWithRetry(explanationPrompt);

      // Calculate confidence
      const confidence = calculatePatchConfidence(
        originalCode,
        fixedCode,
        issue.severity
      );

      const patch: HauntedPatch = {
        id: '',
        issueId: '',
        originalCode,
        cursedCode: fixedCode,
        explanation: parseDemonicResponse(explanation),
        confidence,
      };

      return patch;
    })();

    const patch = await Promise.race([patchPromise, timeoutPromise]);
    return patch;
  } catch (error: any) {
    console.error('Patch generation failed, using fallback:', error.message);
    // Return null to indicate no patch available
    // Fallback could generate a simple rule-based patch, but for now we return null
    return generateFallbackPatch(issue, originalCode);
  }
}

/**
 * Generate a simple fallback patch using rule-based logic
 */
function generateFallbackPatch(
  issue: CodeIssue,
  _originalCode: string
): HauntedPatch | null {
  // For now, return null to indicate patch generation failed
  // In a production system, you might implement simple rule-based fixes
  // for common issues (e.g., adding semicolons, fixing indentation)
  
  console.log('Fallback patch generation not implemented for:', issue.ruleId);
  return null;
}

/**
 * Check Bedrock service health
 */
export async function checkBedrockHealth(): Promise<boolean> {
  try {
    const testPrompt = 'Respond with "OK" if you can read this.';
    const response = await invokeBedrockWithRetry(testPrompt);
    return response.length > 0;
  } catch (error) {
    console.error('Bedrock health check failed:', error);
    return false;
  }
}

/**
 * Main handler for Lambda invocations
 */
export interface DemonicOracleEvent {
  action: 'generateFeedback' | 'generatePatch' | 'healthCheck';
  issue?: CodeIssue;
  originalCode?: string;
}

export interface DemonicOracleResponse {
  success: boolean;
  feedback?: string;
  patch?: HauntedPatch;
  error?: string;
  usedFallback?: boolean;
}

export async function handler(event: DemonicOracleEvent): Promise<DemonicOracleResponse> {
  console.log('DemonicOracle invoked:', JSON.stringify(event, null, 2));

  try {
    switch (event.action) {
      case 'generateFeedback':
        if (!event.issue) {
          throw new Error('Issue is required for generateFeedback action');
        }
        const feedback = await conjureDemonicFeedbackWithFallback(event.issue);
        return {
          success: true,
          feedback,
          usedFallback: false, // Could track this in the function
        };

      case 'generatePatch':
        if (!event.issue || !event.originalCode) {
          throw new Error('Issue and originalCode are required for generatePatch action');
        }
        const patch = await summonHauntedPatchWithFallback(event.issue, event.originalCode);
        return {
          success: true,
          patch: patch || undefined,
          usedFallback: patch === null,
        };

      case 'healthCheck':
        const isHealthy = await checkBedrockHealth();
        return {
          success: isHealthy,
        };

      default:
        throw new Error(`Unknown action: ${event.action}`);
    }
  } catch (error: any) {
    console.error('DemonicOracle error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

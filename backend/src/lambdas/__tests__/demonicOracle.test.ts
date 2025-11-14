// Tests for DemonicOracle Lambda

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CodeIssue } from '../../types/spectral';

// Mock Bedrock client
vi.mock('@aws-sdk/client-bedrock-runtime', () => {
  const mockSend = vi.fn();
  return {
    BedrockRuntimeClient: vi.fn().mockImplementation(() => ({
      send: mockSend,
    })),
    InvokeModelCommand: vi.fn().mockImplementation((params) => params),
    __mockSend: mockSend, // Export for test access
  };
});

// Import after mocks
import {
  handler,
  selectCursedPersonality,
  conjureDemonicFeedback,
  conjurePositiveFeedback,
  summonHauntedPatch,
  parseDemonicResponse,
  validateDemonicFeedback,
  checkBedrockHealth,
  conjureDemonicFeedbackWithFallback,
  summonHauntedPatchWithFallback,
} from '../demonicOracle';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';

// Get the mock send function
const getMockSend = () => {
  const client = new BedrockRuntimeClient({});
  return client.send as ReturnType<typeof vi.fn>;
};

describe('DemonicOracle Lambda', () => {
  let mockSend: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSend = getMockSend();
    vi.clearAllMocks();
  });

  describe('Personality selection', () => {
    it('should select minor personality for minor severity', () => {
      const personality = selectCursedPersonality('minor');
      
      expect(personality.tone).toBe('sarcastic and mildly annoyed');
      expect(personality.intensityLevel).toBe(1);
      expect(personality.phraseBank.length).toBeGreaterThan(0);
    });

    it('should select moderate personality for moderate severity', () => {
      const personality = selectCursedPersonality('moderate');
      
      expect(personality.tone).toBe('disappointed and stern');
      expect(personality.intensityLevel).toBe(2);
      expect(personality.phraseBank.length).toBeGreaterThan(0);
    });

    it('should select critical personality for critical severity', () => {
      const personality = selectCursedPersonality('critical');
      
      expect(personality.tone).toBe('furious and dramatic');
      expect(personality.intensityLevel).toBe(3);
      expect(personality.phraseBank.length).toBeGreaterThan(0);
    });

    it('should default to moderate personality for unknown severity', () => {
      const personality = selectCursedPersonality('unknown');
      
      expect(personality.tone).toBe('disappointed and stern');
      expect(personality.intensityLevel).toBe(2);
    });

    it('should have different phrase banks for each personality', () => {
      const minor = selectCursedPersonality('minor');
      const moderate = selectCursedPersonality('moderate');
      const critical = selectCursedPersonality('critical');
      
      expect(minor.phraseBank).not.toEqual(moderate.phraseBank);
      expect(moderate.phraseBank).not.toEqual(critical.phraseBank);
      expect(minor.phraseBank).not.toEqual(critical.phraseBank);
    });
  });

  describe('Bedrock response mocking', () => {
    it('should successfully invoke Bedrock and parse response', async () => {
      const mockResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [
            { text: '💀 The dead are displeased with this var usage!' }
          ]
        }))
      };
      
      mockSend.mockResolvedValue(mockResponse);

      const issue: CodeIssue = {
        severity: 'moderate',
        lineNumber: 5,
        columnNumber: 10,
        message: 'Unexpected var, use let or const instead',
        ruleId: 'no-var',
        context: 'var x = 1;',
      };

      const feedback = await conjureDemonicFeedback(issue);
      
      expect(feedback).toContain('💀');
      expect(mockSend).toHaveBeenCalled();
    });

    it('should handle Bedrock response with multiple content items', async () => {
      const mockResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [
            { text: '👻 First message' },
            { text: 'Second message' }
          ]
        }))
      };
      
      mockSend.mockResolvedValue(mockResponse);

      const issue: CodeIssue = {
        severity: 'minor',
        lineNumber: 1,
        columnNumber: 1,
        message: 'Missing semicolon',
        ruleId: 'semi',
        context: 'const x = 1',
      };

      const feedback = await conjureDemonicFeedback(issue);
      
      expect(feedback).toBe('👻 First message');
    });
  });

  describe('Prompt generation and response parsing', () => {
    it('should generate appropriate prompt for minor issues', async () => {
      const mockResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [{ text: '🕷️ Minor curse detected' }]
        }))
      };
      
      mockSend.mockResolvedValue(mockResponse);

      const issue: CodeIssue = {
        severity: 'minor',
        lineNumber: 10,
        columnNumber: 5,
        message: 'Missing semicolon',
        ruleId: 'semi',
        context: 'const x = 1',
      };

      await conjureDemonicFeedback(issue);
      
      const callArgs = mockSend.mock.calls[0][0];
      const body = JSON.parse(callArgs.body);
      
      expect(body.messages[0].content).toContain('sarcastic and mildly annoyed');
      expect(body.messages[0].content).toContain('minor');
    });

    it('should generate appropriate prompt for critical issues', async () => {
      const mockResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [{ text: '🔥 CRITICAL CURSE!' }]
        }))
      };
      
      mockSend.mockResolvedValue(mockResponse);

      const issue: CodeIssue = {
        severity: 'critical',
        lineNumber: 20,
        columnNumber: 1,
        message: 'eval can be harmful',
        ruleId: 'no-eval',
        context: 'eval("code")',
      };

      await conjureDemonicFeedback(issue);
      
      const callArgs = mockSend.mock.calls[0][0];
      const body = JSON.parse(callArgs.body);
      
      expect(body.messages[0].content).toContain('furious and dramatic');
      expect(body.messages[0].content).toContain('critical');
    });

    it('should parse demonic response correctly', () => {
      const response = '  💀 The dead are displeased  ';
      const parsed = parseDemonicResponse(response);
      
      expect(parsed).toBe('💀 The dead are displeased');
    });

    it('should remove markdown code blocks from response', () => {
      const response = '💀 Issue found\n```javascript\nconst x = 1;\n```\nFix it!';
      const parsed = parseDemonicResponse(response);
      
      expect(parsed).not.toContain('```');
      expect(parsed).toContain('💀 Issue found');
      expect(parsed).toContain('Fix it!');
    });

    it('should handle multi-line responses', () => {
      const response = '💀 Line 1\n\n\nLine 2\n   Line 3';
      const parsed = parseDemonicResponse(response);
      
      expect(parsed).toBe('💀 Line 1 Line 2 Line 3');
    });
  });

  describe('Fallback mechanisms', () => {
    it('should use fallback when Bedrock fails', async () => {
      mockSend.mockRejectedValue(new Error('Bedrock unavailable'));

      const issue: CodeIssue = {
        severity: 'moderate',
        lineNumber: 5,
        columnNumber: 10,
        message: 'Unexpected var',
        ruleId: 'no-var',
        context: 'var x = 1;',
      };

      const feedback = await conjureDemonicFeedback(issue);
      
      // Should still return feedback (fallback)
      expect(feedback).toBeDefined();
      expect(feedback.length).toBeGreaterThan(0);
      expect(feedback).toContain('Unexpected var');
    });

    it('should use fallback on Bedrock timeout', async () => {
      mockSend.mockImplementation(() => 
        new Promise((resolve) => setTimeout(resolve, 30000))
      );

      const issue: CodeIssue = {
        severity: 'critical',
        lineNumber: 1,
        columnNumber: 1,
        message: 'eval is evil',
        ruleId: 'no-eval',
        context: 'eval("x")',
      };

      const feedback = await conjureDemonicFeedbackWithFallback(issue, 100);
      
      expect(feedback).toBeDefined();
      expect(feedback).toContain('eval is evil');
    });

    it('should retry on throttling errors', async () => {
      const throttleError = new Error('ThrottlingException');
      throttleError.name = 'ThrottlingException';
      
      mockSend
        .mockRejectedValueOnce(throttleError)
        .mockRejectedValueOnce(throttleError)
        .mockResolvedValueOnce({
          body: new TextEncoder().encode(JSON.stringify({
            content: [{ text: '💀 Success after retry' }]
          }))
        });

      const issue: CodeIssue = {
        severity: 'moderate',
        lineNumber: 1,
        columnNumber: 1,
        message: 'Test issue',
        ruleId: 'test',
        context: 'test',
      };

      const feedback = await conjureDemonicFeedbackWithFallback(issue);
      
      expect(feedback).toContain('Success after retry');
      expect(mockSend).toHaveBeenCalledTimes(3);
    });

    it('should use fallback after max retries', async () => {
      const throttleError = new Error('ThrottlingException');
      throttleError.name = 'ThrottlingException';
      
      mockSend.mockRejectedValue(throttleError);

      const issue: CodeIssue = {
        severity: 'minor',
        lineNumber: 1,
        columnNumber: 1,
        message: 'Test issue',
        ruleId: 'test',
        context: 'test',
      };

      const feedback = await conjureDemonicFeedbackWithFallback(issue);
      
      expect(feedback).toBeDefined();
      expect(feedback).toContain('Test issue');
      expect(mockSend).toHaveBeenCalledTimes(4); // Initial + 3 retries
    }, 10000); // 10 second timeout for retry delays

    it('should handle empty Bedrock response', async () => {
      mockSend.mockResolvedValue({
        body: new TextEncoder().encode(JSON.stringify({
          content: []
        }))
      });

      const issue: CodeIssue = {
        severity: 'moderate',
        lineNumber: 1,
        columnNumber: 1,
        message: 'Test issue',
        ruleId: 'test',
        context: 'test',
      };

      const feedback = await conjureDemonicFeedback(issue);
      
      // Should use fallback
      expect(feedback).toBeDefined();
      expect(feedback).toContain('Test issue');
    });

    it('should generate fallback for positive feedback', async () => {
      mockSend.mockRejectedValue(new Error('Service error'));

      const feedback = await conjurePositiveFeedback();
      
      expect(feedback).toBeDefined();
      expect(feedback).toContain('pure');
      expect(feedback).toContain('clean');
    });
  });

  describe('Haunted patch generation', () => {
    it('should generate patch with fixed code', async () => {
      mockSend
        .mockResolvedValueOnce({
          body: new TextEncoder().encode(JSON.stringify({
            content: [{ text: '```javascript\nconst x = 1;\n```' }]
          }))
        })
        .mockResolvedValueOnce({
          body: new TextEncoder().encode(JSON.stringify({
            content: [{ text: '💀 Changed var to const for immutability' }]
          }))
        });

      const issue: CodeIssue = {
        severity: 'moderate',
        lineNumber: 1,
        columnNumber: 1,
        message: 'Unexpected var',
        ruleId: 'no-var',
        context: 'var x = 1;',
      };

      const patch = await summonHauntedPatch(issue, 'var x = 1;');
      
      expect(patch).not.toBeNull();
      expect(patch?.originalCode).toBe('var x = 1;');
      expect(patch?.cursedCode).toBe('const x = 1;');
      expect(patch?.explanation).toContain('const');
      expect(patch?.confidence).toBeGreaterThan(0);
      expect(patch?.confidence).toBeLessThanOrEqual(1);
    });

    it('should extract code from markdown blocks', async () => {
      mockSend
        .mockResolvedValueOnce({
          body: new TextEncoder().encode(JSON.stringify({
            content: [{ text: '```\nlet x = 1;\n```' }]
          }))
        })
        .mockResolvedValueOnce({
          body: new TextEncoder().encode(JSON.stringify({
            content: [{ text: 'Changed to let' }]
          }))
        });

      const issue: CodeIssue = {
        severity: 'minor',
        lineNumber: 1,
        columnNumber: 1,
        message: 'Use let',
        ruleId: 'no-var',
        context: 'var x = 1;',
      };

      const patch = await summonHauntedPatch(issue, 'var x = 1;');
      
      expect(patch?.cursedCode).toBe('let x = 1;');
    });

    it('should validate patch syntax', async () => {
      mockSend.mockResolvedValueOnce({
        body: new TextEncoder().encode(JSON.stringify({
          content: [{ text: 'function test() { // Missing closing brace' }]
        }))
      });

      const issue: CodeIssue = {
        severity: 'moderate',
        lineNumber: 1,
        columnNumber: 1,
        message: 'Fix function',
        ruleId: 'test',
        context: 'function test() {}',
      };

      const patch = await summonHauntedPatch(issue, 'function test() {}');
      
      // Should return null for invalid syntax
      expect(patch).toBeNull();
    });

    it('should reject patch identical to original', async () => {
      mockSend.mockResolvedValueOnce({
        body: new TextEncoder().encode(JSON.stringify({
          content: [{ text: 'var x = 1;' }]
        }))
      });

      const issue: CodeIssue = {
        severity: 'moderate',
        lineNumber: 1,
        columnNumber: 1,
        message: 'Fix var',
        ruleId: 'no-var',
        context: 'var x = 1;',
      };

      const patch = await summonHauntedPatch(issue, 'var x = 1;');
      
      expect(patch).toBeNull();
    });

    it('should calculate higher confidence for minor issues', async () => {
      mockSend
        .mockResolvedValueOnce({
          body: new TextEncoder().encode(JSON.stringify({
            content: [{ text: 'const x = 1;' }]
          }))
        })
        .mockResolvedValueOnce({
          body: new TextEncoder().encode(JSON.stringify({
            content: [{ text: 'Fixed' }]
          }))
        });

      const issue: CodeIssue = {
        severity: 'minor',
        lineNumber: 1,
        columnNumber: 1,
        message: 'Use const',
        ruleId: 'prefer-const',
        context: 'let x = 1;',
      };

      const patch = await summonHauntedPatch(issue, 'let x = 1;');
      
      expect(patch?.confidence).toBeGreaterThan(0.7);
    });

    it('should calculate lower confidence for critical issues', async () => {
      mockSend
        .mockResolvedValueOnce({
          body: new TextEncoder().encode(JSON.stringify({
            content: [{ text: 'const result = JSON.parse(input);' }]
          }))
        })
        .mockResolvedValueOnce({
          body: new TextEncoder().encode(JSON.stringify({
            content: [{ text: 'Replaced eval with JSON.parse' }]
          }))
        });

      const issue: CodeIssue = {
        severity: 'critical',
        lineNumber: 1,
        columnNumber: 1,
        message: 'eval is dangerous',
        ruleId: 'no-eval',
        context: 'eval(input)',
      };

      const patch = await summonHauntedPatch(issue, 'eval(input)');
      
      expect(patch?.confidence).toBeLessThan(0.8);
    });
  });

  describe('Feedback validation', () => {
    it('should validate feedback contains technical terms', () => {
      const issue: CodeIssue = {
        severity: 'moderate',
        lineNumber: 1,
        columnNumber: 1,
        message: 'Unexpected var, use let or const instead',
        ruleId: 'no-var',
        context: 'var x = 1;',
      };

      const goodFeedback = '💀 The spirits curse this var declaration! Use const or let instead.';
      const badFeedback = '💀 Bad code!';

      expect(validateDemonicFeedback(goodFeedback, issue)).toBe(true);
      expect(validateDemonicFeedback(badFeedback, issue)).toBe(false);
    });

    it('should reject feedback that is too short', () => {
      const issue: CodeIssue = {
        severity: 'minor',
        lineNumber: 1,
        columnNumber: 1,
        message: 'Missing semicolon',
        ruleId: 'semi',
        context: 'const x = 1',
      };

      const shortFeedback = '💀 Bad';
      
      expect(validateDemonicFeedback(shortFeedback, issue)).toBe(false);
    });

    it('should accept feedback with relevant technical content', () => {
      const issue: CodeIssue = {
        severity: 'critical',
        lineNumber: 1,
        columnNumber: 1,
        message: 'eval can be harmful and should be avoided',
        ruleId: 'no-eval',
        context: 'eval("code")',
      };

      const feedback = '🔥 THE FLAMES OF HELL consume this eval! This harmful function should be avoided at all costs!';
      
      expect(validateDemonicFeedback(feedback, issue)).toBe(true);
    });
  });

  describe('Positive feedback generation', () => {
    it('should generate positive feedback for clean code', async () => {
      mockSend.mockResolvedValue({
        body: new TextEncoder().encode(JSON.stringify({
          content: [{ text: '✨ Your code is pure as a ghost! No curses detected!' }]
        }))
      });

      const feedback = await conjurePositiveFeedback();
      
      expect(feedback).toBeDefined();
      expect(feedback.length).toBeGreaterThan(0);
    });

    it('should use fallback for positive feedback on error', async () => {
      mockSend.mockRejectedValue(new Error('Service error'));

      const feedback = await conjurePositiveFeedback();
      
      expect(feedback).toContain('pure');
      expect(feedback).toContain('No curses');
    });
  });

  describe('Patch fallback mechanisms', () => {
    it('should return null when patch generation fails', async () => {
      mockSend.mockRejectedValue(new Error('Bedrock error'));

      const issue: CodeIssue = {
        severity: 'moderate',
        lineNumber: 1,
        columnNumber: 1,
        message: 'Fix this',
        ruleId: 'test',
        context: 'test code',
      };

      const patch = await summonHauntedPatch(issue, 'test code');
      
      expect(patch).toBeNull();
    });

    it('should handle patch generation timeout', async () => {
      mockSend.mockImplementation(() => 
        new Promise((resolve) => setTimeout(resolve, 30000))
      );

      const issue: CodeIssue = {
        severity: 'moderate',
        lineNumber: 1,
        columnNumber: 1,
        message: 'Fix this',
        ruleId: 'test',
        context: 'test code',
      };

      const patch = await summonHauntedPatchWithFallback(issue, 'test code', 100);
      
      expect(patch).toBeNull();
    });

    it('should return null for empty patch response', async () => {
      mockSend.mockResolvedValue({
        body: new TextEncoder().encode(JSON.stringify({
          content: [{ text: '' }]
        }))
      });

      const issue: CodeIssue = {
        severity: 'moderate',
        lineNumber: 1,
        columnNumber: 1,
        message: 'Fix this',
        ruleId: 'test',
        context: 'test code',
      };

      const patch = await summonHauntedPatch(issue, 'test code');
      
      expect(patch).toBeNull();
    });
  });

  describe('Health check', () => {
    it('should return true when Bedrock is healthy', async () => {
      mockSend.mockResolvedValue({
        body: new TextEncoder().encode(JSON.stringify({
          content: [{ text: 'OK' }]
        }))
      });

      const isHealthy = await checkBedrockHealth();
      
      expect(isHealthy).toBe(true);
    });

    it('should return false when Bedrock is unavailable', async () => {
      mockSend.mockRejectedValue(new Error('Service unavailable'));

      const isHealthy = await checkBedrockHealth();
      
      expect(isHealthy).toBe(false);
    });

    it('should retry health check on throttling', async () => {
      const throttleError = new Error('ThrottlingException');
      throttleError.name = 'ThrottlingException';
      
      mockSend
        .mockRejectedValueOnce(throttleError)
        .mockResolvedValueOnce({
          body: new TextEncoder().encode(JSON.stringify({
            content: [{ text: 'OK' }]
          }))
        });

      const isHealthy = await checkBedrockHealth();
      
      expect(isHealthy).toBe(true);
      expect(mockSend).toHaveBeenCalledTimes(2);
    });
  });

  describe('Lambda handler', () => {
    it('should handle generateFeedback action', async () => {
      mockSend.mockResolvedValue({
        body: new TextEncoder().encode(JSON.stringify({
          content: [{ text: '💀 Demonic feedback' }]
        }))
      });

      const event = {
        action: 'generateFeedback' as const,
        issue: {
          severity: 'moderate' as const,
          lineNumber: 1,
          columnNumber: 1,
          message: 'Test issue',
          ruleId: 'test',
          context: 'test',
        },
      };

      const response = await handler(event);
      
      expect(response.success).toBe(true);
      expect(response.feedback).toBeDefined();
      expect(response.feedback).toContain('💀');
    });

    it('should handle generatePatch action', async () => {
      mockSend
        .mockResolvedValueOnce({
          body: new TextEncoder().encode(JSON.stringify({
            content: [{ text: 'const x = 1;' }]
          }))
        })
        .mockResolvedValueOnce({
          body: new TextEncoder().encode(JSON.stringify({
            content: [{ text: 'Fixed var to const' }]
          }))
        });

      const event = {
        action: 'generatePatch' as const,
        issue: {
          severity: 'moderate' as const,
          lineNumber: 1,
          columnNumber: 1,
          message: 'Use const',
          ruleId: 'no-var',
          context: 'var x = 1;',
        },
        originalCode: 'var x = 1;',
      };

      const response = await handler(event);
      
      expect(response.success).toBe(true);
      expect(response.patch).toBeDefined();
      expect(response.patch?.cursedCode).toBe('const x = 1;');
    });

    it('should handle healthCheck action', async () => {
      mockSend.mockResolvedValue({
        body: new TextEncoder().encode(JSON.stringify({
          content: [{ text: 'OK' }]
        }))
      });

      const event = {
        action: 'healthCheck' as const,
      };

      const response = await handler(event);
      
      expect(response.success).toBe(true);
    });

    it('should return error for missing issue in generateFeedback', async () => {
      const event = {
        action: 'generateFeedback' as const,
      };

      const response = await handler(event);
      
      expect(response.success).toBe(false);
      expect(response.error).toContain('Issue is required');
    });

    it('should return error for missing parameters in generatePatch', async () => {
      const event = {
        action: 'generatePatch' as const,
        issue: {
          severity: 'moderate' as const,
          lineNumber: 1,
          columnNumber: 1,
          message: 'Test',
          ruleId: 'test',
          context: 'test',
        },
      };

      const response = await handler(event);
      
      expect(response.success).toBe(false);
      expect(response.error).toContain('originalCode');
    });

    it('should return error for unknown action', async () => {
      const event = {
        action: 'unknownAction' as any,
      };

      const response = await handler(event);
      
      expect(response.success).toBe(false);
      expect(response.error).toContain('Unknown action');
    });
  });
});

# DemonicOracle Lambda

## Overview

The DemonicOracle Lambda is responsible for generating AI-powered demonic feedback and haunted code patches using AWS Bedrock. It transforms technical code issues into entertaining, Halloween-themed feedback while maintaining technical accuracy.

## Features

### 1. Bedrock Integration
- Uses AWS Bedrock Runtime Client with Claude 3 Sonnet model
- Configurable model ID and region via environment variables
- Robust error handling and retry logic

### 2. Personality System
- Three personality configurations based on issue severity:
  - **Minor**: Sarcastic and mildly annoyed (intensity 1)
  - **Moderate**: Disappointed and stern (intensity 2)
  - **Critical**: Furious and dramatic (intensity 3)
- Each personality has unique phrase banks and tone

### 3. Demonic Feedback Generation
- Converts technical issues into Halloween-themed feedback
- Maintains technical accuracy while using dark humor
- Supports positive feedback for clean code
- Automatic fallback to rule-based messages if Bedrock fails

### 4. Haunted Patch Generation
- Generates corrected code suggestions
- Validates patch syntax automatically
- Provides demonic explanations for changes
- Calculates confidence scores (0.3 - 0.95)

### 5. Error Handling & Resilience
- Exponential backoff retry logic (up to 3 retries)
- Handles throttling, timeouts, and service errors
- Automatic fallback to rule-based analysis
- Timeout protection (25 seconds default)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BEDROCK_MODEL_ID` | Bedrock model identifier | `anthropic.claude-3-sonnet-20240229-v1:0` |
| `BEDROCK_REGION` | AWS region for Bedrock | `us-east-1` |

## API

### Handler Event Structure

```typescript
interface DemonicOracleEvent {
  action: 'generateFeedback' | 'generatePatch' | 'healthCheck';
  issue?: CodeIssue;
  originalCode?: string;
}
```

### Actions

#### 1. Generate Feedback
Generates demonic feedback for a code issue.

**Input:**
```json
{
  "action": "generateFeedback",
  "issue": {
    "severity": "moderate",
    "lineNumber": 42,
    "columnNumber": 10,
    "message": "Variable 'x' is never used",
    "ruleId": "no-unused-vars",
    "context": "const x = 5;"
  }
}
```

**Output:**
```json
{
  "success": true,
  "feedback": "💀 The dead are displeased with this code: You've summoned a variable 'x' but left it to rot unused! This is a waste of precious memory in the crypt.",
  "usedFallback": false
}
```

#### 2. Generate Patch
Generates a haunted patch to fix a code issue.

**Input:**
```json
{
  "action": "generatePatch",
  "issue": {
    "severity": "minor",
    "lineNumber": 42,
    "columnNumber": 10,
    "message": "Missing semicolon",
    "ruleId": "semi",
    "context": "const x = 5"
  },
  "originalCode": "const x = 5"
}
```

**Output:**
```json
{
  "success": true,
  "patch": {
    "id": "",
    "issueId": "",
    "originalCode": "const x = 5",
    "cursedCode": "const x = 5;",
    "explanation": "👻 Added the missing semicolon to appease the syntax spirits!",
    "confidence": 0.85
  },
  "usedFallback": false
}
```

#### 3. Health Check
Checks if Bedrock service is available.

**Input:**
```json
{
  "action": "healthCheck"
}
```

**Output:**
```json
{
  "success": true
}
```

## Exported Functions

### Core Functions

- `conjureDemonicFeedbackWithFallback(issue, timeoutMs?)` - Generate feedback with retry and fallback
- `summonHauntedPatchWithFallback(issue, originalCode, timeoutMs?)` - Generate patch with retry and fallback
- `selectCursedPersonality(severity)` - Select personality based on severity
- `checkBedrockHealth()` - Check Bedrock service availability

### Prompt Engineering

- `generateDemonicFeedbackPrompt(issue, personality)` - Create feedback prompt
- `generatePositiveFeedbackPrompt()` - Create positive feedback prompt
- `generateHauntedPatchPrompt(issue, originalCode)` - Create patch generation prompt
- `generatePatchExplanationPrompt(originalCode, fixedCode, issue)` - Create patch explanation prompt

### Validation

- `validateDemonicFeedback(feedback, originalIssue)` - Ensure technical accuracy
- `validatePatchSyntax(fixedCode, originalCode)` - Validate generated patches
- `parseDemonicResponse(response)` - Clean and parse Bedrock responses

## Retry Configuration

```typescript
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
};
```

## Fallback Behavior

When Bedrock is unavailable or times out:

1. **Feedback Generation**: Falls back to rule-based demonic messages using personality phrase banks
2. **Patch Generation**: Returns null (no patch available)
3. **All Operations**: Log errors and continue gracefully

## Usage Example

```typescript
import { handler } from './demonicOracle';

// Generate feedback
const feedbackResult = await handler({
  action: 'generateFeedback',
  issue: {
    severity: 'critical',
    lineNumber: 10,
    columnNumber: 5,
    message: 'Potential SQL injection vulnerability',
    ruleId: 'security/detect-sql-injection',
    context: 'db.query("SELECT * FROM users WHERE id = " + userId)'
  }
});

// Generate patch
const patchResult = await handler({
  action: 'generatePatch',
  issue: {
    severity: 'moderate',
    lineNumber: 15,
    columnNumber: 0,
    message: 'Function is too complex',
    ruleId: 'complexity',
    context: 'function processData() { ... }'
  },
  originalCode: 'function processData() { ... }'
});
```

## Integration with SpectralAnalyzer

The DemonicOracle is invoked by SpectralAnalyzer to enhance code issues with demonic feedback and generate patches. The integration flow:

1. SpectralAnalyzer detects code issues
2. For each issue, invokes DemonicOracle to generate feedback
3. If auto-fix is enabled, invokes DemonicOracle to generate patches
4. Stores enhanced issues and patches in DynamoDB

## Performance Considerations

- **Timeout**: Default 25 seconds to stay within Lambda limits
- **Retry Logic**: Up to 3 retries with exponential backoff
- **Fallback**: Instant rule-based fallback if Bedrock fails
- **Batch Processing**: Consider invoking for multiple issues in parallel

## Error Handling

The Lambda handles various error scenarios:

- **ThrottlingException**: Retries with exponential backoff
- **TimeoutError**: Falls back to rule-based analysis
- **Service Errors (5xx)**: Retries up to 3 times
- **Invalid Input**: Returns error response with details
- **Syntax Validation Failures**: Returns null patch

## Testing

See `__tests__/demonicOracle.test.ts` for unit tests covering:
- Personality selection
- Prompt generation
- Bedrock invocation with mocks
- Retry logic
- Fallback mechanisms
- Patch validation

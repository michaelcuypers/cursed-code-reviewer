# SpectralAnalyzer Lambda

The SpectralAnalyzer Lambda is the core code scanning service that analyzes code submissions, detects issues, and generates cursed feedback.

## Features

### Code Submission (Task 4.1)
- Accepts code via direct text, file upload, or PR URL
- Automatic language detection for common languages (JavaScript, TypeScript, Python, Java, Go, etc.)
- S3 storage for large code submissions (>100KB)
- DynamoDB storage for scan metadata and issues
- Configurable severity levels (minor, moderate, critical)

### PR Fetching (Task 4.2)
- GitHub API integration to fetch PR diffs
- Parses PR changes and extracts modified code
- Supports public repositories (private repos require GitHub token)
- Handles authentication errors gracefully

### Code Analysis (Task 4.3)
- Static analysis rules for common code issues:
  - Console statements
  - TODO comments
  - Long lines (>120 characters)
  - Use of `var` instead of `let`/`const`
  - Loose equality (`==` instead of `===`)
  - Empty catch blocks
  - Use of `eval`
  - Hardcoded credentials
- Severity-based filtering
- Curse level calculation (0-100 scale)

### Scan Retrieval (Task 4.4)
- Retrieve scan results by scan ID
- User authorization verification
- Automatic code retrieval from S3 if needed
- Returns full scan details with issues

## API Endpoints

### POST /api/v1/spectral-scan
Submit code for scanning.

**Request Body:**
```json
{
  "type": "text" | "file" | "pr",
  "content": "code content or PR URL",
  "language": "javascript" (optional),
  "severityLevel": "minor" | "moderate" | "critical" (optional),
  "autoFixEnabled": true (optional)
}
```

**Response:**
```json
{
  "scanId": "uuid",
  "timestamp": "ISO 8601",
  "issues": [...],
  "overallCurseLevel": 42,
  "scanDuration": 1234,
  "language": "javascript",
  "status": "completed",
  "message": "👻 5 curses detected in your code!"
}
```

### GET /api/v1/spectral-scan/{scanId}
Retrieve scan results.

**Response:**
```json
{
  "scanId": "uuid",
  "timestamp": "ISO 8601",
  "issues": [...],
  "overallCurseLevel": 42,
  "scanDuration": 1234,
  "language": "javascript",
  "status": "completed",
  "submissionType": "text",
  "code": "...",
  "message": "👻 5 curses detected in your code!"
}
```

## Environment Variables

- `TOMBSTONE_TABLE_NAME`: DynamoDB table name for storing scans
- `CODE_CRYPT_BUCKET`: S3 bucket for storing large code submissions
- `GITHUB_TOKEN`: GitHub personal access token for private repo access (optional)

## Services Used

- **CodeAnalysisService**: Language detection and static analysis
- **S3Service**: Code storage and retrieval
- **ScanService**: DynamoDB operations for scans and issues
- **GitHubService**: PR fetching from GitHub API
- **UserService**: User context and scan count tracking

## Data Models

### SpectralScanRecord (DynamoDB)
- PK: `SCAN#{scanId}`
- SK: `METADATA`
- Contains: scanId, soulId, language, severity, timestamp, curse level, TTL (90 days)

### CursedIssueRecord (DynamoDB)
- PK: `SCAN#{scanId}`
- SK: `ISSUE#{issueId}`
- Contains: issue details, severity, line/column numbers, messages

## Testing

Run tests with:
```bash
npm test -- spectralAnalyzer.test.ts
```

## Future Enhancements

- Integration with DemonicOracle Lambda for AI-generated feedback (Task 5)
- Haunted patch generation (Task 6)
- Advanced language-specific analysis rules
- Support for more programming languages

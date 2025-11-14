// GitHub service for fetching PR diffs and code

import { Octokit } from '@octokit/rest';
import type { PRDiff, PRFile } from '../types/spectral';

export class GitHubService {
  private octokit: Octokit;

  constructor(token?: string) {
    this.octokit = new Octokit({
      auth: token || process.env.GITHUB_TOKEN,
    });
  }

  /**
   * Parse GitHub PR URL
   */
  parsePRUrl(url: string): { owner: string; repo: string; prNumber: number } | null {
    // Support formats:
    // https://github.com/owner/repo/pull/123
    // github.com/owner/repo/pull/123
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/);
    
    if (!match) {
      return null;
    }

    return {
      owner: match[1],
      repo: match[2],
      prNumber: parseInt(match[3], 10),
    };
  }

  /**
   * Fetch PR diff from GitHub
   */
  async fetchPRDiff(prUrl: string): Promise<PRDiff> {
    const parsed = this.parsePRUrl(prUrl);
    
    if (!parsed) {
      throw new Error('Invalid GitHub PR URL format');
    }

    const { owner, repo, prNumber } = parsed;

    try {
      // Fetch PR files
      const { data: files } = await this.octokit.pulls.listFiles({
        owner,
        repo,
        pull_number: prNumber,
      });

      // Convert to our PRFile format
      const prFiles: PRFile[] = files.map(file => ({
        filename: file.filename,
        status: file.status as 'added' | 'modified' | 'deleted',
        additions: file.additions,
        deletions: file.deletions,
        patch: file.patch || '',
      }));

      return {
        files: prFiles,
        repository: `${owner}/${repo}`,
        prNumber,
      };
    } catch (error: any) {
      console.error('Error fetching PR from GitHub:', error);
      
      if (error.status === 404) {
        throw new Error('PR not found or repository is private without access');
      }
      
      if (error.status === 401 || error.status === 403) {
        throw new Error('GitHub authentication failed or insufficient permissions');
      }

      throw new Error(`Failed to fetch PR: ${error.message}`);
    }
  }

  /**
   * Extract changed code from PR files
   */
  extractChangedCode(prFiles: PRFile[]): string {
    const codeLines: string[] = [];

    for (const file of prFiles) {
      if (file.status === 'deleted') {
        continue; // Skip deleted files
      }

      codeLines.push(`// File: ${file.filename}`);
      codeLines.push('');

      // Parse patch to extract added/modified lines
      if (file.patch) {
        const lines = file.patch.split('\n');
        for (const line of lines) {
          // Include added lines (starting with +) and context lines
          if (line.startsWith('+') && !line.startsWith('+++')) {
            codeLines.push(line.substring(1)); // Remove the + prefix
          } else if (!line.startsWith('-') && !line.startsWith('@@') && !line.startsWith('+++') && !line.startsWith('---')) {
            codeLines.push(line);
          }
        }
      }

      codeLines.push('');
      codeLines.push('');
    }

    return codeLines.join('\n');
  }

  /**
   * Fetch file content from GitHub
   */
  async fetchFileContent(
    owner: string,
    repo: string,
    path: string,
    ref: string
  ): Promise<string> {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
        ref,
      });

      if ('content' in data && data.content) {
        return Buffer.from(data.content, 'base64').toString('utf-8');
      }

      throw new Error('File content not available');
    } catch (error: any) {
      console.error('Error fetching file content:', error);
      throw new Error(`Failed to fetch file content: ${error.message}`);
    }
  }
}

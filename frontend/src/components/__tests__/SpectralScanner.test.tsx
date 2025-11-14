// Tests for SpectralScanner component - code submission, configuration, and loading states

import { render, screen, fireEvent, waitFor } from '@/test/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpectralScanner } from '../SpectralScanner';
import * as apiClient from '@/lib/api-client';

vi.mock('@/lib/api-client');

describe('SpectralScanner Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('File Upload and Code Submission', () => {
    it('should render code paste interface by default', () => {
      render(<SpectralScanner />);
      
      expect(screen.getByText(/Paste Code/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Paste your code here/i)).toBeInTheDocument();
    });

    it('should switch to file upload mode', () => {
      render(<SpectralScanner />);
      
      const fileButton = screen.getByRole('button', { name: /Upload File/i });
      fireEvent.click(fileButton);
      
      expect(screen.getByText(/Drag & drop your cursed file here/i)).toBeInTheDocument();
    });

    it('should switch to PR URL mode', () => {
      render(<SpectralScanner />);
      
      const prButton = screen.getByRole('button', { name: /GitHub PR/i });
      fireEvent.click(prButton);
      
      expect(screen.getByPlaceholderText(/github\.com/i)).toBeInTheDocument();
    });

    it('should handle text code submission', async () => {
      const mockOnScanSubmit = vi.fn();
      const mockResult = {
        scanId: 'scan-123',
        timestamp: '2024-01-01T00:00:00Z',
        issues: [],
        overallCurseLevel: 0,
        scanDuration: 5,
      };

      vi.mocked(apiClient.apiClient.post).mockResolvedValue(mockResult);

      render(<SpectralScanner onScanSubmit={mockOnScanSubmit} />);
      
      const textarea = screen.getByPlaceholderText(/Paste your code here/i);
      fireEvent.change(textarea, { 
        target: { value: 'function test() { console.log("hello"); }' } 
      });
      
      const submitButton = screen.getByRole('button', { name: /Summon the Cursed Review/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnScanSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'text',
            content: 'function test() { console.log("hello"); }',
            language: 'javascript',
          })
        );
      });
    });

    it('should validate empty code submission', async () => {
      render(<SpectralScanner />);
      
      const submitButton = screen.getByRole('button', { name: /Summon the Cursed Review/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/You must offer code to the cursed reviewer/i)).toBeInTheDocument();
      });
    });

    it('should validate code length', async () => {
      render(<SpectralScanner />);
      
      const textarea = screen.getByPlaceholderText(/Paste your code here/i);
      fireEvent.change(textarea, { target: { value: 'short' } });
      
      const submitButton = screen.getByRole('button', { name: /Summon the Cursed Review/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Your code is too short/i)).toBeInTheDocument();
      });
    });

    it('should validate PR URL format', async () => {
      render(<SpectralScanner />);
      
      const prButton = screen.getByRole('button', { name: /GitHub PR/i });
      fireEvent.click(prButton);
      
      const urlInput = screen.getByPlaceholderText(/github\.com/i);
      fireEvent.change(urlInput, { target: { value: 'invalid-url' } });
      
      const submitButton = screen.getByRole('button', { name: /Summon the Cursed Review/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/doesn't look like a valid GitHub PR URL/i)).toBeInTheDocument();
      });
    });

    it('should handle valid PR URL submission', async () => {
      const mockOnScanSubmit = vi.fn();
      const mockResult = {
        scanId: 'scan-456',
        timestamp: '2024-01-01T00:00:00Z',
        issues: [],
        overallCurseLevel: 0,
        scanDuration: 10,
      };

      vi.mocked(apiClient.apiClient.post).mockResolvedValue(mockResult);

      render(<SpectralScanner onScanSubmit={mockOnScanSubmit} />);
      
      const prButton = screen.getByRole('button', { name: /GitHub PR/i });
      fireEvent.click(prButton);
      
      const urlInput = screen.getByPlaceholderText(/github\.com/i);
      fireEvent.change(urlInput, { 
        target: { value: 'https://github.com/user/repo/pull/123' } 
      });
      
      const submitButton = screen.getByRole('button', { name: /Summon the Cursed Review/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnScanSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'pr',
            content: 'https://github.com/user/repo/pull/123',
          })
        );
      });
    });

    it('should handle file upload with language detection', async () => {
      render(<SpectralScanner />);
      
      const fileButton = screen.getByRole('button', { name: /Upload File/i });
      fireEvent.click(fileButton);
      
      const file = new File(['const x = 1;'], 'test.ts', { type: 'text/plain' });
      const dropZone = screen.getByText(/Drag & drop your cursed file here/i).closest('div');
      
      fireEvent.drop(dropZone!, {
        dataTransfer: { files: [file] },
      });

      await waitFor(() => {
        expect(screen.getByText(/File captured: test\.ts/i)).toBeInTheDocument();
      });
    });
  });

  describe('Configuration Options', () => {
    it('should render severity level selector', () => {
      render(<SpectralScanner />);
      
      expect(screen.getByText(/Minor Curses/i)).toBeInTheDocument();
      expect(screen.getByText(/Moderate Hauntings/i)).toBeInTheDocument();
      expect(screen.getByText(/Critical Possessions/i)).toBeInTheDocument();
    });

    it('should change severity level', () => {
      const mockOnScanSubmit = vi.fn();
      render(<SpectralScanner onScanSubmit={mockOnScanSubmit} />);
      
      const criticalButton = screen.getByText(/Critical Possessions/i);
      fireEvent.click(criticalButton);
      
      expect(criticalButton.closest('button')).toHaveClass('bg-blood-red');
    });

    it('should toggle auto-fix mode', () => {
      render(<SpectralScanner />);
      
      const container = screen.getByText(/Automatically apply haunted patches/i).closest('div')?.parentElement;
      const toggleButton = container?.querySelector('button');
      
      expect(toggleButton).toBeTruthy();
      expect(toggleButton).not.toHaveClass('bg-toxic-green');
      
      fireEvent.click(toggleButton!);
      expect(toggleButton).toHaveClass('bg-toxic-green');
    });

    it('should toggle rule categories', () => {
      render(<SpectralScanner />);
      
      const securityButton = screen.getByText(/Security/i).closest('button');
      fireEvent.click(securityButton!);
      
      expect(securityButton).not.toHaveClass('bg-phantom-purple');
      
      fireEvent.click(securityButton!);
      expect(securityButton).toHaveClass('bg-phantom-purple');
    });

    it('should persist preferences to localStorage', async () => {
      render(<SpectralScanner />);
      
      const criticalButton = screen.getByText(/Critical Possessions/i);
      fireEvent.click(criticalButton);
      
      const container = screen.getByText(/Automatically apply haunted patches/i).closest('div')?.parentElement;
      const toggleButton = container?.querySelector('button');
      fireEvent.click(toggleButton!);

      await waitFor(() => {
        const saved = localStorage.getItem('cursed-scanner-preferences');
        expect(saved).toBeTruthy();
        const prefs = JSON.parse(saved!);
        expect(prefs.severityLevel).toBe('critical');
        expect(prefs.autoFixEnabled).toBe(true);
      });
    });

    it('should load preferences from localStorage', () => {
      localStorage.setItem('cursed-scanner-preferences', JSON.stringify({
        severityLevel: 'minor',
        autoFixEnabled: true,
        ruleCategories: ['security', 'performance'],
      }));

      render(<SpectralScanner />);
      
      const minorButton = screen.getByText(/Minor Curses/i).closest('button');
      expect(minorButton).toHaveClass('bg-toxic-green');
      
      const container = screen.getByText(/Automatically apply haunted patches/i).closest('div')?.parentElement;
      const toggleButton = container?.querySelector('button');
      expect(toggleButton).toHaveClass('bg-toxic-green');
    });

    it('should include configuration in submission', async () => {
      const mockOnScanSubmit = vi.fn();
      const mockResult = {
        scanId: 'scan-789',
        timestamp: '2024-01-01T00:00:00Z',
        issues: [],
        overallCurseLevel: 0,
        scanDuration: 5,
      };

      vi.mocked(apiClient.apiClient.post).mockResolvedValue(mockResult);

      render(<SpectralScanner onScanSubmit={mockOnScanSubmit} />);
      
      const criticalButton = screen.getByText(/Critical Possessions/i);
      fireEvent.click(criticalButton);
      
      const container = screen.getByText(/Automatically apply haunted patches/i).closest('div')?.parentElement;
      const toggleButton = container?.querySelector('button');
      fireEvent.click(toggleButton!);
      
      const textarea = screen.getByPlaceholderText(/Paste your code here/i);
      fireEvent.change(textarea, { 
        target: { value: 'function test() { return true; }' } 
      });
      
      const submitButton = screen.getByRole('button', { name: /Summon the Cursed Review/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnScanSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            severityLevel: 'critical',
            autoFixEnabled: true,
          })
        );
      });
    });
  });

  describe('Loading States and Error Handling', () => {
    it('should show loading state during submission', async () => {
      vi.mocked(apiClient.apiClient.post).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<SpectralScanner />);
      
      const textarea = screen.getByPlaceholderText(/Paste your code here/i);
      fireEvent.change(textarea, { 
        target: { value: 'function test() { return true; }' } 
      });
      
      const submitButton = screen.getByRole('button', { name: /Summon the Cursed Review/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Summoning the demonic oracle/i)).toBeInTheDocument();
      });
    });

    it('should show progress bar during submission', async () => {
      vi.mocked(apiClient.apiClient.post).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<SpectralScanner />);
      
      const textarea = screen.getByPlaceholderText(/Paste your code here/i);
      fireEvent.change(textarea, { 
        target: { value: 'function test() { return true; }' } 
      });
      
      const submitButton = screen.getByRole('button', { name: /Summon the Cursed Review/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/% complete/i)).toBeInTheDocument();
      });
    });

    it('should show estimated time during submission', async () => {
      vi.mocked(apiClient.apiClient.post).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<SpectralScanner />);
      
      const textarea = screen.getByPlaceholderText(/Paste your code here/i);
      fireEvent.change(textarea, { 
        target: { value: 'function test() { return true; }' } 
      });
      
      const submitButton = screen.getByRole('button', { name: /Summon the Cursed Review/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Estimated time:/i)).toBeInTheDocument();
      });
    });

    it('should handle API errors', async () => {
      vi.mocked(apiClient.apiClient.post).mockRejectedValue(
        new Error('Network error occurred')
      );

      render(<SpectralScanner />);
      
      const textarea = screen.getByPlaceholderText(/Paste your code here/i);
      fireEvent.change(textarea, { 
        target: { value: 'function test() { return true; }' } 
      });
      
      const submitButton = screen.getByRole('button', { name: /Summon the Cursed Review/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/💀 Network error occurred/i)).toBeInTheDocument();
      });
    });

    it('should call onScanComplete callback on success', async () => {
      const mockOnScanComplete = vi.fn();
      const mockResult = {
        scanId: 'scan-complete',
        timestamp: '2024-01-01T00:00:00Z',
        issues: [],
        overallCurseLevel: 0,
        scanDuration: 5,
      };

      vi.mocked(apiClient.apiClient.post).mockResolvedValue(mockResult);

      render(<SpectralScanner onScanComplete={mockOnScanComplete} />);
      
      const textarea = screen.getByPlaceholderText(/Paste your code here/i);
      fireEvent.change(textarea, { 
        target: { value: 'function test() { return true; }' } 
      });
      
      const submitButton = screen.getByRole('button', { name: /Summon the Cursed Review/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnScanComplete).toHaveBeenCalledWith(mockResult);
      });
    });

    it('should reset form after successful submission', async () => {
      const mockResult = {
        scanId: 'scan-reset',
        timestamp: '2024-01-01T00:00:00Z',
        issues: [],
        overallCurseLevel: 0,
        scanDuration: 5,
      };

      vi.mocked(apiClient.apiClient.post).mockResolvedValue(mockResult);

      render(<SpectralScanner />);
      
      const textarea = screen.getByPlaceholderText(/Paste your code here/i);
      fireEvent.change(textarea, { 
        target: { value: 'function test() { return true; }' } 
      });
      
      const submitButton = screen.getByRole('button', { name: /Summon the Cursed Review/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Summon the Cursed Review/i })).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should change language selection', () => {
      render(<SpectralScanner />);
      
      const pythonButton = screen.getByText('Python');
      fireEvent.click(pythonButton);
      
      expect(pythonButton).toHaveClass('bg-phantom-purple');
    });
  });
});

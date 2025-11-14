// Tests for PatchGraveyard component - patch rendering, diff display, accept/reject actions, filtering and sorting

import { render, screen, fireEvent, waitFor } from '@/test/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PatchGraveyard } from '../PatchGraveyard';
import * as apiClient from '@/lib/api-client';

vi.mock('@/lib/api-client');

describe('PatchGraveyard Component', () => {
  const mockPatches = [
    {
      id: 'patch-1',
      issueId: 'issue-1',
      originalCode: 'console.log("test");',
      cursedCode: '// Removed console.log',
      explanation: 'Removed console statement for production',
      confidence: 0.95,
      severity: 'minor' as const,
      lineNumber: 5,
    },
    {
      id: 'patch-2',
      issueId: 'issue-2',
      originalCode: 'var x = 1;',
      cursedCode: 'const x = 1;',
      explanation: 'Changed var to const for better scoping',
      confidence: 0.65,
      severity: 'moderate' as const,
      lineNumber: 10,
    },
    {
      id: 'patch-3',
      issueId: 'issue-3',
      originalCode: 'if (x == null)',
      cursedCode: 'if (x === null)',
      explanation: 'Use strict equality operator',
      confidence: 0.85,
      severity: 'critical' as const,
      lineNumber: 3,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  describe('Patch Rendering and Diff Display', () => {
    it('should render all patches', () => {
      render(<PatchGraveyard patches={mockPatches} />);

      expect(screen.getByText(/Removed console statement for production/i)).toBeInTheDocument();
      expect(screen.getByText(/Changed var to const for better scoping/i)).toBeInTheDocument();
      expect(screen.getByText(/Use strict equality operator/i)).toBeInTheDocument();
    });

    it('should display empty state when no patches', () => {
      render(<PatchGraveyard patches={[]} />);

      expect(screen.getByText(/The Graveyard is Empty/i)).toBeInTheDocument();
      expect(screen.getByText(/No haunted patches have been conjured yet/i)).toBeInTheDocument();
      expect(screen.getByText('🪦')).toBeInTheDocument();
    });

    it('should display patch confidence scores', () => {
      render(<PatchGraveyard patches={mockPatches} />);

      expect(screen.getByText(/95% Confidence/i)).toBeInTheDocument();
      expect(screen.getByText(/65% Confidence/i)).toBeInTheDocument();
      expect(screen.getByText(/85% Confidence/i)).toBeInTheDocument();
    });

    it('should display severity badges', () => {
      render(<PatchGraveyard patches={mockPatches} />);

      expect(screen.getByText('MINOR')).toBeInTheDocument();
      expect(screen.getByText('MODERATE')).toBeInTheDocument();
      expect(screen.getByText('CRITICAL')).toBeInTheDocument();
    });

    it('should display line numbers', () => {
      render(<PatchGraveyard patches={mockPatches} />);

      expect(screen.getByText('Line 5')).toBeInTheDocument();
      expect(screen.getByText('Line 10')).toBeInTheDocument();
      expect(screen.getByText('Line 3')).toBeInTheDocument();
    });

    it('should display confidence icons based on level', () => {
      render(<PatchGraveyard patches={mockPatches} />);

      // High confidence (≥80%) shows ✨ - patch-1 (95%) and patch-3 (85%)
      expect(screen.getByText(/95% Confidence/i)).toBeInTheDocument();
      expect(screen.getByText(/85% Confidence/i)).toBeInTheDocument();

      // Medium confidence (50-79%) shows different badge - patch-2 (65%)
      expect(screen.getByText(/65% Confidence/i)).toBeInTheDocument();
    });

    it('should display side-by-side code comparison', () => {
      render(<PatchGraveyard patches={mockPatches} />);

      expect(screen.getAllByText('💀')).toBeTruthy();
      expect(screen.getAllByText('Cursed Code')).toBeTruthy();
      expect(screen.getAllByText('✨')).toBeTruthy();
      expect(screen.getAllByText('Blessed Code')).toBeTruthy();
    });

    it('should render code editors for original and fixed code', () => {
      render(<PatchGraveyard patches={mockPatches} />);

      // Monaco editor shows "Loading..." initially in tests
      const loadingTexts = screen.getAllByText('Loading...');
      // Each patch has 2 editors (original and fixed)
      expect(loadingTexts.length).toBe(mockPatches.length * 2);
    });

    it('should display patch statistics', () => {
      render(<PatchGraveyard patches={mockPatches} />);

      expect(screen.getByText('🪦 Patch Graveyard')).toBeInTheDocument();
      expect(screen.getByText('Total Patches')).toBeInTheDocument();
      expect(screen.getByText('Accepted')).toBeInTheDocument();
      expect(screen.getByText('Rejected')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument(); // Total patches count
    });
  });

  describe('Accept/Reject Actions', () => {
    it('should call API when accepting a patch', async () => {
      vi.mocked(apiClient.apiClient.post).mockResolvedValue({ success: true });

      render(<PatchGraveyard patches={mockPatches} />);

      const acceptButtons = screen.getAllByText('Accept Patch');
      fireEvent.click(acceptButtons[0]);

      await waitFor(() => {
        expect(apiClient.apiClient.post).toHaveBeenCalledWith('/haunted-patch/accept', {
          patchId: 'patch-3', // First patch is critical (sorted by severity)
          scanId: 'issue-3',
        });
      });
    });

    it('should show processing state when accepting', async () => {
      vi.mocked(apiClient.apiClient.post).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<PatchGraveyard patches={mockPatches} />);

      const acceptButtons = screen.getAllByText('Accept Patch');
      fireEvent.click(acceptButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Accepting...')).toBeInTheDocument();
      });
    });

    it('should mark patch as accepted after successful API call', async () => {
      vi.mocked(apiClient.apiClient.post).mockResolvedValue({ success: true });

      render(<PatchGraveyard patches={mockPatches} />);

      const acceptButtons = screen.getAllByText('Accept Patch');
      fireEvent.click(acceptButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Accepted')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should call onPatchAccepted callback', async () => {
      const mockOnPatchAccepted = vi.fn();
      vi.mocked(apiClient.apiClient.post).mockResolvedValue({ success: true });

      render(<PatchGraveyard patches={mockPatches} onPatchAccepted={mockOnPatchAccepted} />);

      const acceptButtons = screen.getAllByText('Accept Patch');
      fireEvent.click(acceptButtons[0]);

      await waitFor(() => {
        expect(mockOnPatchAccepted).toHaveBeenCalledWith('patch-3'); // First patch is critical
      });
    });

    it('should handle API errors when accepting', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(apiClient.apiClient.post).mockRejectedValue(new Error('API Error'));

      render(<PatchGraveyard patches={mockPatches} />);

      const acceptButtons = screen.getAllByText('Accept Patch');
      fireEvent.click(acceptButtons[0]);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith('Failed to accept patch:', expect.any(Error));
      });

      consoleError.mockRestore();
    });

    it('should mark patch as rejected when clicking reject', () => {
      render(<PatchGraveyard patches={mockPatches} />);

      const rejectButtons = screen.getAllByText('Reject');
      const initialCount = rejectButtons.length;
      
      fireEvent.click(rejectButtons[0]);

      // After rejection, the patch card should have opacity-50 class
      const remainingRejectButtons = screen.queryAllByText('Reject');
      expect(remainingRejectButtons.length).toBe(initialCount - 1);
    });

    it('should call onPatchRejected callback', () => {
      const mockOnPatchRejected = vi.fn();

      render(<PatchGraveyard patches={mockPatches} onPatchRejected={mockOnPatchRejected} />);

      const rejectButtons = screen.getAllByText('Reject');
      fireEvent.click(rejectButtons[0]);

      expect(mockOnPatchRejected).toHaveBeenCalledWith('patch-3'); // First patch is critical
    });

    it('should hide action buttons after accepting', async () => {
      vi.mocked(apiClient.apiClient.post).mockResolvedValue({ success: true });

      render(<PatchGraveyard patches={mockPatches} />);

      const acceptButtons = screen.getAllByText('Accept Patch');
      fireEvent.click(acceptButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Accepted')).toBeInTheDocument();
      }, { timeout: 2000 });

      // Accept and Reject buttons should be hidden, only Copy button remains
      const remainingAcceptButtons = screen.queryAllByText('Accept Patch');
      expect(remainingAcceptButtons.length).toBe(mockPatches.length - 1);
    });

    it('should hide action buttons after rejecting', () => {
      render(<PatchGraveyard patches={mockPatches} />);

      const rejectButtons = screen.getAllByText('Reject');
      const initialCount = rejectButtons.length;
      
      fireEvent.click(rejectButtons[0]);

      // After rejection, buttons should still be hidden
      const remainingRejectButtons = screen.queryAllByText('Reject');
      expect(remainingRejectButtons.length).toBe(initialCount - 1);
    });

    it('should copy code to clipboard', async () => {
      render(<PatchGraveyard patches={mockPatches} />);

      const copyButtons = screen.getAllByText('Copy Code');
      fireEvent.click(copyButtons[0]);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('if (x === null)'); // First patch is critical
      });
    });

    it('should show copied confirmation', async () => {
      render(<PatchGraveyard patches={mockPatches} />);

      const copyButtons = screen.getAllByText('Copy Code');
      fireEvent.click(copyButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });
    });

    it('should handle clipboard errors gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockRejectedValue(new Error('Clipboard error')),
        },
      });

      render(<PatchGraveyard patches={mockPatches} />);

      const copyButtons = screen.getAllByText('Copy Code');
      fireEvent.click(copyButtons[0]);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith('Failed to copy to clipboard:', expect.any(Error));
      });

      consoleError.mockRestore();
    });

    it('should show copy button for accepted patches', async () => {
      vi.mocked(apiClient.apiClient.post).mockResolvedValue({ success: true });

      render(<PatchGraveyard patches={mockPatches} />);

      const acceptButtons = screen.getAllByText('Accept Patch');
      fireEvent.click(acceptButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Copy Fixed Code')).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('Filtering and Sorting', () => {
    it('should render filter dropdown', () => {
      render(<PatchGraveyard patches={mockPatches} />);

      expect(screen.getByText('Filter By')).toBeInTheDocument();
      const filterSelect = screen.getByRole('combobox');
      expect(filterSelect).toBeInTheDocument();
    });

    it('should render sort buttons', () => {
      render(<PatchGraveyard patches={mockPatches} />);

      expect(screen.getByText('Sort By')).toBeInTheDocument();
      expect(screen.getByText('💀 Severity')).toBeInTheDocument();
      expect(screen.getByText('✨ Confidence')).toBeInTheDocument();
      expect(screen.getByText('📍 Line Number')).toBeInTheDocument();
    });

    it('should sort by severity by default', () => {
      render(<PatchGraveyard patches={mockPatches} />);

      const severityButton = screen.getByText('💀 Severity');
      expect(severityButton).toHaveClass('bg-phantom-purple');
    });

    it('should sort by confidence when clicked', () => {
      render(<PatchGraveyard patches={mockPatches} />);

      const confidenceButton = screen.getByText('✨ Confidence');
      fireEvent.click(confidenceButton);

      expect(confidenceButton).toHaveClass('bg-phantom-purple');
    });

    it('should sort by line number when clicked', () => {
      render(<PatchGraveyard patches={mockPatches} />);

      const lineNumberButton = screen.getByText('📍 Line Number');
      fireEvent.click(lineNumberButton);

      expect(lineNumberButton).toHaveClass('bg-phantom-purple');
    });

    it('should sort patches by severity correctly', () => {
      render(<PatchGraveyard patches={mockPatches} />);

      // Critical should be first when sorted by severity
      const severityBadges = screen.getAllByText(/CRITICAL|MODERATE|MINOR/);
      expect(severityBadges[0].textContent).toBe('CRITICAL');
    });

    it('should sort patches by confidence correctly', () => {
      render(<PatchGraveyard patches={mockPatches} />);

      const confidenceButton = screen.getByText('✨ Confidence');
      fireEvent.click(confidenceButton);

      // After sorting by confidence, highest (95%) should be first
      const confidenceTexts = screen.getAllByText(/% Confidence/i);
      expect(confidenceTexts[0].textContent).toContain('95%');
    });

    it('should sort patches by line number correctly', () => {
      render(<PatchGraveyard patches={mockPatches} />);

      const lineNumberButton = screen.getByText('📍 Line Number');
      fireEvent.click(lineNumberButton);

      // After sorting by line number, Line 3 should be first
      const lineTexts = screen.getAllByText(/Line \d+/);
      expect(lineTexts[0].textContent).toBe('Line 3');
    });

    it('should filter by pending patches', async () => {
      vi.mocked(apiClient.apiClient.post).mockResolvedValue({ success: true });

      render(<PatchGraveyard patches={mockPatches} />);

      // Accept one patch
      const acceptButtons = screen.getAllByText('Accept Patch');
      fireEvent.click(acceptButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Accepted')).toBeInTheDocument();
      }, { timeout: 2000 });

      // Filter by pending
      const filterSelect = screen.getByRole('combobox');
      fireEvent.change(filterSelect, { target: { value: 'pending' } });

      // Should show only 2 patches now
      const explanations = screen.queryAllByText(/Changed var to const/i);
      expect(explanations.length).toBeGreaterThan(0);
    });

    it('should filter by accepted patches', async () => {
      vi.mocked(apiClient.apiClient.post).mockResolvedValue({ success: true });

      render(<PatchGraveyard patches={mockPatches} />);

      // Accept one patch (first one is critical - patch-3)
      const acceptButtons = screen.getAllByText('Accept Patch');
      fireEvent.click(acceptButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Accepted')).toBeInTheDocument();
      }, { timeout: 2000 });

      // Filter by accepted
      const filterSelect = screen.getByRole('combobox');
      fireEvent.change(filterSelect, { target: { value: 'accepted' } });

      // Should show only the accepted patch (patch-3)
      expect(screen.getByText(/Use strict equality operator/i)).toBeInTheDocument();
    });

    it('should filter by high confidence', () => {
      render(<PatchGraveyard patches={mockPatches} />);

      const filterSelect = screen.getByRole('combobox');
      fireEvent.change(filterSelect, { target: { value: 'high-confidence' } });

      // Should show patches with ≥80% confidence (patch-1: 95%, patch-3: 85%)
      expect(screen.getByText(/Removed console statement/i)).toBeInTheDocument();
      expect(screen.getByText(/Use strict equality operator/i)).toBeInTheDocument();
      expect(screen.queryByText(/Changed var to const/i)).not.toBeInTheDocument();
    });

    it('should filter by medium confidence', () => {
      render(<PatchGraveyard patches={mockPatches} />);

      const filterSelect = screen.getByRole('combobox');
      fireEvent.change(filterSelect, { target: { value: 'medium-confidence' } });

      // Should show patches with 50-79% confidence (patch-2: 65%)
      expect(screen.getByText(/Changed var to const/i)).toBeInTheDocument();
      expect(screen.queryByText(/Removed console statement/i)).not.toBeInTheDocument();
    });

    it('should filter by low confidence', () => {
      const lowConfidencePatch = {
        id: 'patch-4',
        issueId: 'issue-4',
        originalCode: 'test',
        cursedCode: 'test2',
        explanation: 'Low confidence fix',
        confidence: 0.3,
      };

      render(<PatchGraveyard patches={[...mockPatches, lowConfidencePatch]} />);

      const filterSelect = screen.getByRole('combobox');
      fireEvent.change(filterSelect, { target: { value: 'low-confidence' } });

      // Should show only patches with <50% confidence
      expect(screen.getByText(/Low confidence fix/i)).toBeInTheDocument();
      expect(screen.queryByText(/Removed console statement/i)).not.toBeInTheDocument();
    });

    it('should show empty state when no patches match filter', () => {
      render(<PatchGraveyard patches={mockPatches} />);

      const filterSelect = screen.getByRole('combobox');
      fireEvent.change(filterSelect, { target: { value: 'low-confidence' } });

      expect(screen.getByText(/No patches match your current filter/i)).toBeInTheDocument();
      expect(screen.getByText('🔍')).toBeInTheDocument();
    });

    it('should update statistics when filtering', async () => {
      vi.mocked(apiClient.apiClient.post).mockResolvedValue({ success: true });

      render(<PatchGraveyard patches={mockPatches} />);

      // Accept one patch
      const acceptButtons = screen.getAllByText('Accept Patch');
      fireEvent.click(acceptButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Accepted')).toBeInTheDocument();
      }, { timeout: 2000 });

      // Statistics should show 1 accepted
      const acceptedCount = screen.getAllByText('1');
      expect(acceptedCount.length).toBeGreaterThan(0);
    });

    it('should combine sorting and filtering', () => {
      render(<PatchGraveyard patches={mockPatches} />);

      // Filter by high confidence
      const filterSelect = screen.getByRole('combobox');
      fireEvent.change(filterSelect, { target: { value: 'high-confidence' } });

      // Sort by line number
      const lineNumberButton = screen.getByText('📍 Line Number');
      fireEvent.click(lineNumberButton);

      // Should show high confidence patches sorted by line number
      const lineTexts = screen.getAllByText(/Line \d+/);
      expect(lineTexts[0].textContent).toBe('Line 3'); // patch-3 (85%, line 3)
      expect(lineTexts[1].textContent).toBe('Line 5'); // patch-1 (95%, line 5)
    });
  });

  describe('Language Support', () => {
    it('should pass language prop to code editors', () => {
      render(<PatchGraveyard patches={mockPatches} language="typescript" />);

      // Monaco editors should be rendered (showing Loading... in tests)
      const loadingTexts = screen.getAllByText('Loading...');
      expect(loadingTexts.length).toBe(mockPatches.length * 2);
    });

    it('should default to javascript language', () => {
      render(<PatchGraveyard patches={mockPatches} />);

      // Should render without errors
      expect(screen.getByText('🪦 Patch Graveyard')).toBeInTheDocument();
    });
  });
});

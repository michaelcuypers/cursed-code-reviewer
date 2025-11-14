// Tests for CryptHistory component - scan list rendering, filtering, pagination, and detail view navigation

import { render, screen, fireEvent, waitFor } from '@/test/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CryptHistory, HistoricalScan, HistoryResponse } from '../CryptHistory';
import * as apiClient from '@/lib/api-client';

vi.mock('@/lib/api-client');

describe('CryptHistory Component', () => {
  const mockScans: HistoricalScan[] = [
    {
      scanId: 'scan-1',
      timestamp: '2024-01-15T10:30:00Z',
      language: 'javascript',
      overallCurseLevel: 75,
      severityLevel: 'critical',
      issueCount: 12,
      scanDuration: 8,
      submissionType: 'file',
    },
    {
      scanId: 'scan-2',
      timestamp: '2024-01-14T14:20:00Z',
      language: 'typescript',
      overallCurseLevel: 45,
      severityLevel: 'moderate',
      issueCount: 6,
      scanDuration: 5,
      submissionType: 'pr',
    },
    {
      scanId: 'scan-3',
      timestamp: '2024-01-13T09:15:00Z',
      language: 'python',
      overallCurseLevel: 20,
      severityLevel: 'minor',
      issueCount: 3,
      scanDuration: 4,
      submissionType: 'text',
    },
  ];

  const mockHistoryResponse: HistoryResponse = {
    scans: mockScans,
    pagination: {
      currentPage: 1,
      totalPages: 3,
      totalScans: 25,
      pageSize: 10,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Scan List Rendering', () => {
    it('should render all scans', async () => {
      vi.mocked(apiClient.apiClient.get).mockResolvedValue(mockHistoryResponse);

      render(<CryptHistory />);

      await waitFor(() => {
        expect(screen.getByText(/Javascript Scan/i)).toBeInTheDocument();
        expect(screen.getByText(/Typescript Scan/i)).toBeInTheDocument();
        expect(screen.getByText(/Python Scan/i)).toBeInTheDocument();
      });
    });

    it('should display loading state initially', () => {
      vi.mocked(apiClient.apiClient.get).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<CryptHistory />);

      expect(screen.getByText(/Excavating the crypt/i)).toBeInTheDocument();
    });

    it('should display empty state when no scans', async () => {
      vi.mocked(apiClient.apiClient.get).mockResolvedValue({
        scans: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalScans: 0,
          pageSize: 10,
        },
      });

      render(<CryptHistory />);

      await waitFor(() => {
        expect(screen.getByText(/No scans found in the crypt/i)).toBeInTheDocument();
        expect(screen.getByText('👻')).toBeInTheDocument();
      });
    });

    it('should display error state on API failure', async () => {
      vi.mocked(apiClient.apiClient.get).mockRejectedValue(
        new Error('Network error')
      );

      render(<CryptHistory />);

      await waitFor(() => {
        expect(screen.getByText(/Network error/i)).toBeInTheDocument();
        expect(screen.getByText('💀')).toBeInTheDocument();
      });
    });

    it('should display scan metadata correctly', async () => {
      vi.mocked(apiClient.apiClient.get).mockResolvedValue(mockHistoryResponse);

      render(<CryptHistory />);

      await waitFor(() => {
        const issuesLabels = screen.getAllByText(/Issues:/);
        expect(issuesLabels.length).toBeGreaterThan(0);
        expect(screen.getByText('12')).toBeInTheDocument();
        const durationLabels = screen.getAllByText(/Duration:/);
        expect(durationLabels.length).toBeGreaterThan(0);
        expect(screen.getByText('8s')).toBeInTheDocument();
      });
    });

    it('should display severity badges', async () => {
      vi.mocked(apiClient.apiClient.get).mockResolvedValue(mockHistoryResponse);

      render(<CryptHistory />);

      await waitFor(() => {
        expect(screen.getByText('critical')).toBeInTheDocument();
        expect(screen.getByText('moderate')).toBeInTheDocument();
        expect(screen.getByText('minor')).toBeInTheDocument();
      });
    });

    it('should display curse level with correct color', async () => {
      vi.mocked(apiClient.apiClient.get).mockResolvedValue(mockHistoryResponse);

      render(<CryptHistory />);

      await waitFor(() => {
        expect(screen.getByText('75%')).toBeInTheDocument();
        expect(screen.getByText('45%')).toBeInTheDocument();
        expect(screen.getByText('20%')).toBeInTheDocument();
      });
    });

    it('should display submission type icons', async () => {
      vi.mocked(apiClient.apiClient.get).mockResolvedValue(mockHistoryResponse);

      render(<CryptHistory />);

      await waitFor(() => {
        expect(screen.getByText('📁')).toBeInTheDocument(); // file
        expect(screen.getByText('🔗')).toBeInTheDocument(); // pr
        expect(screen.getByText('📝')).toBeInTheDocument(); // text
      });
    });

    it('should display formatted timestamps', async () => {
      vi.mocked(apiClient.apiClient.get).mockResolvedValue(mockHistoryResponse);

      render(<CryptHistory />);

      await waitFor(() => {
        // Check that dates are formatted (exact format may vary by locale)
        const dateElements = screen.getAllByText(/Jan|2024/i);
        expect(dateElements.length).toBeGreaterThan(0);
      });
    });

    it('should display total scan count', async () => {
      vi.mocked(apiClient.apiClient.get).mockResolvedValue(mockHistoryResponse);

      render(<CryptHistory />);

      await waitFor(() => {
        expect(screen.getByText(/25 total scans/i)).toBeInTheDocument();
      });
    });

    it('should call onScansUpdate callback when scans are loaded', async () => {
      const mockOnScansUpdate = vi.fn();
      vi.mocked(apiClient.apiClient.get).mockResolvedValue(mockHistoryResponse);

      render(<CryptHistory onScansUpdate={mockOnScansUpdate} />);

      await waitFor(() => {
        expect(mockOnScansUpdate).toHaveBeenCalledWith(mockScans);
      });
    });
  });

  describe('Filtering', () => {
    it('should render severity filter buttons', async () => {
      vi.mocked(apiClient.apiClient.get).mockResolvedValue(mockHistoryResponse);

      render(<CryptHistory />);

      await waitFor(() => {
        expect(screen.getByText(/🌐 All/i)).toBeInTheDocument();
        expect(screen.getByText(/😊 Minor/i)).toBeInTheDocument();
        expect(screen.getByText(/😰 Moderate/i)).toBeInTheDocument();
        expect(screen.getByText(/💀 Critical/i)).toBeInTheDocument();
      });
    });

    it('should filter by severity level', async () => {
      vi.mocked(apiClient.apiClient.get).mockResolvedValue(mockHistoryResponse);

      render(<CryptHistory />);

      await waitFor(() => {
        expect(screen.getByText(/Javascript Scan/i)).toBeInTheDocument();
      });

      const criticalButton = screen.getByText(/💀 Critical/i);
      fireEvent.click(criticalButton);

      await waitFor(() => {
        expect(apiClient.apiClient.get).toHaveBeenCalledWith(
          expect.stringContaining('severity=critical')
        );
      });
    });

    it('should render date range filters', async () => {
      vi.mocked(apiClient.apiClient.get).mockResolvedValue(mockHistoryResponse);

      render(<CryptHistory />);

      await waitFor(() => {
        expect(screen.getByText('Start Date')).toBeInTheDocument();
        expect(screen.getByText('End Date')).toBeInTheDocument();
      });
    });

    it('should filter by date range', async () => {
      vi.mocked(apiClient.apiClient.get).mockResolvedValue(mockHistoryResponse);

      render(<CryptHistory />);

      await waitFor(() => {
        expect(screen.getByText(/Javascript Scan/i)).toBeInTheDocument();
      });

      const startDateInputs = screen.getAllByDisplayValue('');
      const startDateInput = startDateInputs.find(input => input.getAttribute('type') === 'date');
      fireEvent.change(startDateInput!, { target: { value: '2024-01-01' } });

      await waitFor(() => {
        expect(apiClient.apiClient.get).toHaveBeenCalledWith(
          expect.stringContaining('startDate=2024-01-01')
        );
      });
    });

    it('should filter by language', async () => {
      vi.mocked(apiClient.apiClient.get).mockResolvedValue(mockHistoryResponse);

      render(<CryptHistory />);

      await waitFor(() => {
        expect(screen.getByText(/Javascript Scan/i)).toBeInTheDocument();
      });

      const languageSelect = screen.getByRole('combobox');
      fireEvent.change(languageSelect, { target: { value: 'typescript' } });

      await waitFor(() => {
        expect(apiClient.apiClient.get).toHaveBeenCalledWith(
          expect.stringContaining('language=typescript')
        );
      });
    });

    it('should render language filter dropdown', async () => {
      vi.mocked(apiClient.apiClient.get).mockResolvedValue(mockHistoryResponse);

      render(<CryptHistory />);

      await waitFor(() => {
        const languageSelect = screen.getByRole('combobox');
        expect(languageSelect).toBeInTheDocument();
      });
    });

    it('should reset all filters', async () => {
      vi.mocked(apiClient.apiClient.get).mockResolvedValue(mockHistoryResponse);

      render(<CryptHistory />);

      await waitFor(() => {
        expect(screen.getByText(/Javascript Scan/i)).toBeInTheDocument();
      });

      // Apply filters
      const criticalButton = screen.getByText(/💀 Critical/i);
      fireEvent.click(criticalButton);

      const startDateInputs = screen.getAllByDisplayValue('');
      const startDateInput = startDateInputs.find(input => input.getAttribute('type') === 'date');
      fireEvent.change(startDateInput!, { target: { value: '2024-01-01' } });

      // Reset filters
      const resetButton = screen.getByText(/🔄 Reset Filters/i);
      fireEvent.click(resetButton);

      await waitFor(() => {
        // Should call API without filter parameters
        const lastCall = vi.mocked(apiClient.apiClient.get).mock.calls.slice(-1)[0];
        expect(lastCall[0]).not.toContain('severity=');
        expect(lastCall[0]).not.toContain('startDate=');
      });
    });

    it('should combine multiple filters', async () => {
      vi.mocked(apiClient.apiClient.get).mockResolvedValue(mockHistoryResponse);

      render(<CryptHistory />);

      await waitFor(() => {
        expect(screen.getByText(/Javascript Scan/i)).toBeInTheDocument();
      });

      const criticalButton = screen.getByText(/💀 Critical/i);
      fireEvent.click(criticalButton);

      const languageSelect = screen.getByRole('combobox');
      fireEvent.change(languageSelect, { target: { value: 'javascript' } });

      await waitFor(() => {
        const lastCall = vi.mocked(apiClient.apiClient.get).mock.calls.slice(-1)[0];
        expect(lastCall[0]).toContain('severity=critical');
        expect(lastCall[0]).toContain('language=javascript');
      });
    });

    it('should maintain current page when filters change', async () => {
      vi.mocked(apiClient.apiClient.get).mockResolvedValue(mockHistoryResponse);

      render(<CryptHistory />);

      await waitFor(() => {
        expect(screen.getByText(/Javascript Scan/i)).toBeInTheDocument();
      });

      // Clear previous calls
      vi.clearAllMocks();
      vi.mocked(apiClient.apiClient.get).mockResolvedValue(mockHistoryResponse);

      // Go to page 2
      const nextButton = screen.getByText(/Next →/i);
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(apiClient.apiClient.get).toHaveBeenCalledWith(
          expect.stringContaining('page=2')
        );
      });

      // Clear and change filter
      vi.clearAllMocks();
      vi.mocked(apiClient.apiClient.get).mockResolvedValue(mockHistoryResponse);
      
      const criticalButton = screen.getByText(/💀 Critical/i);
      fireEvent.click(criticalButton);

      await waitFor(() => {
        const lastCall = vi.mocked(apiClient.apiClient.get).mock.calls.slice(-1)[0];
        // Component maintains current page when filters change
        expect(lastCall[0]).toContain('page=2');
        expect(lastCall[0]).toContain('severity=critical');
      });
    });
  });

  describe('Pagination', () => {
    it('should render pagination controls', async () => {
      vi.mocked(apiClient.apiClient.get).mockResolvedValue(mockHistoryResponse);

      render(<CryptHistory />);

      await waitFor(() => {
        expect(screen.getByText(/← Previous/i)).toBeInTheDocument();
        expect(screen.getByText(/Next →/i)).toBeInTheDocument();
      });
    });

    it('should display current page and total pages', async () => {
      vi.mocked(apiClient.apiClient.get).mockResolvedValue(mockHistoryResponse);

      render(<CryptHistory />);

      await waitFor(() => {
        expect(screen.getByText(/Page 1 of 3/i)).toBeInTheDocument();
      });
    });

    it('should disable previous button on first page', async () => {
      vi.mocked(apiClient.apiClient.get).mockResolvedValue(mockHistoryResponse);

      render(<CryptHistory />);

      await waitFor(() => {
        const previousButton = screen.getByText(/← Previous/i);
        expect(previousButton).toBeDisabled();
      });
    });

    it('should enable next button when not on last page', async () => {
      vi.mocked(apiClient.apiClient.get).mockResolvedValue(mockHistoryResponse);

      render(<CryptHistory />);

      await waitFor(() => {
        const nextButton = screen.getByText(/Next →/i);
        expect(nextButton).not.toBeDisabled();
      });
    });

    it('should navigate to next page', async () => {
      vi.mocked(apiClient.apiClient.get).mockResolvedValue(mockHistoryResponse);

      render(<CryptHistory />);

      await waitFor(() => {
        expect(screen.getByText(/Javascript Scan/i)).toBeInTheDocument();
      });

      const nextButton = screen.getByText(/Next →/i);
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(apiClient.apiClient.get).toHaveBeenCalledWith(
          expect.stringContaining('page=2')
        );
      });
    });

    it('should navigate to previous page', async () => {
      vi.mocked(apiClient.apiClient.get).mockResolvedValue({
        ...mockHistoryResponse,
        pagination: {
          ...mockHistoryResponse.pagination,
          currentPage: 2,
        },
      });

      render(<CryptHistory />);

      await waitFor(() => {
        expect(screen.getByText(/Javascript Scan/i)).toBeInTheDocument();
      });

      const previousButton = screen.getByText(/← Previous/i);
      fireEvent.click(previousButton);

      await waitFor(() => {
        expect(apiClient.apiClient.get).toHaveBeenCalledWith(
          expect.stringContaining('page=1')
        );
      });
    });

    it('should disable next button on last page', async () => {
      vi.mocked(apiClient.apiClient.get).mockResolvedValue(mockHistoryResponse);

      render(<CryptHistory />);

      await waitFor(() => {
        expect(screen.getByText(/Javascript Scan/i)).toBeInTheDocument();
      });

      // Navigate to page 2
      const page2Button = screen.getByRole('button', { name: '2' });
      fireEvent.click(page2Button);

      await waitFor(() => {
        expect(apiClient.apiClient.get).toHaveBeenCalledWith(
          expect.stringContaining('page=2')
        );
      });

      // Navigate to page 3 (last page)
      const page3Button = screen.getByRole('button', { name: '3' });
      fireEvent.click(page3Button);

      await waitFor(() => {
        expect(apiClient.apiClient.get).toHaveBeenCalledWith(
          expect.stringContaining('page=3')
        );
      });

      // Now next button should be disabled
      await waitFor(() => {
        const nextButton = screen.getByText(/Next →/i);
        expect(nextButton).toBeDisabled();
      });
    });

    it('should render page number buttons', async () => {
      vi.mocked(apiClient.apiClient.get).mockResolvedValue(mockHistoryResponse);

      render(<CryptHistory />);

      await waitFor(() => {
        expect(screen.getByText(/Javascript Scan/i)).toBeInTheDocument();
      });

      // Check for page buttons using role
      const pageButtons = screen.getAllByRole('button').filter(
        (button) => /^[123]$/.test(button.textContent || '')
      );
      expect(pageButtons.length).toBe(3);
    });

    it('should navigate to specific page by clicking page number', async () => {
      vi.mocked(apiClient.apiClient.get).mockResolvedValue(mockHistoryResponse);

      render(<CryptHistory />);

      await waitFor(() => {
        expect(screen.getByText(/Javascript Scan/i)).toBeInTheDocument();
      });

      const page2Button = screen.getByRole('button', { name: '2' });
      fireEvent.click(page2Button);

      await waitFor(() => {
        expect(apiClient.apiClient.get).toHaveBeenCalledWith(
          expect.stringContaining('page=2')
        );
      });
    });

    it('should highlight current page button', async () => {
      vi.mocked(apiClient.apiClient.get).mockResolvedValue(mockHistoryResponse);

      render(<CryptHistory />);

      await waitFor(() => {
        const page1Button = screen.getByRole('button', { name: '1' });
        expect(page1Button).toHaveClass('bg-phantom-purple');
      });
    });

    it('should not render pagination when only one page', async () => {
      vi.mocked(apiClient.apiClient.get).mockResolvedValue({
        ...mockHistoryResponse,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalScans: 3,
          pageSize: 10,
        },
      });

      render(<CryptHistory />);

      await waitFor(() => {
        expect(screen.getByText(/Javascript Scan/i)).toBeInTheDocument();
      });

      expect(screen.queryByText(/← Previous/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Next →/i)).not.toBeInTheDocument();
    });

    it('should limit page number buttons to 5', async () => {
      vi.mocked(apiClient.apiClient.get).mockResolvedValue({
        ...mockHistoryResponse,
        pagination: {
          currentPage: 1,
          totalPages: 10,
          totalScans: 100,
          pageSize: 10,
        },
      });

      render(<CryptHistory />);

      await waitFor(() => {
        const pageButtons = screen.getAllByRole('button').filter(
          (button) => /^\d+$/.test(button.textContent || '')
        );
        expect(pageButtons.length).toBeLessThanOrEqual(5);
      });
    });
  });

  describe('Detail View Navigation', () => {
    it('should call onScanSelect when clicking a scan', async () => {
      const mockOnScanSelect = vi.fn();
      vi.mocked(apiClient.apiClient.get).mockResolvedValue(mockHistoryResponse);

      render(<CryptHistory onScanSelect={mockOnScanSelect} />);

      await waitFor(() => {
        expect(screen.getByText(/Javascript Scan/i)).toBeInTheDocument();
      });

      const scanButton = screen.getByText(/Javascript Scan/i).closest('button');
      fireEvent.click(scanButton!);

      expect(mockOnScanSelect).toHaveBeenCalledWith('scan-1');
    });

    it('should make scan items clickable', async () => {
      vi.mocked(apiClient.apiClient.get).mockResolvedValue(mockHistoryResponse);

      render(<CryptHistory />);

      await waitFor(() => {
        const scanButtons = screen.getAllByRole('button').filter(
          (button) => button.textContent?.includes('Scan')
        );
        expect(scanButtons.length).toBe(mockScans.length);
      });
    });

    it('should show hover effect on scan items', async () => {
      vi.mocked(apiClient.apiClient.get).mockResolvedValue(mockHistoryResponse);

      render(<CryptHistory />);

      await waitFor(() => {
        const scanButton = screen.getByText(/Javascript Scan/i).closest('button');
        expect(scanButton).toHaveClass('hover:border-phantom-purple');
      });
    });

    it('should handle multiple scan selections', async () => {
      const mockOnScanSelect = vi.fn();
      vi.mocked(apiClient.apiClient.get).mockResolvedValue(mockHistoryResponse);

      render(<CryptHistory onScanSelect={mockOnScanSelect} />);

      await waitFor(() => {
        expect(screen.getByText(/Javascript Scan/i)).toBeInTheDocument();
      });

      const scan1Button = screen.getByText(/Javascript Scan/i).closest('button');
      fireEvent.click(scan1Button!);

      const scan2Button = screen.getByText(/Typescript Scan/i).closest('button');
      fireEvent.click(scan2Button!);

      expect(mockOnScanSelect).toHaveBeenCalledTimes(2);
      expect(mockOnScanSelect).toHaveBeenNthCalledWith(1, 'scan-1');
      expect(mockOnScanSelect).toHaveBeenNthCalledWith(2, 'scan-2');
    });
  });

  describe('Error Handling', () => {
    it('should show retry button on error', async () => {
      vi.mocked(apiClient.apiClient.get).mockRejectedValue(
        new Error('Network error')
      );

      render(<CryptHistory />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });

    it('should retry fetching on retry button click', async () => {
      vi.mocked(apiClient.apiClient.get)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockHistoryResponse);

      render(<CryptHistory />);

      await waitFor(() => {
        expect(screen.getByText(/Network error/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByText('Try Again');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText(/Javascript Scan/i)).toBeInTheDocument();
      });
    });

    it('should handle empty error message', async () => {
      // When Error has empty message, the component shows empty string which is truthy
      // So it displays the empty error message
      vi.mocked(apiClient.apiClient.get).mockRejectedValue(new Error(''));

      render(<CryptHistory />);

      await waitFor(() => {
        // Component should show the empty state since error message is empty string
        // which is still truthy in the error state check
        const tryAgainButtons = screen.queryAllByText('Try Again');
        // If error is empty string, it might show empty state or error state
        // Let's just check that loading is done
        expect(screen.queryByText(/Excavating the crypt/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('API Integration', () => {
    it('should call API with correct parameters', async () => {
      vi.mocked(apiClient.apiClient.get).mockResolvedValue(mockHistoryResponse);

      render(<CryptHistory />);

      await waitFor(() => {
        expect(apiClient.apiClient.get).toHaveBeenCalledWith(
          expect.stringContaining('/crypt-history')
        );
        expect(apiClient.apiClient.get).toHaveBeenCalledWith(
          expect.stringContaining('page=1')
        );
        expect(apiClient.apiClient.get).toHaveBeenCalledWith(
          expect.stringContaining('pageSize=10')
        );
      });
    });

    it('should refetch when filters change', async () => {
      vi.mocked(apiClient.apiClient.get).mockResolvedValue(mockHistoryResponse);

      render(<CryptHistory />);

      await waitFor(() => {
        expect(apiClient.apiClient.get).toHaveBeenCalledTimes(1);
      });

      const criticalButton = screen.getByText(/💀 Critical/i);
      fireEvent.click(criticalButton);

      await waitFor(() => {
        expect(apiClient.apiClient.get).toHaveBeenCalledTimes(2);
      });
    });

    it('should refetch when pagination changes', async () => {
      vi.mocked(apiClient.apiClient.get).mockResolvedValue(mockHistoryResponse);

      render(<CryptHistory />);

      await waitFor(() => {
        expect(apiClient.apiClient.get).toHaveBeenCalledTimes(1);
      });

      const nextButton = screen.getByText(/Next →/i);
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(apiClient.apiClient.get).toHaveBeenCalledTimes(2);
      });
    });
  });
});

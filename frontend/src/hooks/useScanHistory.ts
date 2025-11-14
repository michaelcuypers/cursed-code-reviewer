import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { HistoricalScan, HistoryResponse } from '@/components/CryptHistory';

interface UseScanHistoryParams {
  page: number;
  pageSize: number;
  severity?: string;
  startDate?: string;
  endDate?: string;
  language?: string;
}

export const useScanHistory = (params: UseScanHistoryParams) => {
  return useQuery({
    queryKey: ['scanHistory', params],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        limit: params.pageSize.toString(),
      });
      
      if (params.severity && params.severity !== 'all') {
        queryParams.append('severity', params.severity);
      }
      
      if (params.startDate) {
        queryParams.append('startDate', params.startDate);
      }
      
      if (params.endDate) {
        queryParams.append('endDate', params.endDate);
      }
      
      if (params.language && params.language !== 'all') {
        queryParams.append('language', params.language);
      }
      
      // Get the response from the API
      const response = await apiClient.get<{
        scans: HistoricalScan[];
        count: number;
        totalCount: number;
        hasMore: boolean;
        lastKey?: string;
        message: string;
      }>(`/crypt-history?${queryParams.toString()}`);
      
      // Calculate total pages based on total count
      const totalPages = Math.ceil(response.totalCount / params.pageSize);
      
      // Transform to match expected HistoryResponse format
      return {
        scans: response.scans,
        pagination: {
          currentPage: params.page,
          totalPages: totalPages,
          totalScans: response.totalCount,
          pageSize: params.pageSize,
        },
      } as HistoryResponse;
    },
    staleTime: 30000, // Cache for 30 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
  });
};

export const useScanDetail = (scanId: string | null) => {
  return useQuery({
    queryKey: ['scanDetail', scanId],
    queryFn: async () => {
      if (!scanId) throw new Error('No scan ID provided');
      
      return apiClient.get<{
        scanId: string;
        timestamp: string;
        issues: any[];
        overallCurseLevel: number;
        scanDuration: number;
        language: string;
        status: string;
      }>(`/spectral-scan/${scanId}`);
    },
    enabled: !!scanId,
    staleTime: 60000, // Cache for 1 minute
    gcTime: 600000, // Keep in cache for 10 minutes
  });
};

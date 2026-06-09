import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api";
import { Worker, WorkerFilters, WorkerReview, PaginatedResponse } from "@/types";

export function useWorkers(filters: WorkerFilters = {}) {
  return useQuery({
    queryKey: ["workers", filters],
    queryFn: async (): Promise<PaginatedResponse<Worker>> => {
      const params = new URLSearchParams();
      if (filters.status) params.append("status", filters.status);
      if (filters.zone) params.append("zone", filters.zone);
      if (filters.serviceType) params.append("serviceType", filters.serviceType);
      if (filters.availability !== undefined && filters.availability !== "")
        params.append("availability", String(filters.availability));
      if (filters.minRating) params.append("minRating", String(filters.minRating));
      params.append("page", String(filters.page ?? 1));
      params.append("limit", String(filters.limit ?? 25));

      const res = await apiClient.get<PaginatedResponse<Worker>>(
        `/admin/workers?${params.toString()}`
      );
      return res.data;
    },
  });
}

export function useWorker(id: string) {
  return useQuery({
    queryKey: ["workers", id],
    queryFn: async (): Promise<Worker> => {
      const res = await apiClient.get<Worker>(`/admin/workers/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useWorkerStats(id: string) {
  return useQuery({
    queryKey: ["workers", id, "stats"],
    queryFn: async () => {
      const res = await apiClient.get(`/admin/workers/${id}/stats`);
      return res.data as {
        jobsPerDay: { date: string; count: number }[];
        recentReviews: WorkerReview[];
      };
    },
    enabled: !!id,
  });
}

export function useVetWorker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      workerId,
      approved,
      reason,
    }: {
      workerId: string;
      approved: boolean;
      reason?: string;
    }) => {
      const res = await apiClient.put(`/workers/${workerId}/vet`, {
        approved,
        reason,
      });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workers"] });
    },
  });
}

export function useSuspendWorker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      workerId,
      suspend,
    }: {
      workerId: string;
      suspend: boolean;
    }) => {
      const res = await apiClient.put(`/admin/workers/${workerId}/suspend`, {
        suspend,
      });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workers"] });
    },
  });
}

export function useUpdateWorkerAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      workerId,
      availability,
    }: {
      workerId: string;
      availability: Record<string, boolean>;
    }) => {
      const res = await apiClient.put(
        `/admin/workers/${workerId}/availability`,
        availability
      );
      return res.data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["workers", vars.workerId] });
    },
  });
}

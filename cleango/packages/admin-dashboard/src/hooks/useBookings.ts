import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api";
import { Booking, BookingFilters, PaginatedResponse } from "@/types";

export function useBookings(filters: BookingFilters = {}) {
  return useQuery({
    queryKey: ["bookings", filters],
    queryFn: async (): Promise<PaginatedResponse<Booking>> => {
      const params = new URLSearchParams();
      if (filters.status) params.append("status", filters.status);
      if (filters.serviceType) params.append("serviceType", filters.serviceType);
      if (filters.zone) params.append("zone", filters.zone);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (filters.search) params.append("search", filters.search);
      params.append("page", String(filters.page ?? 1));
      params.append("limit", String(filters.limit ?? 25));

      const res = await apiClient.get<PaginatedResponse<Booking>>(
        `/admin/bookings?${params.toString()}`
      );
      return res.data;
    },
  });
}

export function useRecentBookings() {
  return useQuery({
    queryKey: ["bookings", "recent"],
    queryFn: async (): Promise<Booking[]> => {
      const res = await apiClient.get<Booking[]>("/admin/bookings/recent");
      return res.data;
    },
    refetchInterval: 30_000,
  });
}

export function useBooking(id: string) {
  return useQuery({
    queryKey: ["bookings", id],
    queryFn: async (): Promise<Booking> => {
      const res = await apiClient.get<Booking>(`/admin/bookings/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useAssignWorker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      bookingId,
      workerId,
    }: {
      bookingId: string;
      workerId: string;
    }) => {
      const res = await apiClient.post("/admin/assign", { bookingId, workerId });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      bookingId,
      reason,
    }: {
      bookingId: string;
      reason: string;
    }) => {
      const res = await apiClient.post(`/admin/bookings/${bookingId}/cancel`, {
        reason,
      });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

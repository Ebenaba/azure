import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api";
import {
  DashboardStats,
  BookingChartData,
  RevenueChartData,
} from "@/types";

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: async (): Promise<DashboardStats> => {
      const res = await apiClient.get<DashboardStats>("/admin/stats");
      return res.data;
    },
    refetchInterval: 60_000,
  });
}

export function useBookingsChart() {
  return useQuery({
    queryKey: ["dashboard", "bookings-chart"],
    queryFn: async (): Promise<BookingChartData[]> => {
      const res = await apiClient.get<BookingChartData[]>("/admin/stats/bookings-chart");
      return res.data;
    },
    refetchInterval: 60_000,
  });
}

export function useRevenueChart() {
  return useQuery({
    queryKey: ["dashboard", "revenue-chart"],
    queryFn: async (): Promise<RevenueChartData[]> => {
      const res = await apiClient.get<RevenueChartData[]>("/admin/stats/revenue-chart");
      return res.data;
    },
    refetchInterval: 60_000,
  });
}

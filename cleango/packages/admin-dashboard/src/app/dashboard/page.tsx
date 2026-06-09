"use client";

import {
  CalendarCheck,
  DollarSign,
  Users,
  AlertCircle,
} from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { BookingsChart } from "@/components/dashboard/BookingsChart";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { RecentBookingsTable } from "@/components/dashboard/RecentBookingsTable";
import {
  useDashboardStats,
  useBookingsChart,
  useRevenueChart,
} from "@/hooks/useDashboardStats";
import { useRecentBookings } from "@/hooks/useBookings";
import { formatNaira } from "@/lib/utils";

const KADUNA_ZONES = [
  { name: "Barnawa", hausa: "Barnawa", lga: "Chikun", serviceable: true },
  { name: "Narayi", hausa: "Narayi", lga: "Chikun", serviceable: true },
  { name: "Malali", hausa: "Malali", lga: "Kaduna North", serviceable: true },
  { name: "Rigasa", hausa: "Rigasa", lga: "Igabi", serviceable: true },
  { name: "Kawo", hausa: "Kawo", lga: "Kaduna North", serviceable: true },
  { name: "Tudun Wada", hausa: "Tudun Wada", lga: "Kaduna South", serviceable: false },
  { name: "Unguwar Rimi", hausa: "Unguwar Rimi", lga: "Kaduna North", serviceable: false },
  { name: "Ungwan Mu'azu", hausa: "Ungwan Mu'azu", lga: "Kaduna South", serviceable: false },
];

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: bookingsChart, isLoading: chartLoading } = useBookingsChart();
  const { data: revenueChart, isLoading: revenueLoading } = useRevenueChart();
  const { data: recentBookings, isLoading: bookingsLoading } = useRecentBookings();

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label="Total Bookings Today"
          value={statsLoading ? "—" : stats?.completedToday ?? 0}
          icon={CalendarCheck}
          trend={12}
          trendLabel="vs yesterday"
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatsCard
          label="Revenue Today"
          value={statsLoading ? "—" : formatNaira(stats?.todayRevenue ?? 0)}
          icon={DollarSign}
          trend={8}
          trendLabel="vs yesterday"
          iconBg="bg-[#E8F5E9]"
          iconColor="text-[#2E7D32]"
        />
        <StatsCard
          label="Active Workers"
          value={statsLoading ? "—" : stats?.activeWorkers ?? 0}
          icon={Users}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
        />
        <StatsCard
          label="Pending Vetting"
          value={statsLoading ? "—" : stats?.pendingVetting ?? 0}
          icon={AlertCircle}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BookingsChart data={bookingsChart ?? []} loading={chartLoading} />
        <RevenueChart data={revenueChart ?? []} loading={revenueLoading} />
      </div>

      {/* Recent Bookings */}
      <RecentBookingsTable
        bookings={recentBookings ?? []}
        loading={bookingsLoading}
      />

      {/* Zone Coverage */}
      <div>
        <h3 className="text-base font-semibold text-gray-800 mb-3">
          Zone Coverage — Kaduna State
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {KADUNA_ZONES.map((zone) => (
            <div
              key={zone.name}
              className={`rounded-lg p-3 border ${
                zone.serviceable
                  ? "bg-[#E8F5E9] border-[#A5D6A7]"
                  : "bg-gray-100 border-gray-200"
              }`}
            >
              <p
                className={`font-semibold text-sm ${
                  zone.serviceable ? "text-[#2E7D32]" : "text-gray-500"
                }`}
              >
                {zone.name}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{zone.lga} LGA</p>
              <span
                className={`text-xs font-medium mt-1 inline-block ${
                  zone.serviceable ? "text-green-700" : "text-gray-400"
                }`}
              >
                {zone.serviceable ? "● Serviceable" : "○ Coming Soon"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

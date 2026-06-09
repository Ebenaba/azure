"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookingChartData } from "@/types";
import { format, parseISO } from "date-fns";

interface BookingsChartProps {
  data: BookingChartData[];
  loading?: boolean;
}

const COLORS = {
  pending: "#F9A825",
  confirmed: "#1565C0",
  completed: "#2E7D32",
  cancelled: "#EF4444",
};

export function BookingsChart({ data, loading }: BookingsChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    date: (() => {
      try {
        return format(parseISO(d.date), "EEE dd");
      } catch {
        return d.date;
      }
    })(),
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Bookings — Last 7 Days</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-pulse w-full h-full bg-gray-100 rounded" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={264}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: "#6B7280" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#6B7280" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  fontSize: "12px",
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
              />
              <Bar dataKey="pending" fill={COLORS.pending} name="Pending" radius={[2, 2, 0, 0]} />
              <Bar dataKey="confirmed" fill={COLORS.confirmed} name="Confirmed" radius={[2, 2, 0, 0]} />
              <Bar dataKey="completed" fill={COLORS.completed} name="Completed" radius={[2, 2, 0, 0]} />
              <Bar dataKey="cancelled" fill={COLORS.cancelled} name="Cancelled" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

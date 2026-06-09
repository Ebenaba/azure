"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RevenueChartData } from "@/types";
import { format, parseISO } from "date-fns";

interface RevenueChartProps {
  data: RevenueChartData[];
  loading?: boolean;
}

const formatNairaCompact = (value: number) => {
  if (value >= 1_000_000) return `₦${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `₦${(value / 1_000).toFixed(0)}K`;
  return `₦${value}`;
};

export function RevenueChart({ data, loading }: RevenueChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    date: (() => {
      try {
        return format(parseISO(d.date), "dd MMM");
      } catch {
        return d.date;
      }
    })(),
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Revenue — Last 30 Days (₦)</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-pulse w-full h-full bg-gray-100 rounded" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={264}>
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2E7D32" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#2E7D32" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#6B7280" }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#6B7280" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatNairaCompact}
              />
              <Tooltip
                formatter={(value: number) =>
                  new Intl.NumberFormat("en-NG", {
                    style: "currency",
                    currency: "NGN",
                    minimumFractionDigits: 0,
                  }).format(value)
                }
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  fontSize: "12px",
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#2E7D32"
                strokeWidth={2}
                fill="url(#revenueGradient)"
                name="Revenue"
                dot={false}
                activeDot={{ r: 4, fill: "#2E7D32" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

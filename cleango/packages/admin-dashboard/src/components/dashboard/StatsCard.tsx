import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number;
  trendLabel?: string;
  iconBg?: string;
  iconColor?: string;
}

export function StatsCard({
  label,
  value,
  icon: Icon,
  trend,
  trendLabel,
  iconBg = "bg-[#E8F5E9]",
  iconColor = "text-[#2E7D32]",
}: StatsCardProps) {
  const isPositive = trend !== undefined && trend >= 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
            <p className="text-2xl font-bold text-gray-900 truncate">{value}</p>
            {trend !== undefined && (
              <div className="flex items-center gap-1 mt-2">
                {isPositive ? (
                  <TrendingUp className="w-4 h-4 text-green-600 flex-shrink-0" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500 flex-shrink-0" />
                )}
                <span
                  className={cn(
                    "text-xs font-medium",
                    isPositive ? "text-green-600" : "text-red-500"
                  )}
                >
                  {isPositive ? "+" : ""}
                  {trend}%
                </span>
                {trendLabel && (
                  <span className="text-xs text-gray-400">{trendLabel}</span>
                )}
              </div>
            )}
          </div>
          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ml-4", iconBg)}>
            <Icon className={cn("w-6 h-6", iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

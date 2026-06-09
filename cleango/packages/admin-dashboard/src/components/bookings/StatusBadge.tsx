import { Badge } from "@/components/ui/badge";
import { getStatusLabel } from "@/lib/utils";
import type { BookingStatus } from "@/types";

interface StatusBadgeProps {
  status: BookingStatus | string;
}

type BadgeVariant = "default" | "secondary" | "success" | "warning" | "destructive" | "outline" | "accent" | "purple" | "blue" | "orange" | "gray";

const statusVariantMap: Record<string, BadgeVariant> = {
  pending: "warning",
  confirmed: "blue",
  en_route: "purple",
  in_progress: "orange",
  completed: "success",
  cancelled: "destructive",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const variant: BadgeVariant = statusVariantMap[status] ?? "gray";
  return <Badge variant={variant}>{getStatusLabel(status)}</Badge>;
}

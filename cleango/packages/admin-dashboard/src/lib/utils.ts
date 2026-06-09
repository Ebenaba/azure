import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO, isValid } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNaira(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date | undefined): string {
  if (!date) return "—";
  try {
    const d = typeof date === "string" ? parseISO(date) : date;
    if (!isValid(d)) return "—";
    return format(d, "dd MMM yyyy, HH:mm");
  } catch {
    return "—";
  }
}

export function formatDateShort(date: string | Date | undefined): string {
  if (!date) return "—";
  try {
    const d = typeof date === "string" ? parseISO(date) : date;
    if (!isValid(d)) return "—";
    return format(d, "dd MMM yyyy");
  } catch {
    return "—";
  }
}

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "en_route"
  | "in_progress"
  | "completed"
  | "cancelled";

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 border-amber-200",
    confirmed: "bg-blue-100 text-blue-800 border-blue-200",
    en_route: "bg-purple-100 text-purple-800 border-purple-200",
    in_progress: "bg-orange-100 text-orange-800 border-orange-200",
    completed: "bg-green-100 text-green-800 border-green-200",
    cancelled: "bg-red-100 text-red-800 border-red-200",
    active: "bg-green-100 text-green-800 border-green-200",
    inactive: "bg-gray-100 text-gray-800 border-gray-200",
    suspended: "bg-red-100 text-red-800 border-red-200",
    pending_vetting: "bg-amber-100 text-amber-800 border-amber-200",
    vetted: "bg-green-100 text-green-800 border-green-200",
    flagged: "bg-red-100 text-red-800 border-red-200",
    released: "bg-green-100 text-green-800 border-green-200",
    held: "bg-blue-100 text-blue-800 border-blue-200",
    refunded: "bg-gray-100 text-gray-800 border-gray-200",
    paid: "bg-green-100 text-green-800 border-green-200",
    failed: "bg-red-100 text-red-800 border-red-200",
  };
  return map[status] ?? "bg-gray-100 text-gray-800 border-gray-200";
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: "Pending",
    confirmed: "Confirmed",
    en_route: "En Route",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
    active: "Active",
    inactive: "Inactive",
    suspended: "Suspended",
    pending_vetting: "Pending Vetting",
    vetted: "Vetted",
    flagged: "Flagged",
    released: "Released",
    held: "In Escrow",
    refunded: "Refunded",
    paid: "Paid",
    failed: "Failed",
  };
  return map[status] ?? status;
}

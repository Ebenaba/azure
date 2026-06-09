"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Search,
  Download,
  Eye,
  UserCheck,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/bookings/StatusBadge";
import { AssignWorkerModal } from "@/components/bookings/AssignWorkerModal";
import { useBookings, useCancelBooking } from "@/hooks/useBookings";
import { BookingFilters, Booking } from "@/types";
import { formatDate, formatNaira } from "@/lib/utils";

const SERVICE_TYPES = [
  "standard_clean",
  "deep_clean",
  "move_in_out",
  "office_clean",
  "post_construction",
];

const ZONES = [
  "Barnawa",
  "Narayi",
  "Malali",
  "Rigasa",
  "Kawo",
  "Tudun Wada",
  "Unguwar Rimi",
];

export default function BookingsPage() {
  const [filters, setFilters] = useState<BookingFilters>({ page: 1, limit: 25 });
  const [searchInput, setSearchInput] = useState("");
  const [assignModal, setAssignModal] = useState<{
    bookingId: string;
    zone: string;
  } | null>(null);

  const { data, isLoading, refetch } = useBookings(filters);
  const cancelBooking = useCancelBooking();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((f) => ({ ...f, search: searchInput, page: 1 }));
  };

  const handleCancel = async (booking: Booking) => {
    const reason = window.prompt(
      `Cancel booking ${booking.ref}?\nEnter cancellation reason:`
    );
    if (!reason) return;

    try {
      await cancelBooking.mutateAsync({ bookingId: booking.id, reason });
      toast.success(`Booking ${booking.ref} has been cancelled.`);
    } catch {
      toast.error("Failed to cancel booking.");
    }
  };

  const exportCSV = () => {
    if (!data?.data) return;
    const rows = [
      ["Ref", "Customer", "Service", "Zone", "Scheduled Date", "Worker", "Price", "Status"],
      ...data.data.map((b) => [
        b.ref,
        b.customerName ?? "",
        b.serviceType,
        b.zone,
        b.scheduledDate,
        b.workerName ?? "",
        b.totalPrice.toString(),
        b.status,
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = data?.totalPages ?? 1;
  const currentPage = filters.page ?? 1;

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[200px]">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by ref or customer name..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button type="submit" size="sm" variant="outline">
                Search
              </Button>
            </form>

            <Select
              value={filters.status ?? ""}
              onValueChange={(v) =>
                setFilters((f) => ({ ...f, status: v as BookingFilters["status"], page: 1 }))
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="en_route">En Route</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.serviceType ?? ""}
              onValueChange={(v) =>
                setFilters((f) => ({ ...f, serviceType: v || undefined, page: 1 }))
              }
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All Services" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Services</SelectItem>
                {SERVICE_TYPES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.zone ?? ""}
              onValueChange={(v) =>
                setFilters((f) => ({ ...f, zone: v || undefined, page: 1 }))
              }
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All Zones" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Zones</SelectItem>
                {ZONES.map((z) => (
                  <SelectItem key={z} value={z}>
                    {z}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2 ml-auto">
              <Input
                type="date"
                className="w-36"
                onChange={(e) =>
                  setFilters((f) => ({ ...f, startDate: e.target.value || undefined, page: 1 }))
                }
              />
              <Input
                type="date"
                className="w-36"
                onChange={(e) =>
                  setFilters((f) => ({ ...f, endDate: e.target.value || undefined, page: 1 }))
                }
              />
              <Button variant="outline" size="sm" onClick={exportCSV}>
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Ref</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="hidden sm:table-cell">Service</TableHead>
                    <TableHead className="hidden md:table-cell">Zone</TableHead>
                    <TableHead className="hidden lg:table-cell">Scheduled</TableHead>
                    <TableHead className="hidden md:table-cell">Worker</TableHead>
                    <TableHead className="hidden sm:table-cell text-right">Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-gray-400">
                        No bookings found
                      </TableCell>
                    </TableRow>
                  ) : (
                    data?.data.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell>
                          <Link
                            href={`/dashboard/bookings/${booking.id}`}
                            className="font-mono text-xs text-[#2E7D32] hover:underline"
                          >
                            {booking.ref}
                          </Link>
                        </TableCell>
                        <TableCell className="font-medium text-sm max-w-[120px] truncate">
                          {booking.customerName ?? "—"}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-gray-600 capitalize">
                          {booking.serviceType.replace(/_/g, " ")}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-gray-600">
                          {booking.zone}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-gray-500">
                          {formatDate(booking.scheduledDate)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-gray-600">
                          {booking.workerName ?? (
                            <span className="text-gray-400 text-xs">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-right text-sm font-medium">
                          {formatNaira(booking.totalPrice)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={booking.status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/dashboard/bookings/${booking.id}`}>
                              <Button variant="ghost" size="icon" title="View details">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </Link>
                            {!booking.workerId &&
                              booking.status !== "cancelled" &&
                              booking.status !== "completed" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Assign worker"
                                  onClick={() =>
                                    setAssignModal({
                                      bookingId: booking.id,
                                      zone: booking.zone,
                                    })
                                  }
                                >
                                  <UserCheck className="w-4 h-4 text-blue-600" />
                                </Button>
                              )}
                            {booking.status !== "cancelled" &&
                              booking.status !== "completed" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Cancel booking"
                                  onClick={() => handleCancel(booking)}
                                >
                                  <XCircle className="w-4 h-4 text-red-500" />
                                </Button>
                              )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-gray-500">
                    Showing {((currentPage - 1) * 25) + 1}–
                    {Math.min(currentPage * 25, data?.total ?? 0)} of{" "}
                    {data?.total ?? 0} bookings
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage <= 1}
                      onClick={() =>
                        setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))
                      }
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm font-medium">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPages}
                      onClick={() =>
                        setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))
                      }
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Assign Worker Modal */}
      {assignModal && (
        <AssignWorkerModal
          bookingId={assignModal.bookingId}
          zone={assignModal.zone}
          open={true}
          onClose={() => setAssignModal(null)}
          onAssigned={() => refetch()}
        />
      )}
    </div>
  );
}

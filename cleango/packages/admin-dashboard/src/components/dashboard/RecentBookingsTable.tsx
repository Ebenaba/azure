"use client";

import Link from "next/link";
import { Booking } from "@/types";
import { formatDate, formatNaira } from "@/lib/utils";
import { StatusBadge } from "@/components/bookings/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

interface RecentBookingsTableProps {
  bookings: Booking[];
  loading?: boolean;
}

export function RecentBookingsTable({
  bookings,
  loading,
}: RecentBookingsTableProps) {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base">Recent Bookings</CardTitle>
        <Link
          href="/dashboard/bookings"
          className="text-sm text-[#2E7D32] hover:underline flex items-center gap-1"
        >
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            No bookings yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Ref</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden sm:table-cell">Service</TableHead>
                <TableHead className="hidden md:table-cell">Zone</TableHead>
                <TableHead className="hidden lg:table-cell">Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Worker</TableHead>
                <TableHead className="hidden sm:table-cell text-right">Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.slice(0, 10).map((booking) => (
                <TableRow key={booking.id} className="cursor-pointer">
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
                  <TableCell>
                    <StatusBadge status={booking.status} />
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-gray-600">
                    {booking.workerName ?? (
                      <span className="text-gray-400 text-xs">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-right text-sm font-medium">
                    {formatNaira(booking.totalPrice)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

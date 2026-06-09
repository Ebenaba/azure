"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/bookings/StatusBadge";
import apiClient from "@/lib/api";
import { Customer, Booking, PaginatedResponse } from "@/types";
import { formatDateShort, formatDate, formatNaira } from "@/lib/utils";

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["customers", searchQuery, page],
    queryFn: async (): Promise<PaginatedResponse<Customer>> => {
      const params = new URLSearchParams({
        page: String(page),
        limit: "25",
      });
      if (searchQuery) params.append("search", searchQuery);
      const res = await apiClient.get<PaginatedResponse<Customer>>(
        `/admin/customers?${params.toString()}`
      );
      return res.data;
    },
  });

  const { data: customerBookings } = useQuery({
    queryKey: ["customer-bookings", selectedCustomer?.id],
    queryFn: async (): Promise<Booking[]> => {
      const res = await apiClient.get<Booking[]>(
        `/admin/customers/${selectedCustomer!.id}/bookings`
      );
      return res.data;
    },
    enabled: !!selectedCustomer,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(search);
    setPage(1);
  };

  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="submit" size="sm">Search</Button>
            {searchQuery && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setSearchQuery("");
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="hidden sm:table-cell">Zone</TableHead>
                    <TableHead className="hidden md:table-cell text-center">Bookings</TableHead>
                    <TableHead className="hidden lg:table-cell">Last Booking</TableHead>
                    <TableHead className="hidden lg:table-cell">Joined</TableHead>
                    <TableHead className="hidden sm:table-cell">Preference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-gray-400">
                        No customers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    data?.data.map((customer) => (
                      <TableRow
                        key={customer.id}
                        className="cursor-pointer"
                        onClick={() => setSelectedCustomer(customer)}
                      >
                        <TableCell className="font-medium text-sm">{customer.name}</TableCell>
                        <TableCell className="text-sm text-gray-600">{customer.phone}</TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-gray-600">
                          {customer.zone}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-center">
                          <span className="font-semibold">{customer.totalBookings}</span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-gray-500">
                          {customer.lastBookingDate
                            ? formatDateShort(customer.lastBookingDate)
                            : "—"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-gray-500">
                          {formatDateShort(customer.createdAt)}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {customer.femalePref && (
                            <Badge variant="purple" className="text-xs">
                              Female Cleaner
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-gray-500">
                    {data?.total ?? 0} total customers
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm">
                      {page} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
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

      {/* Customer Detail Modal */}
      <Dialog
        open={!!selectedCustomer}
        onOpenChange={(o) => !o && setSelectedCustomer(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedCustomer?.name}</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 text-xs">Phone</p>
                  <p className="font-medium">{selectedCustomer.phone}</p>
                </div>
                {selectedCustomer.email && (
                  <div>
                    <p className="text-gray-500 text-xs">Email</p>
                    <p className="font-medium">{selectedCustomer.email}</p>
                  </div>
                )}
                <div>
                  <p className="text-gray-500 text-xs">Zone</p>
                  <p className="font-medium">{selectedCustomer.zone}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Total Bookings</p>
                  <p className="font-bold text-lg">{selectedCustomer.totalBookings}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Joined</p>
                  <p className="font-medium">{formatDateShort(selectedCustomer.createdAt)}</p>
                </div>
                {selectedCustomer.femalePref && (
                  <div>
                    <Badge variant="purple" className="text-xs">Female Cleaner Preference</Badge>
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-3">Booking History</h4>
                {!customerBookings ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin w-5 h-5 border-2 border-[#2E7D32] border-t-transparent rounded-full" />
                  </div>
                ) : customerBookings.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-4">No bookings yet</p>
                ) : (
                  <div className="space-y-2">
                    {customerBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm"
                      >
                        <div>
                          <p className="font-mono text-xs text-[#2E7D32]">{booking.ref}</p>
                          <p className="text-gray-600 capitalize mt-0.5">
                            {booking.serviceType.replace(/_/g, " ")}
                          </p>
                          <p className="text-xs text-gray-400">
                            {formatDate(booking.scheduledDate)}
                          </p>
                        </div>
                        <div className="text-right">
                          <StatusBadge status={booking.status} />
                          <p className="text-xs text-gray-500 mt-1">
                            {formatNaira(booking.totalPrice)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

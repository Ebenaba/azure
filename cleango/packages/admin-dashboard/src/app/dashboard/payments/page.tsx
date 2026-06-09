"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Shield, DollarSign, TrendingDown, ArrowDownCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatsCard } from "@/components/dashboard/StatsCard";
import apiClient from "@/lib/api";
import { Payment, EscrowRecord, PaymentStats } from "@/types";
import { formatDate, formatNaira, getStatusColor, getStatusLabel } from "@/lib/utils";

export default function PaymentsPage() {
  const [tab, setTab] = useState("transactions");
  const qc = useQueryClient();

  const { data: paymentStats, isLoading: statsLoading } = useQuery({
    queryKey: ["payment-stats"],
    queryFn: async (): Promise<PaymentStats> => {
      const res = await apiClient.get<PaymentStats>("/admin/payments/stats");
      return res.data;
    },
  });

  const { data: transactions, isLoading: txLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: async (): Promise<Payment[]> => {
      const res = await apiClient.get<Payment[]>("/admin/payments");
      return res.data;
    },
  });

  const { data: escrowRecords, isLoading: escrowLoading } = useQuery({
    queryKey: ["escrow"],
    queryFn: async (): Promise<EscrowRecord[]> => {
      const res = await apiClient.get<EscrowRecord[]>("/admin/escrow");
      return res.data;
    },
  });

  const releaseEscrow = useMutation({
    mutationFn: async (escrowId: string) => {
      const res = await apiClient.post(`/admin/escrow/${escrowId}/release`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["escrow"] });
      qc.invalidateQueries({ queryKey: ["payment-stats"] });
      toast.success("Escrow released successfully.");
    },
    onError: () => {
      toast.error("Failed to release escrow.");
    },
  });

  const handleReleaseEscrow = (record: EscrowRecord) => {
    if (
      !window.confirm(
        `Release ${formatNaira(record.amount)} escrow for booking ${record.bookingRef}?`
      )
    )
      return;
    releaseEscrow.mutate(record.id);
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label="Total Processed"
          value={statsLoading ? "—" : formatNaira(paymentStats?.totalProcessed ?? 0)}
          icon={DollarSign}
          iconBg="bg-[#E8F5E9]"
          iconColor="text-[#2E7D32]"
        />
        <StatsCard
          label="In Escrow"
          value={statsLoading ? "—" : formatNaira(paymentStats?.inEscrow ?? 0)}
          icon={Shield}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatsCard
          label="Released Today"
          value={statsLoading ? "—" : formatNaira(paymentStats?.releasedToday ?? 0)}
          icon={ArrowDownCircle}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
        />
        <StatsCard
          label="Refunded This Month"
          value={statsLoading ? "—" : formatNaira(paymentStats?.refundedThisMonth ?? 0)}
          icon={TrendingDown}
          iconBg="bg-red-50"
          iconColor="text-red-500"
        />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="escrow">Escrow</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <Card>
            <CardContent className="p-0">
              {txLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>Date</TableHead>
                      <TableHead>Booking Ref</TableHead>
                      <TableHead className="hidden sm:table-cell">Customer</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="hidden md:table-cell">Paystack Ref</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10 text-gray-400">
                          No transactions yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      transactions?.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell className="text-sm text-gray-500">
                            {formatDate(tx.createdAt)}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-[#2E7D32]">
                            {tx.bookingRef ?? tx.bookingId.slice(0, 8)}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm">
                            {tx.customerName ?? "—"}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatNaira(tx.amount)}
                          </TableCell>
                          <TableCell className="hidden md:table-cell font-mono text-xs text-gray-500">
                            {tx.paystackRef ?? "—"}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(tx.status)}`}
                            >
                              {getStatusLabel(tx.status)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="escrow">
          <Card>
            <CardContent className="p-0">
              {escrowLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>Booking Ref</TableHead>
                      <TableHead className="hidden sm:table-cell">Customer</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="hidden md:table-cell">Held Since</TableHead>
                      <TableHead className="hidden lg:table-cell">Release After</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {escrowRecords?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10 text-gray-400">
                          No escrow records
                        </TableCell>
                      </TableRow>
                    ) : (
                      escrowRecords?.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-mono text-xs text-[#2E7D32]">
                            {record.bookingRef ?? record.bookingId.slice(0, 8)}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm">
                            {record.customerName ?? "—"}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatNaira(record.amount)}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-gray-500">
                            {formatDate(record.heldAt)}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-sm text-gray-500">
                            {record.releaseAfter ? formatDate(record.releaseAfter) : "—"}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(record.status)}`}
                            >
                              {getStatusLabel(record.status)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {record.status === "held" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReleaseEscrow(record)}
                                disabled={releaseEscrow.isPending}
                                className="text-xs h-7"
                              >
                                Release
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

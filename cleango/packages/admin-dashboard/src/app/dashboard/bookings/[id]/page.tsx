"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  User,
  Phone,
  CreditCard,
  Shield,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Loader2,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/bookings/StatusBadge";
import { AssignWorkerModal } from "@/components/bookings/AssignWorkerModal";
import { useBooking, useCancelBooking } from "@/hooks/useBookings";
import { formatDate, formatNaira, getStatusColor, getStatusLabel } from "@/lib/utils";
import { BookingStatus } from "@/types";

const STATUS_TIMELINE: BookingStatus[] = [
  "pending",
  "confirmed",
  "en_route",
  "in_progress",
  "completed",
];

function StatusTimeline({ currentStatus }: { currentStatus: BookingStatus }) {
  const cancelledIndex = currentStatus === "cancelled" ? -1 : null;
  const currentIndex = STATUS_TIMELINE.indexOf(currentStatus);

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2">
      {STATUS_TIMELINE.map((status, idx) => {
        const isPast = currentIndex > idx;
        const isCurrent = currentIndex === idx;
        const isCancelled = currentStatus === "cancelled";

        return (
          <div key={status} className="flex items-center gap-1 flex-shrink-0">
            <div
              className={`flex flex-col items-center gap-1`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  isCancelled
                    ? "bg-gray-100 text-gray-400"
                    : isCurrent
                    ? "bg-[#2E7D32] text-white"
                    : isPast
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {isPast && !isCancelled ? "✓" : idx + 1}
              </div>
              <span className="text-xs text-gray-500 whitespace-nowrap">
                {getStatusLabel(status)}
              </span>
            </div>
            {idx < STATUS_TIMELINE.length - 1 && (
              <div
                className={`h-0.5 w-8 mt-[-16px] ${
                  isPast && !isCancelled ? "bg-green-400" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        );
      })}
      {currentStatus === "cancelled" && (
        <div className="flex flex-col items-center gap-1 ml-2">
          <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold">
            ✕
          </div>
          <span className="text-xs text-red-500">Cancelled</span>
        </div>
      )}
    </div>
  );
}

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [assignOpen, setAssignOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const { data: booking, isLoading, refetch } = useBooking(id);
  const cancelBooking = useCancelBooking();

  const handleCancel = async () => {
    const reason = window.prompt("Enter cancellation reason:");
    if (!reason) return;
    try {
      await cancelBooking.mutateAsync({ bookingId: id, reason });
      toast.success("Booking cancelled.");
      refetch();
    } catch {
      toast.error("Failed to cancel booking.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p>Booking not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const commission = booking.commission ?? booking.totalPrice * 0.15;
  const surcharge = booking.surcharge ?? 0;
  const basePrice = booking.basePrice ?? booking.totalPrice - surcharge - (booking.extras?.reduce((s, e) => s + e.price, 0) ?? 0);
  const extrasTotal = booking.extras?.reduce((s, e) => s + e.price, 0) ?? 0;

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Back */}
      <Button variant="ghost" size="sm" onClick={() => router.back()}>
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Bookings
      </Button>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Booking{" "}
            <span className="font-mono text-[#2E7D32]">{booking.ref}</span>
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Created {formatDate(booking.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={booking.status} />
          {booking.status !== "cancelled" && booking.status !== "completed" && (
            <>
              {!booking.workerId && (
                <Button size="sm" onClick={() => setAssignOpen(true)}>
                  <UserCheck className="w-4 h-4 mr-1" />
                  Assign Worker
                </Button>
              )}
              <Button size="sm" variant="destructive" onClick={handleCancel}>
                Cancel Booking
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Status Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Status Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <StatusTimeline currentStatus={booking.status} />
          {booking.cancellationReason && (
            <p className="text-sm text-red-600 mt-2">
              Reason: {booking.cancellationReason}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Main Info + Customer/Worker */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Booking Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Booking Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Scheduled Date</p>
                <p className="text-sm font-medium">{formatDate(booking.scheduledDate)}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Address</p>
                <p className="text-sm font-medium">{booking.address}</p>
                <p className="text-xs text-gray-500">{booking.zone}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Service Type</p>
              <p className="text-sm font-medium capitalize">
                {booking.serviceType.replace(/_/g, " ")}
              </p>
            </div>
            {booking.femaleCleaner && (
              <Badge variant="purple" className="text-xs">
                Female Cleaner Requested
              </Badge>
            )}
            {booking.notes && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Notes</p>
                <p className="text-sm text-gray-700 bg-gray-50 rounded p-2">
                  {booking.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer + Worker */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <p className="text-sm font-medium">
                  {booking.customerName ?? "—"}
                </p>
              </div>
              {booking.customerPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <p className="text-sm">{booking.customerPhone}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Assigned Worker</CardTitle>
            </CardHeader>
            <CardContent>
              {booking.workerId ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <p className="text-sm font-medium">{booking.workerName}</p>
                  </div>
                  {booking.workerPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <p className="text-sm">{booking.workerPhone}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-3">
                  <p className="text-sm text-gray-400">No worker assigned</p>
                  {booking.status !== "cancelled" && (
                    <Button
                      size="sm"
                      className="mt-2"
                      onClick={() => setAssignOpen(true)}
                    >
                      Assign Now
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Price Breakdown + Payment + Escrow */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Price Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Base Price</span>
              <span>{formatNaira(basePrice)}</span>
            </div>
            {booking.extras?.map((extra) => (
              <div key={extra.name} className="flex justify-between">
                <span className="text-gray-500">{extra.name}</span>
                <span>{formatNaira(extra.price)}</span>
              </div>
            ))}
            {surcharge > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Zone Surcharge</span>
                <span>{formatNaira(surcharge)}</span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between font-semibold">
              <span>Total</span>
              <span className="text-[#2E7D32]">
                {formatNaira(booking.totalPrice)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>Platform Commission (15%)</span>
              <span>{formatNaira(commission)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Payment
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Amount</span>
              <span className="font-medium">{formatNaira(booking.totalPrice)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <Badge variant="warning" className="text-xs">Paid via Paystack</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Escrow
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Amount Held</span>
              <span className="font-medium">{formatNaira(booking.totalPrice - commission)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              {booking.status === "completed" ? (
                <Badge variant="success" className="text-xs">Released</Badge>
              ) : (
                <Badge variant="blue" className="text-xs">In Escrow</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chat Transcript */}
      {booking.chatTranscript && booking.chatTranscript.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className="flex items-center justify-between w-full"
            >
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Chat Transcript ({booking.chatTranscript.length} messages)
              </CardTitle>
              {chatOpen ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>
          </CardHeader>
          {chatOpen && (
            <CardContent className="space-y-3 max-h-80 overflow-y-auto">
              {booking.chatTranscript.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${
                    msg.sender === "customer" ? "justify-start" : "justify-end"
                  }`}
                >
                  <div
                    className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                      msg.sender === "customer"
                        ? "bg-gray-100 text-gray-800"
                        : msg.sender === "system"
                        ? "bg-blue-50 text-blue-800 mx-auto text-xs italic"
                        : "bg-[#2E7D32] text-white"
                    }`}
                  >
                    <p>{msg.message}</p>
                    <p className="text-xs opacity-60 mt-0.5">
                      {formatDate(msg.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      {/* Assign Worker Modal */}
      {assignOpen && (
        <AssignWorkerModal
          bookingId={booking.id}
          zone={booking.zone}
          open={assignOpen}
          onClose={() => setAssignOpen(false)}
          onAssigned={() => refetch()}
        />
      )}
    </div>
  );
}

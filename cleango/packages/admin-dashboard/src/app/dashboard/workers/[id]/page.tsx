"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Star,
  Phone,
  MapPin,
  Briefcase,
  TrendingUp,
  Loader2,
  ShieldAlert,
  CheckCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VettingModal } from "@/components/workers/VettingModal";
import { useWorker, useWorkerStats, useSuspendWorker, useUpdateWorkerAvailability } from "@/hooks/useWorkers";
import { formatDateShort, formatNaira } from "@/lib/utils";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

export default function WorkerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [vettingOpen, setVettingOpen] = useState(false);
  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const [availabilityEdited, setAvailabilityEdited] = useState(false);

  const { data: worker, isLoading, refetch } = useWorker(id);
  const { data: stats } = useWorkerStats(id);
  const suspend = useSuspendWorker();
  const updateAvailability = useUpdateWorkerAvailability();

  const handleSuspend = async () => {
    if (!worker) return;
    const action = worker.status === "suspended" ? "reactivate" : "suspend";
    if (!window.confirm(`${action === "suspend" ? "Suspend" : "Reactivate"} ${worker.name}?`)) return;
    try {
      await suspend.mutateAsync({ workerId: id, suspend: action === "suspend" });
      toast.success(`Worker ${action === "suspend" ? "suspended" : "reactivated"}.`);
      refetch();
    } catch {
      toast.error("Action failed. Please try again.");
    }
  };

  const handleSaveAvailability = async () => {
    try {
      await updateAvailability.mutateAsync({ workerId: id, availability });
      toast.success("Availability updated.");
      setAvailabilityEdited(false);
    } catch {
      toast.error("Failed to update availability.");
    }
  };

  const toggleDay = (day: string) => {
    const current = availability[day] ?? worker?.availability ?? false;
    setAvailability((prev) => ({ ...prev, [day]: !current }));
    setAvailabilityEdited(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="text-center py-16 text-gray-400">
        Worker not found.
        <Button variant="outline" className="mt-4 block mx-auto" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const workerAvailability = { ...worker } as Record<string, unknown>;

  return (
    <div className="space-y-5 max-w-5xl">
      <Button variant="ghost" size="sm" onClick={() => router.back()}>
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Workers
      </Button>

      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start gap-5">
            <div className="w-20 h-20 rounded-full bg-[#2E7D32] flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
              {worker.name[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{worker.name}</h1>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Phone className="w-4 h-4" />
                      {worker.phone}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <MapPin className="w-4 h-4" />
                      {worker.zone}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {worker.vetted && (
                      <Badge variant="success" className="text-xs">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Vetted
                      </Badge>
                    )}
                    {worker.status === "pending_vetting" && (
                      <Badge variant="warning" className="text-xs">Pending Vetting</Badge>
                    )}
                    {worker.status === "suspended" && (
                      <Badge variant="destructive" className="text-xs">Suspended</Badge>
                    )}
                    {worker.status === "flagged" && (
                      <Badge variant="destructive" className="text-xs">Flagged</Badge>
                    )}
                    <span className="text-xs text-gray-500 capitalize">
                      {worker.gender} · Joined {formatDateShort(worker.createdAt)}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {worker.status === "pending_vetting" && (
                    <Button size="sm" onClick={() => setVettingOpen(true)}>
                      Review & Vet
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant={worker.status === "suspended" ? "default" : "destructive"}
                    onClick={handleSuspend}
                    disabled={suspend.isPending}
                  >
                    <ShieldAlert className="w-4 h-4 mr-1" />
                    {worker.status === "suspended" ? "Reactivate" : "Suspend"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{worker.totalJobs}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total Jobs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-1">
              <p className="text-2xl font-bold text-gray-900">{worker.rating.toFixed(1)}</p>
              <Star className="w-5 h-5 text-[#F9A825] fill-[#F9A825]" />
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Avg Rating</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">
              {worker.completionRate ? `${Math.round(worker.completionRate * 100)}%` : "—"}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Completion Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">
              {worker.earningsThisMonth ? formatNaira(worker.earningsThisMonth) : "—"}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Earnings This Month</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Chart */}
      {stats?.jobsPerDay && stats.jobsPerDay.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Performance — Last 30 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.jobsPerDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#2E7D32" name="Jobs" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Vetting Documents */}
      {worker.status === "pending_vetting" && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-amber-800">Vetting Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-700 mb-3">
              This worker has submitted their documents and is awaiting vetting approval.
            </p>
            <Button onClick={() => setVettingOpen(true)}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Review Documents & Vet
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Services */}
      {worker.services && worker.services.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Services
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {worker.services.map((s) => (
                <span
                  key={s}
                  className="px-3 py-1 bg-[#E8F5E9] text-[#2E7D32] rounded-full text-sm font-medium capitalize"
                >
                  {s.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Availability */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Availability Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            {DAYS.map((day) => {
              const isAvail =
                availability[day] !== undefined
                  ? availability[day]
                  : (workerAvailability[day] as boolean | undefined) ?? true;
              return (
                <button
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
                    isAvail
                      ? "bg-[#2E7D32] text-white"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {day.slice(0, 3)}
                </button>
              );
            })}
          </div>
          {availabilityEdited && (
            <Button size="sm" onClick={handleSaveAvailability} disabled={updateAvailability.isPending}>
              {updateAvailability.isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : null}
              Save Availability
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Recent Reviews */}
      {stats?.recentReviews && stats.recentReviews.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recent Reviews</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.recentReviews.slice(0, 5).map((review) => (
              <div key={review.id} className="border-b border-gray-100 pb-3 last:border-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm">{review.customerName}</p>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i < review.rating
                            ? "text-[#F9A825] fill-[#F9A825]"
                            : "text-gray-200 fill-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                {review.comment && (
                  <p className="text-sm text-gray-600 mt-1">{review.comment}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {formatDateShort(review.createdAt)} · {review.bookingRef}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {vettingOpen && (
        <VettingModal
          worker={worker}
          open={vettingOpen}
          onClose={() => setVettingOpen(false)}
          onComplete={() => {
            setVettingOpen(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}

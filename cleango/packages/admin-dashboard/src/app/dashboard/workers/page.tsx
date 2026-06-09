"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Star,
  Phone,
  MapPin,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VettingModal } from "@/components/workers/VettingModal";
import { useWorkers } from "@/hooks/useWorkers";
import { Worker, WorkerFilters, WorkerStatus } from "@/types";
import { formatDateShort } from "@/lib/utils";

const ZONES = [
  "Barnawa", "Narayi", "Malali", "Rigasa", "Kawo",
  "Tudun Wada", "Unguwar Rimi",
];

const STATUS_VARIANT: Record<WorkerStatus, "success" | "warning" | "destructive" | "gray" | "blue"> = {
  active: "success",
  inactive: "gray",
  suspended: "destructive",
  pending_vetting: "warning",
  vetted: "blue",
  flagged: "destructive",
} as unknown as Record<WorkerStatus, "success" | "warning" | "destructive" | "gray" | "blue">;

function WorkerCard({
  worker,
  onVet,
}: {
  worker: Worker;
  onVet: (w: Worker) => void;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full bg-[#2E7D32] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
            {worker.name[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <Link
                href={`/dashboard/workers/${worker.id}`}
                className="font-semibold text-gray-900 hover:text-[#2E7D32] text-sm truncate"
              >
                {worker.name}
              </Link>
              <Badge
                variant={(STATUS_VARIANT[worker.status] ?? "gray") as Parameters<typeof Badge>[0]["variant"]}
                className="text-xs flex-shrink-0"
              >
                {worker.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </Badge>
            </div>

            <div className="flex items-center gap-1 mt-1">
              <Phone className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-500">{worker.phone}</span>
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-500">{worker.zone}</span>
            </div>

            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-[#F9A825] fill-[#F9A825]" />
                <span className="text-xs font-medium">{worker.rating.toFixed(1)}</span>
              </div>
              <span className="text-xs text-gray-500">{worker.totalJobs} jobs</span>
              {worker.vetted && (
                <CheckCircle className="w-3.5 h-3.5 text-green-600" />
              )}
            </div>

            {worker.lastActive && (
              <p className="text-xs text-gray-400 mt-1">
                Last active: {formatDateShort(worker.lastActive)}
              </p>
            )}

            {worker.status === "pending_vetting" && (
              <Button
                size="sm"
                className="mt-2 h-7 text-xs"
                onClick={() => onVet(worker)}
              >
                Review Documents
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function WorkersPage() {
  const [tab, setTab] = useState("all");
  const [filters, setFilters] = useState<WorkerFilters>({ page: 1, limit: 24 });
  const [search, setSearch] = useState("");
  const [vettingWorker, setVettingWorker] = useState<Worker | null>(null);

  const tabStatusMap: Record<string, WorkerStatus | ""> = {
    all: "",
    pending: "pending_vetting",
    active: "active",
    flagged: "flagged",
  };

  const effectiveFilters: WorkerFilters = {
    ...filters,
    status: tabStatusMap[tab] || undefined,
    page: filters.page,
  };

  const { data, isLoading, refetch } = useWorkers(effectiveFilters);

  const handleTabChange = (t: string) => {
    setTab(t);
    setFilters((f) => ({ ...f, page: 1 }));
  };

  const totalPages = data?.totalPages ?? 1;
  const currentPage = filters.page ?? 1;

  const filteredData = data?.data.filter((w) =>
    search
      ? w.name.toLowerCase().includes(search.toLowerCase()) ||
        w.phone.includes(search)
      : true
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Tabs value={tab} onValueChange={handleTabChange} className="flex-1">
          <TabsList>
            <TabsTrigger value="all">All Workers</TabsTrigger>
            <TabsTrigger value="pending">Pending Vetting</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="flagged">Flagged</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button size="sm">
          <UserPlus className="w-4 h-4 mr-1" />
          Register Worker
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-64"
        />
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
              <SelectItem key={z} value={z}>{z}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.minRating?.toString() ?? ""}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, minRating: v ? Number(v) : undefined, page: 1 }))
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Min Rating" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Any Rating</SelectItem>
            <SelectItem value="3">3★ and above</SelectItem>
            <SelectItem value="4">4★ and above</SelectItem>
            <SelectItem value="4.5">4.5★ and above</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : filteredData?.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          No workers found
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredData?.map((worker) => (
            <WorkerCard
              key={worker.id}
              worker={worker}
              onVet={setVettingWorker}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Vetting Modal */}
      {vettingWorker && (
        <VettingModal
          worker={vettingWorker}
          open={true}
          onClose={() => setVettingWorker(null)}
          onComplete={() => {
            setVettingWorker(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Star, Loader2, UserCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAssignWorker } from "@/hooks/useBookings";
import apiClient from "@/lib/api";
import { Worker } from "@/types";

interface AssignWorkerModalProps {
  bookingId: string;
  zone: string;
  open: boolean;
  onClose: () => void;
  onAssigned?: () => void;
}

export function AssignWorkerModal({
  bookingId,
  zone,
  open,
  onClose,
  onAssigned,
}: AssignWorkerModalProps) {
  const [search, setSearch] = useState("");
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);

  const { data: workers, isLoading } = useQuery({
    queryKey: ["available-workers", zone],
    queryFn: async (): Promise<Worker[]> => {
      const res = await apiClient.get<Worker[]>(
        `/admin/workers/available?zone=${encodeURIComponent(zone)}`
      );
      return res.data;
    },
    enabled: open,
  });

  const assign = useAssignWorker();

  const filtered = workers?.filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    w.phone.includes(search)
  ) ?? [];

  const handleAssign = async () => {
    if (!selectedWorkerId) return;
    try {
      await assign.mutateAsync({ bookingId, workerId: selectedWorkerId });
      toast.success("Worker assigned successfully");
      onAssigned?.();
      onClose();
    } catch {
      toast.error("Failed to assign worker. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign Worker</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">
            Available workers in {zone}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-8">
              No available workers found in this zone
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {filtered.map((worker) => (
                <div
                  key={worker.id}
                  onClick={() => setSelectedWorkerId(worker.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedWorkerId === worker.id
                      ? "border-[#2E7D32] bg-[#E8F5E9]"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-[#2E7D32] flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                    {worker.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900">{worker.name}</p>
                    <p className="text-xs text-gray-500">{worker.phone}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-[#F9A825] fill-[#F9A825]" />
                      <span className="text-xs font-medium">{worker.rating.toFixed(1)}</span>
                    </div>
                    <span className="text-xs text-gray-400">{worker.totalJobs} jobs</span>
                  </div>
                  {selectedWorkerId === worker.id && (
                    <UserCheck className="w-5 h-5 text-[#2E7D32] flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedWorkerId || assign.isPending}
          >
            {assign.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Assigning...
              </>
            ) : (
              "Assign Worker"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { CheckCircle, XCircle, Loader2, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useVetWorker } from "@/hooks/useWorkers";
import { Worker } from "@/types";

interface VettingModalProps {
  worker: Worker;
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export function VettingModal({
  worker,
  open,
  onClose,
  onComplete,
}: VettingModalProps) {
  const [rejectionReason, setRejectionReason] = useState("");
  const [action, setAction] = useState<"approve" | "reject" | null>(null);

  const vet = useVetWorker();

  const handleVet = async (approved: boolean) => {
    if (!approved && !rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection.");
      return;
    }

    try {
      await vet.mutateAsync({
        workerId: worker.id,
        approved,
        reason: approved ? undefined : rejectionReason.trim(),
      });

      toast.success(
        approved
          ? `${worker.name} has been approved as a CleanGo worker.`
          : `${worker.name}'s application has been rejected.`
      );
      onComplete?.();
      onClose();
    } catch {
      toast.error("Vetting action failed. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Worker Vetting — {worker.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Worker info */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="w-14 h-14 rounded-full bg-[#2E7D32] flex items-center justify-center text-white text-xl font-bold">
              {worker.name[0].toUpperCase()}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{worker.name}</h3>
              <p className="text-sm text-gray-600">{worker.phone}</p>
              <p className="text-sm text-gray-600">Zone: {worker.zone}</p>
              <p className="text-sm text-gray-600 capitalize">
                Gender: {worker.gender}
              </p>
            </div>
          </div>

          {/* Documents */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="mb-2 block">NIN / ID Photo</Label>
              {worker.ninPhotoUrl ? (
                <div className="relative h-48 rounded-lg overflow-hidden border border-gray-200">
                  <Image
                    src={worker.ninPhotoUrl}
                    alt="NIN Photo"
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="h-48 rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-400">
                  <FileText className="w-8 h-8" />
                  <p className="text-sm">No NIN photo uploaded</p>
                </div>
              )}
            </div>

            <div>
              <Label className="mb-2 block">Police Clearance Certificate</Label>
              {worker.policeCertUrl ? (
                <div className="relative h-48 rounded-lg overflow-hidden border border-gray-200">
                  <Image
                    src={worker.policeCertUrl}
                    alt="Police Certificate"
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="h-48 rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-400">
                  <FileText className="w-8 h-8" />
                  <p className="text-sm">No police certificate uploaded</p>
                </div>
              )}
            </div>
          </div>

          {/* Services */}
          {worker.services && worker.services.length > 0 && (
            <div>
              <Label className="mb-2 block">Services Offered</Label>
              <div className="flex flex-wrap gap-2">
                {worker.services.map((s) => (
                  <span
                    key={s}
                    className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium capitalize"
                  >
                    {s.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Rejection reason */}
          {action === "reject" && (
            <div>
              <Label htmlFor="rejectionReason" className="mb-2 block">
                Rejection Reason <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="rejectionReason"
                placeholder="Explain why this worker's application is being rejected (e.g. documents unclear, incomplete info)..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">
                This will be sent to the worker via SMS.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={vet.isPending}>
            Cancel
          </Button>
          {action !== "reject" ? (
            <>
              <Button
                variant="destructive"
                onClick={() => setAction("reject")}
                disabled={vet.isPending}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
              <Button
                onClick={() => handleVet(true)}
                disabled={vet.isPending}
              >
                {vet.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Approve Worker
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setAction(null)}
                disabled={vet.isPending}
              >
                Back
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleVet(false)}
                disabled={vet.isPending || !rejectionReason.trim()}
              >
                {vet.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4 mr-2" />
                )}
                Confirm Rejection
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

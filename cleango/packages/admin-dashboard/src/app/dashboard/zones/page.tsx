"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MapPin, Users, CalendarCheck, Edit2, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import apiClient from "@/lib/api";
import { Zone } from "@/types";
import { formatNaira } from "@/lib/utils";

const editZoneSchema = z.object({
  surcharge: z.coerce.number().min(0),
  serviceable: z.boolean(),
});

type EditZoneValues = z.infer<typeof editZoneSchema>;

export default function ZonesPage() {
  const qc = useQueryClient();
  const [editZone, setEditZone] = useState<Zone | null>(null);

  const { data: zones, isLoading } = useQuery({
    queryKey: ["zones"],
    queryFn: async (): Promise<Zone[]> => {
      const res = await apiClient.get<Zone[]>("/admin/zones");
      return res.data;
    },
  });

  const updateZone = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: EditZoneValues;
    }) => {
      const res = await apiClient.put(`/admin/zones/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["zones"] });
      toast.success("Zone updated.");
      setEditZone(null);
    },
    onError: () => {
      toast.error("Failed to update zone.");
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EditZoneValues>({
    resolver: zodResolver(editZoneSchema),
  });

  const serviceable = watch("serviceable");

  const openEdit = (zone: Zone) => {
    setEditZone(zone);
    reset({ surcharge: zone.surcharge, serviceable: zone.serviceable });
  };

  const onSubmit = (values: EditZoneValues) => {
    if (!editZone) return;
    updateZone.mutate({ id: editZone.id, data: values });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Manage service zones across Kaduna State. Toggle serviceability and set zone surcharges.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {zones?.map((zone) => (
          <div
            key={zone.id}
            className={`rounded-xl border p-4 transition-all ${
              zone.serviceable
                ? "bg-[#E8F5E9] border-[#A5D6A7] shadow-sm"
                : "bg-gray-50 border-gray-200"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <MapPin
                  className={`w-4 h-4 flex-shrink-0 ${
                    zone.serviceable ? "text-[#2E7D32]" : "text-gray-400"
                  }`}
                />
                <div>
                  <p
                    className={`font-semibold text-sm ${
                      zone.serviceable ? "text-[#2E7D32]" : "text-gray-600"
                    }`}
                  >
                    {zone.name}
                  </p>
                  {zone.nameHausa && (
                    <p className="text-xs text-gray-500">{zone.nameHausa}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => openEdit(zone)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-2">{zone.lga} LGA</p>

            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs text-gray-600">
                  {zone.workerCount} workers
                </span>
              </div>
              <div className="flex items-center gap-1">
                <CalendarCheck className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs text-gray-600">
                  {zone.bookingCount} bookings
                </span>
              </div>
            </div>

            {zone.surcharge > 0 && (
              <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mt-2 inline-block">
                +{formatNaira(zone.surcharge)} surcharge
              </p>
            )}

            <div className="mt-2">
              <span
                className={`text-xs font-medium ${
                  zone.serviceable ? "text-green-700" : "text-gray-400"
                }`}
              >
                {zone.serviceable ? "● Active" : "○ Coming Soon"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Zone Modal */}
      <Dialog open={!!editZone} onOpenChange={(o) => !o && setEditZone(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Zone — {editZone?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="surcharge">Zone Surcharge (₦)</Label>
              <Input
                id="surcharge"
                type="number"
                min="0"
                placeholder="0"
                {...register("surcharge")}
                className="mt-1"
              />
              {errors.surcharge && (
                <p className="text-xs text-red-500 mt-1">{errors.surcharge.message}</p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setValue("serviceable", !serviceable)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  serviceable ? "bg-[#2E7D32]" : "bg-gray-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    serviceable ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <Label>Serviceable</Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditZone(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateZone.isPending}>
                {updateZone.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

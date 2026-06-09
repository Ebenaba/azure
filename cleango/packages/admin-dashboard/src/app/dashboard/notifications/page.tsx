"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Bell, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import apiClient from "@/lib/api";
import { Notification } from "@/types";
import { formatDate } from "@/lib/utils";

const notificationSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  body: z.string().min(1, "Message body is required").max(500),
  target: z.enum(["all_customers", "all_workers", "zone", "specific_user"]),
  targetZone: z.string().optional(),
  targetUserId: z.string().optional(),
});

type NotificationFormValues = z.infer<typeof notificationSchema>;

const ZONES = ["Barnawa", "Narayi", "Malali", "Rigasa", "Kawo", "Tudun Wada"];

const TARGET_LABELS: Record<string, string> = {
  all_customers: "All Customers",
  all_workers: "All Workers",
  zone: "Specific Zone",
  specific_user: "Specific User",
};

export default function NotificationsPage() {
  const qc = useQueryClient();

  const { data: history, isLoading } = useQuery({
    queryKey: ["notification-history"],
    queryFn: async (): Promise<Notification[]> => {
      const res = await apiClient.get<Notification[]>("/admin/notifications");
      return res.data;
    },
  });

  const sendNotification = useMutation({
    mutationFn: async (data: NotificationFormValues) => {
      const res = await apiClient.post("/admin/notifications/broadcast", data);
      return res.data;
    },
    onSuccess: (data: { sentCount?: number }) => {
      qc.invalidateQueries({ queryKey: ["notification-history"] });
      toast.success(`Notification sent to ${data?.sentCount ?? "all"} recipients.`);
      reset();
    },
    onError: () => {
      toast.error("Failed to send notification. Please try again.");
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationSchema),
    defaultValues: { target: "all_customers" },
  });

  const target = watch("target");

  const onSubmit = (values: NotificationFormValues) => {
    sendNotification.mutate(values);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Broadcast Form */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Send Broadcast Notification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Notification title..."
                  {...register("title")}
                  className="mt-1"
                />
                {errors.title && (
                  <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>
                )}
              </div>

              <div>
                <Label>Target Audience</Label>
                <Select
                  value={target}
                  onValueChange={(v) =>
                    setValue("target", v as NotificationFormValues["target"])
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_customers">All Customers</SelectItem>
                    <SelectItem value="all_workers">All Workers</SelectItem>
                    <SelectItem value="zone">Specific Zone</SelectItem>
                    <SelectItem value="specific_user">Specific User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {target === "zone" && (
              <div>
                <Label>Select Zone</Label>
                <Select onValueChange={(v) => setValue("targetZone", v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Choose a zone..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ZONES.map((z) => (
                      <SelectItem key={z} value={z}>{z}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {target === "specific_user" && (
              <div>
                <Label htmlFor="targetUserId">User ID</Label>
                <Input
                  id="targetUserId"
                  placeholder="Firebase UID or user ID..."
                  {...register("targetUserId")}
                  className="mt-1"
                />
              </div>
            )}

            <div>
              <Label htmlFor="body">Message</Label>
              <Textarea
                id="body"
                placeholder="Write your notification message here..."
                rows={4}
                {...register("body")}
                className="mt-1"
              />
              {errors.body && (
                <p className="text-xs text-red-500 mt-1">{errors.body.message}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                {watch("body")?.length ?? 0}/500 characters
              </p>
            </div>

            <Button
              type="submit"
              disabled={sendNotification.isPending}
              className="w-full sm:w-auto"
            >
              {sendNotification.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Send Notification
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Notification History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : history?.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">
              No notifications sent yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Date</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="hidden sm:table-cell">Target</TableHead>
                  <TableHead className="hidden md:table-cell">Zone/User</TableHead>
                  <TableHead className="text-right">Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history?.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell className="text-sm text-gray-500">
                      {formatDate(n.createdAt)}
                    </TableCell>
                    <TableCell className="font-medium text-sm">{n.title}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-gray-600">
                      {TARGET_LABELS[n.target] ?? n.target}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-gray-500">
                      {n.targetZone ?? n.targetUserId ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-semibold text-sm">{n.sentCount}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "en_route"
  | "in_progress"
  | "completed"
  | "cancelled";

export type WorkerStatus =
  | "active"
  | "inactive"
  | "suspended"
  | "pending_vetting"
  | "flagged";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export type EscrowStatus = "held" | "released" | "refunded";

export interface BookingExtra {
  name: string;
  price: number;
}

export interface Booking {
  id: string;
  ref: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  workerId?: string;
  workerName?: string;
  workerPhone?: string;
  serviceType: string;
  status: BookingStatus;
  scheduledDate: string;
  address: string;
  zone: string;
  totalPrice: number;
  basePrice?: number;
  surcharge?: number;
  commission?: number;
  extras: BookingExtra[];
  notes?: string;
  femaleCleaner: boolean;
  cancellationReason?: string;
  chatTranscript?: ChatMessage[];
  createdAt: string;
  updatedAt?: string;
}

export interface ChatMessage {
  sender: "customer" | "worker" | "system";
  message: string;
  timestamp: string;
}

export interface Worker {
  id: string;
  name: string;
  phone: string;
  email?: string;
  zone: string;
  status: WorkerStatus;
  availability: boolean;
  rating: number;
  totalJobs: number;
  completionRate?: number;
  vetted: boolean;
  gender: "male" | "female";
  nin?: string;
  ninPhotoUrl?: string;
  policeCertUrl?: string;
  services: string[];
  fcmToken?: string;
  lastActive?: string;
  earningsThisMonth?: number;
  createdAt: string;
  vettingRejectionReason?: string;
}

export interface WorkerReview {
  id: string;
  workerId: string;
  customerId: string;
  customerName: string;
  bookingRef: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface WorkerAvailability {
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
  startTime?: string;
  endTime?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  zone: string;
  femalePref: boolean;
  totalBookings: number;
  lastBookingDate?: string;
  createdAt: string;
}

export interface DashboardStats {
  totalBookings: number;
  pendingBookings: number;
  activeBookings: number;
  completedToday: number;
  totalWorkers: number;
  activeWorkers: number;
  pendingVetting: number;
  totalRevenue: number;
  todayRevenue: number;
  avgRating: number;
}

export interface BookingChartData {
  date: string;
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
}

export interface RevenueChartData {
  date: string;
  revenue: number;
}

export interface Zone {
  id: string;
  name: string;
  nameHausa?: string;
  lat: number;
  lng: number;
  lga: string;
  serviceable: boolean;
  workerCount: number;
  bookingCount: number;
  surcharge: number;
}

export interface Payment {
  id: string;
  bookingId: string;
  bookingRef?: string;
  customerName?: string;
  amount: number;
  status: PaymentStatus;
  paystackRef?: string;
  createdAt: string;
}

export interface EscrowRecord {
  id: string;
  bookingId: string;
  bookingRef?: string;
  customerName?: string;
  amount: number;
  status: EscrowStatus;
  heldAt: string;
  releasedAt?: string;
  releaseAfter?: string;
}

export interface PaymentStats {
  totalProcessed: number;
  inEscrow: number;
  releasedToday: number;
  refundedThisMonth: number;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  target: "all_customers" | "all_workers" | "zone" | "specific_user";
  targetZone?: string;
  targetUserId?: string;
  sentCount: number;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BookingFilters {
  status?: BookingStatus | "";
  serviceType?: string;
  zone?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface WorkerFilters {
  status?: WorkerStatus | "";
  zone?: string;
  serviceType?: string;
  availability?: boolean | "";
  minRating?: number;
  page?: number;
  limit?: number;
}

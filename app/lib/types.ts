// Shapes returned by the e-Tekisi backend. Keep in sync with the backend's
// dto/api package (BookingDto, DriverDto, CommuterDto, ApiRecords).

export type Role = "COMMUTER" | "DRIVER" | "OPERATOR" | "ADMIN";
export type BookingStatus = "PENDING" | "OFFERED" | "ACCEPTED" | "COMPLETED" | "CANCELLED";
export type LatLng = [number, number];

export interface Booking {
  id: number;
  commuterId: number;
  driverId: number | null;
  pickupLocation: string;
  destination: string;
  scheduledTime: string | null;
  fare: number | null;
  tip: number | null;
  status: BookingStatus;
  /** While OFFERED: when the driver's offer lapses (ISO-8601). */
  offerExpiresAt: string | null;
  // Shared only with the booking's participants: names and plate once a driver
  // makes an offer, phone numbers once the commuter accepts it.
  driverName: string | null;
  driverPhone: string | null;
  taxiPlate: string | null;
  commuterName: string | null;
  commuterPhone: string | null;
}

export interface CreateBookingResponse {
  status: string;
  bookingId: number;
  booking: Booking;
  message: string;
}

export interface TripCompletedResponse {
  status: string;
  booking: Booking;
  earned: number;
}

export interface Commuter {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
}

export interface Driver {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  taxiPlate: string;
  licenseNumber: string;
  balance: number;
  tripsCompleted: number;
  active: boolean;
}

export interface Wallet {
  balance: number;
  totalTrips: number;
}

export interface Earnings {
  totalEarnings: number;
  tripCount: number;
  availableBalance: number;
  history: Booking[];
}

export type PayoutMethod = "BANK_TRANSFER" | "FNB_EWALLET" | "CAPITEC_CASH_SEND";

export interface Payout {
  id: number;
  amount: number;
  method: PayoutMethod;
  bankName: string | null;
  accountNumberMasked: string | null;
  accountHolder: string | null;
  phoneNumberMasked: string | null;
  status: PayoutStatus;
  createdAt: string | null;
  processedAt: string | null;
  rejectionReason: string | null;
}

export type PayoutStatus = "PENDING" | "APPROVED" | "PAID" | "REJECTED";

/** Payout with full details, from the staff-only /api/payouts endpoints. */
export interface PayoutOps {
  id: number;
  driverId: number;
  driverName: string | null;
  driverPhone: string | null;
  amount: number;
  method: PayoutMethod;
  bankName: string | null;
  accountNumber: string | null;
  accountHolder: string | null;
  phoneNumber: string | null;
  status: PayoutStatus;
  createdAt: string | null;
  processedAt: string | null;
  processedBy: number | null;
  reference: string | null;
  rejectionReason: string | null;
}

export interface Insight {
  id: number;
  type: string;
  code: string;
  severity: "INFO" | "WARN" | "CRITICAL";
  message: string;
  bookingId: number | null;
  driverId: number | null;
  commuterId: number | null;
  createdAt: string | null;
}

export interface AppNotification {
  id: number;
  message: string;
  read: boolean;
  createdAt: string | null;
}

export interface ChatMessage {
  id: number;
  bookingId: number;
  senderId: number;
  senderRole: Role | null;
  content: string;
  timestamp: string | null;
}

export type QueueStatus = "WAITING" | "SERVING" | "COMPLETED";

export interface QueueTicket {
  id: number;
  driverId: number;
  driverName: string;
  taxiRank: string;
  status: QueueStatus;
  skipCount: number;
  joinedAt: string | null;
  servedAt: string | null;
}

export interface TaxiRank {
  id: number;
  name: string;
  location: string | null;
  status: string | null;
}

export interface SavedRank {
  id: number;
  commuterId: number;
  name: string;
  address: string;
  createdAt: string | null;
}

export interface DriverLocation {
  driverId: number;
  lat: number | null;
  lng: number | null;
  lastUpdated: string | null;
}

export interface LoginResponse {
  status: "SUCCESS" | "FAIL";
  userId: number;
  role: Role;
  token: string;
  tokenType: string;
  expiresInSeconds: number;
  message?: string;
}

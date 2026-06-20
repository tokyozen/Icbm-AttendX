import type { Role, Gender, SessionStatus, VerificationStatus } from "@/generated/prisma/client";

export type { Role, Gender, SessionStatus, VerificationStatus };

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  location?: string | null;
  learningTrack?: string | null;
}

export interface StudentRecord {
  id: string;
  applicationId: string;
  fullName: string;
  gender: Gender;
  trainingLocation: string;
  learningTrack: string;
  email?: string | null;
  phoneNumber?: string | null;
  isActive: boolean;
}

export interface SessionRecord {
  id: string;
  sessionName: string;
  sessionCode: string;
  location: string;
  learningTrack: string;
  instructorId: string;
  qrToken: string;
  startedAt: Date;
  expiresAt: Date;
  endedAt?: Date | null;
  status: SessionStatus;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  applicationId: string;
  fullName: string;
  gender: string;
  trainingLocation: string;
  learningTrack: string;
  checkInTime: Date;
  deviceType?: string | null;
  browser?: string | null;
  ipAddress?: string | null;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'FLAGGED';
  verifiedAt?: Date | null;
  verifiedBy?: string | null;
}

export interface CheckInPayload {
  qrToken: string;
  applicationId: string;
  deviceType?: string;
  browser?: string;
  ipAddress?: string;
}

export interface ApiResponse<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export const LEARNING_TRACKS = [
  "Cybersecurity",
  "Software Development",
  "AI & Machine Learning",
  "Business Process & Outsourcing (BPO)",
  "Project Management",
] as const;

export const TRAINING_LOCATIONS = [
  "Abuja",
  "Enugu",
  "Both Campuses",
] as const;

export type LearningTrack = (typeof LEARNING_TRACKS)[number];
export type TrainingLocation = (typeof TRAINING_LOCATIONS)[number];

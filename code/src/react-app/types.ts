import type { MochaUser } from "@getmocha/users-service/shared";

export interface Reader {
  id: number;
  name: string;
  email: string;
  phone: string;
  address?: string;
  birth_date?: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface Mass {
  id: number;
  mass_date: string;
  mass_time: string;
  mass_type: string;
  first_reading: string | null;
  psalm: string | null;
  second_reading: string | null;
  gospel: string | null;
  has_second_reading: number;
  has_commentator: number;
  has_notes: number;
  notes: string | null;
  first_reader_id: number | null;
  second_reader_id: number | null;
  psalm_reader_id: number | null;
  commentator_reader_id: number | null;
  first_reader_custom: string | null;
  second_reader_custom: string | null;
  psalm_reader_custom: string | null;
  commentator_reader_custom: string | null;
  created_at: string;
  updated_at: string;
}

export interface SpecialCelebrationRole {
  id: number;
  celebration_id: number;
  role_name: string;
  reader_id: number | null;
  custom_reader_name: string | null;
  role_order: number;
  created_at: string;
  updated_at: string;
}

export interface SpecialCelebration {
  id: number;
  name: string;
  celebration_date: string;
  celebration_time: string;
  description: string | null;
  roles?: SpecialCelebrationRole[];
  created_at: string;
  updated_at: string;
}

export interface UserWithRole extends MochaUser {
  role: "admin" | "user";
}

export type CelebrationRole = SpecialCelebrationRole;

export interface ReaderAvailability {
  id: number;
  reader_id: number;
  day_of_week: number; // 0 = Sunday, 6 = Saturday
  mass_time: string;
  created_at: string;
  updated_at: string;
  reader_name?: string;
  is_active?: number;
}

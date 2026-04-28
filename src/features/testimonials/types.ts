export type TestimonialStatus = 'pending' | 'approved' | 'rejected';

export interface ApprovedTestimonial {
  id: string;
  rating: number;
  quote: string;
  approvedAt: string | null;
  member: {
    id: string;
    name: string | null;
    organicId: number | null;
    avatarUrl: string | null;
  };
}

export interface PendingTestimonial extends ApprovedTestimonial {
  createdAt: string;
}

export interface SubmitTestimonialInput {
  rating: number;
  quote: string;
}

export interface SubmitTestimonialResult {
  ok: boolean;
  error?: string;
}

export interface UpdateMeInput {
  fullName: string;
}

export interface License {
  plan: string;
  status: "active" | "expired";
  allowance: number;
  used: number;
  remaining: number;
  limitReached: boolean;
  validUntil: string;
}

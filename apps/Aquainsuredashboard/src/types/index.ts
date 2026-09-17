// ─── Data model types matching MongoDB schemas & SeaweedFS MediaObjects ─────

export interface MediaObject {
  key?: string;
  bucket?: string;
  url: string;
  mimeType?: string;
  size?: number;
  uploadedAt?: string;
}

export interface Farmer {
  _id: string;
  name: string;
  fatherName: string;
  phone: string;
  gender?: 'male' | 'female' | 'other';
  isScSt?: boolean;
  dob?: string;
  community?: string;
  address: {
    village: string;
    taluk: string;
    district: string;
    state: string;
    pinCode: string;
  };
  registration?: {
    regType?: 'caa' | 'mpeda' | 'dof';
    regNumber?: string;
    regCertificate?: MediaObject | string | null;
  };
  identity?: {
    aadharNumber?: string;
    aadharFile?: MediaObject | string | null;
    hasPan?: boolean;
    panNumber?: string;
    panFile?: MediaObject | string | null;
    photo?: MediaObject | string | null;
  };
  bankDetails?: {
    accountHolderName?: string;
    bankName?: string;
    branch?: string;
    accountType?: 'savings' | 'current';
    accountNumber?: string;
    ifscCode?: string;
  };
  pondCount?: number;
  insuranceCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Farm {
  _id: string;
  name?: string;
  farmerId: string | Farmer;
  location: { place: string; taluk: string; district: string };
  latitude?: number;
  longitude?: number;
  ownership: { type: 'owned' | 'leased'; patta: string };
  totalPonds: number;
  farmPhoto?: MediaObject | string | null;
  infrastructure?: Record<string, boolean>;
  createdAt: string;
}

export interface Pond {
  _id: string;
  farmId: string;
  farmerId: string | { _id: string; name: string };
  pondNumber: number;
  name: string;
  dimensionAcres?: number;
  photo?: MediaObject | string | null;
  address?: {
    village?: string;
    taluk?: string;
    district?: string;
    state?: string;
    pinCode?: string;
  };
  createdAt: string;
}

export interface InsuranceClaim {
  claimedAt?: string;
  reason?: 'disease_outbreak' | 'mass_mortality' | 'flooding_calamity' | 'water_toxicity' | 'other' | string;
  description?: string;
  estimatedLossPercent?: number;
  evidencePhoto?: MediaObject | string | null;
  status?: 'pending' | 'under_review' | 'approved' | 'rejected';
  reviewedAt?: string;
  reviewerNotes?: string;
  settlementAmount?: number;
}

export interface Insurance {
  _id: string;
  pondId: string | Pond;
  farmerId: string | Farmer;
  farmId: string | Farm;
  stockingDate: string;
  stockingDensity: number;
  species: 'vannamei' | 'tiger' | string;
  insuranceType: 'basic' | 'comprehensive' | string;
  insurancePeriodDays: number;
  plannedHarvestDate?: string;
  maxHarvestDate?: string;
  status: 'active' | 'expired' | 'claim_pending' | 'claim_approved' | 'claim_rejected' | 'claimed';
  claim?: InsuranceClaim;
  createdAt: string;
}

export interface DailyEntry {
  _id: string;
  pondId: string | Pond;
  dayNumber: number;
  date: string;
  farmerName?: string;
  farmerPhone?: string;
  sampling?: {
    survival?: number;
    biomass?: number;
    proportionateGrowth?: boolean;
  };
  feedManagement?: {
    feedQuantity?: number;
    feedCost?: number;
    feedBills?: MediaObject | string | null;
  };
  financials?: {
    labourCost?: number;
    otherExpenses?: number;
    waterCost?: number;
    miscBills?: MediaObject | string | null;
    electricityBills?: MediaObject | string | null;
  };
  waterQuality?: {
    do?: number;
    ph?: number;
    temperature?: number;
    ammonia?: number;
    hardness?: number;
    alkalinity?: number;
    waterReport?: MediaObject | string | null;
  };
  shrimpHealth?: {
    status?: 'normal' | 'deficiency';
    measures?: string;
    shrimpPhoto?: MediaObject | string | null;
    labReport?: MediaObject | string | null;
  };
  productionEstimation?: {
    expectedCop?: number;
    expectedProduction?: number;
    expectedAbw?: number;
  };
  createdAt: string;
}

export interface OneTimeEntry {
  _id: string;
  pondId: string | Pond;
  farmerId?: string;
  farmId?: string;
  date?: string;
  stage?: string;
  pondPreparation?: {
    bleachingKg?: number;
    limingKg?: number;
    pondPrepBills?: MediaObject | string | null;
  };
  seedSelection?: {
    hatcheryName?: string;
    seedCount?: number;
    pcrCertificate?: MediaObject | string | null;
    seedBills?: MediaObject | string | null;
  };
  createdAt: string;
}

export interface FarmerDetailData extends Farmer {
  farms: Farm[];
  ponds: Pond[];
  insurances: Insurance[];
}

export interface ImageItem {
  _id: string;
  label: string;
  sublabel: string;
  image: string;
  timestamp: string;
  source: string;
  meta?: Record<string, string>;
}

export interface DashboardStats {
  totalFarmers: number;
  totalFarms: number;
  totalPonds: number;
  totalInsurances: number;
  activeInsurances: number;
  expiredInsurances: number;
  claimedInsurances: number;
  pendingClaims?: number;
  totalDailyEntries: number;
  totalOneTimeEntries: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  pagination?: Pagination;
  error?: string;
}

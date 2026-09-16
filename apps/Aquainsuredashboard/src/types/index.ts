// ─── Data model types matching MongoDB schemas ─────────────────────────────

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
  };
  identity?: {
    aadharNumber?: string;
    hasPan?: boolean;
    panNumber?: string;
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
  farmerId: string | Farmer;
  location: { place: string; taluk: string; district: string };
  latitude?: number;
  longitude?: number;
  ownership: { type: 'owned' | 'leased'; patta: string };
  totalPonds: number;
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
  address?: {
    village?: string;
    taluk?: string;
    district?: string;
    state?: string;
    pinCode?: string;
  };
  createdAt: string;
}

export interface Insurance {
  _id: string;
  pondId: string;
  farmerId: string;
  farmId: string;
  stockingDate: string;
  stockingDensity: number;
  species: 'vannamei' | 'tiger';
  insuranceType: 'basic' | 'comprehensive';
  insurancePeriodDays: number;
  plannedHarvestDate?: string;
  maxHarvestDate?: string;
  status: 'active' | 'expired' | 'claimed';
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
  };
  financials?: {
    labourCost?: number;
    otherExpenses?: number;
    waterCost?: number;
  };
  waterQuality?: {
    do?: number;
    ph?: number;
    temperature?: number;
    ammonia?: number;
    hardness?: number;
    alkalinity?: number;
  };
  shrimpHealth?: {
    status?: 'normal' | 'deficiency';
    measures?: string;
  };
  productionEstimation?: {
    expectedCop?: number;
    expectedProduction?: number;
    expectedAbw?: number;
  };
  createdAt: string;
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

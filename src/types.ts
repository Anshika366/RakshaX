export interface Step {
  number: number;
  title: string;
  description: string;
  details: string[];
}

export interface Feature {
  id: string;
  title: string;
  description: string;
  category: 'core' | 'communication' | 'detection' | 'profile' | 'accessibility';
  iconName: string;
  badge?: string;
}

export interface Scenario {
  id: string;
  title: string;
  emoji: string;
  group: 'daily' | 'crisis' | 'travel';
  challenge: string;
  safeguardAction: string;
  resolution: string;
  illustrationType: 'night_walk' | 'traveler' | 'senior' | 'family' | 'accident' | 'medical';
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface BiometricSettings {
  shake3TimesEnabled: boolean;
  voiceBiometricEnabled: boolean;
  voiceKeyword: string;
  voiceModelRegistered: boolean;
}

export interface SafetyProfile {
  fullName: string;
  photoUrl?: string;
  gender: string;
  dateOfBirth: string;
  bloodGroup: string;
  medicalConditions: string;
  allergies: string;
  currentMedications: string;
  address: string;
  city: string;
  state: string;
  country: string;
  emergencyNotes: string;
  doctorName?: string;
  doctorNumber?: string;
  safetyPin?: string;
  biometrics?: BiometricSettings;
}

export interface EmergencyContact {
  id: string;
  photoUrl?: string;
  name: string;
  relationship: string;
  phoneNumber: string;
  whatsAppNumber: string;
  email: string;
  priority: 'High' | 'Medium' | 'Low';
  isPrimary: boolean;
  isSecondary: boolean;
  isFavorite: boolean;
  alertChannels?: {
    sms: boolean;
    whatsapp: boolean;
    call: boolean;
    email: boolean;
  };
}

export interface IncidentHistory {
  id: string;
  date: string;
  time: string;
  duration: string;
  location: string;
  coordinates: string;
  status: 'Resolved' | 'Cancelled' | 'Active';
}

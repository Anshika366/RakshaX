import { SafetyProfile, EmergencyContact, IncidentHistory } from '../types';

export interface UserAccount {
  email: string;
  passwordHash: string; // stored simple password
  fullName: string;
  profile: SafetyProfile;
  contacts: EmergencyContact[];
  incidents: IncidentHistory[];
}

const DEFAULT_PROFILE: SafetyProfile = {
  fullName: 'Anshika Pathak',
  gender: 'Female',
  dateOfBirth: '2000-08-20',
  bloodGroup: 'B+',
  medicalConditions: 'None',
  allergies: 'None',
  currentMedications: 'None',
  address: 'Viman Nagar / Dhanori Road',
  city: 'Pune',
  state: 'Maharashtra',
  country: 'India',
  emergencyNotes: 'Alert emergency guardians immediately upon SOS trigger. Track live coordinates.',
  doctorName: 'Dr. Joshi',
  doctorNumber: '+91 98765 43210'
};

const DEFAULT_CONTACTS: EmergencyContact[] = [
  {
    id: 'c1',
    name: 'Suresh Pathak (Family)',
    relationship: 'Family',
    phoneNumber: '+91 98765 00112',
    whatsAppNumber: '+91 98765 00112',
    email: 'family@safeguard.io',
    priority: 'High',
    isPrimary: true,
    isSecondary: false,
    isFavorite: true,
    alertChannels: { sms: true, whatsapp: true, call: true, email: true }
  },
  {
    id: 'c2',
    name: 'Pooja Sharma (Guardian)',
    relationship: 'Guardian',
    phoneNumber: '+91 98765 00113',
    whatsAppNumber: '+91 98765 00113',
    email: 'guardian@safeguard.io',
    priority: 'High',
    isPrimary: false,
    isSecondary: true,
    isFavorite: true,
    alertChannels: { sms: true, whatsapp: true, call: true, email: false }
  },
  {
    id: 'c3',
    name: 'Dr. Sameer Roy (Neighbor)',
    relationship: 'Neighbor',
    phoneNumber: '+91 98765 00114',
    whatsAppNumber: '+91 98765 00114',
    email: 'sameer@safeguard.io',
    priority: 'Medium',
    isPrimary: false,
    isSecondary: false,
    isFavorite: false,
    alertChannels: { sms: true, whatsapp: false, call: true, email: false }
  }
];

const DEFAULT_INCIDENTS: IncidentHistory[] = [
  {
    id: 'INC-2026-PUN-01',
    date: '2026-06-12',
    time: '09:45 PM',
    duration: '4 mins',
    location: 'Viman Nagar, Pune, Maharashtra',
    coordinates: '18.5679° N, 73.9143° E',
    status: 'Resolved',
  },
  {
    id: 'INC-2026-PUN-02',
    date: '2026-05-30',
    time: '08:12 AM',
    duration: '12 mins',
    location: 'Dhanori, Pune, Maharashtra',
    coordinates: '18.6027° N, 73.9366° E',
    status: 'Resolved',
  }
];

export function initUserDB(): void {
  if (typeof window === 'undefined') return;
  const raw = localStorage.getItem('safeguard_users');
  // Check if existing users contain obsolete New Delhi data
  const isStale = raw && (raw.includes('New Delhi') || raw.includes('Green Park'));
  if (!raw || isStale) {
    const initialUsers: UserAccount[] = [
      {
        email: 'anshikapathak25@navgurukul.org',
        passwordHash: 'password123',
        fullName: 'Anshika Pathak',
        profile: DEFAULT_PROFILE,
        contacts: DEFAULT_CONTACTS,
        incidents: DEFAULT_INCIDENTS
      },
      {
        email: 'anshika@safeguard.io',
        passwordHash: 'password123',
        fullName: 'Anshika Pathak',
        profile: DEFAULT_PROFILE,
        contacts: DEFAULT_CONTACTS,
        incidents: DEFAULT_INCIDENTS
      }
    ];
    localStorage.setItem('safeguard_users', JSON.stringify(initialUsers));
  }
}

export function getAllUsers(): UserAccount[] {
  initUserDB();
  const raw = localStorage.getItem('safeguard_users');
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function saveAllUsers(users: UserAccount[]): void {
  localStorage.setItem('safeguard_users', JSON.stringify(users));
}

export function signUpUser(email: string, passwordHash: string, fullName: string): UserAccount {
  const users = getAllUsers();
  const normalizedEmail = email.toLowerCase().trim();
  
  if (users.some(u => u.email === normalizedEmail)) {
    throw new Error('An account with this email already exists.');
  }

  const newProfile: SafetyProfile = {
    fullName,
    gender: 'Female',
    dateOfBirth: '2000-01-01',
    bloodGroup: 'O+',
    medicalConditions: '',
    allergies: '',
    currentMedications: '',
    address: '',
    city: '',
    state: '',
    country: '',
    emergencyNotes: ''
  };

  const newUser: UserAccount = {
    email: normalizedEmail,
    passwordHash,
    fullName,
    profile: newProfile,
    contacts: [],
    incidents: []
  };

  users.push(newUser);
  saveAllUsers(users);
  return newUser;
}

export function signInUser(email: string, passwordHash: string): UserAccount {
  const users = getAllUsers();
  const normalizedEmail = email.toLowerCase().trim();
  
  const user = users.find(u => u.email === normalizedEmail);
  if (!user) {
    throw new Error('Account not found with this email.');
  }

  if (user.passwordHash !== passwordHash) {
    throw new Error('Incorrect password. Please try again.');
  }

  return user;
}

export function updateUserProfile(email: string, profile: SafetyProfile): void {
  const users = getAllUsers();
  const normalizedEmail = email.toLowerCase().trim();
  const index = users.findIndex(u => u.email === normalizedEmail);
  if (index !== -1) {
    users[index].profile = profile;
    users[index].fullName = profile.fullName;
    saveAllUsers(users);
  }
}

export function updateUserContacts(email: string, contacts: EmergencyContact[]): void {
  const users = getAllUsers();
  const normalizedEmail = email.toLowerCase().trim();
  const index = users.findIndex(u => u.email === normalizedEmail);
  if (index !== -1) {
    users[index].contacts = contacts;
    saveAllUsers(users);
  }
}

export function updateUserIncidents(email: string, incidents: IncidentHistory[]): void {
  const users = getAllUsers();
  const normalizedEmail = email.toLowerCase().trim();
  const index = users.findIndex(u => u.email === normalizedEmail);
  if (index !== -1) {
    users[index].incidents = incidents;
    saveAllUsers(users);
  }
}

export function getCurrentUserAccount(email: string): UserAccount | null {
  const users = getAllUsers();
  const normalizedEmail = email.toLowerCase().trim();
  return users.find(u => u.email === normalizedEmail) || null;
}

export function deleteUserAccount(email: string): void {
  const users = getAllUsers();
  const normalizedEmail = email.toLowerCase().trim();
  const updated = users.filter(u => u.email !== normalizedEmail);
  saveAllUsers(updated);
}

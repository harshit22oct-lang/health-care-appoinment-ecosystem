// ============================================================
// SEED — Comprehensive demo data seeder
// Run: npm run seed
// ============================================================
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const env = require('../config/env');
const logger = require('../utils/logger');

const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const Slot = require('../models/Slot');
const Appointment = require('../models/Appointment');
const NotificationJob = require('../models/NotificationJob');

const SALT_ROUNDS = 12;

// ── Seed Data ─────────────────────────────────────────────────
// ── Seed Data ─────────────────────────────────────────────────
// Exactly 12 Demo Bookable Doctors (2 per department across 6 departments)
const DEMO_DOCTORS = [
  // 1. CARDIOLOGY (2 Demo Doctors)
  {
    firstName: 'Priya', lastName: 'Sharma', email: 'dr.priya@healthsync.demo',
    specialization: 'Cardiology',
    qualifications: ['MBBS', 'MD - Medicine', 'DM - Cardiology (AIIMS)'],
    bio: 'Dr. Priya Sharma is a senior interventional cardiologist with 15 years of clinical practice. Specialises in coronary angioplasty, heart failure management, arrhythmia, and preventive cardiac wellness.',
    consultationFee: 800, slotDurationMinutes: 30, yearsOfExperience: 15,
    city: 'Bhopal', state: 'Madhya Pradesh',
    clinicAddress: 'Bansal Hospital Campus, Shahpura Lake Road, Bhopal',
    hospitalAffiliation: 'Bansal Hospital & Heart Institute',
    languages: ['English', 'Hindi'],
    averageRating: 4.9, totalReviews: 342,
    doctorType: 'DEMO', isBookable: true, isVerified: true,
    nextAvailableSlot: 'Today · 03:30 PM',
  },
  {
    firstName: 'Vikramaditya', lastName: 'Rathore', email: 'dr.vikramaditya@healthsync.demo',
    specialization: 'Cardiology',
    qualifications: ['MBBS', 'MD - Cardiology', 'FACC (USA)'],
    bio: 'Dr. Vikramaditya Rathore is a chief cardiologist with 18 years of experience in structural heart disease, cardiac imaging, hypertension, and post-bypass rehabilitation.',
    consultationFee: 950, slotDurationMinutes: 30, yearsOfExperience: 18,
    city: 'Bengaluru', state: 'Karnataka',
    clinicAddress: 'Bannerghatta Main Road, Bengaluru',
    hospitalAffiliation: 'Apollo Heart Center, Bengaluru',
    languages: ['English', 'Hindi', 'Kannada'],
    averageRating: 4.95, totalReviews: 418,
    doctorType: 'DEMO', isBookable: true, isVerified: true,
    nextAvailableSlot: 'Today · 04:00 PM',
  },

  // 2. NEUROLOGY (2 Demo Doctors)
  {
    firstName: 'Arjun', lastName: 'Mehta', email: 'dr.arjun@healthsync.demo',
    specialization: 'Neurology',
    qualifications: ['MBBS', 'MD - General Medicine', 'DM - Neurology'],
    bio: 'Dr. Arjun Mehta is a consultant neurologist specializing in chronic migraine management, stroke recovery, epilepsy care, and peripheral neuropathy.',
    consultationFee: 1000, slotDurationMinutes: 30, yearsOfExperience: 12,
    city: 'Bhopal', state: 'Madhya Pradesh',
    clinicAddress: 'Chirayu Hospital Complex, Bairagarh Bypass, Bhopal',
    hospitalAffiliation: 'Chirayu Medical College & Hospital',
    languages: ['English', 'Hindi'],
    averageRating: 4.8, totalReviews: 215,
    doctorType: 'DEMO', isBookable: true, isVerified: true,
    nextAvailableSlot: 'Tomorrow · 10:30 AM',
  },
  {
    firstName: 'Nandini', lastName: 'Sen', email: 'dr.nandini@healthsync.demo',
    specialization: 'Neurology',
    qualifications: ['MBBS', 'DM - Neurology', 'Fellowship in Movement Disorders'],
    bio: 'Dr. Nandini Sen is a senior neurologist with expertise in Parkinson\'s disease, memory disorders, vertigo, and multiple sclerosis with over 14 years of clinical experience.',
    consultationFee: 1100, slotDurationMinutes: 30, yearsOfExperience: 14,
    city: 'Mumbai', state: 'Maharashtra',
    clinicAddress: 'Dr. E Moses Road, Worli, Mumbai',
    hospitalAffiliation: 'Fortis Neurosciences Institute, Mumbai',
    languages: ['English', 'Hindi', 'Marathi', 'Bengali'],
    averageRating: 4.88, totalReviews: 290,
    doctorType: 'DEMO', isBookable: true, isVerified: true,
    nextAvailableSlot: 'Today · 05:00 PM',
  },

  // 3. DERMATOLOGY (2 Demo Doctors)
  {
    firstName: 'Ananya', lastName: 'Krishnan', email: 'dr.ananya@healthsync.demo',
    specialization: 'Dermatology',
    qualifications: ['MBBS', 'MD - Dermatology & Venereology'],
    bio: 'Dr. Ananya Krishnan is a board-certified dermatologist specializing in clinical eczema, psoriasis, acne scar reduction, pediatric dermatology, and medical laser treatments.',
    consultationFee: 600, slotDurationMinutes: 20, yearsOfExperience: 10,
    city: 'Bhopal', state: 'Madhya Pradesh',
    clinicAddress: 'Plot 12, Zone-II, MP Nagar, Bhopal',
    hospitalAffiliation: 'Apollo Skin & Laser Clinic',
    languages: ['English', 'Hindi'],
    averageRating: 4.75, totalReviews: 480,
    doctorType: 'DEMO', isBookable: true, isVerified: true,
    nextAvailableSlot: 'Today · 02:00 PM',
  },
  {
    firstName: 'Rohan', lastName: 'Kapoor', email: 'dr.rohan.derma@healthsync.demo',
    specialization: 'Dermatology',
    qualifications: ['MBBS', 'DVD', 'MD - Dermatology (PGI Chandigarh)'],
    bio: 'Dr. Rohan Kapoor is an experienced skin specialist with 11 years of experience in advanced trichology, hair restoration, autoimmune dermatoses, and anti-aging therapies.',
    consultationFee: 750, slotDurationMinutes: 20, yearsOfExperience: 11,
    city: 'Delhi', state: 'Delhi NCR',
    clinicAddress: 'Press Enclave Road, Saket, New Delhi',
    hospitalAffiliation: 'Max Skin & Laser Center, Delhi',
    languages: ['English', 'Hindi', 'Punjabi'],
    averageRating: 4.82, totalReviews: 360,
    doctorType: 'DEMO', isBookable: true, isVerified: true,
    nextAvailableSlot: 'Today · 03:00 PM',
  },

  // 4. ORTHOPAEDICS (2 Demo Doctors)
  {
    firstName: 'Rahul', lastName: 'Gupta', email: 'dr.rahul@healthsync.demo',
    specialization: 'Orthopaedics',
    qualifications: ['MBBS', 'MS - Orthopaedics', 'M.Ch - Ortho (UK)'],
    bio: 'Dr. Rahul Gupta is an orthopaedic and joint replacement surgeon with 18 years of experience. Specialises in robotic knee replacement, arthroscopic ligament repair, and sports injury trauma.',
    consultationFee: 700, slotDurationMinutes: 30, yearsOfExperience: 18,
    city: 'Bhopal', state: 'Madhya Pradesh',
    clinicAddress: 'E-5 Arera Colony, Link Road 3, Bhopal',
    hospitalAffiliation: 'Narmada Trauma & Joint Institute',
    languages: ['English', 'Hindi'],
    averageRating: 4.9, totalReviews: 310,
    doctorType: 'DEMO', isBookable: true, isVerified: true,
    nextAvailableSlot: 'Today · 04:30 PM',
  },
  {
    firstName: 'Shweta', lastName: 'Joshi', email: 'dr.shweta@healthsync.demo',
    specialization: 'Orthopaedics',
    qualifications: ['MBBS', 'MS - Orthopaedics', 'Fellowship in Spine Surgery'],
    bio: 'Dr. Shweta Joshi is a leading spine and joint surgeon with 15 years of expertise in minimally invasive spine decompression, sciatica treatment, and shoulder arthroscopy.',
    consultationFee: 850, slotDurationMinutes: 30, yearsOfExperience: 15,
    city: 'Pune', state: 'Maharashtra',
    clinicAddress: 'Kalyani Nagar, Pune',
    hospitalAffiliation: 'Manipal Joint Institute, Pune',
    languages: ['English', 'Hindi', 'Marathi'],
    averageRating: 4.85, totalReviews: 245,
    doctorType: 'DEMO', isBookable: true, isVerified: true,
    nextAvailableSlot: 'Tomorrow · 11:00 AM',
  },

  // 5. PAEDIATRICS (2 Demo Doctors)
  {
    firstName: 'Meera', lastName: 'Nair', email: 'dr.meera@healthsync.demo',
    specialization: 'Paediatrics',
    qualifications: ['MBBS', 'MD - Paediatrics', 'DCH (London)'],
    bio: 'Dr. Meera Nair is a gentle and attentive child specialist with 8 years of experience. Expertise in newborn immunization, developmental milestones, pediatric asthma, and infectious illnesses.',
    consultationFee: 500, slotDurationMinutes: 20, yearsOfExperience: 8,
    city: 'Bhopal', state: 'Madhya Pradesh',
    clinicAddress: 'Bittan Market Commercial Complex, E-4, Bhopal',
    hospitalAffiliation: 'Mother & Child Care Polyclinic',
    languages: ['English', 'Hindi', 'Malayalam'],
    averageRating: 4.88, totalReviews: 530,
    doctorType: 'DEMO', isBookable: true, isVerified: true,
    nextAvailableSlot: 'Today · 01:30 PM',
  },
  {
    firstName: 'Siddharth', lastName: 'Verma', email: 'dr.siddharth@healthsync.demo',
    specialization: 'Paediatrics',
    qualifications: ['MBBS', 'MD - Paediatrics', 'Fellowship in Neonatology'],
    bio: 'Dr. Siddharth Verma is a consultant pediatrician and neonatologist with 13 years of experience managing acute pediatric allergies, neonatal jaundice, and childhood nutrition.',
    consultationFee: 650, slotDurationMinutes: 20, yearsOfExperience: 13,
    city: 'Hyderabad', state: 'Telangana',
    clinicAddress: 'Road No. 2, Banjara Hills, Hyderabad',
    hospitalAffiliation: 'Rainbow Children\'s Hospital, Hyderabad',
    languages: ['English', 'Hindi', 'Telugu'],
    averageRating: 4.92, totalReviews: 380,
    doctorType: 'DEMO', isBookable: true, isVerified: true,
    nextAvailableSlot: 'Today · 03:00 PM',
  },

  // 6. GENERAL MEDICINE (2 Demo Doctors)
  {
    firstName: 'Vikram', lastName: 'Patel', email: 'dr.vikram@healthsync.demo',
    specialization: 'General Medicine',
    qualifications: ['MBBS', 'MD - Internal Medicine'],
    bio: 'Dr. Vikram Patel is a senior consulting physician with 10 years of clinical experience. Specialises in chronic diabetes management, hypertension, thyroid disorders, and seasonal viral fever management.',
    consultationFee: 400, slotDurationMinutes: 20, yearsOfExperience: 10,
    city: 'Bhopal', state: 'Madhya Pradesh',
    clinicAddress: 'Top Floor, City Center, New Market, Bhopal',
    hospitalAffiliation: 'City Care Polyclinic & Diagnostic Center',
    languages: ['English', 'Hindi'],
    averageRating: 4.7, totalReviews: 640,
    doctorType: 'DEMO', isBookable: true, isVerified: true,
    nextAvailableSlot: 'Today · 02:30 PM',
  },
  {
    firstName: 'Sunita', lastName: 'Kulkarni', email: 'dr.sunita@healthsync.demo',
    specialization: 'General Medicine',
    qualifications: ['MBBS', 'MD - General Medicine', 'FRCP (Edin)'],
    bio: 'Dr. Sunita Kulkarni is an internist with 16 years of clinical practice focusing on geriatric medicine, metabolic health, lifestyle illness reversal, and comprehensive annual health evaluations.',
    consultationFee: 550, slotDurationMinutes: 20, yearsOfExperience: 16,
    city: 'Chennai', state: 'Tamil Nadu',
    clinicAddress: 'Anna Salai, Teynampet, Chennai',
    hospitalAffiliation: 'Columbia Asia Hospital, Chennai',
    languages: ['English', 'Hindi', 'Tamil'],
    averageRating: 4.86, totalReviews: 410,
    doctorType: 'DEMO', isBookable: true, isVerified: true,
    nextAvailableSlot: 'Today · 04:00 PM',
  },
];

// Exactly 6 Reference Profiles (Public Directory Doctors · Non-Bookable)
const REFERENCE_DOCTORS = [
  {
    firstName: 'Naresh', lastName: 'Trehan', email: 'ref.dr.trehan@publicdir.healthsync',
    specialization: 'Cardiology',
    qualifications: ['MBBS', 'Surgeon - Cardiothoracic', 'Padma Bhushan', 'Padma Shri'],
    bio: 'Chief Cardiovascular & Cardiothoracic Surgeon. Founder of Medanta The Medicity. Performed over 48,000 successful open heart surgeries.',
    consultationFee: 2500, slotDurationMinutes: 30, yearsOfExperience: 40,
    city: 'Delhi', state: 'Delhi NCR',
    clinicAddress: 'Sector 38, Gurugram, Delhi NCR',
    hospitalAffiliation: 'Medanta - The Medicity',
    languages: ['English', 'Hindi', 'Punjabi'],
    averageRating: 4.98, totalReviews: 1250,
    doctorType: 'REFERENCE', isBookable: false, isVerified: true,
    referenceNote: 'REFERENCE PROFILE · Sourced Public Directory · Not bookable on HealthSync',
    nextAvailableSlot: 'Not available on HealthSync',
  },
  {
    firstName: 'P.', lastName: 'Satishchandra', email: 'ref.dr.satishchandra@publicdir.healthsync',
    specialization: 'Neurology',
    qualifications: ['MBBS', 'DM - Neurology', 'Former Director NIMHANS'],
    bio: 'Renowned Senior Professor and Consultant Neurologist. Leading authority on complex clinical epilepsy, encephalopathy, and neuro-infectious conditions.',
    consultationFee: 2000, slotDurationMinutes: 45, yearsOfExperience: 38,
    city: 'Bengaluru', state: 'Karnataka',
    clinicAddress: 'Hosur Road, Bengaluru',
    hospitalAffiliation: 'NIMHANS & Apollo Hospitals Bengaluru',
    languages: ['English', 'Kannada', 'Hindi'],
    averageRating: 4.95, totalReviews: 890,
    doctorType: 'REFERENCE', isBookable: false, isVerified: true,
    referenceNote: 'REFERENCE PROFILE · Sourced Public Directory · Not bookable on HealthSync',
    nextAvailableSlot: 'Not available on HealthSync',
  },
  {
    firstName: 'Hemanta', lastName: 'Kumar Kar', email: 'ref.dr.kar@publicdir.healthsync',
    specialization: 'Dermatology',
    qualifications: ['MBBS', 'MD - Dermatology', 'Ex-HOD RML Hospital New Delhi'],
    bio: 'Senior Consultant Dermatologist & Leprologist. Pioneer in vitiligo surgery, immunodermatology, and medical skin pathology in India.',
    consultationFee: 1500, slotDurationMinutes: 20, yearsOfExperience: 35,
    city: 'Delhi', state: 'Delhi NCR',
    clinicAddress: 'Ansari Nagar, New Delhi',
    hospitalAffiliation: 'AIIMS & Dr. RML Hospital New Delhi',
    languages: ['English', 'Hindi', 'Odia'],
    averageRating: 4.92, totalReviews: 760,
    doctorType: 'REFERENCE', isBookable: false, isVerified: true,
    referenceNote: 'REFERENCE PROFILE · Sourced Public Directory · Not bookable on HealthSync',
    nextAvailableSlot: 'Not available on HealthSync',
  },
  {
    firstName: 'Ashok', lastName: 'Rajgopal', email: 'ref.dr.rajgopal@publicdir.healthsync',
    specialization: 'Orthopaedics',
    qualifications: ['MBBS', 'MS - Orthopaedics', 'M.Ch - Ortho', 'Padma Shri'],
    bio: 'Chairman of Bone & Joint Institute. Internationally celebrated orthopaedic surgeon who has completed 30,000+ total knee replacement procedures.',
    consultationFee: 2200, slotDurationMinutes: 30, yearsOfExperience: 36,
    city: 'Delhi', state: 'Delhi NCR',
    clinicAddress: 'CH Bakhtawar Singh Road, Gurugram',
    hospitalAffiliation: 'Medanta Bone & Joint Institute',
    languages: ['English', 'Hindi'],
    averageRating: 4.96, totalReviews: 1100,
    doctorType: 'REFERENCE', isBookable: false, isVerified: true,
    referenceNote: 'REFERENCE PROFILE · Sourced Public Directory · Not bookable on HealthSync',
    nextAvailableSlot: 'Not available on HealthSync',
  },
  {
    firstName: 'Arvind', lastName: 'Bagga', email: 'ref.dr.bagga@publicdir.healthsync',
    specialization: 'Paediatrics',
    qualifications: ['MBBS', 'MD - Paediatrics', 'FAMS', 'FICP (AIIMS)'],
    bio: 'Professor & Head of Pediatric Nephrology at AIIMS New Delhi. Global expert on childhood nephrotic syndrome and pediatric renal disorders.',
    consultationFee: 1800, slotDurationMinutes: 30, yearsOfExperience: 32,
    city: 'Delhi', state: 'Delhi NCR',
    clinicAddress: 'Sri Aurobindo Marg, Ansari Nagar, New Delhi',
    hospitalAffiliation: 'AIIMS New Delhi',
    languages: ['English', 'Hindi'],
    averageRating: 4.94, totalReviews: 950,
    doctorType: 'REFERENCE', isBookable: false, isVerified: true,
    referenceNote: 'REFERENCE PROFILE · Sourced Public Directory · Not bookable on HealthSync',
    nextAvailableSlot: 'Not available on HealthSync',
  },
  {
    firstName: 'Randeep', lastName: 'Guleria', email: 'ref.dr.guleria@publicdir.healthsync',
    specialization: 'General Medicine',
    qualifications: ['MBBS', 'MD - General Medicine', 'DM - Pulmonary', 'Padma Shri', 'Former Director AIIMS'],
    bio: 'Eminent Senior Pulmonologist & Internal Medicine Expert. Former Director of AIIMS New Delhi and Chairman of the National COVID Task Force.',
    consultationFee: 2500, slotDurationMinutes: 30, yearsOfExperience: 35,
    city: 'Delhi', state: 'Delhi NCR',
    clinicAddress: 'Medanta The Medicity, Gurugram, Delhi NCR',
    hospitalAffiliation: 'Medanta & Former Director AIIMS',
    languages: ['English', 'Hindi'],
    averageRating: 4.99, totalReviews: 2100,
    doctorType: 'REFERENCE', isBookable: false, isVerified: true,
    referenceNote: 'REFERENCE PROFILE · Sourced Public Directory · Not bookable on HealthSync',
    nextAvailableSlot: 'Not available on HealthSync',
  },
];

const PATIENTS = [
  { firstName: 'Rohan', lastName: 'Verma', email: 'rohan@patient.demo', phone: '+91 98765 43210', dateOfBirth: new Date('1990-05-15'), bloodGroup: 'O+', allergies: ['Penicillin'] },
  { firstName: 'Sneha', lastName: 'Iyer', email: 'sneha@patient.demo', phone: '+91 87654 32109', dateOfBirth: new Date('1995-11-22'), bloodGroup: 'B+', allergies: [] },
  { firstName: 'Amit', lastName: 'Kumar', email: 'amit@patient.demo', phone: '+91 76543 21098', dateOfBirth: new Date('1985-03-08'), bloodGroup: 'A+', allergies: ['Sulfa drugs'] },
];

// ── Seed Functions ────────────────────────────────────────────
const hashPassword = async (pwd) => bcrypt.hash(pwd, SALT_ROUNDS);

const generateSlotsForDoctor = async (doctorUserId) => {
  const slotDuration = 30; // minutes
  const slots = [];

  // Generate slots for next 7 days
  for (let day = 0; day < 7; day++) {
    const date = new Date();
    date.setDate(date.getDate() + day);
    date.setHours(0, 0, 0, 0);

    const isWeekend = date.getDay() === 0; // Skip Sunday
    if (isWeekend) continue;

    // Morning block: 09:00 - 13:00 (8 slots)
    // Afternoon block: 14:00 - 17:00 (6 slots)
    const slotTimes = [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
      '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    ];

    for (const timeStr of slotTimes) {
      const [h, m] = timeStr.split(':').map(Number);
      const start = new Date(date);
      start.setHours(h, m, 0, 0);
      const end = new Date(start.getTime() + slotDuration * 60 * 1000);

      slots.push({
        doctorId: doctorUserId,
        startTime: start,
        endTime: end,
        status: 'AVAILABLE',
      });
    }
  }

  try {
    await Slot.insertMany(slots, { ordered: false });
  } catch (err) {
    if (err.code !== 11000) throw err;
  }
};

const seed = async () => {
  if (!env.MONGODB_URI) {
    logger.error('[Seed] MONGODB_URI is not set. Please configure your .env file.');
    logger.info('[Seed] Copy .env.example to .env and add your MongoDB Atlas URI.');
    process.exit(1);
  }

  logger.info('[Seed] Connecting to MongoDB...');
  await mongoose.connect(env.MONGODB_URI);
  logger.info('[Seed] Connected. Clearing existing data...');

  // Clear all collections
  await Promise.all([
    User.deleteMany({}),
    DoctorProfile.deleteMany({}),
    Slot.deleteMany({}),
    Appointment.deleteMany({}),
    NotificationJob.deleteMany({}),
  ]);

  logger.info('[Seed] Creating Admin user...');
  const adminUser = await User.create({
    firstName: 'Platform',
    lastName: 'Admin',
    email: 'admin@healthsync.demo',
    passwordHash: 'Admin@123456',
    role: 'admin',
    isActive: true,
  });

  logger.info('[Seed] Creating 12 Demo Bookable Doctors...');
  const demoDoctorUsers = [];
  for (const doctorData of DEMO_DOCTORS) {
    const { firstName, lastName, email, specialization, qualifications, bio, consultationFee,
            slotDurationMinutes, yearsOfExperience, city, state, clinicAddress, hospitalAffiliation, languages,
            averageRating, totalReviews, doctorType, isBookable, referenceNote, nextAvailableSlot } = doctorData;

    const user = await User.create({
      firstName, lastName, email,
      passwordHash: 'Doctor@123456',
      role: 'doctor', isActive: true,
    });

    await DoctorProfile.create({
      userId: user._id,
      specialization, qualifications, bio, consultationFee,
      slotDurationMinutes, yearsOfExperience, city, state, clinicAddress, hospitalAffiliation,
      languages, averageRating, totalReviews,
      doctorType: doctorType || 'DEMO',
      isBookable: isBookable !== undefined ? isBookable : true,
      referenceNote: referenceNote || '',
      nextAvailableSlot: nextAvailableSlot || 'Today · 03:30 PM',
      isVerified: true,
    });

    await generateSlotsForDoctor(user._id);
    demoDoctorUsers.push(user);
    logger.info(`[Seed]   ✅ Demo Doctor: Dr. ${firstName} ${lastName} (${specialization} · ${city})`);
  }

  logger.info('[Seed] Creating 6 Reference Directory Profiles (Non-Bookable)...');
  for (const refData of REFERENCE_DOCTORS) {
    const { firstName, lastName, email, specialization, qualifications, bio, consultationFee,
            slotDurationMinutes, yearsOfExperience, city, state, clinicAddress, hospitalAffiliation, languages,
            averageRating, totalReviews, doctorType, isBookable, referenceNote, nextAvailableSlot } = refData;

    const user = await User.create({
      firstName, lastName, email,
      passwordHash: 'Reference@123456',
      role: 'doctor', isActive: true,
    });

    await DoctorProfile.create({
      userId: user._id,
      specialization, qualifications, bio, consultationFee,
      slotDurationMinutes, yearsOfExperience, city, state, clinicAddress, hospitalAffiliation,
      languages, averageRating, totalReviews,
      doctorType: 'REFERENCE',
      isBookable: false,
      referenceNote: referenceNote || 'REFERENCE PROFILE · Sourced Public Directory · Not bookable on HealthSync',
      nextAvailableSlot: nextAvailableSlot || 'Not available on HealthSync',
      isVerified: true,
    });
    logger.info(`[Seed]   🏛️ Reference Profile: Dr. ${firstName} ${lastName} (${specialization} · ${hospitalAffiliation})`);
  }

  logger.info('[Seed] Creating Patient users...');
  const patientUsers = [];
  for (const patientData of PATIENTS) {
    const user = await User.create({
      ...patientData,
      passwordHash: 'Patient@123456',
      role: 'patient', isActive: true,
    });
    patientUsers.push(user);
    logger.info(`[Seed]   ✅ ${patientData.firstName} ${patientData.lastName}`);
  }

  // Create a sample completed appointment with prescription
  logger.info('[Seed] Creating sample appointment history...');
  const cardioDoctor = demoDoctorUsers[0];
  const patient = patientUsers[0];
  const sampleSlot = await Slot.findOne({ doctorId: cardioDoctor._id, status: 'AVAILABLE' });

  if (sampleSlot) {
    await Slot.findByIdAndUpdate(sampleSlot._id, { status: 'BOOKED' });
    await Appointment.create({
      patientId: patient._id,
      doctorId: cardioDoctor._id,
      slotId: sampleSlot._id,
      scheduledAt: sampleSlot.startTime,
      symptoms: 'Experiencing chest tightness and shortness of breath during mild exertion for the past 3 days. Some dizziness when climbing stairs.',
      symptomDuration: '3 days',
      severity: 'moderate',
      previousConditions: ['Hypertension'],
      currentMedications: ['Amlodipine 5mg'],
      status: 'COMPLETED',
      clinicalNotes: 'Patient presents with exertional chest tightness and dyspnoea. BP: 142/88. HR: 78 bpm. ECG shows ST changes. Likely stable angina. Starting anti-anginal therapy.',
      diagnosis: 'Stable Angina Pectoris',
      vitalSigns: { bloodPressure: '142/88', heartRate: 78, temperature: 37.1, oxygenSaturation: 97, weight: 72 },
      prescription: {
        medications: [
          { name: 'Isosorbide Mononitrate', dosage: '20mg', frequency: 'Twice daily after meals', durationDays: 30, timing: 'after_food', reminderTimes: ['09:00', '20:00'] },
          { name: 'Aspirin', dosage: '75mg', frequency: 'Once daily after breakfast', durationDays: 30, timing: 'after_food', reminderTimes: ['09:00'] },
          { name: 'Atorvastatin', dosage: '40mg', frequency: 'Once at bedtime', durationDays: 30, timing: 'any', reminderTimes: ['21:00'] },
        ],
        followUpDays: 14,
        dietaryRestrictions: ['Avoid high-sodium foods', 'Limit saturated fats', 'No alcohol'],
        warnings: ['Seek emergency care if chest pain worsens or occurs at rest', 'Do not stop medications without consulting doctor'],
      },
      'preVisitAI.status': 'COMPLETED',
      'preVisitAI.urgencyLevel': 'High',
      'preVisitAI.chiefComplaint': 'Exertional chest tightness with dyspnoea and dizziness',
      'preVisitAI.suggestedDoctorQuestions': [
        'Does the chest tightness radiate to your arm, jaw, or back?',
        'What is your exact exercise tolerance — how many flights of stairs trigger symptoms?',
        'Have you had any previous cardiac evaluations or stress tests?',
      ],
      'preVisitAI.riskFlags': ['Hypertensive patient with new exertional symptoms — cardiac cause must be ruled out'],
      'postVisitAI.status': 'COMPLETED',
      'postVisitAI.patientFriendlySummary': 'You have been diagnosed with stable angina, which means your heart muscle is not getting enough blood during activity. This is manageable with the right medications. We have started you on three medications to reduce chest pain, protect your heart, and manage your cholesterol.',
      'postVisitAI.medicationTimetable': [
        { time: '9:00 AM', medications: ['Isosorbide Mononitrate 20mg', 'Aspirin 75mg'], instructions: 'After breakfast' },
        { time: '8:00 PM', medications: ['Isosorbide Mononitrate 20mg'], instructions: 'After dinner' },
        { time: '9:00 PM', medications: ['Atorvastatin 40mg'], instructions: 'At bedtime' },
      ],
      'postVisitAI.warningFlags': [
        'Go to emergency immediately if chest pain occurs at rest or with minimal exertion',
        'Headache is a common side effect of Isosorbide — take with food to reduce it',
      ],
      'postVisitAI.nextCheckupDeadline': '2 weeks',
      calendarSyncStatus: 'NOT_SYNCED',
    });
  }

  logger.info('');
  logger.info('╔══════════════════════════════════════════════════════════╗');
  logger.info('║             ✅ SEED COMPLETED SUCCESSFULLY               ║');
  logger.info('╠══════════════════════════════════════════════════════════╣');
  logger.info('║  DEMO CREDENTIALS                                        ║');
  logger.info('║                                                          ║');
  logger.info('║  Admin:   admin@healthsync.demo  / Admin@123456          ║');
  logger.info('║  Doctor:  dr.priya@healthsync.demo / Doctor@123456       ║');
  logger.info('║  Patient: rohan@patient.demo      / Patient@123456       ║');
  logger.info('╚══════════════════════════════════════════════════════════╝');

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  logger.error('[Seed] Fatal error:', err);
  mongoose.disconnect().finally(() => process.exit(1));
});

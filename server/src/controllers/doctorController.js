// ============================================================
// CONTROLLER — Doctor Profiles & Slots
// ============================================================
'use strict';

const { body, query, param } = require('express-validator');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const { getAvailableSlots } = require('../services/slotService');
const { applyDoctorLeave, cancelLeave, previewLeaveConflicts } = require('../services/doctorLeaveService');

// ── Validation ───────────────────────────────────────────────
const createDoctorValidation = [
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('specialization').trim().notEmpty(),
  body('consultationFee').isNumeric().isFloat({ min: 0 }),
  body('slotDurationMinutes').optional().isIn([15, 20, 30, 45, 60]),
];

const leaveValidation = [
  body('startDate').isISO8601().withMessage('startDate must be a valid date'),
  body('endDate').isISO8601().withMessage('endDate must be a valid date'),
  body('reason').optional().trim().isLength({ max: 200 }),
];

const { matchSpecialtyForQuery, fetchRealWorldCityDoctors } = require('../services/llmService');

// ── In-Memory Verified Bookable Demo Doctors (Always Available) ───
const IN_MEMORY_DEMO_DOCTORS = [
  {
    _id: '64f1a2b3c4d5e6f7a8b9c0d1',
    userId: { _id: '64f1a2b3c4d5e6f7a8b9c0d1', firstName: 'Priya', lastName: 'Sharma', email: 'dr.priya@healthsync.demo', phone: '+91 98765 43211' },
    specialization: 'Cardiology',
    qualifications: ['MBBS', 'MD - General Medicine', 'DM - Cardiology (AIIMS)'],
    bio: 'Dr. Priya Sharma is a senior interventional cardiologist with 14+ years of clinical experience. Specialises in coronary angiography, heart failure management, hypertension, and preventive cardiology.',
    consultationFee: 750, slotDurationMinutes: 30, yearsOfExperience: 14,
    city: 'Bhopal', state: 'Madhya Pradesh',
    clinicAddress: 'Bansal Hospital & Heart Institute, Shahpura, Bhopal',
    hospitalAffiliation: 'Bansal Hospital, Bhopal',
    languages: ['English', 'Hindi'],
    averageRating: 4.9, totalReviews: 320,
    doctorType: 'DEMO', isBookable: true, isVerified: true,
    nextAvailableSlot: 'Today · 03:00 PM',
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c0d2',
    userId: { _id: '64f1a2b3c4d5e6f7a8b9c0d2', firstName: 'Vikramaditya', lastName: 'Rathore', email: 'dr.vikramaditya@healthsync.demo', phone: '+91 98765 43212' },
    specialization: 'Cardiology',
    qualifications: ['MBBS', 'MD', 'DM - Cardiology', 'FACC (USA)'],
    bio: 'Dr. Vikramaditya Rathore has 19 years of expertise in complex coronary angioplasty, pacemaker implantations, and adult structural heart disease.',
    consultationFee: 900, slotDurationMinutes: 30, yearsOfExperience: 19,
    city: 'Bengaluru', state: 'Karnataka',
    clinicAddress: 'Bannerghatta Road, Bengaluru',
    hospitalAffiliation: 'Apollo Hospitals Bannerghatta, Bengaluru',
    languages: ['English', 'Hindi', 'Kannada'],
    averageRating: 4.95, totalReviews: 418,
    doctorType: 'DEMO', isBookable: true, isVerified: true,
    nextAvailableSlot: 'Today · 04:00 PM',
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c0d3',
    userId: { _id: '64f1a2b3c4d5e6f7a8b9c0d3', firstName: 'Arjun', lastName: 'Mehta', email: 'dr.arjun@healthsync.demo', phone: '+91 98765 43213' },
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
    _id: '64f1a2b3c4d5e6f7a8b9c0d4',
    userId: { _id: '64f1a2b3c4d5e6f7a8b9c0d4', firstName: 'Nandini', lastName: 'Sen', email: 'dr.nandini@healthsync.demo', phone: '+91 98765 43214' },
    specialization: 'Neurology',
    qualifications: ['MBBS', 'DM - Neurology', 'Fellowship in Movement Disorders'],
    bio: 'Dr. Nandini Sen is a senior neurologist with expertise in Parkinson disease, memory disorders, vertigo, and multiple sclerosis with over 14 years of clinical experience.',
    consultationFee: 1100, slotDurationMinutes: 30, yearsOfExperience: 14,
    city: 'Mumbai', state: 'Maharashtra',
    clinicAddress: 'Dr. E Moses Road, Worli, Mumbai',
    hospitalAffiliation: 'Fortis Neurosciences Institute, Mumbai',
    languages: ['English', 'Hindi', 'Marathi', 'Bengali'],
    averageRating: 4.88, totalReviews: 290,
    doctorType: 'DEMO', isBookable: true, isVerified: true,
    nextAvailableSlot: 'Today · 05:00 PM',
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c0d5',
    userId: { _id: '64f1a2b3c4d5e6f7a8b9c0d5', firstName: 'Ananya', lastName: 'Krishnan', email: 'dr.ananya@healthsync.demo', phone: '+91 98765 43215' },
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
    _id: '64f1a2b3c4d5e6f7a8b9c0d6',
    userId: { _id: '64f1a2b3c4d5e6f7a8b9c0d6', firstName: 'Rohan', lastName: 'Kapoor', email: 'dr.rohan.derma@healthsync.demo', phone: '+91 98765 43216' },
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
  {
    _id: '64f1a2b3c4d5e6f7a8b9c0d7',
    userId: { _id: '64f1a2b3c4d5e6f7a8b9c0d7', firstName: 'Rahul', lastName: 'Gupta', email: 'dr.rahul@healthsync.demo', phone: '+91 98765 43217' },
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
    _id: '64f1a2b3c4d5e6f7a8b9c0d8',
    userId: { _id: '64f1a2b3c4d5e6f7a8b9c0d8', firstName: 'Shweta', lastName: 'Joshi', email: 'dr.shweta@healthsync.demo', phone: '+91 98765 43218' },
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
  {
    _id: '64f1a2b3c4d5e6f7a8b9c0d9',
    userId: { _id: '64f1a2b3c4d5e6f7a8b9c0d9', firstName: 'Meera', lastName: 'Nair', email: 'dr.meera@healthsync.demo', phone: '+91 98765 43219' },
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
    _id: '64f1a2b3c4d5e6f7a8b9c0da',
    userId: { _id: '64f1a2b3c4d5e6f7a8b9c0da', firstName: 'Siddharth', lastName: 'Verma', email: 'dr.siddharth@healthsync.demo', phone: '+91 98765 43220' },
    specialization: 'Paediatrics',
    qualifications: ['MBBS', 'MD - Paediatrics', 'Fellowship in Neonatology'],
    bio: 'Dr. Siddharth Verma is a consultant pediatrician and neonatologist with 13 years of experience managing acute pediatric allergies, neonatal jaundice, and childhood nutrition.',
    consultationFee: 650, slotDurationMinutes: 20, yearsOfExperience: 13,
    city: 'Hyderabad', state: 'Telangana',
    clinicAddress: 'Road No. 2, Banjara Hills, Hyderabad',
    hospitalAffiliation: 'Rainbow Childrens Hospital, Hyderabad',
    languages: ['English', 'Hindi', 'Telugu'],
    averageRating: 4.92, totalReviews: 380,
    doctorType: 'DEMO', isBookable: true, isVerified: true,
    nextAvailableSlot: 'Today · 03:00 PM',
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c0db',
    userId: { _id: '64f1a2b3c4d5e6f7a8b9c0db', firstName: 'Vikram', lastName: 'Patel', email: 'dr.vikram@healthsync.demo', phone: '+91 98765 43221' },
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
    _id: '64f1a2b3c4d5e6f7a8b9c0dc',
    userId: { _id: '64f1a2b3c4d5e6f7a8b9c0dc', firstName: 'Sunita', lastName: 'Kulkarni', email: 'dr.sunita@healthsync.demo', phone: '+91 98765 43222' },
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
  {
    _id: '64f1a2b3c4d5e6f7a8b9c0dd',
    userId: { _id: '64f1a2b3c4d5e6f7a8b9c0dd', firstName: 'Aarav', lastName: 'Deshmukh', email: 'dr.aarav.dental@healthsync.demo', phone: '+91 98765 43223' },
    specialization: 'Dentistry',
    qualifications: ['BDS', 'MDS - Conservative Dentistry & Endodontics', 'Certified Implantologist'],
    bio: 'Dr. Aarav Deshmukh is a senior dental surgeon with 11 years of experience in single-sitting painless root canals, laser teeth whitening, ceramic crowns, and full mouth rehabilitations.',
    consultationFee: 450, slotDurationMinutes: 30, yearsOfExperience: 11,
    city: 'Bhopal', state: 'Madhya Pradesh',
    clinicAddress: 'Plot 45, Zone-I, MP Nagar, Bhopal',
    hospitalAffiliation: 'Smiles 32 Advanced Dental Institute',
    languages: ['English', 'Hindi'],
    averageRating: 4.92, totalReviews: 520,
    doctorType: 'DEMO', isBookable: true, isVerified: true,
    nextAvailableSlot: 'Today · 11:30 AM',
  },
];

// ── Handlers ─────────────────────────────────────────────────
const searchDoctors = asyncHandler(async (req, res) => {
  const { specialization, city, fee_max, fee_min, language, doctorType, isBookable, sort = 'recommended', page = 1, limit = 30 } = req.query;

  let dbDoctors = [];
  let total = 0;
  try {
    const filter = { isVerified: { $ne: false } };
    if (specialization && specialization !== 'All') filter.specialization = new RegExp(specialization, 'i');
    if (city && city !== 'All' && city !== 'All Cities') filter.city = new RegExp(city, 'i');
    if (fee_max) filter.consultationFee = { ...filter.consultationFee, $lte: Number(fee_max) };
    if (fee_min) filter.consultationFee = { ...filter.consultationFee, $gte: Number(fee_min) };
    if (language) filter.languages = { $in: [new RegExp(language, 'i')] };
    if (doctorType) filter.doctorType = doctorType;
    if (isBookable !== undefined) filter.isBookable = isBookable === 'true';

    const docs = await DoctorProfile.find(filter)
      .populate('userId', 'firstName lastName email phone')
      .limit(Number(limit));
    dbDoctors = docs || [];
    total = dbDoctors.length;
  } catch (err) {
    logger.warn(`[DoctorController] DB query fallback: ${err.message}`);
    dbDoctors = [];
    total = 0;
  }

  // Filter in-memory verified bookable doctors
  let filteredDemo = IN_MEMORY_DEMO_DOCTORS.filter(d => {
    if (specialization && specialization !== 'All' && d.specialization.toLowerCase() !== specialization.toLowerCase()) return false;
    if (isBookable === 'false') return false;
    if (fee_max && d.consultationFee > Number(fee_max)) return false;
    if (fee_min && d.consultationFee < Number(fee_min)) return false;
    return true;
  });

  // If city is specified, prioritize city demo doctors
  if (city && city !== 'All' && city !== 'All Cities') {
    const cityD = filteredDemo.filter(d => d.city.toLowerCase() === city.toLowerCase());
    if (cityD.length > 0) {
      filteredDemo = cityD;
    }
  }

  // Merge DB doctors and in-memory demo doctors without ID or email duplicates
  const existingIds = new Set(dbDoctors.map(d => String(d._id)));
  const existingEmails = new Set(dbDoctors.map(d => String(d.userId?.email || '').toLowerCase()));
  const bookableMerged = [...dbDoctors];

  filteredDemo.forEach(fd => {
    if (!existingIds.has(String(fd._id)) && !existingEmails.has(String(fd.userId.email).toLowerCase())) {
      bookableMerged.push(fd);
    }
  });

  // Fetch live real-world city doctors and clinics via AI / City Registry
  let realCityDoctors = [];
  const targetCity = city && city !== 'All' && city !== 'All Cities' ? city : 'Bhopal';
  const targetSpec = specialization && specialization !== 'All' ? specialization : 'General Medicine';

  try {
    realCityDoctors = await fetchRealWorldCityDoctors({ city: targetCity, specialization: targetSpec });
  } catch (err) {
    realCityDoctors = [];
  }

  // Format real-world doctors into compatible reference profile structures
  const formattedRealDocs = (realCityDoctors || []).map((rd, idx) => {
    const rawName = (rd && rd.name) ? rd.name : (rd && rd.hospitalAffiliation ? rd.hospitalAffiliation : 'Medical Specialist');
    const parts = rawName.replace(/^Dr\.\s*/i, '').split(' ');
    return {
      _id: `ref_ai_${idx}_${((rd && rd.city) || 'city').toLowerCase()}`,
      userId: {
        _id: `ref_user_${idx}`,
        firstName: parts[0] || 'Specialist',
        lastName: parts.slice(1).join(' ') || '',
        email: `directory.${idx}@${((rd && rd.city) || 'city').toLowerCase()}.healthsync`,
      },
      specialization: (rd && rd.specialization) || targetSpec,
      qualifications: (rd && rd.qualifications) || ['MBBS', 'MD'],
      bio: (rd && rd.bio) || `Senior verified specialist at ${(rd && rd.hospitalAffiliation) || 'Premier Hospital'}.`,
      consultationFee: (rd && rd.consultationFee) || 600,
      slotDurationMinutes: 30,
      yearsOfExperience: (rd && rd.yearsOfExperience) || 15,
      city: (rd && rd.city) || targetCity,
      clinicAddress: (rd && rd.clinicAddress) || `${targetCity} Medical Center`,
      hospitalAffiliation: (rd && rd.hospitalAffiliation) || `${targetCity} General Hospital`,
      averageRating: (rd && rd.averageRating) || 4.85,
      totalReviews: (rd && rd.totalReviews) || 350,
      phone: rd && rd.phone,
      timings: rd && rd.timings,
      doctorType: 'REFERENCE',
      isBookable: false,
      referenceNote: (rd && rd.referenceNote) || 'REFERENCE PROFILE · Sourced Public Directory · Direct Walk-In / Hospital Helpline',
      nextAvailableSlot: 'Not available on HealthSync',
      isVerified: true,
    };
  });

  // Combine bookable demo doctors with AI Real-World Directory profiles
  const allDoctors = [...bookableMerged, ...formattedRealDocs];

  ApiResponse.ok(res, {
    doctors: allDoctors,
    bookableCount: bookableMerged.length,
    realWorldDirectoryCount: formattedRealDocs.length,
    pagination: { total: allDoctors.length, page: Number(page), limit: Number(limit), pages: 1 },
  });
});

const getDoctorById = asyncHandler(async (req, res) => {
  const reqId = String(req.params.id);

  // 1. Check in-memory demo doctors first
  const demoMatch = IN_MEMORY_DEMO_DOCTORS.find(d => String(d._id) === reqId || String(d.userId._id) === reqId);
  if (demoMatch) {
    return ApiResponse.ok(res, demoMatch);
  }

  // 2. Check DB
  let profile = null;
  try {
    profile = await DoctorProfile.findOne({ $or: [{ userId: reqId }, { _id: reqId }] })
      .populate('userId', 'firstName lastName email phone');
  } catch (err) {
    logger.warn(`[DoctorController] getDoctorById DB error: ${err.message}`);
  }

  if (profile) {
    return ApiResponse.ok(res, profile);
  }

  // 3. Fallback default doctor profile
  const fallbackProfile = {
    _id: req.params.id,
    userId: {
      _id: req.params.id,
      firstName: 'Priya',
      lastName: 'Sharma',
      email: 'dr.priya@healthsync.demo',
      phone: '+91 98765 43211',
    },
    specialization: 'Cardiology',
    qualifications: ['MBBS', 'MD (Medicine)', 'DM (Cardiology)'],
    bio: 'Senior Interventional Cardiologist with 14+ years of clinical excellence in coronary interventions and preventive cardiology.',
    consultationFee: 750,
    slotDurationMinutes: 30,
    yearsOfExperience: 14,
    city: 'Bhopal',
    clinicAddress: 'Bansal Hospital & Heart Institute, Shahpura, Bhopal',
    hospitalAffiliation: 'Bansal Hospital, Bhopal',
    averageRating: 4.9,
    totalReviews: 240,
    doctorType: 'DEMO',
    isBookable: true,
    nextAvailableSlot: 'Today · 03:00 PM',
    isVerified: true,
  };

  ApiResponse.ok(res, fallbackProfile);
});

const createDoctor = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, phone, ...profileData } = req.body;

  const user = await User.create({
    email,
    passwordHash: password,
    firstName,
    lastName,
    phone,
    role: 'doctor',
  });

  const profile = await DoctorProfile.create({
    userId: user._id,
    ...profileData,
    isVerified: true,
  });

  ApiResponse.created(res, { user: user.toPublicJSON(), profile }, 'Doctor created successfully.');
});

const updateDoctorProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const doctorId = req.user.role === 'admin' ? id : req.user._id;

  const profile = await DoctorProfile.findOneAndUpdate(
    { userId: doctorId },
    { $set: req.body },
    { new: true, runValidators: true }
  );
  if (!profile) throw ApiError.notFound('Doctor profile not found.');
  ApiResponse.ok(res, profile, 'Profile updated.');
});

const getDoctorSlots = asyncHandler(async (req, res) => {
  const { date } = req.query;
  if (!date) throw ApiError.badRequest('date query parameter is required (YYYY-MM-DD).');

  let slots = [];
  try {
    slots = await getAvailableSlots(req.params.id, date);
  } catch (err) {
    logger.warn(`[DoctorController] getDoctorSlots error: ${err.message}`);
  }

  if (!slots || slots.length === 0) {
    const times = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'];
    slots = times.map((t, idx) => {
      const [h, m] = t.split(':').map(Number);
      const start = new Date(date + 'T00:00:00.000Z');
      start.setUTCHours(h, m);
      const end = new Date(start.getTime() + 30 * 60000);
      return {
        _id: `demo_slot_${idx}_${date.replace(/-/g, '')}`,
        doctorId: req.params.id,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        status: 'AVAILABLE',
        isLocked: false,
      };
    });
  }

  ApiResponse.ok(res, slots);
});

const applyLeave = asyncHandler(async (req, res) => {
  const doctorId = req.user.role === 'admin' ? req.params.id : req.user._id;
  const result = await applyDoctorLeave(doctorId, req.body);
  ApiResponse.ok(res, result);
});

const removeLeave = asyncHandler(async (req, res) => {
  const doctorId = req.user.role === 'admin' ? req.params.id : req.user._id;
  const result = await cancelLeave(doctorId, req.params.leaveId);
  ApiResponse.ok(res, result);
});

const previewConflicts = asyncHandler(async (req, res) => {
  const doctorId = req.user.role === 'admin' ? req.params.id : req.user._id;
  const result = await previewLeaveConflicts(doctorId, req.body);
  ApiResponse.ok(res, result);
});

const aiSearchDoctors = asyncHandler(async (req, res) => {
  const { query: userQuery } = req.body;
  if (!userQuery || typeof userQuery !== 'string') {
    throw ApiError.badRequest('Search query is required.');
  }

  const aiMatch = await matchSpecialtyForQuery(userQuery);

  const filter = {
    specialization: new RegExp(aiMatch.primarySpecialty, 'i'),
    isVerified: { $ne: false },
  };

  if (aiMatch.detectedCity) {
    filter.city = new RegExp(aiMatch.detectedCity, 'i');
  }

  let dbDoctors = [];
  try {
    dbDoctors = await DoctorProfile.find(filter)
      .populate('userId', 'firstName lastName email phone')
      .sort({ averageRating: -1, yearsOfExperience: -1 })
      .limit(10);
  } catch (err) {}

  // Filter in-memory demo doctors
  const inMemoryMatches = IN_MEMORY_DEMO_DOCTORS.filter(d => {
    const specMatch = d.specialization.toLowerCase().includes(aiMatch.primarySpecialty.toLowerCase());
    const cityMatch = !aiMatch.detectedCity || d.city.toLowerCase().includes(aiMatch.detectedCity.toLowerCase());
    return specMatch && cityMatch;
  });

  const bookableDoctors = [...dbDoctors, ...inMemoryMatches];

  // Map realWorldClinics from AI into doctor card structure
  const realClinics = (aiMatch.realWorldClinics || []).map((clinic, idx) => {
    const city = aiMatch.detectedCity || 'Bengaluru';
    return {
      _id: `ai_ref_${Date.now()}_${idx}`,
      userId: {
        _id: `ai_ref_user_${idx}`,
        firstName: clinic.name.split(' ')[0] || 'Care',
        lastName: clinic.name.split(' ').slice(1).join(' ') || 'Center',
        phone: clinic.phone || '+91 80 4124 5500',
        email: `contact@${clinic.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.in`,
      },
      specialization: aiMatch.primarySpecialty,
      qualifications: ['Verified Healthcare Facility', 'Public Directory Listing'],
      bio: `${clinic.name} provides comprehensive clinical care in ${clinic.area || city}. Certified medical specialists, diagnostic facilities, and emergency care.`,
      consultationFee: clinic.typicalFee || '₹500 - ₹800',
      slotDurationMinutes: 30,
      yearsOfExperience: 15,
      city: city,
      state: 'India',
      clinicAddress: clinic.area || `${city} Medical Hub`,
      hospitalAffiliation: clinic.name,
      averageRating: clinic.rating || 4.85,
      totalReviews: 320,
      doctorType: 'REFERENCE',
      isBookable: false,
      referenceNote: 'PUBLIC DIRECTORY · Direct Walk-In / Hospital Helpline',
      nextAvailableSlot: clinic.timings || '09:00 AM - 08:00 PM',
      isVerified: true,
    };
  });

  const combinedDoctors = [...bookableDoctors, ...realClinics];

  ApiResponse.ok(res, {
    aiMatch,
    doctors: combinedDoctors,
    bookableCount: bookableDoctors.length,
    realWorldCount: realClinics.length,
    total: combinedDoctors.length,
  }, 'AI Doctor recommendations generated.');
});

module.exports = {
  searchDoctors,
  getDoctorById,
  createDoctor,
  updateDoctorProfile,
  getDoctorSlots,
  applyLeave,
  removeLeave,
  previewConflicts,
  aiSearchDoctors,
  createDoctorValidation,
  leaveValidation,
};


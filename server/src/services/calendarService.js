// ============================================================
// SERVICE — Google Calendar OAuth 2.0 Integration
// Gracefully skipped when credentials are not configured
// ============================================================
'use strict';

const { google } = require('googleapis');
const mongoose = require('mongoose');
const User = require('../models/User');
const env = require('../config/env');
const logger = require('../utils/logger');

const isCalendarConfigured = () =>
  !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

const createOAuth2Client = () => {
  if (!isCalendarConfigured()) return null;
  return new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI
  );
};

/**
 * Get authorised OAuth2 client for a user.
 * Auto-refreshes access token if expired.
 */
const getAuthorizedClient = async (userId) => {
  if (!isCalendarConfigured()) return null;

  const user = await User.findById(userId).select('+calendarTokens');
  if (!user?.calendarTokens?.refresh_token) return null;

  const oAuth2Client = createOAuth2Client();
  oAuth2Client.setCredentials(user.calendarTokens);

  // Auto-refresh token if expiring within 5 minutes
  const expiresIn = (user.calendarTokens.expiry_date || 0) - Date.now();
  if (expiresIn < 5 * 60 * 1000) {
    try {
      const { credentials } = await oAuth2Client.refreshAccessToken();
      oAuth2Client.setCredentials(credentials);
      await User.findByIdAndUpdate(userId, { calendarTokens: credentials });
      logger.info(`[CalendarService] Access token refreshed for user ${userId}`);
    } catch (err) {
      logger.warn(`[CalendarService] Token refresh failed for user ${userId}: ${err.message}`);
      return null;
    }
  }

  return oAuth2Client;
};

/**
 * Generate the Google OAuth consent URL (Zero-Warning Clean Scopes for Login)
 */
const getAuthUrl = (state) => {
  const oAuth2Client = createOAuth2Client();
  if (!oAuth2Client) return null;

  const isLogin = !state || state === 'login';
  const scopes = isLogin
    ? [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ]
    : [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/calendar.events',
      ];

  return oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'select_account',
    scope: scopes,
    state: state || 'login',
  });
};

/**
 * Exchange auth code for tokens and handle Google Login + Calendar
 */
const handleOAuthCallback = async (code, state) => {
  const oAuth2Client = createOAuth2Client();
  if (!oAuth2Client) throw new Error('Google OAuth is not configured');

  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);

  // Fetch Google User Profile info
  const oauth2 = google.oauth2({ version: 'v2', auth: oAuth2Client });
  const userInfo = await oauth2.userinfo.get();
  const { email, given_name, family_name } = userInfo.data;

  let user = null;
  // If state was a specific userId (connecting from dashboard)
  if (state && mongoose.Types.ObjectId.isValid(state)) {
    user = await User.findById(state);
    if (user) {
      user.calendarTokens = tokens;
      await user.save();
    }
  }

  // If logging in via Google
  if (!user && email) {
    user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Auto-register new patient account via Google
      user = await User.create({
        firstName: given_name || 'Patient',
        lastName: family_name || 'User',
        email: email.toLowerCase(),
        password: `GoogleAuth@${Date.now()}`,
        role: 'patient',
        isEmailVerified: true,
        calendarTokens: tokens,
      });
    } else {
      user.calendarTokens = tokens;
      await user.save();
    }
  }

  logger.info(`[CalendarService] Google OAuth success for user: ${email || user?._id}`);
  return { user, tokens };
};

/**
 * Create a Google Calendar event for an appointment
 */
const createCalendarEvent = async ({ userId, appointment, doctorName, patientName, symptoms }) => {
  if (!isCalendarConfigured()) return null;

  try {
    const auth = await getAuthorizedClient(userId);
    if (!auth) return null;

    const calendar = google.calendar({ version: 'v3', auth });

    const event = {
      summary: `Medical Appointment — Dr. ${doctorName}`,
      description: `Patient: ${patientName}\nSymptoms: ${symptoms || 'Not provided'}\nAppointment ID: ${appointment._id}`,
      start: {
        dateTime: appointment.scheduledAt.toISOString(),
        timeZone: 'Asia/Kolkata',
      },
      end: {
        dateTime: new Date(appointment.scheduledAt.getTime() + 30 * 60 * 1000).toISOString(),
        timeZone: 'Asia/Kolkata',
      },
      colorId: '2', // Sage green for medical
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 60 },
          { method: 'email', minutes: 1440 }, // 24 hours before
        ],
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });

    logger.info(`[CalendarService] Event created: ${response.data.id} for appointment ${appointment._id}`);
    return response.data.id;
  } catch (err) {
    logger.warn(`[CalendarService] Failed to create event: ${err.message}`);
    return null;
  }
};

/**
 * Delete a Google Calendar event
 */
const deleteCalendarEvent = async (userId, eventId) => {
  if (!isCalendarConfigured() || !eventId) return false;

  try {
    const auth = await getAuthorizedClient(userId);
    if (!auth) return false;

    const calendar = google.calendar({ version: 'v3', auth });
    await calendar.events.delete({ calendarId: 'primary', eventId });
    logger.info(`[CalendarService] Event deleted: ${eventId}`);
    return true;
  } catch (err) {
    logger.warn(`[CalendarService] Failed to delete event ${eventId}: ${err.message}`);
    return false;
  }
};

/**
 * Update a Google Calendar event (for reschedules)
 */
const updateCalendarEvent = async (userId, eventId, { newStartTime, summary }) => {
  if (!isCalendarConfigured() || !eventId) return false;

  try {
    const auth = await getAuthorizedClient(userId);
    if (!auth) return false;

    const calendar = google.calendar({ version: 'v3', auth });
    await calendar.events.patch({
      calendarId: 'primary',
      eventId,
      resource: {
        summary,
        start: { dateTime: newStartTime.toISOString(), timeZone: 'Asia/Kolkata' },
        end: {
          dateTime: new Date(newStartTime.getTime() + 30 * 60 * 1000).toISOString(),
          timeZone: 'Asia/Kolkata',
        },
      },
    });
    logger.info(`[CalendarService] Event updated: ${eventId}`);
    return true;
  } catch (err) {
    logger.warn(`[CalendarService] Failed to update event ${eventId}: ${err.message}`);
    return false;
  }
};

module.exports = {
  isCalendarConfigured,
  getAuthUrl,
  handleOAuthCallback,
  createCalendarEvent,
  deleteCalendarEvent,
  updateCalendarEvent,
};

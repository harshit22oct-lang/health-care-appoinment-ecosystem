// ============================================================
// CONTROLLER — AI Health & Platform Assistant
// ============================================================
'use strict';

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { chatWithHealthAssistant } = require('../services/llmService');

const handleChat = asyncHandler(async (req, res) => {
  const { message, history } = req.body;
  if (!message || typeof message !== 'string') {
    throw ApiError.badRequest('Message is required.');
  }

  const result = await chatWithHealthAssistant({
    message,
    history: Array.isArray(history) ? history : [],
  });

  ApiResponse.ok(res, result, 'AI Assistant response generated.');
});

module.exports = { handleChat };

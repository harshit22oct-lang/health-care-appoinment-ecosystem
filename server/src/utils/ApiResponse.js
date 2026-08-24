// ============================================================
// UTIL — Standardised Success Response
// ============================================================
'use strict';

class ApiResponse {
  /**
   * @param {number} statusCode
   * @param {*}      data
   * @param {string} message
   */
  constructor(statusCode, data, message = 'Success') {
    this.statusCode = statusCode;
    this.success = statusCode < 400;
    this.message = message;
    this.data = data;
    this.timestamp = new Date().toISOString();
  }

  send(res) {
    return res.status(this.statusCode).json({
      success: this.success,
      message: this.message,
      data: this.data,
      timestamp: this.timestamp,
    });
  }

  static ok(res, data, message = 'Success') {
    return new ApiResponse(200, data, message).send(res);
  }

  static created(res, data, message = 'Created successfully') {
    return new ApiResponse(201, data, message).send(res);
  }

  static noContent(res) {
    return res.status(204).send();
  }
}

module.exports = ApiResponse;

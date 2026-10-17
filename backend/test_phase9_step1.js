import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

import app from './src/app.js';
import connectDB from './src/config/db.js';
import User from './src/models/User.js';
import Interview from './src/models/Interview.js';
import { getJwtSecret } from './src/utils/jwt.js';

const TEST_PORT = 5098;
const BASE_URL = `http://localhost:${TEST_PORT}`;

// Fetch helper
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  let json = null;
  const text = await res.text();
  try {
    json = JSON.parse(text);
  } catch (e) {
    json = { raw: text };
  }

  return {
    status: res.status,
    headers: res.headers,
    data: json,
  };
}

async function runTestSuite() {
  console.log('========================================================');
  console.log('🧪 RUNNING PHASE 9 STEP 9.1 BACKEND SECURITY & VALIDATION TESTS');
  console.log('========================================================\n');

  let server;
  let passedCount = 0;
  let failedCount = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passedCount++;
    } else {
      console.error(`❌ FAIL: ${testName} - ${details}`);
      failedCount++;
    }
  }

  try {
    await connectDB();
    server = app.listen(TEST_PORT);
    console.log(`🚀 Test server listening on ${BASE_URL}\n`);

    // ----------------------------------------------------
    // TEST 1: Missing JWT rejects with 401
    // ----------------------------------------------------
    const res1 = await request('/api/interviews');
    assert(
      res1.status === 401 && res1.data.status === 'fail',
      '1. Protected route rejects requests without a token (401)',
      `Got status ${res1.status}`
    );

    // ----------------------------------------------------
    // TEST 2: Invalid JWT rejects with 401
    // ----------------------------------------------------
    const res2 = await request('/api/interviews', {
      headers: { Authorization: 'Bearer totally_invalid_token_99999' },
    });
    assert(
      res2.status === 401 && res2.data.message.includes('Invalid authentication token'),
      '2. Protected route rejects invalid JWT token (401)',
      `Got status ${res2.status}, msg: ${res2.data.message}`
    );

    // ----------------------------------------------------
    // TEST 3: Expired JWT rejects with 401
    // ----------------------------------------------------
    const secret = getJwtSecret();
    const expiredToken = jwt.sign({ userId: '65f000000000000000000001' }, secret, { expiresIn: '0s' });
    await new Promise((r) => setTimeout(r, 60));
    const res3 = await request('/api/interviews', {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    assert(
      res3.status === 401 && res3.data.message.includes('expired'),
      '3. Protected route rejects expired JWT with session expired message (401)',
      `Got status ${res3.status}, msg: ${res3.data.message}`
    );

    // ----------------------------------------------------
    // TEST 4: Input Validation on Registration
    // ----------------------------------------------------
    const res4a = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: '', email: 'not-an-email', password: '123' }),
    });
    assert(
      res4a.status === 400 && res4a.data.errors && res4a.data.errors.length >= 3,
      '4a. Registration rejects invalid/missing name, email, and password (<8 chars) (400)',
      `Got status ${res4a.status}, errors: ${JSON.stringify(res4a.data.errors)}`
    );

    const massivePassword = 'A'.repeat(200);
    const res4b = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Valid User', email: 'valid@example.com', password: massivePassword }),
    });
    assert(
      res4b.status === 400 && JSON.stringify(res4b.data).includes('cannot exceed 128 characters'),
      '4b. Registration rejects massive passwords (>128 chars) to block CPU DoS (400)',
      `Got status ${res4b.status}`
    );

    // ----------------------------------------------------
    // TEST 5: Create User A and User B for authorization & ownership testing
    // ----------------------------------------------------
    const timestamp = Date.now();
    const userAEmail = `audit_user_a_${timestamp}@example.com`;
    const userBEmail = `audit_user_b_${timestamp}@example.com`;

    const regA = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'User A', email: userAEmail, password: 'Password123!' }),
    });
    assert(
      regA.status === 201 && regA.data.data.user.email === userAEmail,
      '5a. User A registers successfully with safe payload (201)',
      `Got status ${regA.status}`
    );

    // Ensure password and __v are never returned
    assert(
      regA.data.data.user.password === undefined && regA.data.data.user.__v === undefined,
      '5b. Password and password hash are NEVER returned in registration response',
      `Found password field in: ${JSON.stringify(regA.data.data.user)}`
    );

    const regB = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'User B', email: userBEmail, password: 'Password123!' }),
    });
    assert(regB.status === 201, '5c. User B registers successfully (201)');

    // Log in User A & User B
    const loginA = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: userAEmail, password: 'Password123!' }),
    });
    const tokenA = loginA.data.token;
    assert(
      loginA.status === 200 && Boolean(tokenA) && loginA.data.data.user.password === undefined,
      '5d. User A logs in; token received and password excluded from response (200)',
      `Got status ${loginA.status}`
    );

    const loginB = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: userBEmail, password: 'Password123!' }),
    });
    const tokenB = loginB.data.token;
    assert(loginB.status === 200 && Boolean(tokenB), '5e. User B logs in successfully (200)');

    // ----------------------------------------------------
    // TEST 6: User A creates an interview session
    // ----------------------------------------------------
    const createRes = await request('/api/interviews', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        role: 'Full Stack Engineer',
        experienceLevel: 'Intermediate',
        difficulty: 'Medium',
        mode: 'text',
        questionCount: 5,
      }),
    });
    const interviewA = createRes.data.data?.interview;
    assert(
      createRes.status === 201 && interviewA && interviewA.role === 'Full Stack Engineer',
      '6. User A creates interview session with valid config (201)',
      `Got status ${createRes.status}`
    );

    // ----------------------------------------------------
    // TEST 7: Cross-User Authorization & Ownership Isolation
    // User B attempts to access User A's interview
    // ----------------------------------------------------
    const crossGet = await request(`/api/interviews/${interviewA._id}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert(
      crossGet.status === 404,
      '7a. User B cannot access User A interview session (GET /:id returns 404 Not Found)',
      `Got status ${crossGet.status}`
    );

    const crossAnswer = await request(`/api/interviews/${interviewA._id}/answers`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({ questionNumber: 1, answerText: 'Malicious attempt' }),
    });
    assert(
      crossAnswer.status === 404,
      '7b. User B cannot modify User A answers (PUT /:id/answers returns 404 Not Found)',
      `Got status ${crossAnswer.status}`
    );

    const crossFollowUp = await request(`/api/interviews/${interviewA._id}/questions/1/follow-up`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert(
      crossFollowUp.status === 404,
      '7c. User B cannot trigger follow-up on User A session (POST /:id/follow-up returns 404 Not Found)',
      `Got status ${crossFollowUp.status}`
    );

    const crossReport = await request(`/api/interviews/${interviewA._id}/report`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert(
      crossReport.status === 404,
      '7d. User B cannot access User A report (GET /:id/report returns 404 Not Found)',
      `Got status ${crossReport.status}`
    );

    // ----------------------------------------------------
    // TEST 8: Invalid MongoDB ObjectId Format
    // ----------------------------------------------------
    const invalidIdRes = await request('/api/interviews/invalid-not-an-id-12345', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(
      invalidIdRes.status === 400 && invalidIdRes.data.message.includes('Invalid id format'),
      '8. Invalid MongoDB ObjectId format returns 400 Bad Request safely (no 500 CastError)',
      `Got status ${invalidIdRes.status}, msg: ${invalidIdRes.data.message}`
    );

    // ----------------------------------------------------
    // TEST 9: Interview Configuration Input Validation
    // ----------------------------------------------------
    const badConfigRes = await request('/api/interviews', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        role: 'X', // too short (<2)
        experienceLevel: 'GodMode', // invalid
        difficulty: 'Extreme', // invalid
        questionCount: 7, // invalid (only 5, 10, 15)
      }),
    });
    assert(
      badConfigRes.status === 400 && badConfigRes.data.errors && badConfigRes.data.errors.length >= 4,
      '9. Invalid interview config rejected with comprehensive error list (400)',
      `Got status ${badConfigRes.status}, errors: ${JSON.stringify(badConfigRes.data.errors)}`
    );

    // ----------------------------------------------------
    // TEST 10: Answer Submission Payload Validation
    // ----------------------------------------------------
    const oversizedAnswer = 'A'.repeat(10001);
    const oversizedRes = await request(`/api/interviews/${interviewA._id}/answers`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        questionNumber: 1,
        answerText: oversizedAnswer,
      }),
    });
    assert(
      oversizedRes.status === 400 && JSON.stringify(oversizedRes.data).includes('exceeds maximum allowed length of 10,000 characters'),
      '10a. Answer submission rejects oversized answerText (>10,000 chars) (400)',
      `Got status ${oversizedRes.status}`
    );

    const nonStringAnswer = await request(`/api/interviews/${interviewA._id}/answers`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        questionNumber: 1,
        answerText: { malicious: 'object' },
      }),
    });
    assert(
      nonStringAnswer.status === 400 && JSON.stringify(nonStringAnswer.data).includes('must be a string'),
      '10b. Answer submission rejects non-string answerText (NoSQL/type safety) (400)',
      `Got status ${nonStringAnswer.status}`
    );

    // ----------------------------------------------------
    // TEST 11: Malformed JSON Payload Handling
    // ----------------------------------------------------
    const rawMalformedRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"email": "broken_json',
    });
    const malformedJson = await rawMalformedRes.json();
    assert(
      rawMalformedRes.status === 400 && malformedJson.message.includes('Malformed JSON payload'),
      '11. Malformed JSON payload caught and formatted with clean 400 Bad Request',
      `Got status ${rawMalformedRes.status}, msg: ${malformedJson.message}`
    );

    // ----------------------------------------------------
    // TEST 12: Rate Limiting Enforcement
    // Rapidly fire requests to authLimiter endpoint (/api/auth/login)
    // ----------------------------------------------------
    let rateLimited = false;
    let rateLimitHeaderPresent = false;
    for (let i = 0; i < 25; i++) {
      const rlRes = await request('/api/auth/login', {
        method: 'POST',
        headers: { 'x-forwarded-for': '192.168.200.77' },
        body: JSON.stringify({ email: 'ratelimit@example.com', password: 'Password123!' }),
      });
      if (rlRes.headers.get('ratelimit-limit')) {
        rateLimitHeaderPresent = true;
      }
      if (rlRes.status === 429) {
        rateLimited = true;
        break;
      }
    }
    assert(
      rateLimited && rateLimitHeaderPresent,
      '12. Rate limiter enforces HTTP 429 Too Many Requests and sets RateLimit headers',
      `rateLimited: ${rateLimited}, headers: ${rateLimitHeaderPresent}`
    );

    // ----------------------------------------------------
    // TEST 13: Clean up test artifacts from MongoDB
    // ----------------------------------------------------
    await Interview.deleteMany({ _id: interviewA._id });
    await User.deleteMany({ email: { $in: [userAEmail, userBEmail] } });
    console.log('🧹 Cleaned up test database records.\n');

  } catch (err) {
    console.error('💥 Test execution error:', err);
    failedCount++;
  } finally {
    if (server) {
      server.close();
    }
    await mongoose.connection.close();
  }

  console.log('========================================================');
  console.log(`📊 TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('========================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTestSuite();

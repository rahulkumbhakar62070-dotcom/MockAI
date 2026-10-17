/**
 * Automated End-to-End Verification Suite for Phase 9, Step 9.3:
 * End-to-End Testing and Bug Fixing
 * 
 * Tests the complete lifecycle against the live backend server:
 * 1. Health & Configuration
 * 2. User Authentication & Security (Registration, Duplicate Email, Login, Bad Login, Isolation)
 * 3. Protected Route Security & Token Rejection
 * 4. Full Interview Lifecycle:
 *    - Configure Session
 *    - Generate Questions with Gemini
 *    - Start Session
 *    - Submit/Save Answers for all questions
 *    - Generate AI Follow-Up Question
 *    - Answer Follow-Up
 *    - Complete Session
 *    - AI Answer Evaluation & Final Report Generation (with real summaryScore)
 * 5. Report Access & Verification
 * 6. Cross-User Isolation (User B cannot read/modify User A's session or report)
 * 7. History & Analytics Verification (real calculated metrics, trends, comparison)
 * 8. Persistence & Data Integrity
 */

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const BASE_URL = 'http://localhost:5000/api';

const results = [];
function recordTest(testName, passed, details = '') {
  results.push({ testName, passed, details });
  console.log(`${passed ? '✅ PASS' : '❌ FAIL'}: ${testName}${details ? ` - ${details}` : ''}`);
}

async function apiRequest(endpoint, { method = 'GET', body = null, token = null } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, options);
  let data = null;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch (err) {
    data = { raw: text };
  }

  return {
    status: res.status,
    headers: res.headers,
    data,
  };
}

async function runE2ETests() {
  console.log('===============================================================');
  console.log('🧪 RUNNING PHASE 9 STEP 9.3: END-TO-END VERIFICATION SUITE');
  console.log('===============================================================\n');

  const timestamp = Date.now();
  const userAEmail = `e2e_user_a_${timestamp}@example.com`;
  const userBEmail = `e2e_user_b_${timestamp}@example.com`;
  const password = 'Password123!';

  let userAToken = null;
  let userBToken = null;
  let interviewId = null;

  try {
    // -------------------------------------------------------------------------
    // SECTION 1: Health Check & Environment Verification
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 1: SYSTEM HEALTH CHECK ---');
    const healthRes = await apiRequest('/health');
    recordTest(
      '1. Health check returns 200 with database connected',
      healthRes.status === 200 && healthRes.data.database?.status === 'connected',
      `Status: ${healthRes.status}, DB: ${healthRes.data.database?.status}`
    );

    // -------------------------------------------------------------------------
    // SECTION 2: Authentication & Security
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 2: AUTHENTICATION & SECURITY ---');

    // 2a. Register User A
    const regResA = await apiRequest('/auth/register', {
      method: 'POST',
      body: { name: 'E2E User A', email: userAEmail, password },
    });
    recordTest(
      '2a. User A registration succeeds (201)',
      regResA.status === 201 && regResA.data?.status === 'success' && !!regResA.data?.data?.user?.id,
      `Status: ${regResA.status}, User ID: ${regResA.data?.data?.user?.id}`
    );

    // 2b. Password hash exclusion check
    recordTest(
      '2b. Registration response NEVER exposes password or password hash',
      regResA.data?.data?.user?.password === undefined,
      `User object keys: ${Object.keys(regResA.data?.data?.user || {}).join(', ')}`
    );

    // 2c. Duplicate email rejection
    const dupRes = await apiRequest('/auth/register', {
      method: 'POST',
      body: { name: 'Duplicate User', email: userAEmail, password },
    });
    recordTest(
      '2c. Duplicate email registration safely rejected (409 Conflict)',
      dupRes.status === 409 && dupRes.data.status === 'fail',
      `Status: ${dupRes.status}, Message: ${dupRes.data.message}`
    );

    // 2d. Register User B
    const regResB = await apiRequest('/auth/register', {
      method: 'POST',
      body: { name: 'E2E User B', email: userBEmail, password },
    });
    recordTest(
      '2d. User B registration succeeds (201)',
      regResB.status === 201 && regResB.data?.status === 'success',
      `Status: ${regResB.status}`
    );

    // 2e. Login with invalid password
    const badLoginRes = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email: userAEmail, password: 'WrongPassword999!' },
    });
    recordTest(
      '2e. Login with invalid password correctly rejected (401)',
      badLoginRes.status === 401 && badLoginRes.data.status === 'fail',
      `Status: ${badLoginRes.status}`
    );

    // 2f. Login with correct credentials for User A
    const loginResA = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email: userAEmail, password },
    });
    userAToken = loginResA.data?.token;
    recordTest(
      '2f. User A login with correct credentials returns 200 with valid JWT',
      loginResA.status === 200 && typeof userAToken === 'string' && userAToken.length > 20,
      `Status: ${loginResA.status}, Token length: ${userAToken?.length}`
    );

    // 2g. Login with correct credentials for User B
    const loginResB = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email: userBEmail, password },
    });
    userBToken = loginResB.data?.token;
    recordTest(
      '2g. User B login succeeds with independent JWT token',
      loginResB.status === 200 && typeof userBToken === 'string' && userBToken.length > 20,
      `Status: ${loginResB.status}`
    );

    // 2h. Protected routes reject missing token
    const noTokenRes = await apiRequest('/auth/me');
    recordTest(
      '2h. Protected route rejects requests missing Bearer token (401)',
      noTokenRes.status === 401,
      `Status: ${noTokenRes.status}`
    );

    // 2i. Protected routes reject malformed token
    const malformedTokenRes = await apiRequest('/auth/me', { token: 'invalid.token.structure' });
    recordTest(
      '2i. Protected route rejects malformed token (401)',
      malformedTokenRes.status === 401,
      `Status: ${malformedTokenRes.status}`
    );

    // 2j. Fetch authenticated user profile
    const meRes = await apiRequest('/auth/me', { token: userAToken });
    recordTest(
      '2j. GET /api/auth/me returns authenticated user identity',
      meRes.status === 200 && meRes.data?.data?.user?.email === userAEmail,
      `User email: ${meRes.data?.data?.user?.email}`
    );

    // -------------------------------------------------------------------------
    // SECTION 3: Interview Lifecycle & AI Integration
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 3: COMPLETE INTERVIEW WORKFLOW ---');

    // 3a. Configure new interview
    const createRes = await apiRequest('/interviews', {
      method: 'POST',
      token: userAToken,
      body: {
        role: 'Full Stack Developer',
        experienceLevel: 'Intermediate',
        difficulty: 'Medium',
        mode: 'text',
        questionCount: 5,
      },
    });
    interviewId = createRes.data?.data?.interview?._id;
    recordTest(
      '3a. Configure new interview session (POST /api/interviews returns 201)',
      createRes.status === 201 && !!interviewId,
      `Status: ${createRes.status}, Interview ID: ${interviewId}`
    );

    // 3b. Generate questions with Gemini for the session
    console.log('   Generating real questions using Gemini API (model: gemini-3.5-flash-lite)...');
    const genQRes = await apiRequest(`/interviews/${interviewId}/generate-questions`, {
      method: 'POST',
      token: userAToken,
    });
    const questions = genQRes.data?.data?.questions || [];
    recordTest(
      '3b. Gemini question generation succeeds (POST /:id/generate-questions)',
      genQRes.status === 200 && Array.isArray(questions) && questions.length === 5,
      `Questions received: ${questions.length}`
    );

    // 3c. Start interview session
    const startRes = await apiRequest('/interviews/start', {
      method: 'POST',
      token: userAToken,
      body: { interviewId },
    });
    recordTest(
      '3c. Start interview session (POST /api/interviews/start returns 200 with status in_progress)',
      startRes.status === 200 && startRes.data?.data?.interview?.status === 'in_progress',
      `Session status: ${startRes.data?.data?.interview?.status}`
    );

    // 3d. Submit answer for Question 1
    const q1Answer = 'In React, the virtual DOM is a lightweight JavaScript representation of the actual DOM. When state changes occur, React creates a new virtual DOM tree, computes a diff against the previous tree using a reconciliation algorithm, and batches minimal operations to update the real DOM efficiently.';
    const ans1Res = await apiRequest(`/interviews/${interviewId}/answers`, {
      method: 'PUT',
      token: userAToken,
      body: {
        questionNumber: 1,
        answerText: q1Answer,
      },
    });
    recordTest(
      '3d. Submit answer for Question 1 (PUT /:id/answers returns 200 and saves answer)',
      ans1Res.status === 200 && ans1Res.data?.data?.userAnswer === q1Answer && ans1Res.data?.data?.answeredCount === 1,
      `Answered count: ${ans1Res.data?.data?.answeredCount}`
    );

    // 3e. Generate an AI follow-up question based on answer 1
    console.log('   Generating AI follow-up question using Gemini...');
    const followUpRes = await apiRequest(`/interviews/${interviewId}/questions/1/follow-up`, {
      method: 'POST',
      token: userAToken,
    });
    const followUpQuestion = followUpRes.data?.data?.followUpQuestion;
    recordTest(
      '3e. AI follow-up question generation (POST /:id/questions/1/follow-up returns 200 and inserts follow-up)',
      followUpRes.status === 200 && !!followUpQuestion && followUpQuestion.isFollowUp === true,
      `Follow-up: "${followUpQuestion?.questionText?.slice(0, 60)}..."`
    );

    // 3f. Fetch interview to see total questions after follow-up insertion (should be 6)
    const sessionDetailsRes = await apiRequest(`/interviews/${interviewId}`, { token: userAToken });
    const currentQuestions = sessionDetailsRes.data?.data?.interview?.questions || [];
    console.log(`   Session now has ${currentQuestions.length} total questions after follow-up insertion.`);

    // 3g. Answer all remaining questions (Questions 2 through 6)
    const answers = [
      'React Fiber enables concurrent rendering by breaking execution into discrete work units with priority queues.',
      'Node.js Event Loop uses libuv phases (timers, pending callbacks, poll, check, close) to handle non-blocking asynchronous I/O on a single execution thread.',
      'REST APIs use standard HTTP verbs and status codes, while GraphQL uses a single endpoint with declarative schema queries to prevent over-fetching.',
      'MongoDB indexes use B-Trees in wiredTiger memory cache to provide logarithmic O(log N) lookup times, balancing read performance against write overhead.',
      'JWT tokens are signed JSON objects containing header, payload, and HMAC signature, enabling stateless authentication without database session lookups.',
    ];

    for (let i = 2; i <= currentQuestions.length; i++) {
      const ansText = answers[i - 2] || 'Comprehensive technical explanation covering patterns, trade-offs, and scalability.';
      await apiRequest(`/interviews/${interviewId}/answers`, {
        method: 'PUT',
        token: userAToken,
        body: {
          questionNumber: i,
          answerText: ansText,
        },
      });
    }

    const verifyAllAnswered = await apiRequest(`/interviews/${interviewId}`, { token: userAToken });
    const answeredCount = verifyAllAnswered.data?.data?.answeredCount;
    recordTest(
      '3f. All session questions answered successfully (PUT /:id/answers)',
      answeredCount === currentQuestions.length,
      `Answered: ${answeredCount}/${currentQuestions.length}`
    );

    // 3g. Complete the interview session
    const completeRes = await apiRequest(`/interviews/${interviewId}/complete`, {
      method: 'POST',
      token: userAToken,
      body: { status: 'completed' },
    });
    recordTest(
      '3g. Conclude interview session (POST /:id/complete marks status as completed)',
      completeRes.status === 200 && completeRes.data?.data?.status === 'completed',
      `Session status: ${completeRes.data?.data?.status}`
    );

    // 3h. Evaluate interview answers and synthesize final report with Gemini
    console.log('   Evaluating answers and synthesizing comprehensive report with Gemini...');
    const evalRes = await apiRequest(`/interviews/${interviewId}/evaluate`, {
      method: 'POST',
      token: userAToken,
      body: { forceReevaluate: true },
    });
    const reportData = evalRes.data?.data?.report;
    const summaryScore = reportData?.summaryScore;
    recordTest(
      '3h. AI evaluation & report generation (POST /:id/evaluate returns summaryScore and evaluations)',
      evalRes.status === 200 && typeof summaryScore === 'number' && summaryScore >= 0 && summaryScore <= 100,
      `Summary Score: ${summaryScore}/100, Evaluated: ${evalRes.data?.data?.evaluatedCount}`
    );

    // -------------------------------------------------------------------------
    // SECTION 4: Performance Report & Detailed Access
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 4: PERFORMANCE REPORT & DETAILED ACCESS ---');

    // 4a. Retrieve final report
    const reportRes = await apiRequest(`/interviews/${interviewId}/report`, {
      token: userAToken,
    });
    recordTest(
      '4a. GET /api/interviews/:id/report returns complete evaluation report',
      reportRes.status === 200 && reportRes.data?.data?.hasReport === true && !!reportRes.data?.data?.report?.overallFeedback,
      `Report status: ${reportRes.data?.data?.report?.status}, Strengths count: ${reportRes.data?.data?.report?.strengths?.length}`
    );

    // -------------------------------------------------------------------------
    // SECTION 5: Cross-User Isolation & Authorization Security
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 5: CROSS-USER DATA ISOLATION ---');

    // 5a. User B cannot view User A's interview session
    const userBAccessInterview = await apiRequest(`/interviews/${interviewId}`, {
      token: userBToken,
    });
    recordTest(
      '5a. User B CANNOT access User A interview session (returns 404 Not Found)',
      userBAccessInterview.status === 404,
      `Status: ${userBAccessInterview.status}`
    );

    // 5b. User B cannot modify User A's answers
    const userBModifyAnswer = await apiRequest(`/interviews/${interviewId}/answers`, {
      method: 'PUT',
      token: userBToken,
      body: { questionNumber: 1, answerText: 'Malicious answer overwrite attempt' },
    });
    recordTest(
      '5b. User B CANNOT modify User A interview answers (returns 404 Not Found)',
      userBModifyAnswer.status === 404,
      `Status: ${userBModifyAnswer.status}`
    );

    // 5c. User B cannot access User A's performance report
    const userBAccessReport = await apiRequest(`/interviews/${interviewId}/report`, {
      token: userBToken,
    });
    recordTest(
      '5c. User B CANNOT access User A performance report (returns 404 Not Found)',
      userBAccessReport.status === 404,
      `Status: ${userBAccessReport.status}`
    );

    // -------------------------------------------------------------------------
    // SECTION 6: History & Performance Analytics Dashboard
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 6: HISTORY & PERFORMANCE ANALYTICS ---');

    // 6a. Lightweight Interview History
    const historyRes = await apiRequest('/interviews/history', {
      token: userAToken,
    });
    const historyList = historyRes.data?.data?.interviews || [];
    const foundSessionInHistory = historyList.find((i) => i._id === interviewId);
    recordTest(
      '6a. GET /api/interviews/history includes completed session with correct score',
      historyRes.status === 200 && !!foundSessionInHistory && foundSessionInHistory.score === summaryScore,
      `Total history items: ${historyList.length}, Session score in history: ${foundSessionInHistory?.score}`
    );

    // 6b. Performance Analytics & Progress Charts
    const analyticsRes = await apiRequest('/interviews/analytics', {
      token: userAToken,
    });
    const analyticsSummary = analyticsRes.data?.data?.summary;
    const trendData = analyticsRes.data?.data?.trendData;
    recordTest(
      '6b. GET /api/interviews/analytics computes real evaluated statistics and trend data',
      analyticsRes.status === 200 &&
        analyticsSummary?.evaluatedInterviews >= 1 &&
        analyticsSummary?.averageScore === summaryScore &&
        analyticsSummary?.bestScore === summaryScore &&
        Array.isArray(trendData) &&
        trendData.length >= 1,
      `Evaluated Count: ${analyticsSummary?.evaluatedInterviews}, Avg: ${analyticsSummary?.averageScore}, Best: ${analyticsSummary?.bestScore}`
    );

    // 6c. User B analytics remains completely isolated (empty/zero)
    const userBAnalytics = await apiRequest('/interviews/analytics', {
      token: userBToken,
    });
    const userBSummary = userBAnalytics.data?.data?.summary;
    recordTest(
      '6c. User B analytics is completely isolated (0 interviews, null scores)',
      userBAnalytics.status === 200 &&
        userBSummary?.totalInterviews === 0 &&
        userBSummary?.evaluatedInterviews === 0 &&
        userBSummary?.averageScore === null,
      `User B total interviews: ${userBSummary?.totalInterviews}`
    );

    // -------------------------------------------------------------------------
    // SECTION 7: Database Verification & Persistence
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 7: DATABASE PERSISTENCE & DATA INTEGRITY ---');

    // Query single interview to confirm all fields and relations are preserved
    const verifyInterviewRes = await apiRequest(`/interviews/${interviewId}`, {
      token: userAToken,
    });
    const persisted = verifyInterviewRes.data?.data?.interview;
    const hasPreservedQuestions = Array.isArray(persisted?.questions) && persisted?.questions.length > 0;
    const hasEvaluations = persisted?.questions?.some((q) => q.evaluation?.overallScore !== undefined);
    const hasReport = persisted?.report?.summaryScore === summaryScore;

    recordTest(
      '7a. MongoDB interview record fully preserves questions, answers, and evaluations',
      hasPreservedQuestions && hasEvaluations && hasReport,
      `Questions count: ${persisted?.questions?.length}, Report score: ${persisted?.report?.summaryScore}`
    );

  } catch (err) {
    console.error('Unexpected test suite error:', err);
    recordTest('Test execution completed without uncaught exceptions', false, err.message);
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log('\n===============================================================');
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  console.log(`📊 FINAL RESULTS: ${passedCount} PASSED, ${failedCount} FAILED out of ${results.length} tests`);
  console.log('===============================================================');

  if (failedCount > 0) {
    process.exitCode = 1;
  }
}

runE2ETests();

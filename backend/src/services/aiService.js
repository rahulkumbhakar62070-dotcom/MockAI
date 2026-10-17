import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure backend/.env is loaded even if aiService is invoked in isolation
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

/**
 * Validates and initializes official GoogleGenerativeAI client
 */
export const getGeminiClient = ({ temperature = 0.7 } = {}) => {
  const rawKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  const apiKey = typeof rawKey === 'string' ? rawKey.replace(/^["']|["']$/g, '').trim() : '';

  if (!apiKey || apiKey === '' || apiKey === 'your_gemini_api_key_here') {
    const keyError = new Error(
      'Gemini API key is not configured. Please set GEMINI_API_KEY in your backend/.env file.'
    );
    keyError.code = 'AI_KEY_MISSING';
    keyError.statusCode = 503;
    throw keyError;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.GEMINI_MODEL || process.env.AI_MODEL || 'gemini-3.5-flash-lite';

  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: 'application/json',
      temperature,
    },
  });

  return { genAI, model, modelName };
};

/**
 * Executes a Gemini model query with 25-second timeout protection and error normalization
 */
export const runGeminiInference = async (model, prompt, timeoutMs = 25000) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const timeoutErr = new Error(`Gemini API request timed out after ${timeoutMs / 1000} seconds. Please try again.`);
      timeoutErr.statusCode = 504;
      reject(timeoutErr);
    }, timeoutMs);
  });

  try {
    const apiCallPromise = model.generateContent(prompt);
    const result = await Promise.race([apiCallPromise, timeoutPromise]);
    clearTimeout(timeoutId);

    const response = await result.response;
    const rawText = response.text();

    if (!rawText || rawText.trim().length === 0) {
      throw new Error('Gemini model returned an empty response.');
    }

    // Strip accidental markdown fences
    return rawText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
  } catch (error) {
    clearTimeout(timeoutId);
    handleGeminiError(error);
  }
};

/**
 * Normalizes and categorizes Gemini errors without leaking secrets or raw keys
 */
export const handleGeminiError = (error) => {
  const errMsg = error?.message || '';

  // 1. Leaked / Revoked Key Error from Google
  if (errMsg.includes('leaked') || errMsg.includes('API key was reported as leaked')) {
    const leakErr = new Error(
      'Your Gemini API key was reported as leaked and has been revoked by Google. Please generate a fresh, active API key from Google AI Studio (https://aistudio.google.com/) and update your backend/.env file.'
    );
    leakErr.statusCode = 401;
    leakErr.code = 'AI_KEY_REVOKED';
    throw leakErr;
  }

  // 2. Rate limiting check (429)
  if (error?.status === 429 || errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
    const rateLimitError = new Error('Gemini API rate limit reached. Please wait a moment and try again.');
    rateLimitError.statusCode = 429;
    throw rateLimitError;
  }

  // 3. Authentication / Permission check
  if (
    error?.status === 400 ||
    error?.status === 401 ||
    error?.status === 403 ||
    errMsg.includes('400') ||
    errMsg.includes('401') ||
    errMsg.includes('403') ||
    errMsg.includes('API_KEY_INVALID') ||
    errMsg.includes('PERMISSION_DENIED')
  ) {
    const authError = new Error('Gemini API authentication failed. Please verify your GEMINI_API_KEY in backend/.env.');
    authError.statusCode = 401;
    throw authError;
  }

  // 4. Model not found or revoked
  if (error?.status === 404 || errMsg.includes('404') || errMsg.includes('not found')) {
    const modelError = new Error(
      'Gemini API request failed. The configured AI model or key was not recognized or revoked. Please verify settings in backend/.env.'
    );
    modelError.statusCode = 401;
    throw modelError;
  }

  throw error;
};

/**
 * Validates and sanitizes structured questions returned by Gemini
 */
export const validateQuestionsStructure = (questions, expectedCount) => {
  if (!Array.isArray(questions)) {
    throw new Error('Model output format invalid: Expected a JSON array of questions.');
  }

  const validated = [];
  const seenQuestions = new Set();

  for (let i = 0; i < questions.length; i++) {
    const item = questions[i];
    if (!item || typeof item !== 'object') continue;

    const questionText = (item.questionText || item.question || '').trim();
    const topic = (item.topic || item.category || 'Core Concepts').trim();

    if (questionText.length < 10) continue;

    const dedupeKey = questionText.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seenQuestions.has(dedupeKey)) continue;
    seenQuestions.add(dedupeKey);

    validated.push({
      questionNumber: validated.length + 1,
      questionText,
      topic,
    });

    if (validated.length === expectedCount) break;
  }

  if (validated.length === 0) {
    throw new Error('Failed to extract valid interview questions from AI output.');
  }

  return validated;
};

/**
 * Constructs question generation prompt
 */
const buildQuestionPrompt = ({ jobRole, experienceLevel, difficulty, questionCount }) => {
  return `You are a Principal Software Engineer and Bar Raiser conducting a technical interview for a ${jobRole} position.

Candidate Level: ${experienceLevel}
Target Difficulty: ${difficulty}
Required Question Count: Exactly ${questionCount}

Generate exactly ${questionCount} distinct, high-quality technical interview questions relevant to a ${experienceLevel} ${jobRole} at ${difficulty} difficulty.
Questions should focus on realistic engineering challenges, real-world architecture, state management, debugging, performance bottlenecks, and design trade-offs.

You MUST respond strictly with a valid JSON array of objects. Do NOT include any markdown code blocks, backticks, commentary, or text outside the JSON array.
Each object in the array MUST strictly adhere to this structure:
[
  {
    "questionNumber": 1,
    "questionText": "The exact interview question",
    "topic": "The specific technical domain (e.g. Asynchronous I/O, Distributed Caching, Database Indexing, React Reconciliation)"
  }
]`;
};

/**
 * Generate interview questions using official Google Gemini SDK
 */
export const generateQuestionsWithGemini = async ({
  jobRole,
  experienceLevel,
  difficulty,
  questionCount,
}) => {
  const { model } = getGeminiClient({ temperature: 0.7 });
  const prompt = buildQuestionPrompt({ jobRole, experienceLevel, difficulty, questionCount });
  const cleanedText = await runGeminiInference(model, prompt);

  let parsed;
  try {
    parsed = JSON.parse(cleanedText);
  } catch {
    throw new Error('Model response was not valid JSON. Please try generating again.');
  }

  return validateQuestionsStructure(parsed, questionCount);
};

/* =====================================================================
 * PART 1 & 4: AI ANSWER EVALUATION (PHASE 6 STEP 4)
 * ===================================================================== */

/**
 * Score Calibration Scale (0.0 to 10.0):
 * 9.0 - 10.0: Exceptional (Senior-level mastery, precise terminology, addresses edge cases & trade-offs)
 * 7.0 - 8.9:  Proficient (Solid understanding, accurate explanation with minor omissions)
 * 5.0 - 6.9:  Developing (Basic concept grasped, but lacks technical depth or trade-offs)
 * 3.0 - 4.9:  Needs Improvement (Noticeable misconceptions, tangential or superficial response)
 * 0.0 - 2.9:  Inadequate (Irrelevant, largely incorrect, or non-answer)
 */

export const validateAnswerEvaluation = (rawEvaluation) => {
  if (!rawEvaluation || typeof rawEvaluation !== 'object') {
    throw new Error('Evaluation output invalid: Expected a JSON object.');
  }

  const dimensions = ['relevance', 'technicalAccuracy', 'completeness', 'communication'];
  const sanitized = {};

  for (const dim of dimensions) {
    const item = rawEvaluation[dim];
    if (!item || typeof item !== 'object') {
      throw new Error(`Evaluation missing dimension: '${dim}'`);
    }

    const rawScore = Number(item.score);
    if (isNaN(rawScore) || rawScore < 0 || rawScore > 10) {
      throw new Error(`Score for dimension '${dim}' must be a valid number between 0 and 10.`);
    }

    const feedback = (item.feedback || '').trim();
    if (feedback.length === 0) {
      throw new Error(`Feedback for dimension '${dim}' cannot be empty.`);
    }

    sanitized[dim] = {
      score: Number(Math.max(0, Math.min(10, rawScore)).toFixed(1)),
      feedback,
    };
  }

  // Calculate overall answer score as arithmetic average of 4 dimensions (0.0 to 10.0)
  const overallAvg =
    (sanitized.relevance.score +
      sanitized.technicalAccuracy.score +
      sanitized.completeness.score +
      sanitized.communication.score) /
    4;
  sanitized.overallScore = Number(overallAvg.toFixed(1));

  // Strengths validation
  let strengths = [];
  if (Array.isArray(rawEvaluation.strengths)) {
    strengths = rawEvaluation.strengths
      .map((s) => (typeof s === 'string' ? s.trim() : ''))
      .filter((s) => s.length > 0);
  }
  if (strengths.length === 0) {
    strengths = ['Demonstrated fundamental familiarity with the core question context.'];
  }
  sanitized.strengths = strengths;

  // Improvements validation
  let improvements = [];
  if (Array.isArray(rawEvaluation.improvements)) {
    improvements = rawEvaluation.improvements
      .map((i) => (typeof i === 'string' ? i.trim() : ''))
      .filter((i) => i.length > 0);
  }
  if (improvements.length === 0) {
    improvements = ['Include concrete architectural examples and practical edge case trade-offs.'];
  }
  sanitized.improvements = improvements;

  // Suggested Answer validation
  const suggestedAnswer = (rawEvaluation.suggestedAnswer || '').trim();
  if (suggestedAnswer.length === 0) {
    throw new Error('Evaluation must include a high-quality suggestedAnswer reference.');
  }
  sanitized.suggestedAnswer = suggestedAnswer;
  sanitized.evaluatedAt = new Date();

  return sanitized;
};

/**
 * Evaluates an individual interview answer against the question, role, and seniority level using Gemini
 */
export const evaluateAnswerWithGemini = async ({
  jobRole,
  experienceLevel,
  difficulty = 'Medium',
  questionText,
  topic = 'Technical Concept',
  userAnswer,
}) => {
  if (!userAnswer || typeof userAnswer !== 'string' || userAnswer.trim().length === 0) {
    const unsubmittedErr = new Error('Cannot evaluate an unsubmitted or empty answer.');
    unsubmittedErr.statusCode = 400;
    throw unsubmittedErr;
  }

  const { model } = getGeminiClient({ temperature: 0.2 });

  const prompt = `You are a Principal Software Engineer and hiring committee evaluator conducting a technical evaluation of an interview response.

Target Role: ${jobRole}
Candidate Seniority Level: ${experienceLevel}
Target Difficulty: ${difficulty}
Topic / Domain: ${topic}

Interview Question:
"${questionText}"

Candidate's Submitted Answer:
"${userAnswer.trim()}"

Evaluate the candidate's answer strictly and fairly across the following four dimensions on a 0.0 to 10.0 scale:
1. "relevance": Did the candidate directly address the specific question asked without digressing? (0-10)
2. "technicalAccuracy": Are the technical facts, architecture, mechanisms, and terminology correct? (0-10)
3. "completeness": Did the candidate cover the critical aspects, trade-offs, and depth expected of a ${experienceLevel} candidate?
   IMPORTANT: Accept concise answers when they are technically sufficient; do NOT reward answer length by itself or penalize concise clarity. (0-10)
4. "communication": Is the explanation clear, professional, structured, and easy to understand? (0-10)

Scoring Scale (0.0 to 10.0):
- 9.0 to 10.0: Exceptional (Senior-level mastery, precise terminology, handles trade-offs and edge cases)
- 7.0 to 8.9: Proficient (Solid grasp, accurate core answer with minor omissions)
- 5.0 to 6.9: Developing (Basic concept understood, but lacks necessary depth, trade-offs, or has minor errors)
- 3.0 to 4.9: Needs Improvement (Noticeable misconceptions, superficial or tangential answer)
- 0.0 to 2.9: Inadequate (Irrelevant, incorrect, or empty response)

Evaluation Rules:
- Provide specific, useful, and constructive feedback for each dimension. Do NOT give generic praise like "Good answer" or "Well done".
- Identify 2 to 4 concrete strengths demonstrated in the response.
- Identify 2 to 4 concrete improvement areas or missed concepts.
- Provide a "suggestedAnswer": A concise, optimal model answer that a high-performing candidate would provide for this question.
- Do not invent facts about the candidate's qualifications.
- Do not claim that this evaluation is perfectly objective.

Respond STRICTLY with a valid JSON object. Do NOT wrap in markdown code blocks or add any text outside the JSON object:
{
  "relevance": {
    "score": 8.5,
    "feedback": "Directly addresses how indexing accelerates lookup times..."
  },
  "technicalAccuracy": {
    "score": 8.0,
    "feedback": "Correctly describes B-Tree structures and index scans..."
  },
  "completeness": {
    "score": 7.5,
    "feedback": "Covers read benefits but omitted write amplification trade-offs..."
  },
  "communication": {
    "score": 9.0,
    "feedback": "Clear structure and professional engineering terminology..."
  },
  "strengths": [
    "Accurately explains the difference between index scan and collection scan",
    "Highlights compound index prefix rules"
  ],
  "improvements": [
    "Mention memory consumption overhead in RAM for large indexes",
    "Explain impact on write (insert/update) throughput"
  ],
  "suggestedAnswer": "Indexes in MongoDB use B-Tree structures to avoid full collection scans..."
}`;

  const cleanedText = await runGeminiInference(model, prompt);
  let parsed;
  try {
    parsed = JSON.parse(cleanedText);
  } catch {
    throw new Error('Failed to parse AI evaluation response into valid JSON.');
  }

  return validateAnswerEvaluation(parsed);
};

/* =====================================================================
 * PART 3 & 4: FINAL INTERVIEW REPORT SYNTHESIS (PHASE 6 STEP 4)
 * ===================================================================== */

/**
 * Synthesizes holistic session report across all evaluated questions
 *
 * Scoring Rule:
 * Summary score is calculated as:
 * Math.round((sum of overallScores / (totalQuestions * 10)) * 100)
 * Only generated when all questions are answered, evaluated, and interview is not incomplete.
 */
export const generateInterviewReportWithGemini = async ({
  jobRole,
  experienceLevel,
  difficulty,
  questionsWithEvaluations,
  isIncomplete = false,
}) => {
  const evaluatedItems = questionsWithEvaluations.filter(
    (q) => q.evaluation && typeof q.evaluation.overallScore === 'number'
  );

  const totalQuestions = questionsWithEvaluations.length;
  const answeredCount = questionsWithEvaluations.filter(
    (q) => q.userAnswer && q.userAnswer.trim().length > 0
  ).length;

  // Strict Rule for Summary Score:
  // Do not invent a score when:
  // - No answers have been evaluated.
  // - Some required evaluations are missing.
  // - The AI provider failed.
  // - The interview was abandoned before completion.
  let calculatedSummaryScore = null;
  const allQuestionsEvaluated =
    !isIncomplete &&
    totalQuestions > 0 &&
    evaluatedItems.length === totalQuestions &&
    answeredCount === totalQuestions;

  if (allQuestionsEvaluated) {
    const totalScoreSum = evaluatedItems.reduce((acc, q) => acc + q.evaluation.overallScore, 0);
    // Convert 0-10 average to 0-100 percentage
    calculatedSummaryScore = Math.round((totalScoreSum / (totalQuestions * 10)) * 100);
    calculatedSummaryScore = Math.max(0, Math.min(100, calculatedSummaryScore));
  }

  // If no items have been evaluated, return honest empty report
  if (evaluatedItems.length === 0) {
    return {
      generatedAt: new Date(),
      summaryScore: null,
      overallFeedback:
        'No submitted answers have been evaluated for this session yet. Complete and submit questions to generate an AI evaluation report.',
      strengths: [],
      commonImprovements: ['Submit responses to interview questions to receive personalized AI evaluation.'],
      suggestedTopics: [],
      isIncomplete: true,
      status: 'completed',
    };
  }

  // Construct synthesis context
  const promptContext = evaluatedItems.map((q, idx) => ({
    questionNumber: q.questionNumber || idx + 1,
    topic: q.topic || q.category || 'General',
    question: q.questionText || q.question,
    userAnswer: q.userAnswer,
    overallScore: q.evaluation.overallScore,
    dimensionScores: {
      relevance: q.evaluation.relevance?.score,
      technicalAccuracy: q.evaluation.technicalAccuracy?.score,
      completeness: q.evaluation.completeness?.score,
      communication: q.evaluation.communication?.score,
    },
    strengths: q.evaluation.strengths || [],
    improvements: q.evaluation.improvements || [],
  }));

  const { model } = getGeminiClient({ temperature: 0.3 });

  const synthesisPrompt = `You are a Principal Engineer and Bar Raiser synthesizing a comprehensive final mock interview performance report.

Interview Profile:
- Role: ${jobRole}
- Candidate Seniority: ${experienceLevel}
- Target Difficulty: ${difficulty}
- Total Questions in Session: ${totalQuestions}
- Answered Questions: ${answeredCount}
- Evaluated Questions: ${evaluatedItems.length}
- Session Status: ${isIncomplete ? 'Incomplete / Abandoned before completing all questions' : 'Completed all questions'}

Per-Question Evaluation Summary:
${JSON.stringify(promptContext, null, 2)}

Synthesize a holistic, professional, actionable final evaluation report:
1. "overallFeedback": Provide 2 to 3 well-written paragraphs evaluating the candidate's technical readiness for a ${experienceLevel} ${jobRole} based on their demonstrated knowledge across all questions. Acknowledge depth, practical problem solving, and specific gaps.
2. "strengths": An array of 3 to 5 overarching technical strengths demonstrated across the interview.
3. "commonImprovements": An array of 3 to 5 common patterns, missing architectural considerations, or technical gaps.
4. "suggestedTopics": An array of 4 to 6 specific, tangible topics or technologies to study and practice (e.g., "Event Loop Execution & Task Queues", "Database Connection Pooling", "Distributed Caching Strategies").

Respond STRICTLY with a valid JSON object with NO markdown formatting:
{
  "overallFeedback": "Overall assessment narrative...",
  "strengths": ["Macro strength 1", "Macro strength 2"],
  "commonImprovements": ["Key growth area 1", "Key growth area 2"],
  "suggestedTopics": ["Topic 1", "Topic 2", "Topic 3"]
}`;

  let parsedSynthesis;
  try {
    const rawJson = await runGeminiInference(model, synthesisPrompt);
    parsedSynthesis = JSON.parse(rawJson);
  } catch (err) {
    // Graceful fallback synthesis from evaluated questions so user is never left without a report
    console.warn('AI report synthesis warning, using aggregated evaluation data:', err.message);
    const aggregatedStrengths = Array.from(
      new Set(evaluatedItems.flatMap((q) => q.evaluation?.strengths || []))
    ).slice(0, 4);
    const aggregatedImprovements = Array.from(
      new Set(evaluatedItems.flatMap((q) => q.evaluation?.improvements || []))
    ).slice(0, 4);
    const topics = Array.from(
      new Set(evaluatedItems.map((q) => q.topic || q.category).filter(Boolean))
    ).slice(0, 5);

    parsedSynthesis = {
      overallFeedback: `The candidate completed ${evaluatedItems.length} of ${totalQuestions} questions for the ${jobRole} (${experienceLevel}) mock round. Core competency was demonstrated in ${topics.slice(0, 2).join(' and ')}, with opportunities to deepen architectural trade-offs and edge cases.`,
      strengths: aggregatedStrengths.length > 0 ? aggregatedStrengths : ['Demonstrated core understanding of key domain concepts.'],
      commonImprovements: aggregatedImprovements.length > 0 ? aggregatedImprovements : ['Review advanced trade-offs and production scale constraints.'],
      suggestedTopics: topics.length > 0 ? topics : ['System Architecture', 'Core Performance Optimization'],
    };
  }

  return {
    generatedAt: new Date(),
    summaryScore: calculatedSummaryScore,
    overallFeedback: (parsedSynthesis.overallFeedback || '').trim(),
    strengths: Array.isArray(parsedSynthesis.strengths) ? parsedSynthesis.strengths : [],
    commonImprovements: Array.isArray(parsedSynthesis.commonImprovements) ? parsedSynthesis.commonImprovements : [],
    suggestedTopics: Array.isArray(parsedSynthesis.suggestedTopics) ? parsedSynthesis.suggestedTopics : [],
    isIncomplete,
    status: 'completed',
  };
};

/**
 * Generate a smart contextual follow-up question based on candidate's saved response
 */
export const generateFollowUpQuestionWithGemini = async ({
  jobRole,
  experienceLevel,
  difficulty,
  currentQuestionText,
  userAnswer,
  existingQuestions = [],
}) => {
  const { model } = getGeminiClient({ temperature: 0.7 });

  const existingListText = existingQuestions
    .slice(0, 15)
    .map((q, idx) => `${idx + 1}. ${q}`)
    .join('\n');

  const prompt = `You are a Principal Software Engineer and Bar Raiser conducting a technical mock interview for a ${jobRole} (${experienceLevel} level, ${difficulty} difficulty).

The candidate was asked this technical question:
"${currentQuestionText}"

The candidate provided this response:
"${userAnswer}"

Your task: Formulate ONE sharp, relevant, and constructive technical follow-up question that directly investigates the candidate's answer.
- Focus on architectural trade-offs, edge-cases, error-handling, concurrency, or scalability bottlenecks based on what the candidate mentioned (or missed).
- Keep the follow-up question concise, professional, and directly actionable (1 to 2 sentences max).
- Do NOT repeat or closely mirror any of these previously asked questions:
${existingListText}

You MUST respond strictly with a valid JSON object. Do NOT include markdown code blocks, backticks, or any text outside the JSON object.
JSON format:
{
  "questionText": "The exact concise technical follow-up question",
  "topic": "The specific technical topic",
  "reason": "Brief one-sentence explanation of why this follow-up was asked based on their answer"
}`;

  const rawJson = await runGeminiInference(model, prompt);
  let parsed;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    const cleaned = rawJson.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
    parsed = JSON.parse(cleaned);
  }

  const questionText = (parsed.questionText || parsed.question || '').trim();
  const topic = (parsed.topic || parsed.category || 'Deep Dive').trim();
  const reason = (parsed.reason || '').trim();

  if (questionText.length < 10) {
    throw new Error('Gemini returned an invalid or empty follow-up question.');
  }

  return {
    questionText,
    topic,
    reason,
  };
};

export default {
  generateQuestionsWithGemini,
  validateQuestionsStructure,
  evaluateAnswerWithGemini,
  validateAnswerEvaluation,
  generateInterviewReportWithGemini,
  generateFollowUpQuestionWithGemini,
  getGeminiClient,
  runGeminiInference,
  handleGeminiError,
};

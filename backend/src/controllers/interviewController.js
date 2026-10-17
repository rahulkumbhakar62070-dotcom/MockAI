import mongoose from 'mongoose';
import Interview from '../models/Interview.js';
import {
  generateQuestionsWithGemini,
  evaluateAnswerWithGemini,
  generateInterviewReportWithGemini,
  generateFollowUpQuestionWithGemini,
} from '../services/aiService.js';

const VALID_EXPERIENCE_LEVELS = ['Beginner', 'Intermediate', 'Experienced'];
const VALID_MODES = ['text', 'audio_video'];
const VALID_DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const VALID_QUESTION_COUNTS = [5, 10, 15];

/**
 * Controller: Configure & Create a new interview session
 * Route: POST /api/interviews
 * Access: Private (Requires JWT)
 */
export const createInterview = async (req, res, next) => {
  try {
    const { role, jobRole, experienceLevel, mode, difficulty, questionCount } = req.body;
    const targetRole = (role || jobRole || '').trim();
    const errors = [];

    // 1. Role validation
    if (!targetRole || targetRole.length === 0) {
      errors.push('Job role is required.');
    } else if (targetRole.length < 2) {
      errors.push('Job role must be at least 2 characters long.');
    } else if (targetRole.length > 100) {
      errors.push('Job role cannot exceed 100 characters.');
    }

    // 2. Experience level validation
    if (!experienceLevel || !VALID_EXPERIENCE_LEVELS.includes(experienceLevel)) {
      errors.push(`Experience level must be one of: ${VALID_EXPERIENCE_LEVELS.join(', ')}.`);
    }

    // 3. Mode validation
    if (!mode || !VALID_MODES.includes(mode)) {
      errors.push('Interview mode must be either "text" or "audio_video".');
    }

    // 4. Difficulty validation
    if (!difficulty || !VALID_DIFFICULTIES.includes(difficulty)) {
      errors.push(`Difficulty must be one of: ${VALID_DIFFICULTIES.join(', ')}.`);
    }

    // 5. Question count validation
    const parsedCount = Number(questionCount);
    if (!questionCount || !VALID_QUESTION_COUNTS.includes(parsedCount)) {
      errors.push(`Question count must be 5, 10, or 15.`);
    }

    if (errors.length > 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'Validation failed for interview configuration.',
        errors,
      });
    }

    // 6. Create interview (strictly using authenticated req.userId)
    const interview = new Interview({
      user: req.userId,
      role: targetRole,
      experienceLevel,
      mode,
      difficulty,
      questionCount: parsedCount,
      status: 'configured',
    });

    await interview.save();

    return res.status(201).json({
      status: 'success',
      message: 'Interview session configured successfully.',
      data: {
        interview,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Get authenticated user's interview history and real stats
 * Route: GET /api/interviews
 * Access: Private (Requires JWT)
 */
export const getMyInterviews = async (req, res, next) => {
  try {
    const interviews = await Interview.find({ user: req.userId }).sort({ createdAt: -1 });

    // Calculate real average score across completed interviews with valid summaryScores
    const scoredInterviews = interviews.filter(
      (item) => item.report && typeof item.report.summaryScore === 'number' && !isNaN(item.report.summaryScore)
    );
    const averageScore =
      scoredInterviews.length > 0
        ? Math.round(scoredInterviews.reduce((acc, curr) => acc + curr.report.summaryScore, 0) / scoredInterviews.length)
        : null;

    // Calculate practice minutes estimate based on answered questions (approx 3 min / answer)
    const totalPracticeMinutes = interviews.reduce((acc, curr) => {
      const answered = curr.questions ? curr.questions.filter((q) => q.userAnswer && q.userAnswer.trim().length > 0).length : 0;
      return acc + (answered * 3);
    }, 0);

    return res.status(200).json({
      status: 'success',
      data: {
        interviews,
        stats: {
          totalInterviews: interviews.length,
          completedInterviews: interviews.filter((i) => i.status === 'completed').length,
          averageScore,
          totalPracticeMinutes,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Get authenticated candidate's lightweight interview history
 * Route: GET /api/interviews/history
 * Access: Private (Requires JWT)
 *
 * Requirements:
 * - Strictly scoped to authenticated req.userId (never trust client-supplied ID)
 * - Returns only necessary fields for the history page to optimize payload size
 * - Sorted newest first ({ createdAt: -1 })
 * - Honors true MongoDB data without fabricated scores
 */
export const getInterviewHistory = async (req, res, next) => {
  try {
    const userId = req.userId;

    const interviews = await Interview.find({ user: userId })
      .select({
        role: 1,
        experienceLevel: 1,
        mode: 1,
        difficulty: 1,
        questionCount: 1,
        status: 1,
        currentQuestionIndex: 1,
        completedAt: 1,
        createdAt: 1,
        updatedAt: 1,
        'report.summaryScore': 1,
        'report.status': 1,
        'report.generatedAt': 1,
        'report.isIncomplete': 1,
        'questions.userAnswer': 1,
        'questions.questionNumber': 1,
      })
      .sort({ createdAt: -1 })
      .lean();

    const formattedInterviews = interviews.map((item) => {
      const answeredCount = item.questions
        ? item.questions.filter((q) => q.userAnswer && q.userAnswer.trim().length > 0).length
        : 0;

      const hasScore = typeof item.report?.summaryScore === 'number' && !isNaN(item.report.summaryScore);
      const score = hasScore ? item.report.summaryScore : null;

      const { questions, ...rest } = item;
      return {
        ...rest,
        answeredCount,
        hasScore,
        score,
        hasReport: Boolean(item.report && (item.report.status === 'completed' || hasScore || item.status === 'completed')),
      };
    });

    // Calculate genuine aggregate statistics based only on real DB data
    const scoredList = formattedInterviews.filter((i) => i.hasScore);
    const averageScore = scoredList.length > 0
      ? Math.round(scoredList.reduce((acc, curr) => acc + curr.score, 0) / scoredList.length)
      : null;

    const completedCount = formattedInterviews.filter((i) => i.status === 'completed').length;
    const inProgressCount = formattedInterviews.filter((i) => i.status === 'in_progress').length;

    return res.status(200).json({
      status: 'success',
      data: {
        interviews: formattedInterviews,
        total: formattedInterviews.length,
        summary: {
          totalInterviews: formattedInterviews.length,
          completedCount,
          inProgressCount,
          averageScore,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Get single interview session details
 * Route: GET /api/interviews/:id
 * Access: Private (Requires JWT)
 */
export const getInterviewById = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid interview ID format.',
      });
    }

    const interview = await Interview.findOne({
      _id: req.params.id,
      user: req.userId,
    });

    if (!interview) {
      return res.status(404).json({
        status: 'fail',
        message: 'Interview session not found or you do not have permission to view it.',
      });
    }

    const answeredCount = interview.questions.filter((q) => q.userAnswer && q.userAnswer.trim().length > 0).length;

    return res.status(200).json({
      status: 'success',
      data: {
        interview,
        totalQuestions: interview.questions.length,
        answeredCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Real AI Interview Question Generation using Gemini
 * Route: POST /api/interviews/generate-questions
 * Access: Private (Requires JWT)
 */
export const generateQuestions = async (req, res, next) => {
  try {
    const { jobRole, role, experienceLevel, difficulty, questionCount } = req.body;
    const targetRole = (jobRole || role || '').trim();
    const errors = [];

    // 1. Validation
    if (!targetRole || targetRole.length === 0) {
      errors.push('Job role is required.');
    } else if (targetRole.length < 2) {
      errors.push('Job role must be at least 2 characters long.');
    } else if (targetRole.length > 100) {
      errors.push('Job role cannot exceed 100 characters.');
    }

    if (!experienceLevel || !VALID_EXPERIENCE_LEVELS.includes(experienceLevel)) {
      errors.push(`Experience level must be one of: ${VALID_EXPERIENCE_LEVELS.join(', ')}.`);
    }

    if (!difficulty || !VALID_DIFFICULTIES.includes(difficulty)) {
      errors.push(`Difficulty must be one of: ${VALID_DIFFICULTIES.join(', ')}.`);
    }

    const parsedCount = Number(questionCount);
    if (!questionCount || !VALID_QUESTION_COUNTS.includes(parsedCount)) {
      errors.push('Question count must be 5, 10, or 15.');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'Validation failed for question generation.',
        errors,
      });
    }

    // 2. Generate questions via official Google Gemini SDK
    const questions = await generateQuestionsWithGemini({
      jobRole: targetRole,
      experienceLevel,
      difficulty,
      questionCount: parsedCount,
    });

    return res.status(200).json({
      status: 'success',
      message: 'Interview questions generated successfully.',
      data: {
        jobRole: targetRole,
        experienceLevel,
        difficulty,
        questionCount: questions.length,
        questions,
      },
    });
  } catch (error) {
    if (error.code === 'AI_KEY_MISSING' || error.statusCode === 503) {
      return res.status(503).json({
        status: 'fail',
        code: 'AI_KEY_MISSING',
        message: error.message,
      });
    }

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        status: 'fail',
        message: error.message,
      });
    }

    next(error);
  }
};

/**
 * Controller: Generate and attach AI questions to an existing interview session
 * Route: POST /api/interviews/:id/generate-questions
 * Access: Private (Requires JWT)
 */
export const generateQuestionsForSession = async (req, res, next) => {
  try {
    const interview = await Interview.findOne({
      _id: req.params.id,
      user: req.userId,
    });

    if (!interview) {
      return res.status(404).json({
        status: 'fail',
        message: 'Interview session not found or you do not have permission to access it.',
      });
    }

    // Return existing questions if available
    if (interview.questions && interview.questions.length > 0 && !req.query.regenerate) {
      return res.status(200).json({
        status: 'success',
        message: 'Existing questions retrieved for this session.',
        data: {
          interviewId: interview._id,
          role: interview.role,
          experienceLevel: interview.experienceLevel,
          difficulty: interview.difficulty,
          questions: interview.questions,
        },
      });
    }

    // Generate questions with Gemini
    const questions = await generateQuestionsWithGemini({
      jobRole: interview.role,
      experienceLevel: interview.experienceLevel,
      difficulty: interview.difficulty,
      questionCount: interview.questionCount,
    });

    // Map questions to schema format
    interview.questions = questions.map((q) => ({
      questionNumber: q.questionNumber,
      question: q.questionText,
      category: q.topic,
    }));
    interview.status = 'in_progress';
    await interview.save();

    return res.status(200).json({
      status: 'success',
      message: 'Questions generated and attached to session successfully.',
      data: {
        interviewId: interview._id,
        role: interview.role,
        experienceLevel: interview.experienceLevel,
        difficulty: interview.difficulty,
        questions,
      },
    });
  } catch (error) {
    if (error.code === 'AI_KEY_MISSING' || error.statusCode === 503) {
      return res.status(503).json({
        status: 'fail',
        code: 'AI_KEY_MISSING',
        message: error.message,
      });
    }

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        status: 'fail',
        message: error.message,
      });
    }

    next(error);
  }
};

/**
 * Controller: Start an interactive interview session
 * Route: POST /api/interviews/start
 * Access: Private (Requires JWT)
 */
export const startInterviewSession = async (req, res, next) => {
  try {
    const { interviewId, role, jobRole, experienceLevel, mode, difficulty, questionCount, questions } = req.body;
    let interview;

    // 1. If an existing interviewId is provided, retrieve and verify ownership
    if (interviewId) {
      if (!mongoose.Types.ObjectId.isValid(interviewId)) {
        return res.status(400).json({
          status: 'fail',
          message: 'Invalid interview ID format.',
        });
      }

      interview = await Interview.findOne({ _id: interviewId, user: req.userId });
      if (!interview) {
        return res.status(404).json({
          status: 'fail',
          message: 'Interview session not found or you do not have permission to start it.',
        });
      }

      // If user supplied questions from generation step, attach them
      if (Array.isArray(questions) && questions.length > 0) {
        interview.questions = questions.map((q, idx) => ({
          questionNumber: q.questionNumber || idx + 1,
          questionText: (q.questionText || q.question || '').trim(),
          question: (q.questionText || q.question || '').trim(),
          topic: (q.topic || q.category || 'Core Concepts').trim(),
          category: (q.topic || q.category || 'Core Concepts').trim(),
          userAnswer: q.userAnswer || '',
        }));
      }

      // If session still has no questions, generate them via Gemini
      if (!interview.questions || interview.questions.length === 0) {
        const generated = await generateQuestionsWithGemini({
          jobRole: interview.role,
          experienceLevel: interview.experienceLevel,
          difficulty: interview.difficulty,
          questionCount: interview.questionCount,
        });

        interview.questions = generated.map((q) => ({
          questionNumber: q.questionNumber,
          questionText: q.questionText,
          question: q.questionText,
          topic: q.topic,
          category: q.topic,
          userAnswer: '',
        }));
      }

      interview.status = 'in_progress';
      await interview.save();
    } else {
      // 2. Direct start with configuration payload
      const targetRole = (role || jobRole || '').trim();
      const errors = [];

      if (!targetRole || targetRole.length < 2) {
        errors.push('Job role is required (min 2 characters).');
      }
      if (!experienceLevel || !VALID_EXPERIENCE_LEVELS.includes(experienceLevel)) {
        errors.push(`Experience level must be one of: ${VALID_EXPERIENCE_LEVELS.join(', ')}.`);
      }
      if (!difficulty || !VALID_DIFFICULTIES.includes(difficulty)) {
        errors.push(`Difficulty must be one of: ${VALID_DIFFICULTIES.join(', ')}.`);
      }
      const parsedCount = Number(questionCount);
      if (!questionCount || !VALID_QUESTION_COUNTS.includes(parsedCount)) {
        errors.push('Question count must be 5, 10, or 15.');
      }

      if (errors.length > 0) {
        return res.status(400).json({
          status: 'fail',
          message: 'Validation failed to start interview session.',
          errors,
        });
      }

      let sessionQuestions = [];
      if (Array.isArray(questions) && questions.length > 0) {
        // Reuse pre-generated questions (no extra Gemini call)
        sessionQuestions = questions.map((q, idx) => ({
          questionNumber: q.questionNumber || idx + 1,
          questionText: (q.questionText || q.question || '').trim(),
          question: (q.questionText || q.question || '').trim(),
          topic: (q.topic || q.category || 'Core Concepts').trim(),
          category: (q.topic || q.category || 'Core Concepts').trim(),
          userAnswer: '',
        }));
      } else {
        // Generate via Gemini
        const generated = await generateQuestionsWithGemini({
          jobRole: targetRole,
          experienceLevel,
          difficulty,
          questionCount: parsedCount,
        });

        sessionQuestions = generated.map((q) => ({
          questionNumber: q.questionNumber,
          questionText: q.questionText,
          question: q.questionText,
          topic: q.topic,
          category: q.topic,
          userAnswer: '',
        }));
      }

      interview = new Interview({
        user: req.userId,
        role: targetRole,
        experienceLevel,
        mode: mode && VALID_MODES.includes(mode) ? mode : 'text',
        difficulty,
        questionCount: parsedCount,
        status: 'in_progress',
        currentQuestionIndex: 0,
        questions: sessionQuestions,
      });

      await interview.save();
    }

    const answeredCount = interview.questions.filter((q) => q.userAnswer && q.userAnswer.trim().length > 0).length;

    return res.status(200).json({
      status: 'success',
      message: 'Interview session is now active and in progress.',
      data: {
        interview,
        totalQuestions: interview.questions.length,
        answeredCount,
      },
    });
  } catch (error) {
    if (error.code === 'AI_KEY_MISSING' || error.statusCode === 503) {
      return res.status(503).json({
        status: 'fail',
        code: 'AI_KEY_MISSING',
        message: error.message,
      });
    }
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        status: 'fail',
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * Controller: Submit or save an answer for a specific question in an active session
 * Route: PUT /api/interviews/:id/answers
 * Access: Private (Requires JWT)
 */
export const submitAnswer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { questionNumber, answerText, questionIndex } = req.body;

    // 1. Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid interview ID format.',
      });
    }

    // 2. Query interview ensuring user owns it
    const interview = await Interview.findOne({ _id: id, user: req.userId });
    if (!interview) {
      return res.status(404).json({
        status: 'fail',
        message: 'Interview session not found or you do not have permission to modify it.',
      });
    }

    // 3. Prevent answer submission to completed or abandoned interviews
    if (interview.status === 'completed' || interview.status === 'abandoned') {
      return res.status(400).json({
        status: 'fail',
        message: 'Cannot submit answers to a completed or closed interview session.',
      });
    }

    // 4. Validate questionNumber
    const targetNumber = Number(
      questionNumber !== undefined ? questionNumber : (questionIndex !== undefined ? Number(questionIndex) + 1 : 0)
    );
    if (!targetNumber || targetNumber < 1 || targetNumber > interview.questions.length) {
      return res.status(400).json({
        status: 'fail',
        message: `Invalid question number. Must be between 1 and ${interview.questions.length}.`,
      });
    }

    // 5. Validate answer text
    if (typeof answerText !== 'string') {
      return res.status(400).json({
        status: 'fail',
        message: 'answerText must be a string.',
      });
    }

    // 6. Find target question and update answer
    const questionItem = interview.questions.find((q) => q.questionNumber === targetNumber);
    if (!questionItem) {
      return res.status(404).json({
        status: 'fail',
        message: `Question #${targetNumber} not found in this interview session.`,
      });
    }

    questionItem.userAnswer = answerText.trim();
    questionItem.answeredAt = new Date();

    // Update current progress index
    interview.currentQuestionIndex = Math.min(targetNumber - 1, interview.questions.length - 1);
    if (interview.status === 'configured') {
      interview.status = 'in_progress';
    }

    await interview.save();

    const answeredCount = interview.questions.filter((q) => q.userAnswer && q.userAnswer.trim().length > 0).length;
    const isAllAnswered = answeredCount === interview.questions.length;

    return res.status(200).json({
      status: 'success',
      message: 'Answer saved successfully.',
      data: {
        interviewId: interview._id,
        questionNumber: targetNumber,
        userAnswer: questionItem.userAnswer,
        answeredAt: questionItem.answeredAt,
        answeredCount,
        totalQuestions: interview.questions.length,
        isAllAnswered,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Generate an AI follow-up question for a specific question based on user's answer
 * Route: POST /api/interviews/:id/questions/:questionNumber/follow-up
 * Access: Private (Requires JWT)
 */
export const generateFollowUpQuestion = async (req, res, next) => {
  try {
    const { id, questionNumber } = req.params;

    // 1. Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid interview ID format.',
      });
    }

    // 2. Validate questionNumber
    const targetNumber = parseInt(questionNumber, 10);
    if (isNaN(targetNumber) || targetNumber < 1) {
      return res.status(400).json({
        status: 'fail',
        message: 'Question number must be a valid positive integer.',
      });
    }

    // 3. Query interview ensuring user owns it
    const interview = await Interview.findOne({ _id: id, user: req.userId });
    if (!interview) {
      return res.status(404).json({
        status: 'fail',
        message: 'Interview session not found or you do not have permission to modify it.',
      });
    }

    // 5. Check interview status
    if (interview.status === 'completed' || interview.status === 'abandoned') {
      return res.status(400).json({
        status: 'fail',
        message: `Cannot add follow-up questions to an interview that is already ${interview.status}.`,
      });
    }

    // 6. Find target question
    const targetIndex = interview.questions.findIndex((q) => q.questionNumber === targetNumber);
    if (targetIndex === -1) {
      return res.status(404).json({
        status: 'fail',
        message: `Question number ${targetNumber} does not exist in this interview session.`,
      });
    }

    const targetQuestion = interview.questions[targetIndex];

    // 7. Check if user has provided an answer
    const currentAnswer = (targetQuestion.userAnswer || '').trim();
    if (currentAnswer.length < 5) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please submit or save an answer before generating a follow-up question.',
      });
    }

    // 8. Follow-up safety checks and limits
    // Do not allow nested follow-up on an existing follow-up
    if (targetQuestion.isFollowUp) {
      return res.status(400).json({
        status: 'fail',
        message: 'Follow-up questions cannot have nested follow-ups.',
      });
    }

    // Check if a follow-up already exists for this parent question
    const existingFollowUp = interview.questions.find(
      (q) => q.isFollowUp && q.parentQuestionNumber === targetNumber
    );
    if (existingFollowUp) {
      return res.status(400).json({
        status: 'fail',
        message: `A follow-up question has already been generated for Question ${targetNumber}.`,
      });
    }

    // Max 2 follow-ups per entire interview session to keep it concise and focused
    const MAX_FOLLOW_UPS_PER_SESSION = 2;
    const currentFollowUpCount = interview.questions.filter((q) => q.isFollowUp).length;
    if (currentFollowUpCount >= MAX_FOLLOW_UPS_PER_SESSION) {
      return res.status(400).json({
        status: 'fail',
        message: `Maximum follow-up question limit (${MAX_FOLLOW_UPS_PER_SESSION}) reached for this interview session.`,
      });
    }

    // 9. Call Gemini to generate the follow-up question
    const existingQuestionTexts = interview.questions.map((q) => q.questionText || q.question);
    let aiResult;
    try {
      aiResult = await generateFollowUpQuestionWithGemini({
        jobRole: interview.role,
        experienceLevel: interview.experienceLevel,
        difficulty: interview.difficulty,
        currentQuestionText: targetQuestion.questionText || targetQuestion.question,
        userAnswer: currentAnswer,
        existingQuestions: existingQuestionTexts,
      });
    } catch (geminiError) {
      console.error('[AI Follow-Up Error]', geminiError.message);
      return res.status(502).json({
        status: 'error',
        message: 'Failed to generate AI follow-up question. You may continue to the next question.',
        details: geminiError.message,
      });
    }

    // 10. Construct new follow-up question item
    const followUpItem = {
      questionNumber: 0, // will be renumbered below
      questionText: aiResult.questionText,
      question: aiResult.questionText,
      topic: aiResult.topic || targetQuestion.topic || 'Deep Dive',
      category: aiResult.topic || targetQuestion.category || 'Deep Dive',
      userAnswer: '',
      isFollowUp: true,
      parentQuestionNumber: targetNumber,
      followUpReason: aiResult.reason || 'Investigate depth of candidate response',
      expectedKeyPoints: [],
      sampleAnswerHints: '',
    };

    // 11. Splice directly after the target question
    interview.questions.splice(targetIndex + 1, 0, followUpItem);

    // 12. Renumber all questions sequentially 1..N
    interview.questions.forEach((q, idx) => {
      q.questionNumber = idx + 1;
    });

    interview.questionCount = interview.questions.length;
    // Set currentQuestionIndex to the newly inserted follow-up question
    interview.currentQuestionIndex = targetIndex + 1;

    await interview.save();

    return res.status(200).json({
      status: 'success',
      message: 'AI follow-up question generated successfully.',
      data: {
        interview,
        followUpQuestion: interview.questions[targetIndex + 1],
        newQuestionIndex: targetIndex + 1,
        totalQuestions: interview.questions.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Conclude an interview session (completed or abandoned)
 * Route: POST /api/interviews/:id/complete
 * Access: Private (Requires JWT)
 */
export const completeInterviewSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // 1. Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid interview ID format.',
      });
    }

    // 2. Query interview ensuring user owns it
    const interview = await Interview.findOne({ _id: id, user: req.userId });
    if (!interview) {
      return res.status(404).json({
        status: 'fail',
        message: 'Interview session not found or you do not have permission to conclude it.',
      });
    }

    // Allowed completion targets
    const targetStatus = status === 'abandoned' ? 'abandoned' : 'completed';

    interview.status = targetStatus;
    if (targetStatus === 'completed') {
      interview.completedAt = new Date();
    }

    await interview.save();

    const answeredCount = interview.questions.filter((q) => q.userAnswer && q.userAnswer.trim().length > 0).length;

    return res.status(200).json({
      status: 'success',
      message: `Interview session successfully marked as ${targetStatus}.`,
      data: {
        interviewId: interview._id,
        status: interview.status,
        completedAt: interview.completedAt,
        totalQuestions: interview.questions.length,
        answeredCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Evaluate all submitted answers in an interview session and generate the final report
 * Route: POST /api/interviews/:id/evaluate
 * Access: Private (Requires JWT)
 */
export const evaluateInterviewSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const forceReevaluate = req.query.regenerate === 'true' || req.body?.forceReevaluate === true;

    // 1. Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid interview ID format.',
      });
    }

    // 2. Query interview ensuring user owns it
    const interview = await Interview.findOne({ _id: id, user: req.userId });
    if (!interview) {
      return res.status(404).json({
        status: 'fail',
        message: 'Interview session not found or you do not have permission to evaluate it.',
      });
    }

    // 3. Ensure interview has questions and submitted answers
    if (!interview.questions || interview.questions.length === 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'Interview session contains no questions.',
      });
    }

    const answeredQuestions = interview.questions.filter(
      (q) => q.userAnswer && q.userAnswer.trim().length > 0
    );

    if (answeredQuestions.length === 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'Cannot evaluate an interview with no submitted answers. Please submit at least one answer.',
      });
    }

    // 4. Evaluate each submitted answer (caching existing evaluations to prevent duplicate paid API calls)
    let evaluatedCount = 0;
    for (const q of answeredQuestions) {
      const isAlreadyEvaluated =
        !forceReevaluate &&
        q.evaluation &&
        typeof q.evaluation.overallScore === 'number' &&
        q.evaluation.relevance?.score !== undefined;

      if (!isAlreadyEvaluated) {
        const evaluation = await evaluateAnswerWithGemini({
          jobRole: interview.role,
          experienceLevel: interview.experienceLevel,
          difficulty: interview.difficulty,
          questionText: q.questionText || q.question,
          topic: q.topic || q.category || 'Engineering Fundamentals',
          userAnswer: q.userAnswer,
        });

        q.evaluation = evaluation;
      }
      evaluatedCount++;
    }

    // 5. Determine completeness status
    const totalQuestions = interview.questions.length;
    const isCompleted = interview.status === 'completed';
    const isAllAnswered = answeredQuestions.length === totalQuestions;
    const isIncomplete = !isCompleted || !isAllAnswered;

    // 6. Synthesize final interview report
    const report = await generateInterviewReportWithGemini({
      jobRole: interview.role,
      experienceLevel: interview.experienceLevel,
      difficulty: interview.difficulty,
      questionsWithEvaluations: interview.questions,
      isIncomplete,
    });

    interview.report = report;
    await interview.save();

    return res.status(200).json({
      status: 'success',
      message: 'Interview session evaluated and final report generated successfully.',
      data: {
        interviewId: interview._id,
        role: interview.role,
        experienceLevel: interview.experienceLevel,
        difficulty: interview.difficulty,
        totalQuestions,
        answeredCount: answeredQuestions.length,
        evaluatedCount,
        isIncomplete,
        report: interview.report,
        questions: interview.questions,
      },
    });
  } catch (error) {
    if (error.code === 'AI_KEY_MISSING' || error.statusCode === 503) {
      return res.status(503).json({
        status: 'fail',
        code: 'AI_KEY_MISSING',
        message: error.message,
      });
    }
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        status: 'fail',
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * Controller: Evaluate an individual submitted answer for a specific question
 * Route: POST /api/interviews/:id/questions/:questionNumber/evaluate
 * Access: Private (Requires JWT)
 */
export const evaluateSingleQuestionAnswer = async (req, res, next) => {
  try {
    const { id, questionNumber } = req.params;
    const forceReevaluate = req.body?.forceReevaluate === true || req.query.regenerate === 'true';

    // 1. Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid interview ID format.',
      });
    }

    // 2. Query interview ensuring user owns it
    const interview = await Interview.findOne({ _id: id, user: req.userId });
    if (!interview) {
      return res.status(404).json({
        status: 'fail',
        message: 'Interview session not found or you do not have permission to evaluate it.',
      });
    }

    // 3. Find target question
    const targetNum = Number(questionNumber);
    const questionItem = interview.questions.find((q) => q.questionNumber === targetNum);

    if (!questionItem) {
      return res.status(404).json({
        status: 'fail',
        message: `Question #${targetNum} not found in this interview session.`,
      });
    }

    // 4. Reject unsubmitted answers
    if (!questionItem.userAnswer || questionItem.userAnswer.trim().length === 0) {
      return res.status(400).json({
        status: 'fail',
        message: `Cannot evaluate Question #${targetNum} because no answer has been submitted for it.`,
      });
    }

    // 5. If already evaluated and not forced, return cached evaluation
    const isAlreadyEvaluated =
      !forceReevaluate &&
      questionItem.evaluation &&
      typeof questionItem.evaluation.overallScore === 'number';

    if (!isAlreadyEvaluated) {
      const evaluation = await evaluateAnswerWithGemini({
        jobRole: interview.role,
        experienceLevel: interview.experienceLevel,
        difficulty: interview.difficulty,
        questionText: questionItem.questionText || questionItem.question,
        topic: questionItem.topic || questionItem.category || 'Engineering Fundamentals',
        userAnswer: questionItem.userAnswer,
      });

      questionItem.evaluation = evaluation;
      await interview.save();
    }

    return res.status(200).json({
      status: 'success',
      message: `Question #${targetNum} evaluated successfully.`,
      data: {
        interviewId: interview._id,
        questionNumber: targetNum,
        evaluation: questionItem.evaluation,
      },
    });
  } catch (error) {
    if (error.code === 'AI_KEY_MISSING' || error.statusCode === 503) {
      return res.status(503).json({
        status: 'fail',
        code: 'AI_KEY_MISSING',
        message: error.message,
      });
    }
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        status: 'fail',
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * Controller: Get final interview evaluation report
 * Route: GET /api/interviews/:id/report
 * Access: Private (Requires JWT)
 */
export const getInterviewReport = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid interview ID format.',
      });
    }

    // 2. Query interview ensuring user owns it
    const interview = await Interview.findOne({ _id: id, user: req.userId });
    if (!interview) {
      return res.status(404).json({
        status: 'fail',
        message: 'Interview session not found or you do not have permission to view it.',
      });
    }

    const answeredCount = interview.questions.filter((q) => q.userAnswer && q.userAnswer.trim().length > 0).length;
    const evaluatedCount = interview.questions.filter((q) => q.evaluation && typeof q.evaluation.overallScore === 'number').length;
    const totalQuestions = interview.questions.length;

    // Check if report exists
    const hasReport = interview.report && interview.report.status === 'completed';

    return res.status(200).json({
      status: 'success',
      data: {
        hasReport,
        report: hasReport ? interview.report : null,
        interview: {
          _id: interview._id,
          role: interview.role,
          experienceLevel: interview.experienceLevel,
          difficulty: interview.difficulty,
          mode: interview.mode,
          status: interview.status,
          completedAt: interview.completedAt,
          createdAt: interview.createdAt,
          totalQuestions,
          answeredCount,
          evaluatedCount,
        },
        questions: interview.questions,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Get authenticated candidate's performance analytics and trend data
 * Route: GET /api/interviews/analytics
 * Access: Private (Requires JWT)
 *
 * Requirements:
 * - Strictly scoped to authenticated req.userId (never trust client-supplied ID)
 * - Excludes heavy question and answer text (.select() with projected fields)
 * - Returns genuine aggregate stats: completedInterviews, evaluatedInterviews, averageScore, bestScore
 * - Returns chronologically sorted trend data for score graphing
 * - Returns two-point comparison (latest vs previous) with honest non-dogmatic labeling
 * - Returns role-wise analytics breakdown
 */
export const getInterviewAnalytics = async (req, res, next) => {
  try {
    const userId = req.userId;

    const interviews = await Interview.find({ user: userId })
      .select({
        role: 1,
        experienceLevel: 1,
        difficulty: 1,
        mode: 1,
        status: 1,
        completedAt: 1,
        createdAt: 1,
        'report.summaryScore': 1,
        'report.status': 1,
        'report.generatedAt': 1,
        'report.isIncomplete': 1,
      })
      .sort({ createdAt: 1 })
      .lean();

    const totalInterviews = interviews.length;
    const completedInterviews = interviews.filter((i) => i.status === 'completed').length;

    // Filter valid evaluated interviews (score between 0 and 100)
    const evaluatedInterviewsList = interviews.filter(
      (item) =>
        item.report &&
        typeof item.report.summaryScore === 'number' &&
        !isNaN(item.report.summaryScore) &&
        item.report.summaryScore >= 0 &&
        item.report.summaryScore <= 100
    );

    const evaluatedCount = evaluatedInterviewsList.length;

    let averageScore = null;
    let bestScore = null;

    if (evaluatedCount > 0) {
      const scoreSum = evaluatedInterviewsList.reduce((acc, curr) => acc + curr.report.summaryScore, 0);
      averageScore = Math.round(scoreSum / evaluatedCount);
      bestScore = Math.max(...evaluatedInterviewsList.map((curr) => curr.report.summaryScore));
    }

    // Chronological trend data sorted by actual interview timestamp
    const trendData = [...evaluatedInterviewsList]
      .sort((a, b) => {
        const dateA = new Date(a.completedAt || a.report?.generatedAt || a.createdAt).getTime();
        const dateB = new Date(b.completedAt || b.report?.generatedAt || b.createdAt).getTime();
        return dateA - dateB;
      })
      .map((item, index) => {
        const interviewDate = item.completedAt || item.report?.generatedAt || item.createdAt;
        return {
          interviewId: item._id,
          sessionNumber: index + 1,
          role: item.role,
          experienceLevel: item.experienceLevel,
          difficulty: item.difficulty,
          status: item.status,
          date: interviewDate,
          score: item.report.summaryScore,
        };
      });

    // Two-session Comparison (Latest vs Previous)
    let comparison = null;
    if (trendData.length >= 2) {
      const latest = trendData[trendData.length - 1];
      const previous = trendData[trendData.length - 2];
      const difference = latest.score - previous.score;

      comparison = {
        hasComparison: true,
        latest: {
          interviewId: latest.interviewId,
          role: latest.role,
          score: latest.score,
          date: latest.date,
        },
        previous: {
          interviewId: previous.interviewId,
          role: previous.role,
          score: previous.score,
          date: previous.date,
        },
        difference,
        label:
          difference > 0
            ? `+${difference}% compared to previous session`
            : difference < 0
            ? `${difference}% compared to previous session`
            : 'Same score as previous session',
      };
    } else if (trendData.length === 1) {
      comparison = {
        hasComparison: false,
        latest: {
          interviewId: trendData[0].interviewId,
          role: trendData[0].role,
          score: trendData[0].score,
          date: trendData[0].date,
        },
        previous: null,
        difference: null,
        message: 'Complete at least 2 evaluated interviews to view a side-by-side session comparison.',
      };
    } else {
      comparison = {
        hasComparison: false,
        latest: null,
        previous: null,
        difference: null,
        message: 'No evaluated interviews found on record yet.',
      };
    }

    // Role-wise Analytics
    const roleMap = new Map();
    for (const item of interviews) {
      const roleName = (item.role || 'General Technical').trim();
      if (!roleMap.has(roleName)) {
        roleMap.set(roleName, {
          role: roleName,
          totalInterviews: 0,
          completedInterviews: 0,
          evaluatedInterviews: 0,
          scores: [],
          latestDate: item.createdAt,
        });
      }

      const roleEntry = roleMap.get(roleName);
      roleEntry.totalInterviews += 1;
      if (item.status === 'completed') {
        roleEntry.completedInterviews += 1;
      }
      if (
        item.report &&
        typeof item.report.summaryScore === 'number' &&
        !isNaN(item.report.summaryScore) &&
        item.report.summaryScore >= 0 &&
        item.report.summaryScore <= 100
      ) {
        roleEntry.evaluatedInterviews += 1;
        roleEntry.scores.push(item.report.summaryScore);
      }

      const itemDate = new Date(item.completedAt || item.createdAt);
      if (itemDate > new Date(roleEntry.latestDate)) {
        roleEntry.latestDate = itemDate;
      }
    }

    const roleAnalytics = Array.from(roleMap.values())
      .map((entry) => {
        const avg =
          entry.scores.length > 0
            ? Math.round(entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length)
            : null;
        const best = entry.scores.length > 0 ? Math.max(...entry.scores) : null;
        return {
          role: entry.role,
          totalInterviews: entry.totalInterviews,
          completedInterviews: entry.completedInterviews,
          evaluatedInterviews: entry.evaluatedInterviews,
          averageScore: avg,
          bestScore: best,
          latestDate: entry.latestDate,
        };
      })
      .sort((a, b) => b.totalInterviews - a.totalInterviews);

    return res.status(200).json({
      status: 'success',
      data: {
        summary: {
          totalInterviews,
          completedInterviews,
          evaluatedInterviews: evaluatedCount,
          averageScore,
          bestScore,
        },
        trendData,
        comparison,
        roleAnalytics,
      },
    });
  } catch (error) {
    next(error);
  }
};


import mongoose from 'mongoose';

/**
 * Interview Session Schema
 * Persists the configuration and lifecycle status of user mock interview sessions.
 */
const interviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    role: {
      type: String,
      required: [true, 'Job role is required'],
      trim: true,
      minlength: [2, 'Role must be at least 2 characters long'],
      maxlength: [100, 'Role cannot exceed 100 characters'],
    },
    experienceLevel: {
      type: String,
      required: [true, 'Experience level is required'],
      enum: {
        values: ['Beginner', 'Intermediate', 'Experienced'],
        message: 'Experience level must be Beginner, Intermediate, or Experienced',
      },
    },
    mode: {
      type: String,
      required: [true, 'Interview mode is required'],
      enum: {
        values: ['text', 'audio_video'],
        message: 'Interview mode must be either text or audio_video',
      },
    },
    difficulty: {
      type: String,
      required: [true, 'Difficulty level is required'],
      enum: {
        values: ['Easy', 'Medium', 'Hard'],
        message: 'Difficulty must be Easy, Medium, or Hard',
      },
    },
    questionCount: {
      type: Number,
      required: [true, 'Question count is required'],
      min: [1, 'Question count must be at least 1'],
      default: 5,
    },
    status: {
      type: String,
      enum: ['configured', 'in_progress', 'completed', 'abandoned'],
      default: 'configured',
    },
    currentQuestionIndex: {
      type: Number,
      default: 0,
      min: 0,
    },
    completedAt: {
      type: Date,
    },
    questions: [
      {
        questionNumber: { type: Number, required: true },
        questionText: { type: String },
        question: { type: String },
        topic: { type: String },
        category: { type: String },
        userAnswer: { type: String, default: '' },
        answeredAt: { type: Date },
        isFollowUp: { type: Boolean, default: false },
        parentQuestionNumber: { type: Number },
        followUpReason: { type: String, default: '' },
        expectedKeyPoints: [{ type: String }],
        sampleAnswerHints: { type: String },
        // Phase 6 Step 4: AI Evaluation fields per question
        evaluation: {
          evaluatedAt: { type: Date },
          overallScore: { type: Number, min: 0, max: 10 },
          relevance: {
            score: { type: Number, min: 0, max: 10 },
            feedback: { type: String, default: '' },
          },
          technicalAccuracy: {
            score: { type: Number, min: 0, max: 10 },
            feedback: { type: String, default: '' },
          },
          completeness: {
            score: { type: Number, min: 0, max: 10 },
            feedback: { type: String, default: '' },
          },
          communication: {
            score: { type: Number, min: 0, max: 10 },
            feedback: { type: String, default: '' },
          },
          strengths: [{ type: String }],
          improvements: [{ type: String }],
          suggestedAnswer: { type: String, default: '' },
        },
      },
    ],
    // Phase 6 Step 4: Session-level Final Interview Report
    report: {
      generatedAt: { type: Date },
      summaryScore: { type: Number, min: 0, max: 100, default: null },
      overallFeedback: { type: String, default: '' },
      strengths: [{ type: String }],
      commonImprovements: [{ type: String }],
      suggestedTopics: [{ type: String }],
      isIncomplete: { type: Boolean, default: false },
      status: {
        type: String,
        enum: ['not_generated', 'completed', 'failed'],
        default: 'not_generated',
      },
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save normalization hook to ensure questionText/topic and question/category are synchronized
interviewSchema.pre('save', function () {
  if (this.questions && Array.isArray(this.questions)) {
    this.questions.forEach((q) => {
      // Synchronize questionText <-> question
      if (!q.questionText && q.question) {
        q.questionText = q.question;
      } else if (!q.question && q.questionText) {
        q.question = q.questionText;
      }

      // Synchronize topic <-> category
      if (!q.topic && q.category) {
        q.topic = q.category;
      } else if (!q.category && q.topic) {
        q.category = q.topic;
      }
    });
  }
});

const Interview = mongoose.model('Interview', interviewSchema);

export default Interview;

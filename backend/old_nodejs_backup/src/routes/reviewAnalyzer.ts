import express from 'express';
import axios from 'axios';
import { body, validationResult } from 'express-validator';
import { AnalysisResult } from '../models/AnalysisResult';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Validation rules
const analyzeValidation = [
  body('text')
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Review text must be between 10 and 5000 characters'),
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('productName')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Product name cannot exceed 200 characters'),
];

// Helper function to analyze review authenticity using AI
const analyzeReviewWithAI = async (text: string, rating?: number, productName?: string): Promise<any> => {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    throw createError('Google Gemini API key not configured', 500);
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

  const systemPrompt = `You are Trustek, an expert in detecting fake reviews and suspicious rating patterns. Analyze the provided review for authenticity indicators such as:

1. Language patterns typical of fake reviews (overly positive/negative, generic phrases, repetitive language)
2. Suspicious rating patterns (all 5-star or all 1-star reviews)
3. Lack of specific details about the product/service
4. Unusual writing style or grammar patterns
5. Potential bot-generated content

Provide a verdict: SAFE (genuine review), SUSPICIOUS (potentially fake), or MALICIOUS (clearly fake).
Include a confidence score (0-1) and detailed analysis explaining your reasoning.`;

  const prompt = `Analyze this review for authenticity:
${productName ? `Product: ${productName}` : ''}
${rating ? `Rating: ${rating}/5 stars` : ''}
Review Text: "${text}"

Provide a detailed analysis of whether this review appears to be genuine or fake.`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: {
      parts: [{ text: systemPrompt }]
    },
  };

  try {
    const response = await axios.post(apiUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    });

    return response.data;
  } catch (error) {
    logger.error('Review analysis API call failed:', error);
    throw error;
  }
};

// Helper function to extract verdict and confidence from AI response
const extractReviewAnalysis = (responseText: string): { verdict: 'SAFE' | 'SUSPICIOUS' | 'MALICIOUS'; confidence: number } => {
  const upperText = responseText.toUpperCase();
  
  if (upperText.includes('SAFE') || upperText.includes('GENUINE') || upperText.includes('AUTHENTIC')) {
    return { verdict: 'SAFE', confidence: 0.8 };
  } else if (upperText.includes('MALICIOUS') || upperText.includes('FAKE') || upperText.includes('BOT')) {
    return { verdict: 'MALICIOUS', confidence: 0.9 };
  } else if (upperText.includes('SUSPICIOUS') || upperText.includes('POTENTIALLY')) {
    return { verdict: 'SUSPICIOUS', confidence: 0.7 };
  } else {
    return { verdict: 'SUSPICIOUS', confidence: 0.6 };
  }
};

// Helper function to detect fake review patterns
const detectFakePatterns = (text: string, rating?: number): any => {
  const patterns = {
    excessivePunctuation: (text.match(/[!]{2,}/g) || []).length > 2,
    repetitiveWords: /(\b\w+\b).*\1.*\1/.test(text),
    genericPhrases: /\b(amazing|incredible|terrible|awful|best|worst)\b/i.test(text) && text.length < 100,
    allCaps: text.length > 50 && text === text.toUpperCase(),
    suspiciousRating: rating === 5 && text.length < 50,
    noSpecifics: !/\b(quality|delivery|service|product|experience)\b/i.test(text) && text.length > 100,
  };

  const suspiciousCount = Object.values(patterns).filter(Boolean).length;
  
  return {
    patterns,
    suspiciousScore: suspiciousCount / Object.keys(patterns).length,
  };
};

// @route   POST /api/review-analyzer/analyze
// @desc    Analyze review for authenticity
// @access  Private
router.post('/analyze', analyzeValidation, asyncHandler(async (req: AuthRequest, res) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  // Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array(),
    });
  }

  const { text, rating, productName } = req.body;
  const startTime = Date.now();

  try {
    // Detect patterns first
    const patternAnalysis = detectFakePatterns(text, rating);

    // Get AI analysis
    const aiResponse = await analyzeReviewWithAI(text, rating, productName);
    const candidate = aiResponse.candidates?.[0];

    if (!candidate || !candidate.content?.parts?.[0]?.text) {
      throw createError('Received an empty response from the AI service', 500);
    }

    const analysisText = candidate.content.parts[0].text;
    const processingTime = Date.now() - startTime;

    // Extract verdict and confidence
    const { verdict, confidence } = extractReviewAnalysis(analysisText);

    // Combine pattern analysis with AI analysis for final verdict
    const finalConfidence = Math.min(confidence + (patternAnalysis.suspiciousScore * 0.2), 1);
    const finalVerdict = patternAnalysis.suspiciousScore > 0.7 ? 'SUSPICIOUS' : verdict;

    // Save analysis result
    const analysisResult = new AnalysisResult({
      userId: req.user.id,
      type: 'review',
      input: text,
      result: {
        verdict: finalVerdict,
        confidence: finalConfidence,
        summary: analysisText,
        details: {
          patternAnalysis,
          rating,
          productName,
          modelUsed: 'gemini-2.5-flash-preview-05-20',
        },
      },
      metadata: {
        processingTime,
        apiUsed: 'google-gemini',
        timestamp: new Date(),
      },
    });

    await analysisResult.save();

    logger.info('Review analysis completed', {
      userId: req.user.id,
      verdict: finalVerdict,
      confidence: finalConfidence,
      processingTime,
      suspiciousScore: patternAnalysis.suspiciousScore,
    });

    res.json({
      success: true,
      result: {
        verdict: finalVerdict,
        confidence: finalConfidence,
        summary: analysisText,
        patternAnalysis,
        processingTime,
      },
    });

  } catch (error) {
    logger.error('Review analysis failed:', error);
    
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 429) {
        throw createError('Rate limit exceeded. Please try again later.', 429);
      } else if (error.response?.status === 401) {
        throw createError('Invalid API key. Please contact support.', 500);
      }
    }

    throw createError('Failed to analyze review. Please try again.', 500);
  }
}));

// @route   POST /api/review-analyzer/batch-analyze
// @desc    Analyze multiple reviews at once
// @access  Private
router.post('/batch-analyze', asyncHandler(async (req: AuthRequest, res) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  const { reviews } = req.body;

  if (!Array.isArray(reviews) || reviews.length === 0) {
    return res.status(400).json({
      error: 'Invalid input',
      message: 'Please provide an array of reviews to analyze',
    });
  }

  if (reviews.length > 10) {
    return res.status(400).json({
      error: 'Too many reviews',
      message: 'Maximum 10 reviews can be analyzed at once',
    });
  }

  const results = [];
  const startTime = Date.now();

  for (const review of reviews) {
    try {
      const { text, rating, productName } = review;
      
      if (!text || typeof text !== 'string') {
        results.push({
          error: 'Invalid review text',
          review,
        });
        continue;
      }

      const patternAnalysis = detectFakePatterns(text, rating);
      const { verdict, confidence } = extractReviewAnalysis(text);
      const finalConfidence = Math.min(confidence + (patternAnalysis.suspiciousScore * 0.2), 1);
      const finalVerdict = patternAnalysis.suspiciousScore > 0.7 ? 'SUSPICIOUS' : verdict;

      results.push({
        review,
        result: {
          verdict: finalVerdict,
          confidence: finalConfidence,
          patternAnalysis,
        },
      });

    } catch (error) {
      logger.error('Batch review analysis error:', error);
      results.push({
        error: 'Analysis failed',
        review,
      });
    }
  }

  const processingTime = Date.now() - startTime;

  logger.info('Batch review analysis completed', {
    userId: req.user.id,
    reviewCount: reviews.length,
    processingTime,
  });

  res.json({
    success: true,
    results,
    processingTime,
    totalReviews: reviews.length,
  });
}));

// @route   GET /api/review-analyzer/history
// @desc    Get user's review analysis history
// @access  Private
router.get('/history', asyncHandler(async (req: AuthRequest, res) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const analysisResults = await AnalysisResult.find({
    userId: req.user.id,
    type: 'review',
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('-userId -__v');

  const totalCount = await AnalysisResult.countDocuments({
    userId: req.user.id,
    type: 'review',
  });

  res.json({
    history: analysisResults,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
      hasNext: page < Math.ceil(totalCount / limit),
      hasPrev: page > 1,
    },
  });
}));

// @route   GET /api/review-analyzer/stats
// @desc    Get review analysis statistics
// @access  Private
router.get('/stats', asyncHandler(async (req: AuthRequest, res) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  const stats = await AnalysisResult.aggregate([
    { $match: { userId: req.user.id, type: 'review' } },
    {
      $group: {
        _id: '$result.verdict',
        count: { $sum: 1 },
        avgConfidence: { $avg: '$result.confidence' },
      },
    },
  ]);

  const totalAnalyses = await AnalysisResult.countDocuments({
    userId: req.user.id,
    type: 'review',
  });

  res.json({
    totalAnalyses,
    verdictDistribution: stats,
  });
}));

export default router;

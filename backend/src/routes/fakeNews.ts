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
    .isLength({ min: 10, max: 10000 })
    .withMessage('Text must be between 10 and 10000 characters'),
];

// Helper function to call Google Gemini API with retry logic
const callGeminiAPI = async (text: string, retries: number = 3): Promise<any> => {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    throw createError('Google Gemini API key not configured', 500);
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

  const systemPrompt = "You are Trustek, a dedicated fact-checker and journalist AI. Your task is to analyze the user's provided text or claim. Use Google Search grounding to verify the information. Provide a clear verdict (TRUE, FALSE, or UNVERIFIED) followed by a concise, explanatory summary of why the claim is trustworthy or misleading, citing the sources found.";

  const payload = {
    contents: [{ parts: [{ text: `Analyze the following claim/text for authenticity: "${text}"` }] }],
    tools: [{ "google_search": {} }], // Enable Google Search grounding
    systemInstruction: {
      parts: [{ text: systemPrompt }]
    },
  };

  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.post(apiUrl, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000, // 30 second timeout
      });

      if (response.status !== 200) {
        throw new Error(`API returned status ${response.status}`);
      }

      return response.data;
    } catch (error) {
      logger.error(`Gemini API call attempt ${i + 1} failed:`, error);
      
      if (i === retries - 1) {
        throw error;
      }
      
      // Exponential backoff
      const delay = Math.pow(2, i) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Helper function to extract sources from grounding metadata
const extractSources = (groundingMetadata: any): Array<{ uri: string; title: string; domain: string }> => {
  if (!groundingMetadata || !groundingMetadata.groundingAttributions) {
    return [];
  }

  return groundingMetadata.groundingAttributions
    .map((attribution: any) => ({
      uri: attribution.web?.uri,
      title: attribution.web?.title,
      domain: attribution.web?.uri ? new URL(attribution.web.uri).hostname : '',
    }))
    .filter((source: any) => source.uri && source.title);
};

// Helper function to determine verdict and confidence
const analyzeVerdict = (text: string): { verdict: 'TRUE' | 'FALSE' | 'UNVERIFIED'; confidence: number } => {
  const upperText = text.toUpperCase();
  
  if (upperText.includes('TRUE') && upperText.includes('VERIFIED')) {
    return { verdict: 'TRUE', confidence: 0.9 };
  } else if (upperText.includes('FALSE') || upperText.includes('MISLEADING')) {
    return { verdict: 'FALSE', confidence: 0.8 };
  } else if (upperText.includes('UNVERIFIED') || upperText.includes('INSUFFICIENT')) {
    return { verdict: 'UNVERIFIED', confidence: 0.6 };
  } else {
    // Default confidence based on text analysis
    const confidence = text.length > 200 ? 0.7 : 0.5;
    return { verdict: 'UNVERIFIED', confidence };
  }
};

// @route   POST /api/fake-news/analyze
// @desc    Analyze text for fake news
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

  const { text } = req.body;
  const startTime = Date.now();

  try {
    // Call Google Gemini API
    const response = await callGeminiAPI(text);
    const candidate = response.candidates?.[0];

    if (!candidate || !candidate.content?.parts?.[0]?.text) {
      throw createError('Received an empty or malformed response from the AI service', 500);
    }

    const analysisText = candidate.content.parts[0].text;
    const processingTime = Date.now() - startTime;

    // Extract sources
    const sources = extractSources(candidate.groundingMetadata);

    // Analyze verdict
    const { verdict, confidence } = analyzeVerdict(analysisText);

    // Save analysis result to database
    const analysisResult = new AnalysisResult({
      userId: req.user.id,
      type: 'fake_news',
      input: text,
      result: {
        verdict,
        confidence,
        summary: analysisText,
        sources,
        details: {
          groundingMetadata: candidate.groundingMetadata,
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

    logger.info('Fake news analysis completed', {
      userId: req.user.id,
      verdict,
      confidence,
      processingTime,
      sourcesCount: sources.length,
    });

    res.json({
      success: true,
      result: {
        verdict,
        confidence,
        summary: analysisText,
        sources,
        processingTime,
      },
    });

  } catch (error) {
    logger.error('Fake news analysis failed:', error);
    
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 429) {
        throw createError('Rate limit exceeded. Please try again later.', 429);
      } else if (error.response?.status === 401) {
        throw createError('Invalid API key. Please contact support.', 500);
      } else if (error.response?.status === 400) {
        throw createError('Invalid request. Please check your input.', 400);
      }
    }

    throw createError('Failed to analyze text. Please try again.', 500);
  }
}));

// @route   GET /api/fake-news/history
// @desc    Get user's fake news analysis history
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
    type: 'fake_news',
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('-userId -__v');

  const totalCount = await AnalysisResult.countDocuments({
    userId: req.user.id,
    type: 'fake_news',
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

// @route   GET /api/fake-news/stats
// @desc    Get fake news analysis statistics
// @access  Private
router.get('/stats', asyncHandler(async (req: AuthRequest, res) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  const stats = await AnalysisResult.aggregate([
    { $match: { userId: req.user.id, type: 'fake_news' } },
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
    type: 'fake_news',
  });

  const avgProcessingTime = await AnalysisResult.aggregate([
    { $match: { userId: req.user.id, type: 'fake_news' } },
    {
      $group: {
        _id: null,
        avgTime: { $avg: '$metadata.processingTime' },
      },
    },
  ]);

  res.json({
    totalAnalyses,
    verdictDistribution: stats,
    averageProcessingTime: avgProcessingTime[0]?.avgTime || 0,
  });
}));

export default router;

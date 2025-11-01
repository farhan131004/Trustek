import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { body, validationResult } from 'express-validator';
import { AnalysisResult } from '../models/AnalysisResult';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Validation rules
const scanValidation = [
  body('url')
    .isURL({ protocols: ['http', 'https'] })
    .withMessage('Please provide a valid URL'),
];

// Helper function to check URL with VirusTotal API
const checkWithVirusTotal = async (url: string): Promise<any> => {
  const apiKey = process.env.VIRUSTOTAL_API_KEY;
  if (!apiKey) {
    return null; // Skip if no API key
  }

  try {
    // Submit URL for scanning
    const submitResponse = await axios.post(
      'https://www.virustotal.com/vtapi/v2/url/scan',
      new URLSearchParams({
        apikey: apiKey,
        url: url,
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000,
      }
    );

    // Wait a bit for scan to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get scan results
    const reportResponse = await axios.get(
      `https://www.virustotal.com/vtapi/v2/url/report`,
      {
        params: {
          apikey: apiKey,
          resource: url,
        },
        timeout: 10000,
      }
    );

    return reportResponse.data;
  } catch (error) {
    logger.error('VirusTotal API error:', error);
    return null;
  }
};

// Helper function to check URL with PhishTank API
const checkWithPhishTank = async (url: string): Promise<any> => {
  const apiKey = process.env.PHISHTANK_API_KEY;
  if (!apiKey) {
    return null; // Skip if no API key
  }

  try {
    const response = await axios.post(
      'https://checkurl.phishtank.com/checkurl/',
      new URLSearchParams({
        url: url,
        format: 'json',
        app_key: apiKey,
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000,
      }
    );

    return response.data;
  } catch (error) {
    logger.error('PhishTank API error:', error);
    return null;
  }
};

// Helper function to analyze website content
const analyzeWebsiteContent = async (url: string): Promise<any> => {
  try {
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      maxRedirects: 5,
    });

    const $ = cheerio.load(response.data);
    
    // Extract basic information
    const title = $('title').text().trim();
    const description = $('meta[name="description"]').attr('content') || '';
    const keywords = $('meta[name="keywords"]').attr('content') || '';
    
    // Check for suspicious patterns
    const suspiciousPatterns = {
      suspiciousKeywords: /(click here|free money|win now|urgent|limited time|act now)/i.test(title + ' ' + description),
      missingSSL: !url.startsWith('https://'),
      suspiciousDomain: /[0-9]{4,}/.test(url) || /bit\.ly|tinyurl|goo\.gl/i.test(url),
      suspiciousContent: /(congratulations|winner|prize|lottery|inheritance)/i.test(response.data),
      missingContactInfo: !$('a[href*="contact"], a[href*="about"]').length,
      excessiveAds: $('iframe, script[src*="ads"], .advertisement').length > 10,
    };

    // Calculate trust score
    const suspiciousCount = Object.values(suspiciousPatterns).filter(Boolean).length;
    const trustScore = Math.max(0, 1 - (suspiciousCount / Object.keys(suspiciousPatterns).length));

    return {
      title,
      description,
      keywords,
      suspiciousPatterns,
      trustScore,
      statusCode: response.status,
      contentLength: response.data.length,
    };

  } catch (error) {
    logger.error('Website content analysis error:', error);
    return {
      error: 'Failed to analyze website content',
      trustScore: 0.3, // Low trust score for inaccessible sites
    };
  }
};

// Helper function to determine final verdict
const determineVerdict = (trustScore: number, virusTotalResult?: any, phishTankResult?: any): 'SAFE' | 'SUSPICIOUS' | 'MALICIOUS' => {
  // Check VirusTotal results
  if (virusTotalResult && virusTotalResult.positives > 0) {
    const detectionRatio = virusTotalResult.positives / virusTotalResult.total;
    if (detectionRatio > 0.1) { // More than 10% detection
      return 'MALICIOUS';
    }
  }

  // Check PhishTank results
  if (phishTankResult && phishTankResult.in_database && phishTankResult.verified) {
    return 'MALICIOUS';
  }

  // Use trust score
  if (trustScore < 0.3) {
    return 'MALICIOUS';
  } else if (trustScore < 0.6) {
    return 'SUSPICIOUS';
  } else {
    return 'SAFE';
  }
};

// @route   POST /api/website-scanner/scan
// @desc    Scan website for security threats
// @access  Private
router.post('/scan', scanValidation, asyncHandler(async (req: AuthRequest, res) => {
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

  const { url } = req.body;
  const startTime = Date.now();

  try {
    // Normalize URL
    const normalizedUrl = new URL(url).href;

    // Run multiple checks in parallel
    const [virusTotalResult, phishTankResult, contentAnalysis] = await Promise.allSettled([
      checkWithVirusTotal(normalizedUrl),
      checkWithPhishTank(normalizedUrl),
      analyzeWebsiteContent(normalizedUrl),
    ]);

    const processingTime = Date.now() - startTime;

    // Extract results
    const vtResult = virusTotalResult.status === 'fulfilled' ? virusTotalResult.value : null;
    const ptResult = phishTankResult.status === 'fulfilled' ? phishTankResult.value : null;
    const content = contentAnalysis.status === 'fulfilled' ? contentAnalysis.value : { trustScore: 0.3 };

    // Determine final verdict
    const verdict = determineVerdict(content.trustScore || 0.5, vtResult, ptResult);
    const confidence = Math.min(content.trustScore || 0.5 + 0.3, 1); // Boost confidence if external APIs confirm

    // Generate summary
    const summary = generateScanSummary(verdict, content, vtResult, ptResult);

    // Save analysis result
    const analysisResult = new AnalysisResult({
      userId: req.user.id,
      type: 'website',
      input: normalizedUrl,
      result: {
        verdict,
        confidence,
        summary,
        details: {
          contentAnalysis: content,
          virusTotalResult: vtResult,
          phishTankResult: ptResult,
          scanTimestamp: new Date(),
        },
      },
      metadata: {
        processingTime,
        apiUsed: 'virustotal,phishtank,content-analysis',
        timestamp: new Date(),
      },
    });

    await analysisResult.save();

    logger.info('Website scan completed', {
      userId: req.user.id,
      url: normalizedUrl,
      verdict,
      confidence,
      processingTime,
    });

    res.json({
      success: true,
      result: {
        url: normalizedUrl,
        verdict,
        confidence,
        summary,
        details: {
          contentAnalysis: content,
          virusTotalResult: vtResult,
          phishTankResult: ptResult,
        },
        processingTime,
      },
    });

  } catch (error) {
    logger.error('Website scan failed:', error);
    
    if (error instanceof TypeError && error.message.includes('Invalid URL')) {
      throw createError('Invalid URL format', 400);
    }

    throw createError('Failed to scan website. Please try again.', 500);
  }
}));

// Helper function to generate scan summary
const generateScanSummary = (verdict: string, content: any, vtResult?: any, ptResult?: any): string => {
  let summary = `Website analysis completed. Verdict: ${verdict}. `;

  if (content.title) {
    summary += `Site title: "${content.title}". `;
  }

  if (content.suspiciousPatterns) {
    const suspiciousCount = Object.values(content.suspiciousPatterns).filter(Boolean).length;
    if (suspiciousCount > 0) {
      summary += `Found ${suspiciousCount} suspicious patterns. `;
    }
  }

  if (vtResult && vtResult.positives > 0) {
    summary += `VirusTotal detected ${vtResult.positives} security threats. `;
  }

  if (ptResult && ptResult.in_database && ptResult.verified) {
    summary += `PhishTank confirmed this as a phishing site. `;
  }

  if (content.trustScore !== undefined) {
    summary += `Trust score: ${Math.round(content.trustScore * 100)}%.`;
  }

  return summary;
};

// @route   GET /api/website-scanner/history
// @desc    Get user's website scan history
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
    type: 'website',
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('-userId -__v');

  const totalCount = await AnalysisResult.countDocuments({
    userId: req.user.id,
    type: 'website',
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

// @route   GET /api/website-scanner/stats
// @desc    Get website scan statistics
// @access  Private
router.get('/stats', asyncHandler(async (req: AuthRequest, res) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  const stats = await AnalysisResult.aggregate([
    { $match: { userId: req.user.id, type: 'website' } },
    {
      $group: {
        _id: '$result.verdict',
        count: { $sum: 1 },
        avgConfidence: { $avg: '$result.confidence' },
      },
    },
  ]);

  const totalScans = await AnalysisResult.countDocuments({
    userId: req.user.id,
    type: 'website',
  });

  res.json({
    totalScans,
    verdictDistribution: stats,
  });
}));

export default router;

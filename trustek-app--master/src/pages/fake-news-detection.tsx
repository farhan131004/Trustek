import HealthStatus from "@/components/ui/HealthStatus";
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Send, CheckCircle, XCircle, Image, Globe, Search, ShieldCheck, Info, Shield } from 'lucide-react';
import apiService from '@/services/api';

// --- Types ---
interface AnalysisResult {
  detected_text?: string;
  label: 'Fake' | 'Real';
  confidence: number;
  source_status?: 'Safe' | 'Suspicious' | 'Unverified';
  source_summary?: string;
  sources?: Array<{ title?: string; url?: string; snippet?: string; source?: string }>; 
}
interface StructuredReportClaim { id: number; claim: string; judgement: 'Supported' | 'Unverified' | 'Contradicted'; sources: Array<{ url: string; snippet: string }>; }
interface StructuredReport { verdict: 'REAL' | 'MIXED' | 'LIKELY_FAKE' | 'UNVERIFIED'; credibility_score: number; confidence: number; claims: StructuredReportClaim[]; reasoning: string[]; }

// --- Component ---
const FakeNewsDetectionPage: React.FC = () => {
  const [inputType, setInputType] = useState<'url' | 'image'>('url');
  const [url, setUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [showCredibilityInfo, setShowCredibilityInfo] = useState<boolean>(false);
  const [showAdvancedJson, setShowAdvancedJson] = useState<boolean>(false);
  const [structured, setStructured] = useState<StructuredReport | null>(null);
  const [structuredLoading, setStructuredLoading] = useState<boolean>(false);
  const [structuredError, setStructuredError] = useState<string | null>(null);
  const [mode, setMode] = useState<'rule' | 'llm' | 'hybrid'>('hybrid');
  const loadingMessages = useRef<string[]>(['Fetching…','Verifying…','Loading…']);

  const phaseForProgress = (p: number) => {
    // Professional alternatives mapped to phases
    if (p <= 15) return { title: 'Phase 1 — Establishing Data Traceability and Origin', icon: <Search className="w-4 h-4" /> };
    if (p <= 50) return { title: 'Phase 2 — Deep Claim Analysis Initiated', icon: <Search className="w-4 h-4" /> };
    if (p <= 85) return { title: 'Phase 3 — Cross-Source Reference Mapping Underway', icon: <Search className="w-4 h-4" /> };
    return { title: 'Phase 4 — Generating Verification Report', icon: <ShieldCheck className="w-4 h-4" /> };
  };

  // Trigger structured analysis when toggle is on and result is available
  useEffect(() => {
    const run = async () => {
      if (!showAdvancedJson || !result) return;
      setStructured(null);
      setStructuredError(null);
      setStructuredLoading(true);
      try {
        const payload = inputType === 'url' && url.trim()
          ? { url: url.trim() }
          : { text: (result.detected_text || '').trim() };
        const sr = mode === 'llm'
          ? await apiService.analyzeLlm(payload)
          : mode === 'hybrid'
          ? await apiService.analyzeHybrid(payload)
          : await apiService.analyzeStructured(payload);
        setStructured(sr as StructuredReport);
      } catch (e: any) {
        setStructuredError(e?.message || 'Structured analysis failed');
      } finally {
        setStructuredLoading(false);
      }
    };
    run();
  }, [showAdvancedJson, result, inputType, url, mode]);

  const computeSafetyScore = (r: AnalysisResult) => {
    let s = Math.round((r.confidence || 0) * 100);
    if (r.source_status === 'Safe') s = Math.max(s, 85);
    if (r.source_status === 'Suspicious') s = Math.min(s, 35);
    if (r.source_status === 'Unverified') s = Math.round((r.confidence || 0) * 100);
    return Math.max(0, Math.min(100, s));
  };

  const buildCredibilityReasons = (r: AnalysisResult) => {
    const reasons: string[] = [];
    const score = computeSafetyScore(r);
    if (r.source_status === 'Suspicious') {
      reasons.push('Website scan signals low credibility.');
    } else if (r.source_status === 'Unverified') {
      reasons.push('Insufficient corroboration — source not verified.');
    }
    if (r.source_summary) {
      reasons.push(r.source_summary);
    }
    if (r.sources && Array.isArray(r.sources)) {
      const srcs = r.sources.filter(s => s && s.url);
      if (srcs.length === 0) reasons.push('No corroborating articles found from web search.');
      if (srcs.length > 0 && srcs.length < 3) reasons.push('Limited number of corroborating articles identified.');
    }
    // Classifier confidence signal
    const pct = Math.round((r.confidence || 0) * 100);
    if (pct < 50) reasons.push('Classifier confidence below 50% indicates uncertainty.');
    else if (pct < 65 && (r.source_status !== 'Safe')) reasons.push('Moderate classifier confidence with weak corroboration.');
    // If image used (no URL status available) and Unverified
    if (!r.source_status) {
      reasons.push('Image-based analysis without a direct URL reduces verifiability.');
    }
    if (score <= 40) reasons.push('Overall credibility falls in the Low range (0–40%).');
    if (reasons.length === 0) reasons.push('Credibility appears adequate based on current signals.');
    return reasons;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
      // Clear URL when image is selected
      setUrl('');
    } else {
      setImageFile(null);
      setPreviewUrl(null);
      setError('Please upload a valid image file.');
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    // Clear image when URL is entered
    if (newUrl.trim()) {
      setImageFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    }
    setError(null);
  };

  const handleInputTypeChange = (type: 'url' | 'image') => {
    setInputType(type);
    setError(null);
    setResult(null);
    // Clear inputs when switching types
    if (type === 'url') {
      setImageFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    } else {
      setUrl('');
    }
  };

  const handleAnalysis = async () => {
    if (inputType === 'url' && !url.trim()) {
      setError('Please enter a URL');
      return;
    }
    if (inputType === 'image' && !imageFile) {
      setError('Please upload an image');
      return;
    }

    setIsLoading(true);
    setProgress(0);
    setLoadingStep('Validating input...');
    setResult(null);
    setError(null);

    try {
      const start = Date.now();
      let msgIndex = 0;
      setLoadingStep(loadingMessages.current[0]);
      const msgInterval = setInterval(() => {
        msgIndex = (msgIndex + 1) % loadingMessages.current.length;
        setLoadingStep(loadingMessages.current[msgIndex]);
      }, 1600); // ~3 steps ~4.8s total
      const progInterval = setInterval(() => {
        const elapsed = Date.now() - start;
        const target = Math.min(95, Math.round((elapsed / 5000) * 95));
        setProgress((p) => (target > p ? target : p));
      }, 100);

      let analysisResult: AnalysisResult;

      if (inputType === 'url') {
        // Validate URL format before sending
        const urlToAnalyze = url.trim();
        if (!urlToAnalyze.startsWith('http://') && !urlToAnalyze.startsWith('https://')) {
          setError('Please enter a valid URL starting with http:// or https://');
          setIsLoading(false);
          return;
        }

        // Analyze from URL
        setLoadingStep('Fetching webpage...');
        const response = await apiService.analyzeFakeNewsFromUrl(urlToAnalyze);
        analysisResult = {
          detected_text: response.detected_text,
          label: response.label,
          confidence: response.confidence,
          source_status: response.source_status,
          source_summary: response.source_summary,
          sources: response.sources || [],
        };
      } else {
        // Analyze from image
        if (!imageFile) return;
        setLoadingStep('Extracting text from image...');
        const response = await apiService.analyzeFakeNewsFromImage(imageFile);
        analysisResult = {
          detected_text: response.detected_text,
          label: response.label,
          confidence: response.confidence,
          sources: response.sources || [],
        };
      }

      // Ensure minimum ~5s loading for a professional feel
      const remaining = Math.max(0, 5000 - (Date.now() - start));
      setTimeout(() => {
        setLoadingStep('Complete');
        setProgress(100);
        setIsLoading(false);
      }, remaining);

      setResult(analysisResult);
      clearInterval(msgInterval);
      clearInterval(progInterval);
    } catch (err) {
      console.error('Analysis error:', err);
      
      // Extract meaningful error message
      let errorMessage = 'An unexpected error occurred during analysis.';
      
      if (err?.message) {
        errorMessage = err.message;
      } else if (err instanceof TypeError) {
        errorMessage = 'Network error: Unable to connect to the server. Please check your internet connection.';
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      // In normal flow we stop loading after setting progress to 100% above.
      // In error, ensure we stop now.
      setIsLoading(false);
    }
  };

  const getVerdictStyle = (label: 'Fake' | 'Real') => {
    if (label === 'Real') {
      return { 
        icon: <CheckCircle className="w-8 h-8 text-green-500" />, 
        color: 'bg-green-800/20 border-green-500', 
        label: 'REAL',
        textColor: 'text-green-500'
      };
    }
    return { 
      icon: <XCircle className="w-8 h-8 text-red-500" />, 
      color: 'bg-red-800/20 border-red-500', 
      label: 'FAKE',
      textColor: 'text-red-500'
    };
  };

  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="container mx-auto px-4 py-6 sticky top-0 z-10 bg-background/80 backdrop-blur-sm">
        <nav className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">Trustek Shield</span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button 
              onClick={() => navigate('/team')} 
              variant="outline"
              size="sm"
              className="text-foreground border-border hover:bg-accent/10"
            >
              Meet the Team
            </Button>
            <Button 
              onClick={() => navigate('/faqs')} 
              variant="outline"
              size="sm"
              className="text-foreground border-border hover:bg-accent/10"
            >
              FAQs
            </Button>
            <Button 
              onClick={() => navigate('/dashboard')} 
              variant="outline"
              size="sm"
              className="text-accent border-accent hover:bg-accent/10"
            >
              Dev Dashboard
            </Button>
          </div>
        </nav>
      </header>

      <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-sm font-medium">News Verification</span>
          </div>
          <h1 className="text-5xl font-extrabold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Fact Checker Tool
          </h1>
          <p className="text-xl text-muted-foreground">
            Authenticate your claims, text, or images using our AI analysis.
          </p>
        </div>

      <div className="bg-card p-8 rounded-xl shadow-2xl border border-border">
        {/* Input Type Toggle */}
        <div className="flex flex-col gap-3 mb-6 border-b border-border pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => handleInputTypeChange('url')}
                className={`flex items-center space-x-2 p-3 rounded-t-lg transition-colors ${
                  inputType === 'url'
                    ? 'text-primary border-b-2 border-primary font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Globe className="w-5 h-5" /> <span>Enter News URL</span>
              </button>
              <button
                onClick={() => handleInputTypeChange('image')}
                className={`flex items-center space-x-2 p-3 rounded-t-lg transition-colors ${
                  inputType === 'image'
                    ? 'text-primary border-b-2 border-primary font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Image className="w-5 h-5" /> <span>Upload Screenshot</span>
              </button>
            </div>
          </div>
        </div>

        {/* Input Section */}
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          {inputType === 'url' && (
          <input
            type="url"
            className="flex-grow p-4 border border-input rounded-lg bg-background text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-ring focus:border-ring transition-smooth"
            placeholder="Enter News URL (e.g., https://example.com/news)"
            value={url}
            onChange={handleUrlChange}
            disabled={isLoading || (imageFile !== null)}
          />
        )}

        {inputType === 'image' && (
          <div className="flex-grow space-y-3">
            <label htmlFor="image-upload" className="block text-sm font-medium text-foreground">
              Upload Screenshot:
            </label>
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={isLoading || (url.trim() !== '')}
              className="w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
            {previewUrl && (
              <div className="mt-4 border border-input rounded-lg p-2 max-w-xs mx-auto">
                <h4 className="text-xs text-muted-foreground mb-2">Image Preview:</h4>
                <img src={previewUrl} alt="Preview" className="w-full h-auto rounded-md object-cover" />
              </div>
            )}
          </div>
        )}

        {/* Analyze Button */}
        <button
          onClick={handleAnalysis}
          disabled={
            isLoading || (inputType === 'url' && !url.trim()) || (inputType === 'image' && !imageFile)
          }
          className={`sm:w-40 px-6 py-3 flex justify-center items-center space-x-2 rounded-lg font-bold text-shadow-sm transition-smooth ${
            isLoading
              ? 'bg-muted-foreground text-muted cursor-not-allowed'
              : 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:opacity-95'
          }`}
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-current border-t-transparent"></div>
          ) : (
            <>
              <Send className="w-5 h-5" /> <span>Analyze</span>
            </>
          )}
        </button>
      </div>

      {/* Loading Animation with progress and steps */}
      {isLoading && (
        <div className="mt-6 rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-foreground">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"></div>
              <span className="font-medium">{phaseForProgress(progress).title}</span>
            </div>
            <span className="text-sm text-muted-foreground">{progress}%</span>
          </div>
          <div className="w-full h-3 rounded-full overflow-hidden relative bg-muted">
            {/* shimmering overlay */}
            <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
            <div className="h-3 bg-primary relative transition-all duration-200" style={{ width: `${progress}%` }}></div>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            {progress <= 15 && 'Core AI Corroboration Engine Activated.'}
            {progress > 15 && progress <= 50 && 'Comprehensive Fact-Checking Protocol Engaged.'}
            {progress > 50 && progress <= 85 && 'Verifying Claims Against Global Knowledge Base.'}
            {progress > 85 && 'Generating Verification Report.'}
          </div>
        </div>
      )}
      {showAdvancedJson && (
        <div className="mt-6 bg-card p-6 rounded-xl border border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold">Advanced JSON Report ({mode === 'rule' ? 'Basic' : mode === 'llm' ? 'AI' : 'Hybrid'})</h3>
            <button
              onClick={() => {
                const text = structured ? JSON.stringify(structured, null, 2) : '';
                navigator.clipboard.writeText(text);
              }}
              disabled={!structured}
              className={`px-3 py-1 rounded border ${structured ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground cursor-not-allowed'}`}
            >Copy</button>
          </div>
          {structuredLoading && <div className="text-sm text-muted-foreground">Generating structured report…</div>}
          {structuredError && <div className="text-sm text-destructive">{structuredError}</div>}
          {structured && (
            <pre className="mt-2 text-xs overflow-auto max-h-96 bg-background p-3 rounded border border-border">
{JSON.stringify(structured, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-8 p-4 bg-destructive/20 border border-destructive rounded-lg text-destructive-foreground">
          <p className="font-semibold">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="mt-8 bg-card p-8 rounded-xl shadow-2xl border border-border">
          <h2 className="text-3xl font-semibold text-foreground mb-6 text-shadow-sm">Verification Report</h2>
          
          <div className="space-y-6">
            {/* Detected Text */}
            {result.detected_text && (
              <div className="bg-background p-6 rounded-lg border border-border">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-2xl">📰</span>
                  <h3 className="text-lg font-bold text-foreground">Detected text:</h3>
                </div>
                <p className="text-muted-foreground italic">"{result.detected_text.substring(0, 200)}{result.detected_text.length > 200 ? '...' : ''}"</p>
              </div>
            )}

            {/* Sources / Citations */}
            {result.sources && result.sources.length > 0 && (
              <div className="bg-background p-6 rounded-lg border border-border">
                <div className="flex items-center space-x-2 mb-3">
                  <span className="text-2xl">🔗</span>
                  <h3 className="text-lg font-bold text-foreground">Corroborating Sources</h3>
                </div>
                <ul className="space-y-3 list-disc pl-5">
                  {result.sources.map((s, idx) => (
                    <li key={idx} className="text-foreground">
                      {s.url ? (
                        <a href={s.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                          {s.title || s.url}
                        </a>
                      ) : (
                        <span className="text-foreground">{s.title || 'Source'}</span>
                      )}
                      {s.source && <span className="text-muted-foreground ml-2">({s.source})</span>}
                      {s.snippet && (
                        <div className="text-muted-foreground text-sm mt-1">{s.snippet}</div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Verification Outcome */}
            <div className={`p-6 rounded-xl border-l-4 ${getVerdictStyle(result.label).color}`}>
              <div className="flex items-center space-x-4">
                {getVerdictStyle(result.label).icon}
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-2xl">✅</span>
                    <span className="font-extrabold text-xl text-foreground">Verification Outcome</span>
                  </div>
                  <div className="text-lg">
                    <span className={`font-bold ${getVerdictStyle(result.label).textColor}`}>
                      {result.label === 'Real' ? 'Verified' : 'Not Verified'}
                    </span>
                    <span className="text-muted-foreground ml-2">({(result.confidence * 100).toFixed(0)}% Confidence)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Source Status (only for URL analysis) */}
            {result.source_status && (
              <div className="bg-background p-6 rounded-lg border border-border">
                <div className="relative flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">🌐</span>
                    <h3 className="text-lg font-bold text-foreground">Source Credibility Score</h3>
                    {(() => {
                      const computeSafety = (r: AnalysisResult) => {
                        let s = Math.round((r.confidence || 0) * 100);
                        if (r.source_status === 'Safe') s = Math.max(s, 85);
                        if (r.source_status === 'Suspicious') s = Math.min(s, 35);
                        if (r.source_status === 'Unverified') s = Math.round((r.confidence || 0) * 100);
                        return Math.max(0, Math.min(100, s));
                      };
                      const s = computeSafety(result);
                      const tone = s >= 70 ? 'bg-green-600/20 text-green-500 border-green-600/40' : s <= 40 ? 'bg-red-600/20 text-red-500 border-red-600/40' : 'bg-yellow-600/20 text-yellow-500 border-yellow-600/40';
                      return (
                        <span className={`text-xs px-2 py-1 rounded-full border ${tone}`}>{s}% safe</span>
                      );
                    })()}
                    <button
                      type="button"
                      onClick={() => setShowCredibilityInfo((v) => !v)}
                      className="ml-1 inline-flex items-center justify-center w-6 h-6 rounded-full border border-border hover:bg-muted"
                      aria-label="Why this credibility score?"
                      title="Why this credibility score?"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-xs text-muted-foreground">Powered by web corroboration</span>

                  {showCredibilityInfo && (
                    <div className="absolute right-0 top-8 z-20 w-96 rounded-md border border-border bg-background shadow-xl">
                      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                        <span className="text-sm font-semibold">Why flagged as low credibility?</span>
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => setShowCredibilityInfo(false)}
                          aria-label="Close"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="p-3">
                        {(() => {
                          const reasons = buildCredibilityReasons(result);
                          return (
                            <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                              {reasons.map((r, i) => (
                                <li key={i}>{r}</li>
                              ))}
                            </ul>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
                <p className={`font-semibold ${
                  result.source_status === 'Safe' ? 'text-green-500' : result.source_status === 'Suspicious' ? 'text-red-500' : 'text-yellow-500'
                }`}>
                  {result.source_status === 'Safe' ? 'High Credibility' : result.source_status === 'Suspicious' ? 'Low Credibility' : 'Review Recommended'}
                </p>
                {/* Safety bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-muted-foreground mb-2">
                    <span>Low Credibility</span>
                    <span>Review</span>
                    <span>High Credibility</span>
                  </div>
                  {(() => {
                    const computeSafety = (r: AnalysisResult) => {
                      let score = Math.round((r.confidence || 0) * 100);
                      if (r.source_status === 'Safe') score = Math.max(score, 85);
                      if (r.source_status === 'Suspicious') score = Math.min(score, 35);
                      if (r.source_status === 'Unverified') score = Math.round((r.confidence || 0) * 100);
                      return Math.max(0, Math.min(100, score));
                    };
                    const score = computeSafety(result);
                    return (
                      <div className="relative">
                        {/* Segmented track */}
                        <div className="w-full h-3 rounded-full overflow-hidden flex">
                          <div className="h-3 w-1/3 bg-red-500/70"></div>
                          <div className="h-3 w-1/3 bg-yellow-500/70"></div>
                          <div className="h-3 w-1/3 bg-green-500/70"></div>
                        </div>
                        {/* Segment labels */}
                        <div className="absolute inset-0 flex text-[10px] text-background font-semibold">
                          <div className="w-1/3 flex items-center justify-center">Low</div>
                          <div className="w-1/3 flex items-center justify-center">Review</div>
                          <div className="w-1/3 flex items-center justify-center">High</div>
                        </div>
                        {/* Ticks */}
                        <div className="absolute inset-x-0 -bottom-1.5 flex justify-between text-[10px] text-muted-foreground">
                          <span>|</span>
                          <span>|</span>
                          <span>|</span>
                          <span>|</span>
                          <span>|</span>
                        </div>
                        {/* Pointer */}
                        <div className="absolute -top-2" style={{ left: `calc(${score}% - 10px)` }}>
                          <div className="px-1.5 py-0.5 text-[10px] rounded bg-background border border-border shadow">
                            {score}%
                          </div>
                          <div className="mx-auto w-0 h-0 border-l-4 border-r-4 border-t-8 border-t-background border-l-transparent border-r-transparent"></div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Summary */}
            {(result.source_summary || result.detected_text) && (
              <div className="bg-background p-6 rounded-lg border border-border">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-2xl">ℹ️</span>
                  <h3 className="text-lg font-bold text-foreground">Summary:</h3>
                </div>
                <p className="text-muted-foreground">
                  {result.source_summary || 
                   (result.label === 'Real' 
                     ? 'The content appears to be authentic and trustworthy.' 
                     : 'The content shows signs of being fake or misleading.')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Close main card wrapper */}
      </div>
      {/* Backend health check */}
      <HealthStatus />
      </div>
    </div>
  );
};

export default FakeNewsDetectionPage;

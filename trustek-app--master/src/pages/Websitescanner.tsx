import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import apiService from '@/services/api';
import VerificationReport from '../components/VerificationReport';
import {
  Search,
  Send,
  CheckCircle,
  XCircle,
  AlertTriangle,
  LinkIcon,
  Upload,
  Trash2,
  Globe,
  Clock,
  ShieldCheck,
} from "lucide-react";

// --- Interfaces ---
interface AnalysisResult {
  text: string;
  sources: { uri: string; title: string }[];
}

interface SitePreview {
  url?: string;
  title?: string;
  description?: string;
  image?: string;
  site_name?: string;
  favicon?: string;
  status?: string;
}

const WebsiteScannerPage: React.FC = () => {
  const [query, setQuery] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sitePreview, setSitePreview] = useState<SitePreview | null>(null);

  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingStage, setLoadingStage] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);

  // computed verification metrics
  const [trustScore, setTrustScore] = useState<number | null>(null); // 0-100 (higher is safer)
  const [riskLevel, setRiskLevel] = useState<'Safe' | 'Suspicious' | 'Fishy' | null>(null);
  const [suspiciousCount, setSuspiciousCount] = useState<number | null>(null);
  const [adsCount, setAdsCount] = useState<number | null>(null);
  const [iframesCount, setIframesCount] = useState<number | null>(null);
  const [externalScripts, setExternalScripts] = useState<number | null>(null);
  const [adDensity, setAdDensity] = useState<number | null>(null);
  const [corroboration, setCorroboration] = useState<string | null>(null);

  // --- handle image preview ---
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [file]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (!selectedFile.type.startsWith("image/")) {
        setError("Please upload an image file (PNG, JPEG, GIF).");
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const resetInputs = () => {
    setQuery("");
    setFile(null);
    setResult(null);
    setError(null);
    setLoadingStage(0);
    setSitePreview(null);
    setTrustScore(null);
    setRiskLevel(null);
    setSuspiciousCount(null);
    setAdsCount(null);
    setIframesCount(null);
    setExternalScripts(null);
    setAdDensity(null);
    setCorroboration(null);
  };

  // --- Verification Logic (calls backend /api/ml/scan via apiService) ---
  const handleVerification = async () => {
    if (!query.trim() && !file) {
      setError("Please enter a URL or upload a screenshot to analyze.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setTrustScore(null);
    setRiskLevel(null);
    setSuspiciousCount(null);
    setProgress(0);
    setSitePreview(null);
    setAdsCount(null);
    setIframesCount(null);
    setExternalScripts(null);
    setAdDensity(null);
    setCorroboration(null);

    try {
      // staged loading UX
      const steps = [
        { stage: 1, delay: 400, pct: 15 },
        { stage: 2, delay: 450, pct: 35 },
        { stage: 3, delay: 500, pct: 60 },
        { stage: 4, delay: 500, pct: 80 },
      ];
      for (const s of steps) {
        setLoadingStage(s.stage);
        setProgress(s.pct);
        await new Promise((res) => setTimeout(res, s.delay));
      }

      // Call backend website scanner
      if (!query.trim()) {
        // If only screenshot provided, ask for URL (backend scanner expects URL)
        throw new Error('Please provide a URL for website scanning. Image analysis is available in Fake News (Image) flow.');
      }

      const scan = await apiService.scanWebsite(query.trim());

      // Use ML API signals (suspicious keywords, credibility_score, status)
      const suspicious = typeof scan.suspicious_keywords_found === 'number' ? scan.suspicious_keywords_found : 0;
      setSuspiciousCount(suspicious);

      const providedScore = typeof scan.credibility_score === 'number' ? scan.credibility_score : undefined;
      const computedTrust = providedScore !== undefined
        ? Math.max(0, Math.min(100, Math.round(providedScore)))
        : (() => {
            const baseFromStatus = scan.status === 'Safe' ? 75 : 40; // fallback baseline
            const penalty = Math.min(60, suspicious * 15);
            return Math.max(0, Math.min(100, baseFromStatus - penalty + (scan.status === 'Safe' && suspicious === 0 ? 15 : 0)));
          })();
      setTrustScore(computedTrust);
      const level: 'Safe' | 'Suspicious' | 'Fishy' = computedTrust >= 70 ? 'Safe' : computedTrust >= 40 ? 'Suspicious' : 'Fishy';
      setRiskLevel(level);

      const verdictLabel = level === 'Safe' ? 'SAFE / VERIFIED'
        : level === 'Suspicious' ? 'SUSPICIOUS / WARNING'
        : 'POTENTIALLY FISHY';
      const verdictText = scan.summary || '';

      const response: AnalysisResult = {
        text: `**VERDICT:** ${verdictLabel}\n\n${verdictText}`,
        sources: [],
      };

      setResult(response);
      if (typeof scan.ads_count !== 'undefined') setAdsCount(scan.ads_count || 0);
      if (typeof scan.iframes_count !== 'undefined') setIframesCount(scan.iframes_count || 0);
      if (typeof scan.external_scripts !== 'undefined') setExternalScripts(scan.external_scripts || 0);
      if (typeof scan.ad_density !== 'undefined') setAdDensity(typeof scan.ad_density === 'number' ? scan.ad_density : null);
      if (typeof scan.corroboration !== 'undefined') setCorroboration(scan.corroboration || null);

      try {
        const pv = await apiService.getSitePreview(query.trim());
        setSitePreview(pv);
      } catch (e) {
        console.debug('Site preview fetch failed', e);
      }
      setProgress(100);
    } catch (err) {
      console.error("Mock verification failed:", err);
      setError(err instanceof Error ? err.message : "Verification failed. Try again.");
    } finally {
      setIsLoading(false);
      setLoadingStage(0);
      setTimeout(() => setProgress(0), 600);
    }
  };

  // --- Verdict Styling ---
  const getVerdictStyle = (text: string) => {
    const upperText = text.toUpperCase();
    if (upperText.includes("SAFE") || upperText.includes("VERIFIED")) {
      return {
        icon: <CheckCircle className="w-8 h-8 text-green-500" />,
        color: "bg-green-800/20 border-green-500",
        label: "SAFE / VERIFIED",
      };
    }
    if (upperText.includes("FRAUD") || upperText.includes("FAKE")) {
      return {
        icon: <XCircle className="w-8 h-8 text-red-500" />,
        color: "bg-red-800/20 border-red-500",
        label: "FRAUD / FAKE",
      };
    }
    return {
      icon: <AlertTriangle className="w-8 h-8 text-yellow-500" />,
      color: "bg-yellow-800/20 border-yellow-500",
      label: "SUSPICIOUS / WARNING",
    };
  };

  const loadingSteps = [
    { icon: <ShieldCheck className="w-5 h-5 text-primary animate-spin" />, text: "Initializing Security Protocols..." },
    { icon: <Globe className="w-5 h-5 text-primary animate-spin" />, text: "Verifying URL and DNS records..." },
    { icon: <Clock className="w-5 h-5 text-secondary animate-pulse" />, text: "Analyzing content & trust signals..." },
    { icon: <Upload className="w-5 h-5 text-accent animate-pulse" />, text: "Aggregating security intelligence..." },
    { icon: <CheckCircle className="w-5 h-5 text-green-500" />, text: "Finalizing verification report..." },
  ];

  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="container mx-auto px-4 py-6 sticky top-0 z-10 bg-background/80 backdrop-blur-sm">
        <nav className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">Trustek Shield</span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
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
            <Globe className="h-4 w-4" />
            <span className="text-sm font-medium">Website Verification</span>
          </div>
          <h1 className="text-5xl font-extrabold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Website Scanner & Fraud Check
          </h1>
          <p className="text-xl text-muted-foreground">
            Verify any website link or analyze a screenshot for phishing, fraud, and legitimacy.
          </p>
        </div>

      <div className="bg-card p-8 rounded-xl shadow-2xl border border-border">
        <div className="space-y-6">
          {/* URL Input */}
          <div className="space-y-2">
            <label htmlFor="content-query" className="flex items-center text-sm font-medium text-foreground">
              <LinkIcon className="w-4 h-4 mr-2" /> Enter Website URL:
            </label>
            <input
              id="content-query"
              type="text"
              className="w-full p-3 border border-input rounded-lg bg-background text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-ring focus:border-ring transition-smooth"
              placeholder="e.g., https://www.bbc.com"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-foreground">
              <Upload className="w-4 h-4 mr-2" /> Optional: Upload Screenshot (PNG/JPG)
            </label>
            <div className="flex items-center space-x-4">
              <input
                id="file-upload"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={isLoading}
                className="hidden"
              />
              <button
                onClick={() => document.getElementById("file-upload")?.click()}
                disabled={isLoading}
                className={`w-40 px-4 py-2 border border-dashed rounded-lg flex items-center justify-center space-x-2 transition-colors 
                            ${file ? "bg-primary/10 border-primary text-primary" : "bg-muted/30 border-input text-muted-foreground hover:bg-muted"}`}
              >
                {file ? (
                  <>
                    <CheckCircle className="w-4 h-4" /> <span>File Selected</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" /> <span>Choose File</span>
                  </>
                )}
              </button>
              {file && (
                <button
                  onClick={() => setFile(null)}
                  className="p-2 text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            {previewUrl && (
              <div className="mt-4 border border-input rounded-lg overflow-hidden max-w-xs shadow-md">
                <img src={previewUrl} alt="Screenshot Preview" className="w-full h-auto" />
              </div>
            )}
          </div>
        </div>

        {/* Verify Button */}
        <button
          onClick={handleVerification}
          disabled={isLoading || (!query.trim() && !file)}
          className={`mt-6 w-full px-6 py-3 flex justify-center items-center space-x-3 rounded-lg font-bold transition-smooth ${
            isLoading || (!query.trim() && !file)
              ? "bg-muted-foreground text-muted cursor-not-allowed"
              : "bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:opacity-95"
          }`}
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-current border-t-transparent"></div>
              <span>{loadingSteps[loadingStage]?.text || "Verifying URL..."}</span>
            </>
          ) : (
            <>
              <Send className="w-5 h-5" /> <span>Run Full Security Check</span>
            </>
          )}
        </button>

        {/* Progress bar */}
        {isLoading && (
          <div className="mt-3 w-full h-2 bg-muted/40 rounded-full overflow-hidden">
            <div className="h-2 bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-8 p-4 bg-destructive/20 border border-destructive rounded-lg text-destructive-foreground">
          <p className="font-semibold">{error}</p>
        </div>
      )}

      {/* Result Display */}
      {result && (
        <div className="mt-8">
          <h2 className="text-3xl font-semibold mb-4">Verification Report</h2>

          <div className={`p-6 rounded-xl border-l-4 ${getVerdictStyle(result.text).color} mb-6`}>
            <div className="flex items-center space-x-4">
              {getVerdictStyle(result.text).icon}
              <div className="font-extrabold text-2xl">
                Trustek Verdict:{" "}
                <span className="text-primary">{getVerdictStyle(result.text).label}</span>
              </div>
            </div>
          </div>

          {sitePreview && (
            <div className="bg-card p-6 rounded-xl shadow-lg border border-border mb-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    {sitePreview.favicon ? (
                      <img src={sitePreview.favicon} alt="favicon" className="w-6 h-6 rounded" />
                    ) : null}
                    <div className="text-lg font-semibold truncate max-w-[60ch]">
                      {sitePreview.title || 'No title found'}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1 truncate max-w-[72ch]">
                    {sitePreview.description || 'No description available.'}
                  </div>
                  <div className="mt-2 text-xs opacity-60">
                    {sitePreview.site_name || (query ? new URL(query).hostname : '')}
                  </div>
                </div>
                {sitePreview.image ? (
                  <div className="w-full md:w-64 rounded-lg overflow-hidden border border-border">
                    <img src={sitePreview.image} alt="preview" className="w-full h-40 object-cover" />
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* Metrics */}
          <div className="grid gap-6 md:grid-cols-3 mb-6">
            <div className="bg-card p-6 rounded-xl shadow border border-border">
              <div className="text-sm text-muted-foreground mb-1">Verification Score</div>
              <div className="text-4xl font-bold">{trustScore ?? 0}%</div>
              <div className="mt-2 h-2 bg-muted/40 rounded-full overflow-hidden">
                <div className={`h-2 ${ (trustScore ?? 0) >= 70 ? 'bg-green-500' : (trustScore ?? 0) >= 40 ? 'bg-yellow-500' : 'bg-red-500' }`} style={{ width: `${trustScore ?? 0}%` }} />
              </div>
            </div>
            <div className="bg-card p-6 rounded-xl shadow border border-border">
              <div className="text-sm text-muted-foreground mb-1">Risk Level</div>
              <div className="text-2xl font-semibold">{riskLevel ?? 'Unknown'}</div>
            </div>
            <div className="bg-card p-6 rounded-xl shadow border border-border">
              <div className="text-sm text-muted-foreground mb-1">Suspicious Keywords</div>
              <div className="text-2xl font-semibold">{suspiciousCount ?? 0}</div>
            </div>
          </div>

          <div className="bg-card p-6 rounded-xl shadow-lg border border-border mb-6">
            <h3 className="text-xl font-bold mb-3 text-primary">Security Summary</h3>
            <div className="whitespace-pre-wrap text-foreground">{result.text}</div>
          </div>

          <div className="bg-card p-6 rounded-xl shadow-lg border border-border mb-6">
            <h3 className="text-xl font-bold mb-4 text-primary">Signals Summary</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="p-4 rounded-lg border border-border">
                <div className="text-sm text-muted-foreground">Corroboration</div>
                <div className="mt-1 text-lg font-semibold">
                  {corroboration ? corroboration.charAt(0).toUpperCase() + corroboration.slice(1) : 'Unavailable'}
                </div>
              </div>
              <div className="p-4 rounded-lg border border-border">
                <div className="text-sm text-muted-foreground">Ads</div>
                <div className="mt-1 text-lg font-semibold">{adsCount ?? 0}</div>
              </div>
              <div className="p-4 rounded-lg border border-border">
                <div className="text-sm text-muted-foreground">Iframes</div>
                <div className="mt-1 text-lg font-semibold">{iframesCount ?? 0}</div>
              </div>
              <div className="p-4 rounded-lg border border-border">
                <div className="text-sm text-muted-foreground">External Scripts</div>
                <div className="mt-1 text-lg font-semibold">{externalScripts ?? 0}</div>
              </div>
              <div className="p-4 rounded-lg border border-border">
                <div className="text-sm text-muted-foreground">Ad Density</div>
                <div className="mt-1 text-lg font-semibold">{adDensity !== null ? adDensity : '—'}</div>
              </div>
            </div>
          </div>

          {/* Verification Preview Card (metadata + favicon/thumbnail) */}
          {query.trim().startsWith('http') && (
            <div className="mb-6">
              <VerificationReport
                url={query.trim()}
                verdict={riskLevel === 'Safe' ? 'Verified' : riskLevel === 'Suspicious' ? 'Suspicious' : 'Potentially Fishy'}
                credibilityScore={typeof trustScore === 'number' ? trustScore : undefined}
                summary={result.text}
                useScreenshot
              />
            </div>
          )}

          {/* Live Website Preview */}
          {query.trim().startsWith('http') && (
            <div className="bg-card p-6 rounded-xl shadow-lg border border-border mb-6">
              <h3 className="text-xl font-bold mb-3 text-primary">Live Preview</h3>
              <div className="text-sm text-muted-foreground mb-3">Some sites may block embedding; if the preview fails to load, open the link directly.</div>
              <div className="w-full rounded-lg overflow-hidden border border-border">
                <iframe
                  src={query.trim()}
                  title="Website Preview"
                  className="w-full h-[480px] bg-background"
                  sandbox="allow-same-origin allow-forms allow-popups"
                />
              </div>
            </div>
          )}

          {result.sources.length > 0 && (
            <div className="bg-card p-6 rounded-xl shadow-lg border border-border">
              <h3 className="text-xl font-bold mb-3 text-primary flex items-center space-x-2">
                <LinkIcon className="w-5 h-5" />
                <span>Verification Sources</span>
              </h3>
              <ul className="space-y-2 text-sm">
                {result.sources.map((source, index) => (
                  <li key={index} className="flex items-start text-muted-foreground">
                    <span className="mr-2 text-primary">•</span>
                    <a
                      href={source.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline text-secondary transition-colors"
                    >
                      {source.title}
                    </a>
                    <span className="ml-2 text-xs opacity-50">
                      ({new URL(source.uri).hostname})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  </div>
);
};

export default WebsiteScannerPage;

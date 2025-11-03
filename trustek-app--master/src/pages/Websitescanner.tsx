import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
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

const WebsiteScannerPage: React.FC = () => {
  const [query, setQuery] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingStage, setLoadingStage] = useState<number>(0);

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
  };

  // --- MOCK VERIFICATION LOGIC ---
  const handleVerification = async () => {
    if (!query.trim() && !file) {
      setError("Please enter a URL or upload a screenshot to analyze.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // Simulate loading stages
      const steps = [1, 2, 3, 4, 5];
      for (const step of steps) {
        setLoadingStage(step);
        await new Promise((res) => setTimeout(res, 600));
      }

      // Demo verdict logic (mocked)
      let verdictText = "";
      let verdictLabel = "";
      let sources = [];

      if (query.includes("bbc.com")) {
        verdictLabel = "SAFE / VERIFIED";
        verdictText =
          "The BBC website is a verified and trusted source of news. No suspicious activity detected.";
        sources = [
          { uri: "https://www.bbc.com", title: "BBC Official Website" },
        ];
      } else if (
        query.includes("scam") ||
        query.includes("fraud") ||
        query.includes("phishing")
      ) {
        verdictLabel = "FRAUD / FAKE";
        verdictText =
          "⚠️ The provided URL contains suspicious keywords indicating potential scam or phishing intent.";
        sources = [
          { uri: "https://www.google.com/search?q=scam+warnings", title: "Scam Warnings" },
        ];
      } else {
        verdictLabel = "SUSPICIOUS / WARNING";
        verdictText =
          "⚠️ Unable to verify this website. Please proceed with caution. This may be a new or unverified domain.";
        sources = [
          { uri: "https://www.safeweb.norton.com", title: "Norton Safe Web" },
        ];
      }

      // Fake AI-like structured result
      const fakeResponse: AnalysisResult = {
        text: `**VERDICT:** ${verdictLabel}\n\n${verdictText}`,
        sources,
      };

      setResult(fakeResponse);
    } catch (err) {
      console.error("Mock verification failed:", err);
      setError("Verification failed. Try again.");
    } finally {
      setIsLoading(false);
      setLoadingStage(0);
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
    { icon: <Upload className="w-5 h-5 text-accent animate-pulse" />, text: "Processing Image Screenshot..." },
    { icon: <Globe className="w-5 h-5 text-primary animate-spin" />, text: "Querying Global Domain Database..." },
    { icon: <Clock className="w-5 h-5 text-secondary animate-pulse" />, text: "Analyzing Trust Signals and Security Records..." },
    { icon: <CheckCircle className="w-5 h-5 text-green-500" />, text: "Finalizing Verification Report..." },
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
              <span>{loadingSteps[loadingStage]?.text || "Verifying..."}</span>
            </>
          ) : (
            <>
              <Send className="w-5 h-5" /> <span>Run Full Security Check</span>
            </>
          )}
        </button>
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

          <div className="bg-card p-6 rounded-xl shadow-lg border border-border mb-6">
            <h3 className="text-xl font-bold mb-3 text-primary">Security Summary</h3>
            <div className="whitespace-pre-wrap text-foreground">{result.text}</div>
          </div>

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

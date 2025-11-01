import React, { useState } from 'react';
// Assuming withAuth is available via alias, matching other files
import withAuth from '@/components/withAuth'; 
import { Send, CheckCircle, XCircle, Info, Link as LinkIcon, Upload, Image, UserCheck, MessageSquare, Globe } from 'lucide-react';

// API Configuration
const apiKey = ""; 
// Using the recommended stable model for multimodal and grounded search
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

interface AnalysisResult {
    text: string;
    sources: { uri: string; title: string }[];
}

// Function to convert file object to Base64 string
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // Extract only the base64 part (after the comma)
            resolve(result.split(',')[1]);
        };
        reader.onerror = (error) => reject(error);
    });
};

const ReviewAnalyzer: React.FC = () => {
    // Input States
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [websiteUrl, setWebsiteUrl] = useState('');
    const [reviewerInfo, setReviewerInfo] = useState('');
    
    // Output & Processing States
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // --- Utility Functions ---
    
    // Function to handle the API call with exponential backoff
    const fetchWithBackoff = async (url: string, payload: any, retries: number = 3) => {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                if (!response.ok) {
                    throw new Error(`API returned status ${response.status}`);
                }
                return await response.json();
            } catch (err) {
                if (i === retries - 1) throw err;
                const delay = Math.pow(2, i) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        if (file && file.type.startsWith('image/')) {
            setImageFile(file);
            // Clean up previous URL if it exists
            if (previewUrl) URL.revokeObjectURL(previewUrl); 
            setPreviewUrl(URL.createObjectURL(file));
        } else {
            setImageFile(null);
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
            setError("Please upload a valid image file (screenshot of the review).");
        }
    };

    // --- Main Analysis Logic ---
    
    const handleAnalysis = async () => {
        // Validation Check
        if (!imageFile || !websiteUrl.trim() || !reviewerInfo.trim()) {
            setError("Please upload a review screenshot and provide all required information (Website URL and Reviewer Details).");
            return;
        }

        setIsLoading(true);
        setResult(null);
        setError(null);

        try {
            const base64Data = await fileToBase64(imageFile);
            
            const reviewPrompt = `
                Analyze the provided screenshot of a review based on the following context:
                1. Website Credibility Check: The review originates from this site: ${websiteUrl}. Search Google to check this site's reputation (scam reports, trust ratings).
                2. Reviewer Automation Check: The reviewer details are: "${reviewerInfo}". Analyze the name and comment style visible in the image for signs of automation, generic AI text, or unnatural positivity/negativity.
                
                Provide an overall verdict (TRUSTWORTHY, SUSPICIOUS, or FAKE) and justify the rating by detailing the findings for the Website Credibility and Reviewer Automation checks.
            `;
            
            const payload = {
                contents: [{ 
                    parts: [
                        { text: reviewPrompt },
                        { inlineData: { mimeType: imageFile.type, data: base64Data } }
                    ] 
                }],
                tools: [{ "google_search": {} }], // Use grounding for website check
                systemInstruction: {
                    parts: [{ text: "You are Trustek, an advanced review authenticity auditor. Your task is to analyze review screenshots and context to determine if the review is likely trustworthy or fake, providing clear, detailed findings. Your final verdict must be one of: TRUSTWORTHY, SUSPICIOUS, or FAKE." }]
                },
            };

            const response = await fetchWithBackoff(apiUrl, payload);
            const candidate = response.candidates?.[0];

            if (!candidate || !candidate.content?.parts?.[0]?.text) {
                throw new Error("Received an empty or malformed response from the AI.");
            }

            const text = candidate.content.parts[0].text;
            let sources: { uri: string; title: string }[] = [];

            // Extract grounding sources (for website check)
            const groundingMetadata = candidate.groundingMetadata;
            if (groundingMetadata && groundingMetadata.groundingAttributions) {
                sources = groundingMetadata.groundingAttributions
                    .map(attribution => ({
                        uri: attribution.web?.uri,
                        title: attribution.web?.title,
                    }))
                    .filter(source => source.uri && source.title);
            }

            setResult({ text, sources });

        } catch (err) {
            console.error("Review analysis failed:", err);
            setError("Analysis failed. Please ensure the URL is correct and the image is clear.");
        } finally {
            setIsLoading(false);
        }
    };
    
    // Determine verdict for display styling
    const getVerdictStyle = (text: string) => {
        if (text.toUpperCase().includes("TRUSTWORTHY")) return { icon: <CheckCircle className="w-8 h-8 text-green-500" />, color: "bg-green-800/20 border-green-500", label: "TRUSTWORTHY" };
        if (text.toUpperCase().includes("FAKE")) return { icon: <XCircle className="w-8 h-8 text-red-500" />, color: "bg-red-800/20 border-red-500", label: "FAKE" };
        return { icon: <Info className="w-8 h-8 text-yellow-500" />, color: "bg-yellow-800/20 border-yellow-500", label: "SUSPICIOUS" };
    };

    return (
        <div className="min-h-screen container mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <h1 className="text-5xl font-extrabold text-primary mb-2 text-shadow-lg">
                Review Analyzer Tool
            </h1>
            <p className="text-xl text-muted-foreground mb-10">
                Identify fake reviews by analyzing source credibility, reviewer identity, and comment automation.
            </p>
            
            <div className="bg-card p-8 rounded-xl shadow-2xl border border-border">
                <h2 className="text-2xl font-bold mb-6 text-foreground flex items-center space-x-2"><Upload className="w-6 h-6 text-primary" /> <span>Review Submission</span></h2>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Image Upload Area */}
                    <div className="space-y-4">
                        <label htmlFor="image-upload" className="block text-sm font-medium text-foreground flex items-center"><Image className="w-4 h-4 mr-2" /> Upload Review Screenshot*</label>
                        <input
                            id="image-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            disabled={isLoading}
                            className="w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                        />
                        {previewUrl && (
                            <div className="mt-4 border border-input rounded-lg p-3">
                                <h4 className="text-xs text-muted-foreground mb-2">Image Preview:</h4>
                                <img src={previewUrl} alt="Review Preview" className="w-full h-auto rounded-md object-cover max-h-64" />
                            </div>
                        )}
                        {!imageFile && <p className="text-sm text-yellow-500 flex items-center"><AlertTriangle className="w-4 h-4 mr-2" /> Please capture the reviewer name, star rating, and comment clearly.</p>}
                    </div>

                    {/* Context Inputs */}
                    <div className="space-y-6">
                         <div className="space-y-2">
                            <label htmlFor="website-url" className="text-sm font-medium text-foreground flex items-center"><Globe className="w-4 h-4 mr-2" /> Website URL (Source of Review)*</label>
                            <input
                                id="website-url"
                                type="url"
                                value={websiteUrl}
                                onChange={(e) => setWebsiteUrl(e.target.value)}
                                placeholder="e.g., https://shadyproductsite.com"
                                className="w-full p-3 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-ring transition-colors"
                                disabled={isLoading}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="reviewer-info" className="text-sm font-medium text-foreground flex items-center"><UserCheck className="w-4 h-4 mr-2" /> Reviewer Name / Extra Details*</label>
                            <textarea
                                id="reviewer-info"
                                value={reviewerInfo}
                                onChange={(e) => setReviewerInfo(e.target.value)}
                                rows={4}
                                placeholder="e.g., 'Reviewer name is 'Bobby Smith' (looks generic). They have 1 review total.'"
                                className="w-full p-3 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-ring transition-colors resize-none"
                                disabled={isLoading}
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* Analysis Button */}
                <button 
                    onClick={handleAnalysis}
                    disabled={isLoading || !imageFile || !websiteUrl.trim() || !reviewerInfo.trim()}
                    className={`mt-8 w-full px-6 py-4 flex justify-center items-center space-x-3 rounded-lg font-bold text-xl text-shadow-sm transition-smooth ${
                        isLoading ? 'bg-muted-foreground text-muted cursor-not-allowed' : 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:opacity-95'
                    }`}
                >
                    {isLoading ? (
                        <><div className="animate-spin rounded-full h-6 w-6 border-2 border-current border-t-transparent"></div> <span>Analyzing Review Credibility...</span></>
                    ) : (
                        <><Send className="w-6 h-6" /> <span>Run Full Analysis</span></>
                    )}
                </button>
            </div>

            {/* Error Message Display */}
            {error && (
                <div className="mt-8 p-4 bg-destructive/20 border border-destructive rounded-lg text-destructive-foreground">
                    <p className="font-semibold">{error}</p>
                </div>
            )}

            {/* Analysis Results Display */}
            {result && (
                <div className="mt-12">
                    <h2 className="text-3xl font-semibold text-foreground mb-4 text-shadow-sm">Review Report</h2>
                    
                    {/* Verdict Card */}
                    <div className={`p-6 rounded-xl border-l-4 ${getVerdictStyle(result.text).color} mb-6`}>
                        <div className="flex items-center space-x-4">
                            {getVerdictStyle(result.text).icon}
                            <div className="font-extrabold text-2xl">
                                Trustek Verdict: <span className="text-primary">{getVerdictStyle(result.text).label}</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Summary */}
                    <div className="bg-card p-6 rounded-xl shadow-lg border border-border mb-6">
                        <h3 className="text-xl font-bold mb-3 text-primary flex items-center"><MessageSquare className="w-5 h-5 mr-2" /> Summary of Findings</h3>
                        <div className="whitespace-pre-wrap text-foreground">
                            {result.text}
                        </div>
                    </div>

                    {/* Sources */}
                    {result.sources.length > 0 && (
                        <div className="bg-card p-6 rounded-xl shadow-lg border border-border">
                            <h3 className="text-xl font-bold mb-3 text-primary flex items-center space-x-2">
                                <LinkIcon className="w-5 h-5" />
                                <span>Verification Sources (for Website Check)</span>
                            </h3>
                            <ul className="space-y-2 text-sm">
                                {result.sources.map((source, index) => (
                                    <li key={index} className="flex items-start text-muted-foreground">
                                        <span className="mr-2 text-primary">•</span>
                                        <a href={source.uri} target="_blank" rel="noopener noreferrer" 
                                           className="hover:underline text-secondary transition-colors font-medium">
                                            {source.title} 
                                        </a>
                                        <span className="ml-2 text-xs opacity-50">({new URL(source.uri).hostname})</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Apply the protection HOC
export default ReviewAnalyzer;

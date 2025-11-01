import React, { useState } from 'react';
import { Send, CheckCircle, XCircle, Image, Globe } from 'lucide-react';
import apiService from '@/services/api';

// --- Types ---
interface AnalysisResult {
  detected_text?: string;
  label: 'Fake' | 'Real';
  confidence: number;
  source_status?: 'Safe' | 'Suspicious';
  source_summary?: string;
}

// --- Component ---
const FakeNewsDetectionPage: React.FC = () => {
  const [inputType, setInputType] = useState<'url' | 'image'>('url');
  const [url, setUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setResult(null);
    setError(null);

    try {
      let analysisResult: AnalysisResult;

      if (inputType === 'url') {
        // Analyze from URL
        const response = await apiService.analyzeFakeNewsFromUrl(url.trim());
        analysisResult = {
          detected_text: response.detected_text,
          label: response.label,
          confidence: response.confidence,
          source_status: response.source_status,
          source_summary: response.source_summary,
        };
      } else {
        // Analyze from image
        if (!imageFile) return;
        const response = await apiService.analyzeFakeNewsFromImage(imageFile);
        analysisResult = {
          detected_text: response.detected_text,
          label: response.label,
          confidence: response.confidence,
        };
      }

      setResult(analysisResult);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'An unexpected error occurred during analysis.');
    } finally {
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

  return (
    <div className="min-h-screen container mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <h1 className="text-5xl font-extrabold text-primary mb-2 text-shadow-lg">Fact Checker Tool</h1>
      <p className="text-xl text-muted-foreground mb-10">
        Authenticate your claims, text, or images using our AI analysis.
      </p>

      <div className="bg-card p-8 rounded-xl shadow-2xl border border-border">
        {/* Input Type Toggle */}
        <div className="flex space-x-4 mb-6 border-b border-border pb-3">
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
      </div>

      {/* Loading Animation */}
      {isLoading && (
        <div className="mt-6 text-center">
          <div className="inline-flex items-center space-x-2 animate-pulse text-muted-foreground font-medium">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"></div>
            <span>Analyzing...</span>
          </div>
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
          <h2 className="text-3xl font-semibold text-foreground mb-6 text-shadow-sm">Analysis Results</h2>
          
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

            {/* Result */}
            <div className={`p-6 rounded-xl border-l-4 ${getVerdictStyle(result.label).color}`}>
              <div className="flex items-center space-x-4">
                {getVerdictStyle(result.label).icon}
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-2xl">✅</span>
                    <span className="font-extrabold text-xl text-foreground">Result:</span>
                  </div>
                  <div className="text-lg">
                    <span className={`font-bold ${getVerdictStyle(result.label).textColor}`}>
                      {result.label === 'Real' ? 'Real' : 'Fake'}
                    </span>
                    <span className="text-muted-foreground ml-2">
                      (Confidence: {(result.confidence * 100).toFixed(0)}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Source Status (only for URL analysis) */}
            {result.source_status && (
              <div className="bg-background p-6 rounded-lg border border-border">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-2xl">🌐</span>
                  <h3 className="text-lg font-bold text-foreground">Source:</h3>
                </div>
                <p className={`font-semibold ${
                  result.source_status === 'Safe' ? 'text-green-500' : 'text-red-500'
                }`}>
                  {result.source_status}
                </p>
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
    </div>
  );
};

export default FakeNewsDetectionPage;

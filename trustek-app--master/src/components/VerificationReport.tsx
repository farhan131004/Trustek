import React from 'react';
import { ReactTinyLink } from 'react-tiny-link';

type VerificationReportProps = {
  url: string;
  verdict?: string;               // e.g., "Verified", "Suspicious", "Unsafe"
  credibilityScore?: number;      // 0-100
  summary?: string;
  proxyUrl?: string;               // Optional CORS proxy
  useScreenshot?: boolean;         // Show live thumbnail via screenshot API
  screenshotProvider?: 'microlink';
};

export default function VerificationReport({
  url,
  verdict = 'Verified',
  credibilityScore = 99,
  summary = 'This page appears reputable based on corroborating sources and editorial standards.',
  proxyUrl = 'https://api.allorigins.win/raw?url=',
  useScreenshot = false,
  screenshotProvider = 'microlink',
}: VerificationReportProps) {
  if (!url) return null;

  return (
    <div className="flex flex-col gap-4 bg-slate-900 text-white p-4 rounded-2xl shadow-xl">
      <h2 className="text-xl font-semibold">Verification Report</h2>

      {/* Optional live screenshot thumbnail */}
      {useScreenshot && screenshotProvider === 'microlink' && (
        <div className="rounded-xl overflow-hidden">
          <img
            src={`https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url`}
            alt="website screenshot"
            className="rounded-xl shadow"
          />
        </div>
      )}

      <div className="rounded-xl overflow-hidden">
        <ReactTinyLink
          cardSize="large"
          showGraphic={true}
          maxLine={2}
          minLine={1}
          url={url}
          proxyUrl={proxyUrl}
        />
      </div>

      <div className="bg-slate-800 rounded-xl p-4 mt-3">
        <p className="font-medium">✅ Verification Outcome:</p>
        <p>{verdict}</p>

        <p className="mt-2 font-medium">🌐 Source Credibility Score:</p>
        <p>{typeof credibilityScore === 'number' ? `${Math.round(credibilityScore)}% Safe — Powered by web corroboration` : '—'}</p>
      </div>

      <div className="bg-slate-800 rounded-xl p-4 mt-3">
        <p className="font-medium">ℹ️ Summary:</p>
        <p>{summary}</p>
      </div>
    </div>
  );
}

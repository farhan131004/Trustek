import os
import json
import requests
from typing import Any, Dict, Optional, Tuple

# Simple, dependency-light multi-provider LLM client
# Supported providers via .env: grok, wind, openai, gemini (optional), hybrid

PROVIDER = os.getenv('LLM_PROVIDER', 'grok').strip().lower()

# Grok / xAI
GROK_KEY = os.getenv('LLM_API_KEY_GROK') or os.getenv('LLM_API_KEY')
GROK_MODEL = os.getenv('LLM_MODEL_GROK', os.getenv('LLM_MODEL', 'grok-2-latest'))
GROK_URL = os.getenv('LLM_BASE_URL_GROK', os.getenv('LLM_BASE_URL', 'https://api.x.ai/v1/chat/completions'))

# Windsurf / Wind
WIND_KEY = os.getenv('LLM_API_KEY_WIND')
WIND_MODEL = os.getenv('LLM_MODEL_WIND', 'gpt-4.1-json')
WIND_URL = os.getenv('LLM_BASE_URL_WIND', 'https://api.windsurf.com/v1/chat/completions')

# OpenAI
OPENAI_KEY = os.getenv('LLM_API_KEY_OPENAI')
OPENAI_MODEL = os.getenv('LLM_MODEL_OPENAI', 'gpt-4.1')
OPENAI_URL = os.getenv('LLM_BASE_URL_OPENAI', 'https://api.openai.com/v1/chat/completions')

# Gemini (optional; only if google genai lib installed)
GEMINI_KEY = os.getenv('LLM_API_KEY_GEMINI')
GEMINI_MODEL = os.getenv('LLM_MODEL_GEMINI', 'gemini-2.0-flash')
GEMINI_BASE = os.getenv('LLM_BASE_URL_GEMINI', 'https://generativelanguage.googleapis.com')


def _extract_chat_json_text(obj: Dict[str, Any]) -> Optional[str]:
    try:
        # OpenAI/Grok/Wind compatible structure
        return obj['choices'][0]['message']['content']
    except Exception:
        return None


def call_grok(prompt: str) -> Tuple[Optional[str], Optional[Dict[str, Any]]]:
    if not GROK_KEY:
        return None, {'error': 'MISSING_GROK_KEY'}
    headers = {
        'Authorization': f'Bearer {GROK_KEY}',
        'Content-Type': 'application/json'
    }
    data = {
        'model': GROK_MODEL,
        'messages': [
            { 'role': 'user', 'content': prompt }
        ],
        # Ask for strict JSON output
        'response_format': { 'type': 'json' }
    }
    resp = requests.post(GROK_URL, json=data, headers=headers, timeout=25)
    resp.raise_for_status()
    payload = resp.json()
    return _extract_chat_json_text(payload), payload


def call_openai(prompt: str) -> Tuple[Optional[str], Optional[Dict[str, Any]]]:
    if not OPENAI_KEY:
        return None, {'error': 'MISSING_OPENAI_KEY'}
    headers = {
        'Authorization': f'Bearer {OPENAI_KEY}',
        'Content-Type': 'application/json'
    }
    data = {
        'model': OPENAI_MODEL,
        'messages': [ { 'role': 'user', 'content': prompt } ]
    }
    resp = requests.post(OPENAI_URL, json=data, headers=headers, timeout=25)
    resp.raise_for_status()
    payload = resp.json()
    return _extract_chat_json_text(payload), payload


def call_wind(prompt: str) -> Tuple[Optional[str], Optional[Dict[str, Any]]]:
    if not WIND_KEY:
        return None, {'error': 'MISSING_WIND_KEY'}
    headers = {
        'Authorization': f'Bearer {WIND_KEY}',
        'Content-Type': 'application/json'
    }
    data = {
        'model': WIND_MODEL,
        'messages': [ { 'role': 'user', 'content': prompt } ]
    }
    resp = requests.post(WIND_URL, json=data, headers=headers, timeout=25)
    resp.raise_for_status()
    payload = resp.json()
    return _extract_chat_json_text(payload), payload


def call_gemini(prompt: str) -> Tuple[Optional[str], Optional[Dict[str, Any]]]:
    """Call Gemini using the official SDK when available; fallback to REST. Requests strict JSON."""
    if not GEMINI_KEY:
        return None, {'error': 'MISSING_GEMINI_KEY'}
    # Try SDK first
    try:
        import google.generativeai as genai  # type: ignore
        genai.configure(api_key=GEMINI_KEY)
        model = genai.GenerativeModel(GEMINI_MODEL)
        resp = model.generate_content(
            prompt,
            generation_config={
                'response_mime_type': 'application/json'
            }
        )
        # Prefer resp.text when present; else extract from candidates
        text = getattr(resp, 'text', None)
        if text:
            return text, {'sdk': 'google-generativeai'}
        # Fallback to extract from candidates
        try:
            candidates = getattr(resp, 'candidates', None) or []
            if candidates:
                parts = candidates[0].content.parts if hasattr(candidates[0], 'content') else []
                if parts:
                    ptext = getattr(parts[0], 'text', None)
                    if ptext:
                        return ptext, {'sdk': 'google-generativeai'}
        except Exception:
            pass
        # If SDK returned but no text, continue to REST fallback
    except Exception as sdk_err:
        # Proceed to REST fallback
        pass

    # REST fallback
    try:
        url = f"{GEMINI_BASE}/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_KEY}"
        headers = {'Content-Type': 'application/json'}
        data = {
            'contents': [
                {
                    'role': 'user',
                    'parts': [{ 'text': prompt }]
                }
            ],
            'generationConfig': {
                'response_mime_type': 'application/json'
            }
        }
        resp = requests.post(url, headers=headers, json=data, timeout=30)
        resp.raise_for_status()
        payload = resp.json()
        # Try to extract text
        try:
            candidates = payload.get('candidates') or []
            if candidates:
                parts = candidates[0].get('content', {}).get('parts', [])
                if parts:
                    text = parts[0].get('text')
                    return text, payload
        except Exception:
            pass
        return None, payload
    except Exception as e:
        return None, {'error': 'GEMINI_CALL_FAILED', 'details': str(e)}


def call_llm(prompt: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Returns (json_text, provider_used). json_text is the raw JSON string from the model if available.
    """
    provider = PROVIDER
    last_err = None

    def _try(fn, name):
        nonlocal last_err
        try:
            text, raw = fn(prompt)
            if text:
                return text, name
            last_err = raw
        except Exception as e:
            last_err = {'error': f'{name}_call_failed', 'details': str(e)}
        return None, None

    if provider == 'grok':
        out, name = _try(call_grok, 'grok')
        if out: return out, name
    elif provider == 'wind':
        out, name = _try(call_wind, 'wind')
        if out: return out, name
    elif provider == 'openai':
        out, name = _try(call_openai, 'openai')
        if out: return out, name
    elif provider == 'gemini':
        out, name = _try(call_gemini, 'gemini')
        if out: return out, name
    elif provider == 'hybrid':
        # Try Gemini first then Grok, then Wind, then OpenAI
        for fn, name in [(call_gemini, 'gemini'), (call_grok, 'grok'), (call_wind, 'wind'), (call_openai, 'openai')]:
            out, used = _try(fn, name)
            if out:
                return out, used

    # No luck
    return None, json.dumps(last_err) if isinstance(last_err, dict) else str(last_err)

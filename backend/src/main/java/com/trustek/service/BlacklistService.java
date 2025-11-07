package com.trustek.service;

import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class BlacklistService {

    public static class Entry {
        public final String url;
        public final int credibilityScore;
        public final String source; // e.g., "structured", "fact_checker"
        public final long timestamp;
        public final String reason;

        public Entry(String url, int credibilityScore, String source, String reason) {
            this.url = url;
            this.credibilityScore = credibilityScore;
            this.source = source;
            this.reason = reason;
            this.timestamp = System.currentTimeMillis();
        }
    }

    private final Set<String> blacklisted = Collections.newSetFromMap(new ConcurrentHashMap<>());
    private final Map<String, Entry> details = new ConcurrentHashMap<>();

    public boolean isBlacklisted(String url) {
        if (url == null) return false;
        return blacklisted.contains(normalize(url));
    }

    public Entry get(String url) {
        if (url == null) return null;
        return details.get(normalize(url));
    }

    public void blacklist(String url, int credibilityScore, String source, String reason) {
        if (url == null) return;
        String key = normalize(url);
        blacklisted.add(key);
        details.put(key, new Entry(key, credibilityScore, source, reason));
    }

    private String normalize(String url) {
        String u = url.trim();
        // Very light normalization; keep scheme+host+path
        try {
            java.net.URI uri = new java.net.URI(u);
            String scheme = uri.getScheme() != null ? uri.getScheme().toLowerCase() : "http";
            String host = uri.getHost() != null ? uri.getHost().toLowerCase() : u;
            int port = uri.getPort();
            String path = uri.getRawPath() != null ? uri.getRawPath() : "";
            StringBuilder sb = new StringBuilder();
            sb.append(scheme).append("://").append(host);
            if (port != -1) sb.append(":").append(port);
            sb.append(path);
            return sb.toString();
        } catch (Exception e) {
            return u;
        }
    }
}

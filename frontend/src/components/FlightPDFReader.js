import React, { useState, useRef } from 'react';

/**
 * FlightPDFReader
 * ---------------
 * Accepts a flight-ticket PDF, extracts text using PDF.js (loaded from CDN),
 * parses the arrival time, and applies the TA/DA rule:
 *   - Landing after 12:00 PM  → return_date + 1 extra day
 *   - Landing at/before 12:00 PM → no extra day
 *
 * Props:
 *   onDatesExtracted({ departureDate, returnDate, flightInfo }) — called after parse
 */

// ─── helpers ────────────────────────────────────────────────────────────────

const toYMD = (date) => {
  if (!date || isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const addDays = (dateStr, n) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return toYMD(d);
};

/**
 * Parse time string like "14:35", "2:35 PM", "14:35:00" → { hours, minutes }
 * Returns null if not parseable.
 */
const parseTime = (raw) => {
  if (!raw) return null;
  raw = raw.trim();

  // HH:MM or HH:MM:SS (24-hour)
  let m = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (m) return { hours: parseInt(m[1]), minutes: parseInt(m[2]) };

  // H:MM AM/PM or HH:MM AM/PM
  m = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (m) {
    let h = parseInt(m[1]);
    const min = parseInt(m[2]);
    const ampm = m[3].toUpperCase();
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return { hours: h, minutes: min };
  }

  return null;
};

/**
 * Parse a date like "15 May 2025", "2025-05-15", "15/05/2025", "May 15, 2025"
 * Returns a Date object (midnight local) or null.
 */
const parseDate = (raw) => {
  if (!raw) return null;
  raw = raw.trim();

  const MONTHS = {
    jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11,
    january:0,february:1,march:2,april:3,june:5,july:6,august:7,
    september:8,october:9,november:10,december:11
  };

  // DD Mon YYYY or DD-Mon-YYYY
  let m = raw.match(/^(\d{1,2})[\s\-]([A-Za-z]+)[\s\-](\d{4})$/);
  if (m) {
    const mo = MONTHS[m[2].toLowerCase()];
    if (mo !== undefined) return new Date(+m[3], mo, +m[1]);
  }

  // Mon DD, YYYY
  m = raw.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (m) {
    const mo = MONTHS[m[1].toLowerCase()];
    if (mo !== undefined) return new Date(+m[3], mo, +m[2]);
  }

  // YYYY-MM-DD
  m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);

  // DD/MM/YYYY
  m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);

  return null;
};

/**
 * Given the full text of a PDF ticket, attempt to extract:
 *   - departure date & time
 *   - arrival date & time
 *   - from/to city
 * Returns { departureDateStr, arrivalDateStr, arrivalTime, fromCity, toCity, rawArrivalTime }
 */
const extractFlightInfo = (text) => {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const fullText = text;

  let departureDateStr = null;
  let arrivalDateStr   = null;
  let arrivalTimeRaw   = null;
  let departureTimeRaw = null;
  let fromCity = null;
  let toCity   = null;

  // ── 1. Try to find departure/arrival blocks ─────────────────────────────
  // Pattern: "Departs / Arrives" headings followed by date + time
  // Many airlines use: "Departs\n15 May 2025\n06:00" style

  const datePatterns = [
    /\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})\b/gi,
    /\b(\d{4}-\d{2}-\d{2})\b/g,
    /\b(\d{2}\/\d{2}\/\d{4})\b/g,
    /\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})\b/gi,
  ];

  const timePattern = /\b(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)\b/gi;

  // Collect all dates and times found in the text in order
  const allDates = [];
  for (const pat of datePatterns) {
    let m;
    const regex = new RegExp(pat.source, pat.flags);
    while ((m = regex.exec(fullText)) !== null) {
      const d = parseDate(m[1]);
      if (d) allDates.push({ index: m.index, dateStr: toYMD(d), date: d, raw: m[1] });
    }
  }
  allDates.sort((a, b) => a.index - b.index);

  const allTimes = [];
  let tm;
  const timeRegex = new RegExp(timePattern.source, timePattern.flags);
  while ((tm = timeRegex.exec(fullText)) !== null) {
    const t = parseTime(tm[1]);
    if (t) allTimes.push({ index: tm.index, raw: tm[1], ...t });
  }
  allTimes.sort((a, b) => a.index - b.index);

  // ── 2. Look for "Departs" / "Arrives" keywords near dates/times ─────────
  const departKeywords = /\b(depart|departure|departs|dep\.?|take[\s-]?off|boards?|origin)\b/i;
  const arriveKeywords  = /\b(arriv|arrival|arrives|arr\.?|land|destination)\b/i;

  // Scan lines for clues
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (departKeywords.test(line)) {
      // look ahead a few lines for date + time
      for (let j = i; j < Math.min(i + 5, lines.length); j++) {
        if (!departureDateStr) {
          for (const pat of datePatterns) {
            const dm = lines[j].match(new RegExp(pat.source, 'i'));
            if (dm) { const d = parseDate(dm[1]); if (d) departureDateStr = toYMD(d); break; }
          }
        }
        if (!departureTimeRaw) {
          const dtm = lines[j].match(/\b(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)\b/i);
          if (dtm) departureTimeRaw = dtm[1];
        }
        if (departureDateStr && departureTimeRaw) break;
      }
    }

    if (arriveKeywords.test(line)) {
      for (let j = i; j < Math.min(i + 5, lines.length); j++) {
        if (!arrivalDateStr) {
          for (const pat of datePatterns) {
            const dm = lines[j].match(new RegExp(pat.source, 'i'));
            if (dm) { const d = parseDate(dm[1]); if (d) arrivalDateStr = toYMD(d); break; }
          }
        }
        if (!arrivalTimeRaw) {
          const atm = lines[j].match(/\b(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)\b/i);
          if (atm) arrivalTimeRaw = atm[1];
        }
        if (arrivalDateStr && arrivalTimeRaw) break;
      }
    }
  }

  // ── 3. Fallback: if only 1 date, use it as departure; if 2+ use first=dep, last=arr ───
  if (!departureDateStr && allDates.length > 0) {
    departureDateStr = allDates[0].dateStr;
  }
  if (!arrivalDateStr && allDates.length >= 2) {
    arrivalDateStr = allDates[allDates.length - 1].dateStr;
  } else if (!arrivalDateStr && departureDateStr) {
    arrivalDateStr = departureDateStr; // same-day flight
  }

  // ── 4. Fallback times: first time = departure, last = arrival ───────────
  if (!departureTimeRaw && allTimes.length > 0) departureTimeRaw = allTimes[0].raw;
  if (!arrivalTimeRaw   && allTimes.length >= 2) arrivalTimeRaw  = allTimes[allTimes.length - 1].raw;
  else if (!arrivalTimeRaw && allTimes.length === 1) arrivalTimeRaw = allTimes[0].raw;

  // ── 5. City extraction ─────────────────────────────────────────────────
  // Look for IATA codes (3 uppercase letters) or "From: CityName" patterns
  const iataMatches = fullText.match(/\b([A-Z]{3})\s*[-–→]\s*([A-Z]{3})\b/);
  if (iataMatches) { fromCity = iataMatches[1]; toCity = iataMatches[2]; }

  if (!fromCity) {
    const fromMatch = fullText.match(/\b(?:from|origin|departure\s+city)[:\s]+([A-Za-z\s]+?)(?:\s*[-–\n,])/i);
    if (fromMatch) fromCity = fromMatch[1].trim();
  }
  if (!toCity) {
    const toMatch = fullText.match(/\b(?:to|destination|arrival\s+city)[:\s]+([A-Za-z\s]+?)(?:\s*[-–\n,])/i);
    if (toMatch) toCity = toMatch[1].trim();
  }

  return {
    departureDateStr,
    arrivalDateStr,
    arrivalTimeRaw,
    departureTimeRaw,
    fromCity,
    toCity,
    allDatesFound: allDates.length,
    allTimesFound: allTimes.length,
  };
};

// ─── component ──────────────────────────────────────────────────────────────

export default function FlightPDFReader({ onDatesExtracted }) {
  const [status, setStatus]       = useState('idle'); // idle | loading | success | error
  const [result, setResult]       = useState(null);
  const [errorMsg, setErrorMsg]   = useState('');
  const [pdfText, setPdfText]     = useState('');
  const [showRaw, setShowRaw]     = useState(false);
  const fileRef = useRef();

  const loadPdfJs = () => new Promise((resolve, reject) => {
    if (window.pdfjsLib) { resolve(window.pdfjsLib); return; }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve(window.pdfjsLib);
    };
    script.onerror = () => reject(new Error('Failed to load PDF.js'));
    document.head.appendChild(script);
  });

  const extractTextFromPDF = async (file) => {
    const pdfjsLib = await loadPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
    }
    return fullText;
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setErrorMsg('Please upload a PDF file.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMsg('');
    setResult(null);
    setPdfText('');

    try {
      const text = await extractTextFromPDF(file);
      setPdfText(text);

      const info = extractFlightInfo(text);

      // Apply TA/DA rule: landing after 12:00 PM → +1 extra day on return
      const arrivalTime = parseTime(info.arrivalTimeRaw);
      const landingAfterNoon = arrivalTime
        ? arrivalTime.hours > 12 || (arrivalTime.hours === 12 && arrivalTime.minutes > 0)
        : false;

      const effectiveReturnDate = info.arrivalDateStr
        ? landingAfterNoon
          ? addDays(info.arrivalDateStr, 1)
          : info.arrivalDateStr
        : null;

      const parsed = {
        departureDateStr:   info.departureDateStr,
        arrivalDateStr:     info.arrivalDateStr,
        effectiveReturnDate,
        landingAfterNoon,
        arrivalTimeRaw:     info.arrivalTimeRaw,
        departureTimeRaw:   info.departureTimeRaw,
        fromCity:           info.fromCity,
        toCity:             info.toCity,
      };

      setResult(parsed);
      setStatus('success');

      if (onDatesExtracted) {
        onDatesExtracted({
          departureDate: info.departureDateStr || '',
          returnDate:    effectiveReturnDate || '',
          flightInfo:    parsed,
        });
      }
    } catch (err) {
      console.error('PDF parse error:', err);
      setErrorMsg('Could not parse PDF. Please check the file and try again.');
      setStatus('error');
    }

    // Reset input so same file can be re-uploaded
    if (fileRef.current) fileRef.current.value = '';
  };

  const fmt12 = (raw) => {
    const t = parseTime(raw);
    if (!t) return raw || '—';
    const ampm = t.hours >= 12 ? 'PM' : 'AM';
    const h = t.hours % 12 || 12;
    return `${h}:${String(t.minutes).padStart(2, '0')} ${ampm}`;
  };

  const fmtDate = (str) => {
    if (!str) return '—';
    const d = new Date(str + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div style={{
      border: '2px dashed #c9a84c',
      borderRadius: 10,
      padding: 20,
      background: '#fffdf5',
      marginBottom: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 22 }}>✈️</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#0d1b2a' }}>Flight Ticket PDF Reader</div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
            Upload your flight ticket PDF — dates will be auto-filled. Landing after 12:00 PM adds 1 extra day.
          </div>
        </div>
      </div>

      <label style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        background: '#0d1b2a', color: '#fff', padding: '9px 18px',
        borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 600,
        opacity: status === 'loading' ? 0.6 : 1,
        pointerEvents: status === 'loading' ? 'none' : 'auto',
      }}>
        📄 {status === 'loading' ? 'Reading PDF…' : 'Choose PDF Ticket'}
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          style={{ display: 'none' }}
          onChange={handleFile}
          disabled={status === 'loading'}
        />
      </label>

      {status === 'error' && (
        <div style={{ marginTop: 12, color: '#dc2626', fontSize: 13, background: '#fef2f2', padding: '10px 14px', borderRadius: 7, border: '1px solid #fecaca' }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {status === 'success' && result && (
        <div style={{ marginTop: 14 }}>
          {/* Result card */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#0d1b2a', marginBottom: 12 }}>
              ✅ Extracted Flight Details
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
              {[
                ['✈️ From', result.fromCity || 'Not found'],
                ['🛬 To', result.toCity || 'Not found'],
                ['📅 Departure', fmtDate(result.departureDateStr)],
                ['🕐 Dep. Time', fmt12(result.departureTimeRaw)],
                ['📅 Arrival Date', fmtDate(result.arrivalDateStr)],
                ['🕐 Landing Time', fmt12(result.arrivalTimeRaw)],
              ].map(([label, val]) => (
                <div key={label} style={{ background: '#f9fafb', padding: '10px 12px', borderRadius: 7 }}>
                  <div style={{ fontSize: 11, color: '#888', marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1f2937' }}>{val}</div>
                </div>
              ))}
            </div>

            {/* TA/DA Rule result */}
            <div style={{
              marginTop: 14, padding: '12px 16px', borderRadius: 8,
              background: result.landingAfterNoon ? '#fef9ec' : '#f0fdf4',
              border: `1px solid ${result.landingAfterNoon ? '#f5c842' : '#86efac'}`,
            }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: result.landingAfterNoon ? '#92400e' : '#166534' }}>
                {result.landingAfterNoon
                  ? `⚠️ Landing after 12:00 PM (${fmt12(result.arrivalTimeRaw)}) — 1 extra day added`
                  : `✅ Landing at/before 12:00 PM (${fmt12(result.arrivalTimeRaw)}) — No extra day`
                }
              </div>
              <div style={{ fontSize: 13, color: '#374151', marginTop: 6 }}>
                <strong>Effective return date set to:</strong>{' '}
                <span style={{ color: '#0d1b2a', fontWeight: 700 }}>{fmtDate(result.effectiveReturnDate)}</span>
                {result.landingAfterNoon && (
                  <span style={{ marginLeft: 8, fontSize: 12, color: '#b45309' }}>
                    (Original arrival: {fmtDate(result.arrivalDateStr)} → +1 day)
                  </span>
                )}
              </div>
            </div>

            <div style={{ marginTop: 10, fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
              📝 Departure date and return date have been auto-filled in the form above.
            </div>
          </div>

          {/* Raw text toggle */}
          <button
            onClick={() => setShowRaw(r => !r)}
            style={{ marginTop: 10, background: 'none', border: '1px solid #ddd', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 12, color: '#666' }}
          >
            {showRaw ? 'Hide' : 'Show'} raw extracted text
          </button>
          {showRaw && (
            <pre style={{ marginTop: 8, background: '#f3f4f6', padding: 12, borderRadius: 7, fontSize: 11, color: '#374151', maxHeight: 200, overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {pdfText}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

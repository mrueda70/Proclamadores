/**
 * Service for fetching Catholic readings from Ciudad Redonda
 */

/**
 * Fetch with timeout - prevents hanging requests
 */
async function fetchWithTimeout(url: string, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch with retry logic for handling temporary network failures
 */
async function fetchWithRetry(url: string, maxRetries = 3, delayMs = 1000): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, 15000);
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const isTimeout = lastError.name === 'AbortError';
      console.log(`Fetch attempt ${attempt}/${maxRetries} ${isTimeout ? 'timed out' : 'failed'} for ${url}: ${lastError.message}`);
      
      if (attempt < maxRetries) {
        // Wait before retrying, with exponential backoff
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  
  throw new Error(`Failed to fetch after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
}

interface ReadingsData {
  first_reading: string | null;
  psalm: string | null;
  second_reading: string | null;
  gospel: string | null;
  mass_type: string | null;
  liturgical_day: string | null;
  first_reading_text: string | null;
  psalm_text: string | null;
  second_reading_text: string | null;
  gospel_text: string | null;
}

/**
 * Helper function to decode HTML entities
 */
function decodeHTML(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&aacute;/g, 'á')
    .replace(/&eacute;/g, 'é')
    .replace(/&iacute;/g, 'í')
    .replace(/&oacute;/g, 'ó')
    .replace(/&uacute;/g, 'ú')
    .replace(/&ntilde;/g, 'ñ')
    .replace(/&Aacute;/g, 'Á')
    .replace(/&Eacute;/g, 'É')
    .replace(/&Iacute;/g, 'Í')
    .replace(/&Oacute;/g, 'Ó')
    .replace(/&Uacute;/g, 'Ú')
    .replace(/&Ntilde;/g, 'Ñ');
}

/**
 * Extract text content from HTML, preserving line breaks
 */
function extractTextContent(htmlText: string): string {
  return htmlText
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Extract a section of readings (Primera Lectura, Salmo, etc.)
 */
function extractSection(html: string, sectionTitle: string): { citation: string | null; text: string | null } {
  // Pattern: <h2>Title</h2> followed by content until the next <h2> or end
  // Allow for whitespace inside the h2 tags (e.g., <h2> Salmo </h2>)
  const sectionRegex = new RegExp(
    `<h2[^>]*>\\s*${sectionTitle}\\s*</h2>([\\s\\S]*?)(?=<h2|<div class="tribe-events-single-section|$)`,
    'i'
  );
  
  const match = html.match(sectionRegex);
  if (!match) {
    return { citation: null, text: null };
  }
  
  const sectionContent = match[1];
  
  // Extract citation (first <p><b>...</b></p>)
  const citationMatch = sectionContent.match(/<p[^>]*>\s*<b>([^<]+)<\/b>/i);
  const citation = citationMatch ? decodeHTML(citationMatch[1].trim().replace(/:$/, '')) : null;
  
  // Extract all text paragraphs, excluding the citation and ending phrases
  const paragraphs: string[] = [];
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let pMatch;
  
  while ((pMatch = pRegex.exec(sectionContent)) !== null) {
    const pContent = pMatch[1];
    
    // Stop at ending phrases (Palabra de Dios/Señor)
    if (pContent.includes('<b>Palabra de') || pContent.includes('<b>Palabra del')) {
      break;
    }
    
    // Skip paragraphs that contain citation markers (bold tags at the start)
    if (pContent.trim().startsWith('<b>') && pContent.includes('</b>') && 
        (pContent.includes('Lectura') || pContent.includes('evangelio') || pContent.includes('Salmo'))) {
      continue;
    }
    
    const cleanText = extractTextContent(pContent).trim();
    if (cleanText && cleanText.length > 0) {
      paragraphs.push(cleanText);
    }
  }
  
  const text = paragraphs.length > 0 ? paragraphs.join('\n') : null;
  
  return { citation, text };
}

/**
 * Extract Psalm section (special handling because citation format varies)
 */
function extractPsalmSection(html: string): { citation: string | null; text: string | null } {
  // Pattern: <h2>Salmo</h2> followed by content until the next <h2> or end
  // Allow for whitespace inside the h2 tags (e.g., <h2> Salmo </h2>)
  const sectionRegex = /<h2[^>]*>\s*Salmo\s*<\/h2>([\s\S]*?)(?=<h2|<div class="tribe-events-single-section|$)/i;
  
  const match = html.match(sectionRegex);
  if (!match) {
    return { citation: null, text: null };
  }
  
  const sectionContent = match[1];
  
  // Psalms can have citation in three formats:
  // 1. Bold with closing tag: <p><b>Sal ...</b></p>
  // 2. Bold without closing tag (malformed): <p> <b>Sal ...</p>
  // 3. Plain: <p>Sal ...</p>
  let citation: string | null = null;
  
  // Try to find any paragraph containing "Sal" near the beginning
  // This handles both well-formed and malformed HTML
  const citationMatch = sectionContent.match(/<p[^>]*>\s*<?b?>?\s*([^<]*Sal[0-9,.\s-]+)/i);
  if (citationMatch) {
    citation = decodeHTML(citationMatch[1].trim());
  }
  
  // Extract all text paragraphs, excluding the citation and R/. markers
  const paragraphs: string[] = [];
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let pMatch;
  
  while ((pMatch = pRegex.exec(sectionContent)) !== null) {
    const pContent = pMatch[1];
    
    // Stop at ending phrase
    if (pContent.includes('<b>Palabra de') || pContent.includes('<b>Palabra del')) {
      break;
    }
    
    // Skip the citation paragraph
    // It contains "Sal" and might be in <b> tags or plain text
    const contentWithoutTags = pContent.replace(/<[^>]+>/g, '').trim();
    if (contentWithoutTags.includes('Sal') && contentWithoutTags.split(' ').length < 10) {
      continue;
    }
    
    // Skip if it's just "R/." marker
    const cleanText = extractTextContent(pContent).trim();
    if (cleanText === 'R/.' || cleanText === 'R/.') {
      continue;
    }
    
    if (cleanText && cleanText.length > 0) {
      paragraphs.push(cleanText);
    }
  }
  
  // Use double newlines to preserve paragraph separation (verse groups)
  const text = paragraphs.length > 0 ? paragraphs.join('\n\n') : null;
  
  return { citation, text };
}

/**
 * Find the readings event URL for a specific date from the calendar
 */
async function findReadingsUrl(date: string): Promise<string | null> {
  const calendarUrl = `https://www.ciudadredonda.org/calendario/?occurrence=${date}`;
  
  const response = await fetchWithRetry(calendarUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch calendar: ${response.status}`);
  }
  
  const html = await response.text();
  
  // Try multiple patterns to find the readings URL:
  // 1. "evangelio-y-lecturas" (weekdays)
  // 2. "lecturas-del" (Sundays and special days)
  const patterns = [
    new RegExp(`href="([^"]*evangelio-y-lecturas[^"]*${date}[^"]*)"`, 'i'),
    new RegExp(`href="([^"]*lecturas-del[^"]*${date}[^"]*)"`, 'i'),
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  // No readings found for this date
  return null;
}

/**
 * Fetch readings from Ciudad Redonda for a specific date
 */
export async function fetchReadingsFromCiudadRedonda(date: string): Promise<ReadingsData> {
  // Step 1: Find the readings URL for this date
  const url = await findReadingsUrl(date);
  
  // If no readings found for this date, return empty readings
  if (!url) {
    return {
      first_reading: null,
      psalm: null,
      second_reading: null,
      gospel: null,
      mass_type: null,
      liturgical_day: null,
      first_reading_text: null,
      psalm_text: null,
      second_reading_text: null,
      gospel_text: null,
    };
  }
  
  // Step 2: Fetch the readings page
  const response = await fetchWithRetry(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch readings: ${response.status}`);
  }
  
  const html = await response.text();
  
  const readings: ReadingsData = {
    first_reading: null,
    psalm: null,
    second_reading: null,
    gospel: null,
    mass_type: null,
    liturgical_day: null,
    first_reading_text: null,
    psalm_text: null,
    second_reading_text: null,
    gospel_text: null,
  };
  
  // Extract liturgical day (the main title)
  // Updated to match new Ciudad Redonda HTML structure
  const titleMatch = html.match(/<h1[^>]*class="mec-divi-simple-header"[^>]*>([^<]+)<\/h1>/i);
  if (titleMatch) {
    let title = decodeHTML(titleMatch[1].trim());
    
    // Remove "Evangelio y Lecturas del/de la" prefix to get just the liturgical day
    title = title
      .replace(/^Evangelio y Lecturas del?\s+/i, '')
      .replace(/^Lecturas del?\s+/i, '');
    
    // Capitalize first letter
    title = title.charAt(0).toUpperCase() + title.slice(1);
    
    readings.liturgical_day = title;
  }
  
  // Extract mass type (subtitle if present) - keeping for compatibility
  const subtitleMatch = html.match(/<h2[^>]*class="tribe-events-subtitle"[^>]*>([^<]+)<\/h2>/i);
  if (subtitleMatch) {
    readings.mass_type = decodeHTML(subtitleMatch[1].trim());
  }
  
  // Extract Primera Lectura
  const firstReading = extractSection(html, 'Primera Lectura');
  readings.first_reading = firstReading.citation;
  readings.first_reading_text = firstReading.text;
  
  // Extract Salmo (uses special extraction because format is different)
  const psalm = extractPsalmSection(html);
  readings.psalm = psalm.citation;
  readings.psalm_text = psalm.text;
  
  // Extract Segunda Lectura (may not exist)
  const secondReading = extractSection(html, 'Segunda Lectura');
  readings.second_reading = secondReading.citation;
  readings.second_reading_text = secondReading.text;
  
  // Extract Evangelio
  const gospel = extractSection(html, 'Evangelio');
  readings.gospel = gospel.citation;
  readings.gospel_text = gospel.text;
  
  return readings;
}

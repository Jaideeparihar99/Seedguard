(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SeedGuardSathiOcr = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const FIELDS = [
    {name: 'r_crop', label: 'Crop', pattern: /(?:image\s*)?crop/i},
    {name: 'r_variety', label: 'Variety', pattern: /(?:image\s*)?variety/i},
    {name: 'r_lot', label: 'Lot number', pattern: /\b(?:lot(?:\s*(?:number|no\.?))?|batch(?:\s*(?:number|no\.?))?)\b/i},
    {name: 'r_tag', label: 'Tag number', pattern: /\btag(?:\s*(?:number|no\.?))?\b/i},
    {name: 'r_producer', label: 'Seed producing agency', pattern: /\b(?:seed\s+producing\s+agency|agency\s+name|produced\s+by|spa\s+name)\b/i},
    {name: 'q_normal_germination', label: 'Normal germination', pattern: /\bnormal\s+germination\b/i},
    {name: 'q_weed_seed', label: 'Weed seed / purity', pattern: /\bweed\s+seed(?:s)?(?:\s*\(purity\))?/i},
    {name: 'q_other_crop_seed', label: 'Other crop seed / purity', pattern: /\bother\s+crop\s+seed(?:s)?(?:\s*\(purity\))?/i},
    {name: 'q_dead_seed', label: 'Dead seed', pattern: /\bdead\s+seed\b/i},
    {name: 'q_hard_seed', label: 'Hard seed', pattern: /\bhard\s+seed\b/i},
    {name: 'q_insect_damage', label: 'Insect damage', pattern: /\binsect\s+damage\b/i},
    {name: 'q_abnormal_seed', label: 'Abnormal seed', pattern: /\babnormal\s+seed\b/i},
    {name: 'q_diseased_seed', label: 'Diseased seed', pattern: /\b(?:diseased\s+seed|seed\s+health)\b/i},
    {name: 'q_nematode_galls', label: 'Nematode galls', pattern: /\bnematode\s+galls?\b/i},
  ];

  function cleanValue(value) {
    return String(value || '').trim()
      .replace(/^[\s:;#|=–—-]+/, '')
      .replace(/^(?:\([^)]{1,50}\)\s*)+/, '')
      .replace(/[|]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  function extract(text, confidence = 0, ocrLines = []) {
    const lines = String(text || '').split(/\r?\n/).map(line => line.replace(/\u00a0/g, ' ').trim()).filter(Boolean);
    const isAnotherLabel = value => FIELDS.some(field => field.pattern.test(value));
    const confidenceFor = line => {
      const normalized = line.toLowerCase();
      const matched = ocrLines.find(item => item.text?.trim().toLowerCase() === normalized)
        || ocrLines.find(item => item.text?.trim() && normalized.includes(item.text.trim().toLowerCase()));
      return Number.isFinite(matched?.confidence) ? matched.confidence : confidence;
    };
    const suggestions = [];

    for (const field of FIELDS) {
      const index = lines.findIndex(line => field.pattern.test(line));
      if (index < 0) continue;
      const labelLine = lines[index];
      const match = field.pattern.exec(labelLine);
      let value = match ? cleanValue(labelLine.slice(match.index + match[0].length)) : '';
      if (!value) {
        for (let next = index + 1; next < lines.length; next += 1) {
          if (isAnotherLabel(lines[next])) break;
          const candidate = cleanValue(lines[next]);
          if (candidate) { value = candidate; break; }
        }
      }
      // A valid lot identifier can itself contain the word "LOT". Labels are
      // already excluded when looking ahead, so don't reclassify the value here.
      if (!value || value.length > 100 || /\{\{|\}\}/.test(value)) continue;
      if (field.name === 'r_crop' && /^registered\s+(?:district|area|village)\b/i.test(value)) continue;
      suggestions.push({name: field.name, label: field.label, value, confidence: Math.max(5, Math.min(99, Math.round(confidenceFor(labelLine))))});
    }
    return suggestions;
  }

  return {extract};
});

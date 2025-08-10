export type CsvRow = {
  service: string;
  cancel_url_hint?: string;
  flow?: string;
  region?: string;
  support_hint?: string;
  known_paths?: string;
};

export function parseCsv(text: string): CsvRow[] {
  // Very lightweight CSV parser for well-formed rows with quoted fields
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  // Find the header row (first non-empty)
  let headerIdx = 0;
  while (headerIdx < lines.length && !/service/i.test(lines[headerIdx]!)) headerIdx += 1;
  const header = splitCsvLine(lines[headerIdx]!);
  const colIndex: Record<string, number> = {};
  header.forEach((h, i) => (colIndex[h.trim().toLowerCase()] = i));

  const rows: CsvRow[] = [];
  for (let i = headerIdx + 1; i < lines.length; i += 1) {
    const cols = splitCsvLine(lines[i]!);
    const service = cols[colIndex['service'] ?? -1]?.trim();
    if (!service) continue;
    rows.push({
      service,
      cancel_url_hint: cols[colIndex['cancel_url_hint'] ?? -1]?.trim(),
      flow: cols[colIndex['flow'] ?? -1]?.trim(),
      region: cols[colIndex['region'] ?? -1]?.trim(),
      support_hint: cols[colIndex['support_hint'] ?? -1]?.trim(),
      known_paths: cols[colIndex['known_paths'] ?? -1]?.trim(),
    });
  }
  return rows;
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]!;
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}



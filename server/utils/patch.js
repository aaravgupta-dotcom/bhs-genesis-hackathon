// server/utils/patch.js
// Apply an LLM-generated diff/patch to a source string

/**
 * Attempt to apply a unified diff to source code.
 * Falls back to returning a full replacement if diff parsing fails.
 * 
 * @param {string} source - Original source code
 * @param {string} patch - Either a unified diff OR a full replacement marked with <<<FULL>>>
 * @returns {string} - Patched source code
 */
export function applyPatch(source, patch) {
  // If the LLM returned a full replacement marker, use it directly
  if (patch.includes('<<<FULL_REPLACEMENT>>>')) {
    const marker = '<<<FULL_REPLACEMENT>>>';
    const idx = patch.indexOf(marker);
    return patch.slice(idx + marker.length).trim();
  }

  // Extract code from markdown code blocks if present
  const codeBlockMatch = patch.match(/```(?:html|javascript|js)?\n([\s\S]*?)```/);
  if (codeBlockMatch) {
    const extracted = codeBlockMatch[1].trim();
    // If it looks like a full HTML file, use it directly
    if (extracted.includes('<!DOCTYPE') || extracted.includes('<html')) {
      return extracted;
    }
  }

  // Try to apply unified diff hunks
  try {
    return applyUnifiedDiff(source, patch);
  } catch {
    // Last resort: if the patch is a code block, use it as full replacement
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }
    // Give back original with a comment about failed patch
    return source;
  }
}

function applyUnifiedDiff(source, diff) {
  const lines = source.split('\n');
  const diffLines = diff.split('\n');
  let result = [...lines];
  let offset = 0;

  let i = 0;
  while (i < diffLines.length) {
    const line = diffLines[i];
    
    // Hunk header: @@ -start,count +start,count @@
    const hunkMatch = line.match(/^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
    if (hunkMatch) {
      const origStart = parseInt(hunkMatch[1]) - 1; // 0-indexed
      i++;
      const hunkLines = [];
      while (i < diffLines.length && !diffLines[i].startsWith('@@') && !diffLines[i].startsWith('diff')) {
        hunkLines.push(diffLines[i]);
        i++;
      }
      
      // Apply the hunk
      let resultIdx = origStart + offset;
      const removals = [];
      const additions = [];
      
      for (const hunkLine of hunkLines) {
        if (hunkLine.startsWith('-')) {
          removals.push(hunkLine.slice(1));
        } else if (hunkLine.startsWith('+')) {
          additions.push(hunkLine.slice(1));
        }
      }
      
      // Find the context in result to place changes
      let found = resultIdx;
      // Remove old lines
      result.splice(found, removals.length, ...additions);
      offset += additions.length - removals.length;
      
    } else {
      i++;
    }
  }
  
  return result.join('\n');
}

/**
 * Replaces text arrow patterns with unicode arrow characters
 * and formats lines starting with "- " as bullet points.
 * "->" becomes "→", "<-" becomes "←", "- text" becomes "• text"
 */
export function formatArrows(text: string): string {
  return text
    // First handle arrows (before bullet processing to avoid conflicts)
    .replace(/->/g, '→')
    .replace(/<-/g, '←')
    // Format lines starting with "- " as bullet points (but not standalone "-")
    .replace(/^- (.+)$/gm, '• $1');
}

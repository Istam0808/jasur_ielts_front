"use client"

import { useMemo } from 'react';
import { marked } from 'marked';
import clsx from 'clsx';
import styles from './MarkdownRenderer.module.scss';

// ============================================================================
// MARKED CONFIGURATION
// ============================================================================

marked.setOptions({
  gfm: true,
  breaks: true,
  headerIds: false,
  mangle: false,
  silent: false,
});

// ============================================================================
// LANGUAGE DETECTION
// ============================================================================

/**
 * Language detection patterns for common programming languages
 * Ordered by specificity to avoid false positives
 */
const LANGUAGE_PATTERNS = {
  python: /^\s*(?:def |class |import |from |if |elif |else:|while |for |return |print\(|#!\/usr\/bin\/(?:env )?python|@\w+\(|:\s*$)/,
  javascript: /^\s*(?:function |const |let |var |=>|import |export |async |await |require\(|console\.)/,
  typescript: /^\s*(?:interface |type |enum |import type|export type|as \w+|:\s*\w+\s*[=;])/,
  java: /^\s*(?:public |private |protected |class |interface |import |package |@Override|System\.)/,
  cpp: /^\s*(?:#include|using namespace|template<|std::|cout|cin)/,
  c: /^\s*(?:#include |int main|void |struct |typedef |sizeof\(|printf\()/,
  ruby: /^\s*(?:def |class |module |require |attr_|end$|puts )/,
  php: /^\s*(?:<\?php|function |class |\$\w+\s*=|public function|echo )/,
  go: /^\s*(?:func |package |import |type |var |const |fmt\.)/,
  rust: /^\s*(?:fn |let |pub |use |impl |struct |enum |println!)/,
  sql: /^\s*(?:SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\s/i,
  shell: /^\s*(?:#!\/bin\/(?:ba)?sh|export |source |alias |\$\(|echo )/,
  html: /^\s*(?:<\/?[a-z][\s\S]*>|<!DOCTYPE)/i,
  css: /^\s*(?:[.#]?[\w-]+\s*\{|@media|@import|[\w-]+:\s*[^;]+;)/,
  json: /^\s*[{[].*[}\]]?\s*$/,
};

/**
 * Common code syntax patterns for heuristic detection
 */
const CODE_SYNTAX_PATTERNS = [
  /^\s*(?:def |class |function |const |let |var |if |elif |else:|for |while |return |import |export |public |private |protected |print\(|console\.)/,
  /^\s*[{}[\]();]/, // Structural punctuation
  /^\s*\/\//, // Single-line comments
  /^\s*\/\*|\*\//, // Multi-line comments
  /^\s*\*(?!\*)/, // Comment continuation
  /^\s*#+(?!\s)/, // Hash comments (not markdown headers)
  /^\s*(?:-->|<--|==>|=>)/, // Code operators
  /^\s*\w+\s*[=:]\s*[^=]/, // Assignments
  /:\s*$/, // Python-style colons at end of line
  /^\s{2,}\S/, // Consistent indentation (2+ spaces)
];

/**
 * Detects programming language from code content
 */
function detectLanguage(line) {
  for (const [lang, pattern] of Object.entries(LANGUAGE_PATTERNS)) {
    if (pattern.test(line)) return lang;
  }
  return null;
}

/**
 * Analyzes multiple lines to detect language with better accuracy
 */
function detectLanguageFromBlock(lines) {
  const nonEmptyLines = lines.filter(l => l.trim());

  for (const line of nonEmptyLines.slice(0, 5)) {
    const detected = detectLanguage(line);
    if (detected) return detected;
  }

  // Check for Python-specific patterns across the block
  const hasPythonColon = nonEmptyLines.some(l => /(?:if|elif|else|def|class|for|while|with|try|except|finally).*:\s*$/.test(l.trim()));
  const hasPythonIndent = nonEmptyLines.some(l => /^\s{2,}(?!\/\/)/.test(l));

  if (hasPythonColon && hasPythonIndent) return 'python';

  return null;
}

/**
 * Determines if a line appears to be code
 */
function isCodeLine(line) {
  const trimmed = line.trim();

  if (trimmed === '') return false;

  // Explicit indentation (2+ spaces for flexibility)
  if (/^\s{2,}\S/.test(line)) return true;

  // Check against code syntax patterns
  return CODE_SYNTAX_PATTERNS.some(pattern => pattern.test(line));
}

// ============================================================================
// CODE BLOCK PREPROCESSING
// ============================================================================

/**
 * Preprocesses content to wrap detected code blocks in markdown fences
 */
function preprocessCodeBlocks(content) {
  if (!content?.trim()) return '';

  const lines = content.split('\n');
  const result = [];
  let codeBuffer = null;
  let detectedLanguage = null;
  let emptyLineCount = 0;
  const MAX_EMPTY_LINES = 1;

  const flushCodeBlock = () => {
    if (codeBuffer?.length > 0) {
      // Remove trailing empty lines
      while (codeBuffer.length > 0 && codeBuffer[codeBuffer.length - 1].trim() === '') {
        codeBuffer.pop();
      }

      if (codeBuffer.length > 0) {
        // Try to detect language from the entire block
        const blockLanguage = detectedLanguage || detectLanguageFromBlock(codeBuffer);
        const codeContent = codeBuffer.join('\n');
        const langTag = blockLanguage || '';
        result.push(`\`\`\`${langTag}\n${codeContent}\n\`\`\``);
      }

      codeBuffer = null;
      detectedLanguage = null;
      emptyLineCount = 0;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isEmpty = line.trim() === '';
    const looksLikeCode = isCodeLine(line);

    if (codeBuffer !== null) {
      // Currently in a code block
      if (isEmpty) {
        emptyLineCount++;

        // Allow a few empty lines within code blocks
        if (emptyLineCount <= MAX_EMPTY_LINES) {
          codeBuffer.push(line);
        } else {
          // Too many empty lines, might be end of code
          const nextLines = lines.slice(i + 1, i + 3);
          const hasMoreCode = nextLines.some(l => isCodeLine(l));

          if (hasMoreCode) {
            codeBuffer.push(line);
          } else {
            flushCodeBlock();
            result.push(line);
          }
        }
      } else if (looksLikeCode) {
        // Continue code block
        emptyLineCount = 0;
        codeBuffer.push(line);

        if (!detectedLanguage) {
          detectedLanguage = detectLanguage(line);
        }
      } else {
        // Non-code line, end block
        flushCodeBlock();
        result.push(line);
      }
    } else {
      // Not in a code block
      if (looksLikeCode && !isEmpty) {
        // Start new code block
        codeBuffer = [line];
        detectedLanguage = detectLanguage(line);
        emptyLineCount = 0;
      } else {
        // Regular content
        result.push(line);
      }
    }
  }

  flushCodeBlock();

  return result.join('\n');
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * MarkdownRenderer - Professional markdown rendering component
 * 
 * Features:
 * - Automatic code block detection and fencing
 * - Language detection for syntax highlighting
 * - Theme support (dark/light)
 * - GitHub Flavored Markdown support
 * - Optimized rendering with memoization
 */
export default function MarkdownRenderer({
  content,
  theme = 'dark',
  className
}) {
  const htmlContent = useMemo(() => {
    if (!content?.trim()) return '';

    try {
      const processedContent = preprocessCodeBlocks(content);
      return marked.parse(processedContent);
    } catch (error) {
      console.error('MarkdownRenderer: Failed to parse content', error);
      return `<p>Error rendering content</p>`;
    }
  }, [content]);

  const themeClass = theme === 'light' ? styles.light : styles.dark;

  return (
    <div
      className={clsx(styles.markdownContent, themeClass, className)}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}
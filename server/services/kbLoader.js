import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger, logError } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const KB_ROOT = path.resolve(__dirname, '../kb');

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { meta: {}, content: raw.trim() };
  }

  const [, frontmatter, body] = match;
  const meta = {};

  for (const line of frontmatter.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;

    const key = trimmed.slice(0, colonIndex).trim();
    let value = trimmed.slice(colonIndex + 1).trim();

    if (value.startsWith('[') && value.endsWith(']')) {
      value = value
        .slice(1, -1)
        .split(',')
        .map((item) => item.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
    } else {
      value = value.replace(/^["']|["']$/g, '');
    }

    meta[key] = value;
  }

  return { meta, content: body.trim() };
}

function walkMarkdownFiles(dir, files = []) {
  if (!fs.existsSync(dir)) {
    return files;
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkMarkdownFiles(fullPath, files);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }

  return files;
}

function toArticle(absolutePath) {
  const raw = fs.readFileSync(absolutePath, 'utf8');
  const { meta, content } = parseFrontmatter(raw);
  const relativePath = path.relative(KB_ROOT, absolutePath).split(path.sep).join('/');

  return {
    title: meta.title || path.basename(absolutePath, '.md'),
    product_area: meta.product_area || null,
    tags: Array.isArray(meta.tags) ? meta.tags : [],
    content,
    excerpt: content.slice(0, 300),
    file_path: relativePath,
  };
}

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .split(/[^a-z0-9_]+/)
    .filter((token) => token.length > 1);
}

function scoreArticle(article, keywords) {
  const titleTokens = tokenize(article.title);
  const tagTokens = tokenize(article.tags.join(' '));
  const contentTokens = tokenize(article.content);

  let score = 0;
  const matched = new Set();

  for (const keyword of keywords) {
    const titleHits = titleTokens.filter((token) => token === keyword || token.includes(keyword)).length;
    const tagHits = tagTokens.filter((token) => token === keyword || token.includes(keyword)).length;
    const contentHits = contentTokens.filter((token) => token === keyword || token.includes(keyword)).length;

    const keywordScore = titleHits * 3 + tagHits * 2 + contentHits;
    if (keywordScore > 0) {
      matched.add(keyword);
      score += keywordScore;
    }
  }

  return { score, matchedKeywords: [...matched] };
}

/**
 * Reads all .md files recursively from /server/kb/ (no caching).
 */
export function loadAllArticles() {
  logger.info('kbLoader.loadAllArticles request', { kbRoot: KB_ROOT });

  try {
    const files = walkMarkdownFiles(KB_ROOT);
    const articles = files.map(toArticle);

    logger.info('kbLoader.loadAllArticles response', {
      count: articles.length,
      files: articles.map((article) => article.file_path),
    });

    return articles;
  } catch (error) {
    logger.error('kbLoader.loadAllArticles error', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Keyword search against title, tags, and content.
 * Reloads articles from disk on every call. Returns top 3–5 matches.
 */
export function searchArticles(query, productArea) {
  const startedAt = Date.now();
  logger.info('KB search started', {
    event: 'kb_search_start',
    query,
    productArea,
  });

  try {
    const articles = loadAllArticles();
    const keywords = tokenize(query);

    if (keywords.length === 0) {
      logger.info('KB search completed', {
        event: 'kb_search',
        query,
        productArea,
        articlesFound: 0,
        duration: Date.now() - startedAt,
        reason: 'empty_query',
      });
      return [];
    }

    let candidates = articles;
    if (productArea) {
      const area = String(productArea).toLowerCase();
      candidates = articles.filter(
        (article) => String(article.product_area || '').toLowerCase() === area
      );
    }

    const ranked = candidates
      .map((article) => {
        const { score, matchedKeywords } = scoreArticle(article, keywords);
        return {
          title: article.title,
          product_area: article.product_area,
          tags: article.tags,
          content: article.content,
          excerpt: article.excerpt,
          file_path: article.file_path,
          score,
          matched_keywords: matchedKeywords,
        };
      })
      .filter((article) => article.score > 0)
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

    const topCount = Math.min(5, ranked.length);
    const results = ranked.slice(0, topCount);

    logger.info('KB search completed', {
      event: 'kb_search',
      query,
      productArea,
      articlesFound: results.length,
      duration: Date.now() - startedAt,
      sources: results.map((article) => article.file_path),
    });

    return results;
  } catch (error) {
    logError('KB search failed', error, {
      event: 'kb_search_error',
      query,
      productArea,
      duration: Date.now() - startedAt,
    });
    throw error;
  }
}

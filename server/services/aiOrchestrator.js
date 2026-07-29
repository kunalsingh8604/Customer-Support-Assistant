import Groq from 'groq-sdk';
import { logger, logError } from '../utils/logger.js';

const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

const SYSTEM_PROMPT = `You are a customer support AI assistant. You analyze support tickets and draft responses using ONLY the knowledge base (KB) articles provided in the user message.

You must return ONLY valid JSON (no markdown fences, no commentary) with this exact structure:
{
  "classification": {
    "category": "billing | technical | account | general",
    "suggested_urgency": "low | medium | high | critical",
    "confidence": "high | medium | low"
  },
  "missing_information": ["list of missing details needed to resolve this"],
  "follow_up_questions": ["question 1", "question 2"],
  "draft_response": "Full customer-facing response grounded only in the KB articles provided. Must cite article titles used.",
  "suggested_action": {
    "type": "request_clarification | escalate_technical | create_bug_report | no_action",
    "reason": "Why this action is suggested",
    "cited_source": "Which KB article or ticket detail supports this"
  },
  "citations": ["Article title 1", "Article title 2"]
}

Rules you must follow:
- Never invent information not present in the KB articles
- Draft response must only use information from provided articles
- If KB articles don't cover the issue, say so explicitly in draft_response
- Do not send any response or trigger any action automatically — you only produce a draft for human review
- Always cite which articles were used in citations and mention their titles in draft_response
- Pick classification.category as exactly one of: billing, technical, account, general
- Pick classification.suggested_urgency as exactly one of: low, medium, high, critical
- Pick classification.confidence as exactly one of: high, medium, low
- Pick suggested_action.type as exactly one of: request_clarification, escalate_technical, create_bug_report, no_action`;

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (
    !apiKey ||
    apiKey === 'your_groq_api_key_here' ||
    apiKey.includes('your_groq')
  ) {
    const error = new Error(
      'Invalid GROQ_API_KEY. Open server/.env, paste a real key from https://console.groq.com/keys, then restart npm run dev.'
    );
    error.statusCode = 401;
    throw error;
  }
  return new Groq({ apiKey });
}

function buildUserPrompt(ticket, articles) {
  const articleBlocks =
    articles.length === 0
      ? 'No knowledge base articles were found for this ticket.'
      : articles
          .map(
            (article, index) =>
              `### Article ${index + 1}
Title: ${article.title}
Product area: ${article.product_area}
Tags: ${(article.tags || []).join(', ')}
Source: ${article.file_path}
Content:
${article.content}`
          )
          .join('\n\n');

  return `Analyze this support ticket and produce the required JSON.

## Ticket
- ID: ${ticket.id}
- Customer type: ${ticket.customer_type}
- Product area: ${ticket.product_area}
- Urgency: ${ticket.urgency}
- Status: ${ticket.status}
- Issue description: ${ticket.issue_description}
- Previous communication: ${ticket.previous_communication || '(none)'}

## Knowledge base articles
${articleBlocks}`;
}

function parseModelJson(content) {
  const trimmed = String(content || '').trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenceMatch) {
      return JSON.parse(fenceMatch[1].trim());
    }
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error('Model did not return valid JSON');
  }
}

function normalizeAIResult(parsed, articles) {
  const classification = parsed.classification || {};
  const suggestedAction = parsed.suggested_action || {};

  return {
    classification: {
      category: classification.category || 'general',
      suggested_urgency: classification.suggested_urgency || 'medium',
      confidence: classification.confidence || 'low',
    },
    missing_info: Array.isArray(parsed.missing_information)
      ? parsed.missing_information
      : Array.isArray(parsed.missing_info)
        ? parsed.missing_info
        : [],
    follow_up_questions: Array.isArray(parsed.follow_up_questions)
      ? parsed.follow_up_questions
      : [],
    draft_response: parsed.draft_response || '',
    suggested_action: {
      type: suggestedAction.type || 'request_clarification',
      reason: suggestedAction.reason || '',
      cited_source: suggestedAction.cited_source || '',
    },
    citations: Array.isArray(parsed.citations) ? parsed.citations : [],
    retrieved_articles: articles.map((article) => ({
      title: article.title,
      product_area: article.product_area,
      tags: article.tags,
      file_path: article.file_path,
      excerpt: article.excerpt,
      content: article.content,
      score: article.score,
    })),
  };
}

/**
 * Runs a single structured Groq completion for the ticket + KB articles.
 * Does not approve or send anything automatically.
 */
export async function analyzeTicket(ticket, articles) {
  const startedAt = Date.now();

  logger.info('AI workflow started', {
    event: 'ai_workflow_start',
    ticketId: ticket?.id,
    articleCount: articles?.length ?? 0,
    model: MODEL,
  });

  try {
    const client = getGroqClient();
    const completion = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(ticket, articles || []) },
      ],
    });

    const durationMs = Date.now() - startedAt;
    const usage = completion.usage || {};
    const content = completion.choices?.[0]?.message?.content;

    logger.info('AI workflow completed', {
      event: 'ai_workflow_complete',
      ticketId: ticket?.id,
      model: MODEL,
      duration: durationMs,
      tokenUsage: {
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
        total_tokens: usage.total_tokens,
      },
    });

    const parsed = parseModelJson(content);
    const result = normalizeAIResult(parsed, articles || []);

    return {
      ...result,
      meta: {
        model: MODEL,
        duration_ms: durationMs,
        token_usage: {
          prompt_tokens: usage.prompt_tokens ?? null,
          completion_tokens: usage.completion_tokens ?? null,
          total_tokens: usage.total_tokens ?? null,
        },
      },
    };
  } catch (error) {
    logError('AI workflow failed', error, {
      event: 'ai_workflow_error',
      ticketId: ticket?.id,
      duration: Date.now() - startedAt,
      model: MODEL,
    });

    if (!error.statusCode && /api key|authentication|unauthorized/i.test(error.message)) {
      error.statusCode = 502;
    }
    if (!error.statusCode) {
      error.statusCode = 502;
    }
    throw error;
  }
}

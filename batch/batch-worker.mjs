#!/usr/bin/env node

/**
 * batch-worker.mjs — OPT-3: SDK + Prompt Caching
 * 
 * Replaces: claude -p --append-system-prompt-file batch-prompt.md
 * 
 * Usage: node batch-worker.mjs <offer_id> <url> <jd_file> <report_num> <date> [--phase phase_name]
 * 
 * Features:
 * - Reads batch-prompt.md once, marks as cacheable system prompt
 * - Uses Anthropic SDK (@anthropic-ai/sdk) for native cache_control support
 * - Logs cache hits/misses for token reporting
 * - Two-phase support: quick-screen (OPT-2) then full eval (OPT-1)
 */

import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Parse CLI arguments
const args = process.argv.slice(2);
if (args.length < 5) {
  console.error(
    "Usage: node batch-worker.mjs <offer_id> <url> <jd_file> <report_num> <date> [--phase phase_name]"
  );
  process.exit(1);
}

const offerId = args[0];
const url = args[1];
const jdFile = args[2];
const reportNum = args[3];
const date = args[4];
let phase = "full"; // default

// Check for --phase flag
const phaseIdx = args.indexOf("--phase");
if (phaseIdx !== -1 && phaseIdx + 1 < args.length) {
  phase = args[phaseIdx + 1];
}

/**
 * Load batch prompt with caching support
 */
function loadBatchPrompt(phaseType) {
  const promptFile = phaseType === "quick-screen"
    ? "batch/batch-prompt-quick-screen.md"
    : "batch/batch-prompt-opt1.md";

  if (!fs.existsSync(promptFile)) {
    throw new Error(`Batch prompt not found: ${promptFile}`);
  }

  const content = fs.readFileSync(promptFile, "utf8");
  return {
    type: "text",
    text: content,
    cache_control: { type: "ephemeral" },
  };
}

/**
 * Load JD text
 */
function loadJD(jdFilePath) {
  try {
    return fs.readFileSync(jdFilePath, "utf8");
  } catch (_err) {
    return null; // WebFetch will be fallback in the prompt
  }
}

/**
 * Load CV
 */
function loadCV() {
  if (!fs.existsSync("cv.md")) {
    throw new Error("cv.md not found in project root");
  }
  return fs.readFileSync("cv.md", "utf8");
}

/**
 * Build user message with placeholders substituted
 */
function buildUserMessage(jdText, phaseType) {
  let messageBody = "";

  if (phaseType === "quick-screen") {
    messageBody = `
**JD Text:**
\`\`\`
${jdText || "[JD text not available; fallback to URL fetch if needed]"}
\`\`\`

Read cv.md and this JD, then respond ONLY with JSON in the format specified in the prompt.
`;
  } else {
    // Full evaluation (OPT-1)
    messageBody = `
**JD Text:**
\`\`\`
${jdText || "[JD text not available; fallback to URL fetch if needed]"}
\`\`\`

**CV:**
\`\`\`
${loadCV()}
\`\`\`

Proceed with blocks A-B-C-G evaluation as specified in the prompt. Output the markdown report.
`;
  }

  return messageBody;
}

/**
 * Log token usage
 */
function logTokenUsage(response) {
  const { input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens } = response.usage || {};

  const logEntry = {
    offer_id: offerId,
    date: date,
    phase: phase,
    input_tokens,
    output_tokens,
    cache_creation_input_tokens: cache_creation_input_tokens || 0,
    cache_read_input_tokens: cache_read_input_tokens || 0,
    timestamp: new Date().toISOString(),
  };

  const logFile = "reports/token-log.jsonl";
  fs.appendFileSync(logFile, JSON.stringify(logEntry) + "\n");

  return logEntry;
}

/**
 * Main evaluation logic
 */
async function evaluate() {
  try {
    // Load JD
    const jdText = loadJD(jdFile);

    // Load batch prompt with caching
    const systemPrompt = loadBatchPrompt(phase);

    // Build user message
    const userMessage = buildUserMessage(jdText, phase);

    // Call Claude API with cacheable system prompt
    // Model selection: Use Haiku (fast + cheap, sufficient for A-B-C-G screening)
    // Change to "claude-3-5-sonnet-20241022" if nuanced reasoning needed
    const response = await client.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 4000,
      system: [systemPrompt],
      messages: [
        {
          role: "user",
          content: userMessage,
        },
      ],
    });

    // Log token usage
    const tokenLog = logTokenUsage(response);

    // Extract response
    const responseText =
      response.content[0].type === "text" ? response.content[0].text : "";

    // For quick-screen, parse JSON; for full, expect markdown
    if (phase === "quick-screen") {
      // Parse JSON response
      let screenResult;
      try {
        screenResult = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Quick-screen response is not valid JSON: ${responseText}`);
      }

      return {
        status: "completed",
        id: offerId,
        report_num: reportNum,
        phase: "quick-screen",
        archetype: screenResult.archetype,
        quick_score: screenResult.quick_score,
        top_gap: screenResult.top_gap,
        should_skip: screenResult.should_skip,
        usage: tokenLog,
      };
    } else {
      // Full evaluation: save markdown report
      const reportPath = `reports/${reportNum}-eval-${date}.md`;
      fs.writeFileSync(reportPath, responseText);

      return {
        status: "completed",
        id: offerId,
        report_num: reportNum,
        phase: "full",
        report: reportPath,
        usage: tokenLog,
      };
    }
  } catch (error) {
    return {
      status: "failed",
      id: offerId,
      report_num: reportNum,
      phase: phase,
      error: error.message,
    };
  }
}

// Run evaluation
const result = await evaluate();
console.log(JSON.stringify(result, null, 2));

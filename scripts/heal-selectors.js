// ─── scripts/heal-selectors.js — Self-Healing Agent (active mode) ──────────────
// Reads a Cypress spec or Page Object file, identifies fragile selectors,
// and asks Claude to suggest more robust alternatives.
//
// Selector robustness hierarchy (most → least robust):
//   [data-test="..."] > #id > [aria-label="..."] > specific class > text
//
// Usage:
//   ANTHROPIC_API_KEY=sk-ant-... node scripts/heal-selectors.js --file cypress/pages/InventoryPage.js
//   ANTHROPIC_API_KEY=sk-ant-... node scripts/heal-selectors.js --file cypress/e2e/module4-pom/13_saucedemo_shopping.cy.js --patch
//
//   Windows PowerShell:
//   $env:ANTHROPIC_API_KEY="sk-ant-..."; node scripts/heal-selectors.js --file cypress/pages/CartPage.js
//
// Flags:
//   --file <path>   (required) Path to the spec or POM file to analyze
//   --patch         Apply suggestions in-place (overwrites the file)
//   --dry-run       Print the heal report without modifying any file (default)

'use strict'

const Anthropic = require('@anthropic-ai/sdk')
const fs        = require('fs')
const path      = require('path')

const MODEL      = 'claude-sonnet-5'
const MAX_TOKENS = 1024

// ── Argument parsing ──────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = { file: null, patch: false }
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--file' && argv[i + 1]) { args.file  = argv[++i] }
    if (argv[i] === '--patch')               { args.patch = true }
  }
  return args
}

// ── Extract selectors from source using regex ─────────────────────────────────
// Finds cy.get(...), cy.contains(...), and POM elements arrow functions.
function extractSelectors(source) {
  const lines   = source.split('\n')
  const results = []

  lines.forEach((line, idx) => {
    // cy.get('selector') or cy.get("selector") or cy.get(`selector`)
    const getMatches = line.matchAll(/cy\.get\(['"`]([^'"`]+)['"`]\)/g)
    for (const m of getMatches) {
      results.push({ line: idx + 1, raw: m[0], selector: m[1] })
    }

    // POM elements arrow functions: () => cy.get('selector')
    const pomMatches = line.matchAll(/=>\s*cy\.get\(['"`]([^'"`]+)['"`]\)/g)
    for (const m of pomMatches) {
      results.push({ line: idx + 1, raw: m[0], selector: m[1] })
    }
  })

  return results
}

// ── Classify a selector as robust or fragile ─────────────────────────────────
function classifySelector(selector) {
  // Robust: data-test attribute, meaningful IDs, aria-label
  if (/\[data-test/.test(selector)) return 'robust'
  if (/^#[a-z]/.test(selector) && !/#\d/.test(selector)) return 'robust'
  if (/\[aria-label/.test(selector)) return 'robust'

  // Fragile: nth-child/nth-of-type, short generic class names, numeric IDs
  if (/nth-child|nth-of-type/.test(selector)) return 'fragile'
  if (/^\.(?:btn|title|item|badge|link|text|icon|label|input|button|container|wrapper|row|col|header|footer|nav|menu|list|card|modal|overlay|content|main|sidebar|panel|tab|form|field|error|msg|desc|name|price|img|image)$/.test(selector)) return 'fragile'
  // Class-only selectors with very short names are often fragile
  if (/^\.[\w-]{1,6}$/.test(selector)) return 'fragile'

  return 'unknown'
}

// ── System prompt ─────────────────────────────────────────────────────────────
function buildSystemPrompt() {
  return `You are a Cypress selector quality reviewer and repair specialist.
Analyze the provided JavaScript file and identify selectors that may be fragile or brittle.

Fragile selectors:
- Positional selectors: nth-child, nth-of-type
- Short generic class names: .btn, .title, .item, .badge, .text, .link, .icon
- Class chains without data attributes
- Auto-generated-looking IDs (numeric or hash-like)

Robust selectors (prefer in this order):
1. [data-test="..."] — explicitly designed for testing, most stable
2. #meaningful-id — stable when IDs are semantically named
3. [aria-label="..."] — semantic and accessibility-friendly
4. Specific component class names (e.g. .inventory_item_name, .shopping_cart_badge)
5. cy.contains('visible text') — text-based as last resort

Output ONLY valid JSON, no markdown fences, no prose:
{
  "file": "string",
  "suggestions": [
    {
      "line": <number>,
      "original": "string (the current selector)",
      "suggested": "string (the improved selector)",
      "reason": "string",
      "confidence": "HIGH|MEDIUM|LOW"
    }
  ]
}

Only include selectors that can actually be improved. Do not suggest changes to already-robust selectors.
If the file has no fragile selectors, return an empty suggestions array.`
}

// ── Apply patch: replace selectors in source ──────────────────────────────────
// Applies changes in reverse line order to preserve line numbers.
function applyPatch(source, suggestions) {
  const lines = source.split('\n')

  // Sort descending by line so we edit from bottom to top
  const sorted = [...suggestions].sort((a, b) => b.line - a.line)

  for (const s of sorted) {
    const idx = s.line - 1
    if (idx >= 0 && idx < lines.length) {
      // Replace only the first occurrence of the original selector on that line
      lines[idx] = lines[idx].replace(s.original, s.suggested)
    }
  }

  return lines.join('\n')
}

// ── Print heal report to stdout ───────────────────────────────────────────────
function printReport(filePath, suggestions) {
  const sep = '─'.repeat(60)
  console.log(`\nHeal Report: ${filePath}`)
  console.log(sep)

  if (!suggestions.length) {
    console.log('✓ No fragile selectors found — this file looks healthy.')
    return
  }

  suggestions.forEach((s) => {
    const conf = s.confidence === 'HIGH' ? '🔴' : s.confidence === 'MEDIUM' ? '🟡' : '⚪'
    console.log(`\nLine ${s.line}:  ${s.original}`)
    console.log(`  ${conf} Suggested: ${s.suggested}`)
    console.log(`     Confidence: ${s.confidence}`)
    console.log(`     Reason: ${s.reason}`)
  })

  console.log(`\n${sep}`)
  console.log(`Total suggestions: ${suggestions.length}`)
  console.log('\nTo apply all suggestions in-place, re-run with --patch')
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs(process.argv)

  if (!args.file) {
    console.error('ERROR: --file is required.')
    console.error('Usage: node scripts/heal-selectors.js --file cypress/pages/InventoryPage.js [--patch]')
    process.exit(1)
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('ERROR: ANTHROPIC_API_KEY environment variable is not set.')
    console.error('Usage: ANTHROPIC_API_KEY=sk-ant-... node scripts/heal-selectors.js --file <path>')
    process.exit(1)
  }

  const filePath = path.resolve(process.cwd(), args.file)
  if (!fs.existsSync(filePath)) {
    console.error(`ERROR: file not found — ${filePath}`)
    process.exit(1)
  }

  const source    = fs.readFileSync(filePath, 'utf8')
  const selectors = extractSelectors(source)
  const fragile   = selectors.filter((s) => classifySelector(s.selector) !== 'robust')

  console.error(`Self-Healing Agent — model: ${MODEL}`)
  console.error(`  File: ${args.file}`)
  console.error(`  Selectors found: ${selectors.length} total, ${fragile.length} potentially fragile`)
  console.error('  Calling Claude API...\n')

  if (selectors.length === 0) {
    console.log('No selectors found in this file — nothing to heal.')
    return
  }

  const client = new Anthropic.default({ apiKey })

  let healReport
  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      thinking: { type: 'disabled' },
      system: buildSystemPrompt(),
      messages: [
        {
          role: 'user',
          content: `File: ${args.file}\n\n${source}`,
        },
      ],
    })
    healReport = message.content[0].text
    console.error(`Tokens used — input: ${message.usage.input_tokens}, output: ${message.usage.output_tokens}`)
  } catch (err) {
    console.error(`ERROR: Claude API call failed — ${err.message}`)
    process.exit(1)
  }

  // Parse the JSON response
  let parsed
  try {
    // Strip accidental markdown fences
    const cleaned = healReport.replace(/^```(?:json)?\n?/gm, '').replace(/^```\n?/gm, '').trim()
    parsed = JSON.parse(cleaned)
  } catch {
    console.error('WARNING: Claude returned non-JSON output. Printing raw:\n')
    console.log(healReport)
    process.exit(1)
  }

  const suggestions = parsed.suggestions || []

  if (args.patch) {
    if (!suggestions.length) {
      console.log(`✓ No fragile selectors found in ${args.file} — nothing to patch.`)
      return
    }
    const patched = applyPatch(source, suggestions)
    fs.writeFileSync(filePath, patched, 'utf8')
    console.log(`\n✓ Patched ${suggestions.length} selector(s) in: ${args.file}`)
    suggestions.forEach((s) =>
      console.log(`  Line ${s.line}: ${s.original}  →  ${s.suggested}`)
    )
    console.log('\nVerify the file runs correctly:')
    console.log(`  npx cypress run --spec "${args.file}"`)
  } else {
    printReport(args.file, suggestions)
  }
}

main().catch((err) => {
  console.error('Self-Healing Agent failed:', err.message)
  process.exit(1)
})

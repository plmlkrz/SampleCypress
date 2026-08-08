// ─── scripts/plan-tests.js — Planning Agent ────────────────────────────────────
// Given a plain-English feature description, reads existing Page Objects and
// scans spec filenames, then calls Claude to produce a structured JSON test plan.
//
// The plan can be piped directly into generate-spec-v2.js to produce a spec file.
//
// Usage:
//   ANTHROPIC_API_KEY=sk-ant-... node scripts/plan-tests.js --feature "User story"
//   ANTHROPIC_API_KEY=sk-ant-... node scripts/plan-tests.js --feature "..." --output plan.json
//
//   Windows PowerShell:
//   $env:ANTHROPIC_API_KEY="sk-ant-..."; node scripts/plan-tests.js --feature "..."
//
// Output schema:
//   {
//     "feature": "string",
//     "scenarios": [{ "id", "title", "steps", "expectedResult" }],
//     "preconditions": ["string"],
//     "fixtures": [{ "filename", "shape" }],
//     "pomActions": [{ "page", "method", "description" }],
//     "selectorHints": [{ "element", "suggestedSelector", "strategy" }],
//     "newPomMethodsNeeded": [{ "page", "methodName", "implementation" }],
//     "coverageGaps": ["string"]
//   }

'use strict'

const Anthropic = require('@anthropic-ai/sdk')
const fs        = require('fs')
const path      = require('path')

const MODEL          = 'claude-sonnet-5'
const MAX_TOKENS     = 2048
const POM_DIR        = path.resolve(__dirname, '../cypress/pages')
const SPECS_DIR      = path.resolve(__dirname, '../cypress/e2e')

// ── Argument parsing ──────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = { feature: '', output: null, noPomContext: false }
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--feature' && argv[i + 1]) {
      args.feature = argv[++i]
    } else if (argv[i] === '--output' && argv[i + 1]) {
      args.output = argv[++i]
    } else if (argv[i] === '--no-pom-context') {
      args.noPomContext = true
    }
  }
  return args
}

// ── Read all POM files from cypress/pages/ ────────────────────────────────────
function readPomFiles(pomDir) {
  if (!fs.existsSync(pomDir)) return []
  return fs.readdirSync(pomDir)
    .filter((f) => f.endsWith('.js'))
    .map((f) => ({
      filename: f,
      content: fs.readFileSync(path.join(pomDir, f), 'utf8'),
    }))
}

// ── Recursively scan cypress/e2e/ for spec filenames ─────────────────────────
// Returns relative paths only (not content) to keep the prompt lean.
function scanExistingSpecs(specsDir, baseDir = specsDir) {
  if (!fs.existsSync(specsDir)) return []
  const entries = fs.readdirSync(specsDir, { withFileTypes: true })
  const results = []
  for (const entry of entries) {
    const full = path.join(specsDir, entry.name)
    if (entry.isDirectory()) {
      results.push(...scanExistingSpecs(full, baseDir))
    } else if (entry.name.endsWith('.cy.js')) {
      results.push(path.relative(baseDir, full))
    }
  }
  return results
}

// ── System prompt ─────────────────────────────────────────────────────────────
function buildSystemPrompt() {
  return `You are a senior QA architect. Given a feature description and existing page objects, produce a structured test plan as valid JSON.

Output ONLY valid JSON matching this exact schema — no markdown fences, no prose outside the JSON:
{
  "feature": "string",
  "scenarios": [
    {
      "id": "string (e.g. TC-01)",
      "title": "string",
      "steps": ["string"],
      "expectedResult": "string"
    }
  ],
  "preconditions": ["string"],
  "fixtures": [
    {
      "filename": "string (e.g. checkout_data.json)",
      "shape": "string describing the JSON keys and types"
    }
  ],
  "pomActions": [
    {
      "page": "string (e.g. CartPage)",
      "method": "string",
      "description": "string"
    }
  ],
  "selectorHints": [
    {
      "element": "string (human description)",
      "suggestedSelector": "string (CSS selector or cy.contains pattern)",
      "strategy": "string (data-test | id | aria-label | class | text)"
    }
  ],
  "newPomMethodsNeeded": [
    {
      "page": "string",
      "methodName": "string",
      "implementation": "string (one-liner or short code snippet)"
    }
  ],
  "coverageGaps": ["string (things this feature touches that have no existing tests)"]
}`
}

// ── User message ──────────────────────────────────────────────────────────────
function buildUserMessage(feature, pomFiles, existingSpecs) {
  const parts = [`Feature to test:\n${feature}`]

  if (existingSpecs.length) {
    parts.push(`Existing spec files (already covered — avoid duplicating these):\n${existingSpecs.join('\n')}`)
  }

  if (pomFiles.length) {
    const pomSection = pomFiles
      .map((p) => `--- ${p.filename} ---\n${p.content}`)
      .join('\n\n')
    parts.push(`Available Page Objects (use these methods in your plan):\n${pomSection}`)
  }

  return parts.join('\n\n')
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs(process.argv)

  if (!args.feature) {
    console.error('ERROR: --feature is required.')
    console.error('Usage: node scripts/plan-tests.js --feature "User story text" [--output plan.json]')
    process.exit(1)
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('ERROR: ANTHROPIC_API_KEY environment variable is not set.')
    console.error('Usage: ANTHROPIC_API_KEY=sk-ant-... node scripts/plan-tests.js --feature "..."')
    process.exit(1)
  }

  const pomFiles     = args.noPomContext ? [] : readPomFiles(POM_DIR)
  const existingSpecs = scanExistingSpecs(SPECS_DIR)

  console.error(`Planning Agent — model: ${MODEL}`)
  console.error(`  Feature: ${args.feature}`)
  console.error(`  POM files loaded: ${pomFiles.length}`)
  console.error(`  Existing specs scanned: ${existingSpecs.length}`)
  console.error('  Calling Claude API...\n')

  const client = new Anthropic.default({ apiKey })

  let planJson
  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      thinking: { type: 'disabled' },
      system: buildSystemPrompt(),
      messages: [
        {
          role: 'user',
          content: buildUserMessage(args.feature, pomFiles, existingSpecs),
        },
      ],
    })
    planJson = message.content[0].text
    console.error(`Tokens used — input: ${message.usage.input_tokens}, output: ${message.usage.output_tokens}`)
  } catch (err) {
    console.error(`ERROR: Claude API call failed — ${err.message}`)
    process.exit(1)
  }

  // Validate JSON before outputting
  try {
    JSON.parse(planJson)
  } catch {
    console.error('WARNING: Claude returned non-JSON output. Printing raw text.\n')
    console.log(planJson)
    process.exit(1)
  }

  if (args.output) {
    const outPath = path.resolve(process.cwd(), args.output)
    fs.mkdirSync(path.dirname(outPath), { recursive: true })
    fs.writeFileSync(outPath, planJson, 'utf8')
    console.error(`\nPlan written to: ${outPath}`)
    console.error('\nNext step — generate a spec from this plan:')
    console.error(`  node scripts/generate-spec-v2.js --plan ${args.output}`)
  } else {
    // Print to stdout so the output can be piped
    console.log(planJson)
  }
}

main().catch((err) => {
  console.error('Planning Agent failed:', err.message)
  process.exit(1)
})

// ─── scripts/generate-spec-v2.js — Script Generation Agent ────────────────────
// Generates a complete, runnable Cypress spec file from a test plan (JSON) or a
// plain-English scenario description.  Injects real POM file content into the
// system prompt so Claude knows exactly which methods and selectors exist.
//
// This is a generalized successor to generate-spec.js, which is kept unchanged
// for curriculum continuity. This script supports any page/module.
//
// Usage:
//   # From a plan file (produced by plan-tests.js):
//   ANTHROPIC_API_KEY=sk-ant-... node scripts/generate-spec-v2.js --plan cart-plan.json --page CartPage,InventoryPage
//
//   # From a plain scenario:
//   ANTHROPIC_API_KEY=sk-ant-... node scripts/generate-spec-v2.js \
//     --scenario "Test that adding two items shows badge count of 2" \
//     --page InventoryPage \
//     --output cypress/e2e/module5-ai-qa/18_cart_badge.cy.js
//
//   Windows PowerShell:
//   $env:ANTHROPIC_API_KEY="sk-ant-..."; node scripts/generate-spec-v2.js --plan cart-plan.json

'use strict'

const Anthropic = require('@anthropic-ai/sdk')
const fs        = require('fs')
const path      = require('path')

const MODEL      = 'claude-sonnet-5'
const MAX_TOKENS = 2048
const POM_DIR    = path.resolve(__dirname, '../cypress/pages')
const OUTPUT_DIR = path.resolve(__dirname, '../cypress/e2e/module5-ai-qa')

// ── Argument parsing ──────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = { plan: null, scenario: '', page: '', output: null }
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--plan' && argv[i + 1])     { args.plan     = argv[++i] }
    if (argv[i] === '--scenario' && argv[i + 1]) { args.scenario = argv[++i] }
    if (argv[i] === '--page' && argv[i + 1])     { args.page     = argv[++i] }
    if (argv[i] === '--output' && argv[i + 1])   { args.output   = argv[++i] }
  }
  return args
}

// ── Load named POM files (comma-separated names) ─────────────────────────────
function resolvePages(pageNamesStr, pomDir) {
  if (!pageNamesStr) return []
  return pageNamesStr.split(',').map((name) => {
    const trimmed  = name.trim()
    const filename = trimmed.endsWith('.js') ? trimmed : `${trimmed}.js`
    const absPath  = path.join(pomDir, filename)
    try {
      return { name: trimmed, filename, content: fs.readFileSync(absPath, 'utf8') }
    } catch {
      return { name: trimmed, filename, content: `(could not read ${filename})` }
    }
  })
}

// ── Build output file path ────────────────────────────────────────────────────
function resolveOutputPath(plan, outputFlag) {
  if (outputFlag) return path.resolve(process.cwd(), outputFlag)
  const title  = plan && plan.feature
    ? plan.feature.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40)
    : `generated_${Date.now()}`
  const ts     = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16)
  return path.join(OUTPUT_DIR, `${title}_${ts}.cy.js`)
}

// ── System prompt ─────────────────────────────────────────────────────────────
function buildSystemPrompt(pomFiles) {
  const pomDocs = pomFiles.length
    ? pomFiles.map((p) => `--- ${p.filename} ---\n${p.content}`).join('\n\n')
    : '(no page objects specified — use cy.get() with the selector priority below)'

  return `You are an expert Cypress 13 test automation engineer.
Generate a complete, runnable Cypress spec file.

STRICT RULES — follow every one:
1. Output ONLY valid JavaScript. No markdown fences, no explanation text, no prose outside code comments.
2. Use ES6 import syntax for page objects: import LoginPage from '../../pages/LoginPage'
   Import only the page objects that are actually used in the spec.
3. Use { testIsolation: false } in the describe block options.
4. Include before() for the initial page visit (call PageObject.visit() exactly once).
5. Include beforeEach() that resets state via CLIENT-SIDE navigation only:
   - Open burger menu → click logout → cy.clearLocalStorage() → log in again → wait for page to render.
   - NEVER use cy.visit() or cy.reload() inside beforeEach on SPA virtual routes (they return 404 from the server).
6. Use cy.fixture() for structured test data (credentials, products, etc.).
7. Selector priority (use the highest-priority selector available):
   [data-test="..."] > #id > [aria-label="..."] > specific class > cy.contains()
8. NEVER call cy.task(), cy.reload(), or cy.visit() inside beforeEach.
9. Write descriptive it() block titles.
10. Add a comment block at the top identifying this as an AI-generated file and listing the source (scripts/generate-spec-v2.js, model: ${MODEL}).

Available Page Objects (use ONLY the methods shown below — do not invent methods):
${pomDocs}`
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs(process.argv)

  if (!args.plan && !args.scenario) {
    console.error('ERROR: either --plan <file> or --scenario "<text>" is required.')
    console.error('Usage: node scripts/generate-spec-v2.js --plan plan.json [--page CartPage] [--output path/spec.cy.js]')
    console.error('       node scripts/generate-spec-v2.js --scenario "..." --page InventoryPage')
    process.exit(1)
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('ERROR: ANTHROPIC_API_KEY environment variable is not set.')
    console.error('Usage: ANTHROPIC_API_KEY=sk-ant-... node scripts/generate-spec-v2.js --plan plan.json')
    process.exit(1)
  }

  // Load plan from file if specified
  let plan = null
  if (args.plan) {
    const planPath = path.resolve(process.cwd(), args.plan)
    try {
      plan = JSON.parse(fs.readFileSync(planPath, 'utf8'))
    } catch (err) {
      console.error(`ERROR: could not read/parse plan file "${args.plan}" — ${err.message}`)
      process.exit(1)
    }
  }

  // Resolve page object names: prefer plan.pomActions pages, fall back to --page flag
  const pageNamesStr = args.page
    || (plan && plan.pomActions ? [...new Set(plan.pomActions.map((a) => a.page))].join(',') : '')
  const pomFiles = resolvePages(pageNamesStr, POM_DIR)

  console.error(`Script Generation Agent — model: ${MODEL}`)
  console.error(`  Source: ${plan ? `plan file (${plan.feature || 'untitled'})` : `scenario`}`)
  console.error(`  Page objects: ${pomFiles.map((p) => p.name).join(', ') || '(none specified)'}`)
  console.error('  Calling Claude API...\n')

  const client = new Anthropic.default({ apiKey })

  const userContent = plan
    ? `Generate a Cypress spec for this test plan:\n\n${JSON.stringify(plan, null, 2)}`
    : `Generate a Cypress spec for this scenario:\n\n${args.scenario}${args.page ? `\n\nTarget page object(s): ${args.page}` : ''}`

  let specSource
  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      thinking: { type: 'disabled' },
      system: buildSystemPrompt(pomFiles),
      messages: [{ role: 'user', content: userContent }],
    })
    specSource = message.content[0].text
    console.error(`Tokens used — input: ${message.usage.input_tokens}, output: ${message.usage.output_tokens}`)
  } catch (err) {
    console.error(`ERROR: Claude API call failed — ${err.message}`)
    process.exit(1)
  }

  // Strip accidental markdown fences if the model adds them despite the rule
  specSource = specSource.replace(/^```(?:javascript|js)?\n?/gm, '').replace(/^```\n?/gm, '')

  const outputPath = resolveOutputPath(plan, args.output)
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, specSource, 'utf8')

  console.error(`\nSpec written to:\n  ${outputPath}`)
  console.error('\nVerify syntax:')
  console.error(`  node --check "${outputPath}"`)
  console.error('\nRun the spec:')
  console.error(`  npx cypress run --spec "${path.relative(process.cwd(), outputPath)}"`)
}

main().catch((err) => {
  console.error('Script Generation Agent failed:', err.message)
  process.exit(1)
})

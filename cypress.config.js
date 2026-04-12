const { defineConfig } = require('cypress')

module.exports = defineConfig({
  // ─── Global Settings ────────────────────────────────────────────────────────
  // The default URL that cy.visit('/path') will prepend.
  // Module 1 & 2 tests use the-internet.herokuapp.com as their base.
  // Module 4 POM tests override this per-spec using Cypress.env('saucedemo_url').

  viewportWidth: 1280,
  viewportHeight: 720,

  // How long (ms) Cypress waits for a DOM element to appear before failing.
  defaultCommandTimeout: 8000,

  // Keep screenshots on failure for debugging (uploaded as CI artifacts).
  screenshotOnRunFailure: true,

  // Video recording is off locally (speeds up runs). The CI workflow enables it.
  video: false,

  // ─── Environment Variables ───────────────────────────────────────────────────
  // Access these in tests with: Cypress.env('key')
  // Override at runtime:  cypress run --env key=value
  env: {
    saucedemo_url: 'https://www.saucedemo.com',
    khanacademy_url: 'https://www.khanacademy.org',
    api_url: 'https://jsonplaceholder.typicode.com',
    // Credentials are stored here for convenience in a training project.
    // In production, use cypress.env.json (git-ignored) or CI secrets instead.
    standard_user: 'standard_user',
    password: 'secret_sauce',
    // AI pillar — set via cypress.env.json (git-ignored) or --env flag.
    // Never hardcode a real key here.
    anthropic_api_key: '',
  },

  e2e: {
    // Scan all .cy.js files under cypress/e2e/ recursively.
    specPattern: 'cypress/e2e/**/*.cy.js',

    // Default baseUrl for Module 1 & 2 tests.
    baseUrl: 'https://the-internet.herokuapp.com',

    // Support file is loaded automatically before every spec.
    supportFile: 'cypress/support/e2e.js',

    setupNodeEvents(on, config) {
      // ── cy.task('askAI') ────────────────────────────────────────────────────
      // Pillar 2: mid-test LLM evaluation bridge.
      // Called from specs as: cy.task('askAI', { prompt, context })
      // Returns: string (the model's text response)
      //
      // If no API key is configured, returns a sentinel string so specs can
      // skip gracefully rather than throw.
      on('task', {
        // Print a message to the terminal during headless runs.
        // Usage: cy.task('log', 'your message here')
        log(message) {
          console.log(message)
          return null
        },

        async askAI({ prompt, context = '' }) {
          const apiKey = config.env.anthropic_api_key
          if (!apiKey) {
            return '[AI_SKIPPED: no anthropic_api_key configured]'
          }
          // Lazy-require so a missing SDK doesn't break non-AI test runs.
          const Anthropic = require('@anthropic-ai/sdk')
          const client = new Anthropic.default({ apiKey })
          try {
            const message = await client.messages.create({
              model: 'claude-sonnet-4-6',
              max_tokens: 256,
              messages: [
                {
                  role: 'user',
                  content: context
                    ? `Context:\n${context}\n\nQuestion:\n${prompt}`
                    : prompt,
                },
              ],
            })
            return message.content[0].text
          } catch (err) {
            return `[AI_SKIPPED: API error — ${err.message}]`
          }
        },

        // ── cy.task('planTests') — Planning Agent ───────────────────────────
        // Analyzes a feature description + existing POMs → structured JSON test plan.
        // Usage: cy.task('planTests', { feature, pomContext?, existingSpecs? })
        async planTests({ feature, existingSpecs = [], pomContext = [] }) {
          const apiKey = config.env.anthropic_api_key
          if (!apiKey) return '[AI_SKIPPED: no anthropic_api_key configured]'

          const Anthropic = require('@anthropic-ai/sdk')
          const fs        = require('fs')
          const path      = require('path')
          const client    = new Anthropic.default({ apiKey })

          // Read POM files from disk so Claude knows which selectors/methods exist
          const pomSections = pomContext.map((pomPath) => {
            const absPath = path.resolve(process.cwd(), pomPath)
            try {
              const content = fs.readFileSync(absPath, 'utf8')
              return `--- ${path.basename(pomPath)} ---\n${content}`
            } catch {
              return `--- ${path.basename(pomPath)} --- (could not read file)`
            }
          }).join('\n\n')

          const systemPrompt = `You are a senior QA architect. Given a feature description and existing page objects, produce a structured test plan as valid JSON.

Output ONLY valid JSON matching this exact schema — no markdown fences, no prose:
{
  "feature": "string",
  "scenarios": [{ "id": "string", "title": "string", "steps": ["string"], "expectedResult": "string" }],
  "preconditions": ["string"],
  "fixtures": [{ "filename": "string", "shape": "object describing the JSON structure" }],
  "pomActions": [{ "page": "string", "method": "string", "description": "string" }],
  "selectorHints": [{ "element": "string", "suggestedSelector": "string", "strategy": "string" }],
  "newPomMethodsNeeded": [{ "page": "string", "methodName": "string", "implementation": "string" }],
  "coverageGaps": ["string"]
}`

          const userMessage = [
            `Feature to test:\n${feature}`,
            existingSpecs.length
              ? `\nExisting spec files (already covered):\n${existingSpecs.join('\n')}`
              : '',
            pomSections
              ? `\nAvailable Page Objects:\n${pomSections}`
              : '',
          ].filter(Boolean).join('\n\n')

          try {
            const message = await client.messages.create({
              model: 'claude-sonnet-4-6',
              max_tokens: 2048,
              system: systemPrompt,
              messages: [{ role: 'user', content: userMessage }],
            })
            return message.content[0].text
          } catch (err) {
            return `[AI_SKIPPED: API error — ${err.message}]`
          }
        },

        // ── cy.task('generateScript') — Script Generation Agent ─────────────
        // Converts a test plan or plain-English scenario → runnable .cy.js source.
        // Usage: cy.task('generateScript', { plan?, scenario?, targetPage? })
        // Returns the spec SOURCE as a string — caller decides where to write it.
        async generateScript({ plan = null, scenario = '', targetPage = '' }) {
          const apiKey = config.env.anthropic_api_key
          if (!apiKey) return '[AI_SKIPPED: no anthropic_api_key configured]'

          const Anthropic = require('@anthropic-ai/sdk')
          const client    = new Anthropic.default({ apiKey })

          const systemPrompt = `You are an expert Cypress 13 test automation engineer.
Generate a complete, runnable Cypress spec file.

STRICT RULES:
1. Output ONLY valid JavaScript. No markdown fences, no prose outside comments.
2. Use ES6 import syntax for page objects: import LoginPage from '../../pages/LoginPage'
3. Use { testIsolation: false } in the describe block options.
4. Include before() for initial navigation (call PageObject.visit() once).
5. Include beforeEach() that resets state via client-side navigation only — never use cy.visit() or cy.reload() inside beforeEach on SPA virtual routes.
6. Use cy.fixture() for structured test data (credentials, products, etc.).
7. Selector priority: [data-test="..."] > #id > [aria-label] > stable class > text.
8. Never call cy.task(), cy.reload(), or cy.visit() inside beforeEach.
9. Write descriptive it() block titles.
10. Add a comment block at the top explaining the spec was generated by the Script Generation Agent.`

          const userContent = plan
            ? `Generate a Cypress spec for this test plan:\n\n${JSON.stringify(plan, null, 2)}`
            : `Generate a Cypress spec for this scenario:\n\n${scenario}${targetPage ? `\n\nTarget page object(s): ${targetPage}` : ''}`

          try {
            const message = await client.messages.create({
              model: 'claude-sonnet-4-6',
              max_tokens: 2048,
              system: systemPrompt,
              messages: [{ role: 'user', content: userContent }],
            })
            return message.content[0].text
          } catch (err) {
            return `[AI_SKIPPED: API error — ${err.message}]`
          }
        },

        // ── cy.task('suggestSelectors') — Self-Healing Agent (passive) ───────
        // Given a broken selector + error message, returns ranked alternatives.
        // Usage: cy.task('suggestSelectors', { selector, errorMessage, pageHtml? })
        async suggestSelectors({ selector, errorMessage, pageHtml = '' }) {
          const apiKey = config.env.anthropic_api_key
          if (!apiKey) return '[AI_SKIPPED: no anthropic_api_key configured]'

          const Anthropic = require('@anthropic-ai/sdk')
          const client    = new Anthropic.default({ apiKey })

          // Truncate HTML snapshot to stay within token budget
          const htmlSnippet = pageHtml ? pageHtml.slice(0, 3000) : ''

          const systemPrompt = `You are a Cypress selector repair specialist.
Given a broken selector and optional page HTML, suggest ranked alternative selectors.

Selector priority (most robust first):
1. [data-test="..."] — explicitly for testing, most stable
2. #id — stable when IDs are meaningful
3. [aria-label="..."] — semantic and accessible
4. Specific class names (e.g. BEM classes, not .btn or .title)
5. cy.contains('text') — text-based as a last resort

Output ONLY valid JSON, no markdown fences:
{ "suggestions": [{ "selector": "string", "strategy": "string", "confidence": "HIGH|MEDIUM|LOW", "explanation": "string" }] }`

          const userContent = [
            `Broken selector: ${selector}`,
            `Cypress error: ${errorMessage.slice(0, 500)}`,
            htmlSnippet ? `\nPage HTML (truncated):\n${htmlSnippet}` : '',
          ].filter(Boolean).join('\n')

          try {
            const message = await client.messages.create({
              model: 'claude-sonnet-4-6',
              max_tokens: 1024,
              system: systemPrompt,
              messages: [{ role: 'user', content: userContent }],
            })
            return message.content[0].text
          } catch (err) {
            return `[AI_SKIPPED: API error — ${err.message}]`
          }
        },

        // ── cy.task('healSpec') — Self-Healing Agent (active) ────────────────
        // Reads a spec or POM file, identifies fragile selectors, returns heal report.
        // Usage: cy.task('healSpec', { specPath, pomPath? })
        async healSpec({ specPath, pomPath = null }) {
          const apiKey = config.env.anthropic_api_key
          if (!apiKey) return '[AI_SKIPPED: no anthropic_api_key configured]'

          const Anthropic = require('@anthropic-ai/sdk')
          const fs        = require('fs')
          const path      = require('path')
          const client    = new Anthropic.default({ apiKey })

          let specSource = ''
          let pomSource  = ''
          try {
            specSource = fs.readFileSync(path.resolve(process.cwd(), specPath), 'utf8')
          } catch (err) {
            return `[AI_SKIPPED: could not read specPath — ${err.message}]`
          }
          if (pomPath) {
            try {
              pomSource = fs.readFileSync(path.resolve(process.cwd(), pomPath), 'utf8')
            } catch { /* POM read failure is non-fatal */ }
          }

          const systemPrompt = `You are a Cypress selector quality reviewer.
Identify all fragile selectors in the provided file and suggest robust replacements.

Fragile selectors: positional class indices (.item:nth-child), short generic class names (.btn, .title, .item, .badge), auto-generated-looking IDs.
Robust selectors: [data-test="..."], #meaningful-id, [aria-label="..."], specific semantic classes.

Output ONLY valid JSON, no markdown fences:
{ "file": "string", "suggestions": [{ "line": number, "original": "string", "suggested": "string", "reason": "string", "confidence": "HIGH|MEDIUM|LOW" }] }`

          const userContent = [
            `File: ${specPath}\n\n${specSource}`,
            pomSource ? `\nRelated POM:\n${pomSource}` : '',
          ].filter(Boolean).join('\n\n')

          try {
            const message = await client.messages.create({
              model: 'claude-sonnet-4-6',
              max_tokens: 1024,
              system: systemPrompt,
              messages: [{ role: 'user', content: userContent }],
            })
            return message.content[0].text
          } catch (err) {
            return `[AI_SKIPPED: API error — ${err.message}]`
          }
        },
      })
      return config
    },
  },
})

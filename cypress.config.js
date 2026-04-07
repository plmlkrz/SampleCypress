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
      })
      return config
    },
  },
})

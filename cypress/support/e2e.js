// ─── e2e.js — Global Support File ────────────────────────────────────────────
// This file is loaded automatically before EVERY spec file.
// Use it to:
//   • Import custom commands
//   • Set up global hooks (beforeEach, afterEach)
//   • Configure global Cypress behavior

// Import all custom commands defined in commands.js
import './commands'

// ─── Passive Self-Healing Hook ────────────────────────────────────────────────
// When a test fails with a selector-not-found error, automatically ask the
// Self-Healing Agent for alternative selectors and log them to the Cypress
// timeline. The original error is always re-thrown so the test still fails —
// this hook is diagnostic only, it does NOT suppress failures.
//
// Requires anthropic_api_key to be configured; silently skips when absent.
Cypress.on('fail', (err) => {
  // Only attempt healing if an API key is present
  if (!Cypress.env('anthropic_api_key')) throw err

  // Extract the selector from standard Cypress "element not found" messages
  const match = err.message.match(/cy\.get\(['"`](.+?)['"`]\)/)
  if (match) {
    const selector = match[1]
    // cy.task is available here because we are inside a Cypress event handler.
    // Use the raw task (not the cy.suggestSelectors command) to avoid chaining issues.
    cy.task(
      'suggestSelectors',
      { selector, errorMessage: err.message },
      { timeout: 30000 }
    ).then((response) => {
      if (response && !response.startsWith('[AI_SKIPPED')) {
        cy.log(`Self-Healing Agent — suggestions for "${selector}":`)
        try {
          const { suggestions = [] } = JSON.parse(response)
          suggestions.forEach((s, i) =>
            cy.log(`  [${i + 1}] ${s.selector} (${s.confidence}) — ${s.explanation}`)
          )
        } catch {
          cy.log(response)
        }
      }
    })
  }

  // Re-throw so the test still fails as expected
  throw err
})

// ─── Global Hooks ─────────────────────────────────────────────────────────────
// Cypress 12+ enables `testIsolation: true` by default, which automatically
// clears cookies, sessionStorage, and localStorage before each test and
// navigates to `about:blank`. This means you do NOT need to manually clear
// state in a global beforeEach for most use cases.
//
// Only add a global beforeEach if you have shared setup that applies to
// ALL specs (e.g., setting an auth token, seeding test data via an API call).
//
// Example of a useful global beforeEach:
// beforeEach(() => {
//   cy.intercept('GET', '**/analytics/**', { statusCode: 204 }).as('analytics')
// })

// ─── Global Error Handling ────────────────────────────────────────────────────
// Cypress will fail a test on uncaught exceptions by default.
// If a third-party script throws errors you can't control, suppress them:
//
// Cypress.on('uncaught:exception', (err, runnable) => {
//   // Return false to prevent Cypress from failing the test.
//   // Be specific — only suppress errors you understand!
//   if (err.message.includes('ResizeObserver loop limit exceeded')) {
//     return false
//   }
// })

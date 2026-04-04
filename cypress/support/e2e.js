// ─── e2e.js — Global Support File ────────────────────────────────────────────
// This file is loaded automatically before EVERY spec file.
// Use it to:
//   • Import custom commands
//   • Set up global hooks (beforeEach, afterEach)
//   • Configure global Cypress behavior

// Import all custom commands defined in commands.js
import './commands'

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

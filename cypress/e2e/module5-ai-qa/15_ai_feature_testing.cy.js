// ─── Module 5 | Lesson 15: AI Feature Testing Patterns ────────────────────────
// This spec demonstrates how to test an application that exposes AI-powered
// features. Three patterns are shown, each solving a different problem:
//
//   Pattern 1 — Mock the AI endpoint with cy.intercept
//   ───────────────────────────────────────────────────
//   Real AI endpoints are non-deterministic and slow. Intercept them with fixture
//   data so your tests are fast, repeatable, and independent of the AI service's
//   availability. Test the integration contract — does the app handle the response
//   correctly? — not the AI model itself.
//
//   Pattern 2 — Semantic / schema assertions (not exact-text assertions)
//   ─────────────────────────────────────────────────────────────────────
//   AI-generated content changes on every call. Asserting on structure (required
//   fields, data types, value ranges, ID formats) is far more resilient than
//   asserting on exact strings. This is the golden rule of AI output testing.
//
//   Pattern 3 — LLM-evaluated assertions via cy.task('askAI')
//   ──────────────────────────────────────────────────────────
//   Some quality criteria — tone, clarity, professionalism — cannot be captured
//   by regex or exact match. Delegate those evaluations back to an LLM.
//   cy.aiAssert(text, criterion) does this via cy.task('askAI').
//   If no ANTHROPIC_API_KEY is configured, these assertions skip gracefully
//   rather than failing, so CI stays green.
//
// Target app: SauceDemo (the site used throughout Modules 4–5)
// Mocked endpoint: /api/ai/recommend (hypothetical AI recommendations feature)

import LoginPage     from '../../pages/LoginPage'
import InventoryPage from '../../pages/InventoryPage'

describe('Module 5 | AI Feature Testing Patterns', { testIsolation: false }, () => {
  before(() => {
    // Log in once for the entire suite.
    LoginPage.visit()
    LoginPage.login(
      Cypress.env('standard_user'),
      Cypress.env('password')
    )
    cy.url().should('include', '/inventory')
  })

  beforeEach(() => {
    // Reset to a clean logged-in state using the established Module 4 pattern:
    // client-side logout → clear storage → re-login. No cy.visit() to avoid
    // SPA routing timeouts on virtual routes.
    cy.get('#react-burger-menu-btn').click({ force: true })
    cy.get('#logout_sidebar_link').should('be.visible').click()
    cy.get('#login-button').should('be.visible')
    cy.clearLocalStorage()
    LoginPage.login(
      Cypress.env('standard_user'),
      Cypress.env('password')
    )
    cy.url().should('include', '/inventory')
  })

  // ── Pattern 1 & 2: Mock AI Endpoint + Schema Assertions ─────────────────────

  it('intercepts the AI recommendation endpoint and validates response schema', () => {
    // Pattern 1: Register the intercept BEFORE the action that triggers it.
    // We mock a hypothetical endpoint that an AI-powered version of SauceDemo
    // would call to fetch personalised product recommendations.
    cy.fixture('ai_responses').then((aiData) => {
      cy.intercept('GET', '**/api/ai/recommend**', {
        statusCode: 200,
        body: aiData.recommendation,
      }).as('aiRecommend')

      // Trigger the intercepted request from the browser context (not cy.request,
      // which runs in Node.js and bypasses cy.intercept). The fetch rejects on a
      // network error from the real server — that is fine; cy.intercept has already
      // served the fixture before the real request reaches the network.
      cy.window().then((win) => {
        return win
          .fetch(`${Cypress.env('saucedemo_url')}/api/ai/recommend`)
          .catch(() => {})  // real server 404s — swallow so the test can continue
      })

      cy.wait('@aiRecommend').then((interception) => {
        const body = interception.response.body

        // Pattern 2: Schema assertions — shape and types, not content.
        // These assertions pass regardless of which specific products the AI
        // recommends, making them resilient to model updates.

        // Top-level structure
        expect(body).to.have.property('recommendations')
        expect(body).to.have.property('model')
        expect(body).to.have.property('requestId')
        expect(body).to.have.property('generatedAt')

        // Array contract
        expect(body.recommendations).to.be.an('array')
        expect(body.recommendations.length).to.be.greaterThan(0)
        expect(body.recommendations.length).to.be.lessThan(11)  // max 10 recs

        // Per-item schema — check the first item as a representative sample
        const first = body.recommendations[0]
        expect(first).to.have.all.keys('productId', 'productName', 'score', 'reason', 'tags')
        expect(first.productId).to.be.a('string').and.not.be.empty
        expect(first.productName).to.be.a('string').and.not.be.empty
        expect(first.score).to.be.a('number').and.be.within(0, 1)  // confidence 0–1
        expect(first.reason).to.be.a('string').and.not.be.empty
        expect(first.tags).to.be.an('array').and.have.length.greaterThan(0)

        // Metadata format contracts
        expect(body.model).to.be.a('string').and.not.be.empty
        expect(body.requestId).to.match(/^req_/)                    // ID prefix format
        expect(body.generatedAt).to.match(/^\d{4}-\d{2}-\d{2}T/)   // ISO 8601
      })
    })
  })

  it('handles an empty recommendation list while maintaining valid schema', () => {
    cy.fixture('ai_responses').then((aiData) => {
      cy.intercept('GET', '**/api/ai/recommend**', {
        statusCode: 200,
        body: aiData.emptyRecommendation,
      }).as('emptyRecommend')

      cy.window().then((win) => {
        return win
          .fetch(`${Cypress.env('saucedemo_url')}/api/ai/recommend`)
          .catch(() => {})
      })

      cy.wait('@emptyRecommend').then((interception) => {
        const body = interception.response.body

        // Schema must remain valid even when the AI returns no results.
        // This tests that the app doesn't break on an empty recommendations array.
        expect(body).to.have.property('recommendations')
        expect(body.recommendations).to.be.an('array').and.have.length(0)

        // Metadata fields must still be present — the contract doesn't change
        // just because the model found nothing to recommend.
        expect(body.model).to.be.a('string').and.not.be.empty
        expect(body.requestId).to.be.a('string').and.not.be.empty
      })
    })
  })

  it('handles a model-unavailable 503 error with the correct error schema', () => {
    cy.fixture('ai_responses').then((aiData) => {
      cy.intercept('GET', '**/api/ai/recommend**', {
        statusCode: 503,
        body: aiData.errorResponse,
      }).as('aiError')

      cy.window().then((win) => {
        return win
          .fetch(`${Cypress.env('saucedemo_url')}/api/ai/recommend`)
          .catch(() => {})
      })

      cy.wait('@aiError').then((interception) => {
        expect(interception.response.statusCode).to.eq(503)

        const body = interception.response.body

        // Error response schema contract — must be consistent so the app can
        // display the right message and honour the retry-after value.
        expect(body).to.have.all.keys('error', 'message', 'retryAfter')
        expect(body.error).to.be.a('string').and.not.be.empty
        expect(body.message).to.be.a('string').and.not.be.empty
        expect(body.retryAfter).to.be.a('number').and.be.greaterThan(0)
      })
    })
  })

  // ── Pattern 3: LLM-Evaluated Assertions ──────────────────────────────────────
  // These tests use cy.aiAssert() to evaluate qualitative properties of real
  // content on the page. They call the Claude API mid-test via cy.task('askAI').
  //
  // Without a configured anthropic_api_key, these skip (logged) rather than fail.

  it('evaluates product descriptions for professional tone using AI assertion', () => {
    // Read a real product description off the SauceDemo inventory page.
    // We're testing the *quality* of copy — the kind of thing an AI content
    // generator might produce, and that humans struggle to assert on with regex.
    cy.get('.inventory_item_desc').first().invoke('text').then((descText) => {
      cy.aiAssert(
        descText.trim(),
        'reads like a professional retail product description (coherent, not offensive, not gibberish)'
      )
    })
  })

  it('evaluates all product names are appropriate for a professional store', () => {
    cy.get('.inventory_item_name').then(($names) => {
      const names = [...$names].map((el) => el.innerText.trim()).join(', ')

      cy.aiAssert(
        names,
        'is a list of appropriate, professional product names suitable for an e-commerce store'
      )
    })
  })

  it('uses cy.task directly to ask AI an open-ended question about page content', () => {
    // Pattern 3b: raw cy.task usage (bypassing cy.aiAssert) to demonstrate the
    // underlying plumbing and show more complex prompt construction.
    cy.get('.inventory_item').its('length').then((count) => {
      cy.task(
        'askAI',
        {
          prompt: `A product catalog page shows ${count} items. Is this a reasonable number of items for a single-page e-commerce inventory? Reply with YES or NO followed by one sentence of reasoning.`,
        },
        { timeout: 30000 }
      ).then((response) => {
        if (response.startsWith('[AI_SKIPPED')) {
          cy.log('AI task skipped — no API key configured')
          return
        }

        // Log the reasoning so it's visible in the Cypress runner timeline.
        cy.log(`AI says: ${response}`)

        expect(
          response.toUpperCase().startsWith('YES'),
          `Expected AI to confirm ${count} items is a reasonable catalog size, got: "${response}"`
        ).to.be.true
      })
    })
  })
})

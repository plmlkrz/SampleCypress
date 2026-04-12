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
    cy.task('log', '\n=== MODULE 5 | SPEC 15: AI Feature Testing Patterns ===')
    cy.task('log', 'Pattern 1: cy.intercept mocking')
    cy.task('log', 'Pattern 2: schema assertions')
    cy.task('log', 'Pattern 3: LLM-evaluated assertions')
    cy.task('log', '=======================================================\n')
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
    cy.task('log', '\n--- PATTERN 1+2: Mock endpoint + schema assertions ---')
    cy.fixture('ai_responses').then((aiData) => {
      cy.task('log', 'intercept registered: GET **/api/ai/recommend**')
      cy.task('log', `fixture body — model: ${aiData.recommendation.model}, requestId: ${aiData.recommendation.requestId}`)
      cy.task('log', `recommendations count: ${aiData.recommendation.recommendations.length}`)

      cy.intercept('GET', '**/api/ai/recommend**', {
        statusCode: 200,
        body: aiData.recommendation,
      }).as('aiRecommend')

      cy.window().then((win) => {
        return win
          .fetch(`${Cypress.env('saucedemo_url')}/api/ai/recommend`)
          .catch(() => {})
      })

      cy.wait('@aiRecommend').then((interception) => {
        const body = interception.response.body
        cy.task('log', '--- INTERCEPTED RESPONSE ---')
        cy.task('log', `  model:        ${body.model}`)
        cy.task('log', `  requestId:    ${body.requestId}`)
        cy.task('log', `  generatedAt:  ${body.generatedAt}`)
        cy.task('log', `  recs count:   ${body.recommendations.length}`)
        cy.task('log', `  first item:   ${body.recommendations[0]?.productName} (score: ${body.recommendations[0]?.score})`)
        cy.task('log', '---------------------------')

        // Pattern 2: Schema assertions
        expect(body).to.have.property('recommendations')
        expect(body).to.have.property('model')
        expect(body).to.have.property('requestId')
        expect(body).to.have.property('generatedAt')
        expect(body.recommendations).to.be.an('array')
        expect(body.recommendations.length).to.be.greaterThan(0)
        expect(body.recommendations.length).to.be.lessThan(11)

        const first = body.recommendations[0]
        expect(first).to.have.all.keys('productId', 'productName', 'score', 'reason', 'tags')
        expect(first.productId).to.be.a('string').and.not.be.empty
        expect(first.productName).to.be.a('string').and.not.be.empty
        expect(first.score).to.be.a('number').and.be.within(0, 1)
        expect(first.reason).to.be.a('string').and.not.be.empty
        expect(first.tags).to.be.an('array').and.have.length.greaterThan(0)
        expect(body.model).to.be.a('string').and.not.be.empty
        expect(body.requestId).to.match(/^req_/)
        expect(body.generatedAt).to.match(/^\d{4}-\d{2}-\d{2}T/)

        cy.task('log', 'schema assertions: PASS')
      })
    })
  })

  it('handles an empty recommendation list while maintaining valid schema', () => {
    cy.task('log', '\n--- PATTERN 2: Empty recommendation list ---')
    cy.fixture('ai_responses').then((aiData) => {
      cy.task('log', 'intercept registered: returning emptyRecommendation fixture')

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
        cy.task('log', `  recommendations: [] (length: ${body.recommendations.length})`)
        cy.task('log', `  model:           ${body.model}`)
        cy.task('log', `  requestId:       ${body.requestId}`)

        expect(body).to.have.property('recommendations')
        expect(body.recommendations).to.be.an('array').and.have.length(0)
        expect(body.model).to.be.a('string').and.not.be.empty
        expect(body.requestId).to.be.a('string').and.not.be.empty

        cy.task('log', 'schema assertions: PASS (empty list, metadata still present)')
      })
    })
  })

  it('handles a model-unavailable 503 error with the correct error schema', () => {
    cy.task('log', '\n--- PATTERN 2: 503 error response schema ---')
    cy.fixture('ai_responses').then((aiData) => {
      cy.task('log', 'intercept registered: returning 503 errorResponse fixture')

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
        const body = interception.response.body
        cy.task('log', `  statusCode:  ${interception.response.statusCode}`)
        cy.task('log', `  error:       ${body.error}`)
        cy.task('log', `  message:     ${body.message}`)
        cy.task('log', `  retryAfter:  ${body.retryAfter}s`)

        expect(interception.response.statusCode).to.eq(503)
        expect(body).to.have.all.keys('error', 'message', 'retryAfter')
        expect(body.error).to.be.a('string').and.not.be.empty
        expect(body.message).to.be.a('string').and.not.be.empty
        expect(body.retryAfter).to.be.a('number').and.be.greaterThan(0)

        cy.task('log', 'schema assertions: PASS')
      })
    })
  })

  // ── Pattern 3: LLM-Evaluated Assertions ──────────────────────────────────────

  it('evaluates product descriptions for professional tone using AI assertion', () => {
    cy.task('log', '\n--- PATTERN 3: LLM-evaluated assertion — product description ---')
    cy.get('.inventory_item_desc').first().invoke('text').then((descText) => {
      cy.task('log', `  evaluating: "${descText.trim().slice(0, 100)}..."`)
      cy.task('log', `  criteria:   "reads like a professional retail product description"`)
      cy.aiAssert(
        descText.trim(),
        'reads like a professional retail product description (coherent, not offensive, not gibberish)'
      )
    })
  })

  it('evaluates all product names are appropriate for a professional store', () => {
    cy.task('log', '\n--- PATTERN 3: LLM-evaluated assertion — all product names ---')
    cy.get('.inventory_item_name').then(($names) => {
      const names = [...$names].map((el) => el.innerText.trim()).join(', ')
      cy.task('log', `  evaluating: "${names}"`)
      cy.task('log', `  criteria:   "appropriate, professional product names for an e-commerce store"`)
      cy.aiAssert(
        names,
        'is a list of appropriate, professional product names suitable for an e-commerce store'
      )
    })
  })

  it('uses cy.task directly to ask AI an open-ended question about page content', () => {
    cy.task('log', '\n--- PATTERN 3b: Raw cy.task askAI call ---')
    cy.get('.inventory_item').its('length').then((count) => {
      const prompt = `A product catalog page shows ${count} items. Is this a reasonable number of items for a single-page e-commerce inventory? Reply with YES or NO followed by one sentence of reasoning.`
      cy.task('log', `  item count: ${count}`)
      cy.task('log', `  prompt:     "${prompt}"`)

      cy.task('askAI', { prompt }, { timeout: 30000 }).then((response) => {
        if (response.startsWith('[AI_SKIPPED')) {
          cy.task('log', `  result:     SKIPPED (no API key)`)
          return
        }
        cy.task('log', `  AI says:    ${response}`)
        expect(
          response.toUpperCase().startsWith('YES'),
          `Expected AI to confirm ${count} items is a reasonable catalog size, got: "${response}"`
        ).to.be.true
        cy.task('log', '  assertion:  PASS')
      })
    })
  })
})

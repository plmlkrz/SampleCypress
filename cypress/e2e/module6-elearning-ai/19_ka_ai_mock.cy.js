// Module 6 | Spec 19: Khan Academy — AI Tutor Endpoint Mocking + Schema Validation
//
// Demonstrates how to test an AI API endpoint WITHOUT a real backend.
// Uses cy.intercept() to mock a Khanmigo-style POST endpoint and validates
// the response schema — shapes, types, and format contracts — not content.
//
// Key principle: schema tests are stable even as AI model responses change.
//
// Pattern: cy.intercept() → cy.window().fetch() → cy.wait() → assert schema
// (cy.request() runs in Node.js and bypasses cy.intercept — always use win.fetch())
//
// Target: https://www.khanacademy.org (page must be loaded for win.fetch to work)

import KhanAcademyPage from '../../pages/KhanAcademyPage'

const AI_ENDPOINT = '**/api/v1/khanmigo/message**'
const AI_FULL_URL = `${Cypress.env('khanacademy_url')}/api/v1/khanmigo/message`

describe('Module 6 | KA AI Mock — Endpoint Schema Validation', { testIsolation: false }, () => {
  before(() => {
    // Load KA once so cy.window() has a live browser context for win.fetch()
    KhanAcademyPage.visit()
  })

  it('intercepts the AI tutor endpoint and validates the full response schema', () => {
    cy.fixture('ai_tutor_responses').then((data) => {
      cy.intercept('POST', AI_ENDPOINT, {
        statusCode: 200,
        body: data.tutorResponse,
      }).as('tutorCall')

      cy.window().then((win) => {
        return win.fetch(AI_FULL_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'What is the Pythagorean theorem?' }),
        }).catch(() => {})
      })

      cy.wait('@tutorCall').then((interception) => {
        const body = interception.response.body

        // Print the full response to the terminal (visible in headless runs)
        cy.task('log', '--- INTERCEPTED RESPONSE BODY ---')
        cy.task('log', `messageId:  ${body.messageId}`)
        cy.task('log', `model:      ${body.model}`)
        cy.task('log', `confidence: ${body.confidence}`)
        cy.task('log', `response:   ${body.response}`)
        cy.task('log', `hints:      ${JSON.stringify(body.hints)}`)
        cy.task('log', `references: ${JSON.stringify(body.references)}`)
        cy.task('log', `timestamp:  ${body.timestamp}`)
        cy.task('log', '---------------------------------')

        // Required top-level keys
        expect(body).to.have.all.keys('messageId', 'response', 'confidence', 'references', 'hints', 'timestamp', 'model')

        // Type contracts
        expect(body.messageId).to.be.a('string').and.not.be.empty
        expect(body.response).to.be.a('string').and.not.be.empty
        expect(body.confidence).to.be.a('number').and.be.within(0, 1)
        expect(body.references).to.be.an('array')
        expect(body.hints).to.be.an('array')
        expect(body.model).to.be.a('string').and.not.be.empty

        // Format contracts (ISO 8601 timestamp)
        expect(body.timestamp).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)

        // Reference item schema (when present)
        if (body.references.length > 0) {
          const ref = body.references[0]
          expect(ref).to.have.all.keys('articleId', 'title', 'url')
          expect(ref.articleId).to.be.a('string').and.not.be.empty
          expect(ref.url).to.be.a('string').and.match(/^\//)
        }
      })
    })
  })

  it('validates that an empty-input response prompts for clarification', () => {
    cy.fixture('ai_tutor_responses').then((data) => {
      cy.intercept('POST', AI_ENDPOINT, {
        statusCode: 200,
        body: data.emptyInputResponse,
      }).as('emptyCall')

      cy.window().then((win) => {
        return win.fetch(AI_FULL_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: '' }),
        }).catch(() => {})
      })

      cy.wait('@emptyCall').then((interception) => {
        const body = interception.response.body

        // Print the full response to the terminal (visible in headless runs)
        cy.task('log', '--- INTERCEPTED RESPONSE BODY ---')
        cy.task('log', `messageId:  ${body.messageId}`)
        cy.task('log', `model:      ${body.model}`)
        cy.task('log', `confidence: ${body.confidence}`)
        cy.task('log', `response:   ${body.response}`)
        cy.task('log', `hints:      ${JSON.stringify(body.hints)}`)
        cy.task('log', `references: ${JSON.stringify(body.references)}`)
        cy.task('log', `timestamp:  ${body.timestamp}`)
        cy.task('log', '---------------------------------')

        expect(body.response).to.be.a('string').and.not.be.empty
        // Confidence should be high — the AI is certain this was an empty message
        expect(body.confidence).to.equal(1.0)
        expect(body.references).to.be.an('array').with.lengthOf(0)
      })
    })
  })

  it('validates that an off-topic response redirects to academic subjects', () => {
    cy.fixture('ai_tutor_responses').then((data) => {
      cy.intercept('POST', AI_ENDPOINT, {
        statusCode: 200,
        body: data.offTopicResponse,
      }).as('offTopicCall')

      cy.window().then((win) => {
        return win.fetch(AI_FULL_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Who will win the championship?' }),
        }).catch(() => {})
      })

      cy.wait('@offTopicCall').then((interception) => {
        const body = interception.response.body

        // Print the full response to the terminal (visible in headless runs)
        cy.task('log', '--- INTERCEPTED RESPONSE BODY ---')
        cy.task('log', `messageId:  ${body.messageId}`)
        cy.task('log', `model:      ${body.model}`)
        cy.task('log', `confidence: ${body.confidence}`)
        cy.task('log', `response:   ${body.response}`)
        cy.task('log', `hints:      ${JSON.stringify(body.hints)}`)
        cy.task('log', `references: ${JSON.stringify(body.references)}`)
        cy.task('log', `timestamp:  ${body.timestamp}`)
        cy.task('log', '---------------------------------')

        // Schema still holds even for off-topic handling
        expect(body).to.have.all.keys('messageId', 'response', 'confidence', 'references', 'hints', 'timestamp', 'model')
        expect(body.response).to.be.a('string').and.not.be.empty
        expect(body.references).to.be.an('array')
      })
    })
  })

  it('handles a 503 service-error response with correct error schema', () => {
    cy.fixture('ai_tutor_responses').then((data) => {
      cy.intercept('POST', AI_ENDPOINT, {
        statusCode: 503,
        body: data.errorResponse,
      }).as('errorCall')

      cy.window().then((win) => {
        return win.fetch(AI_FULL_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Help me with algebra' }),
        }).catch(() => {})
      })

      cy.wait('@errorCall').then((interception) => {
        expect(interception.response.statusCode).to.equal(503)
        const body = interception.response.body

        // Print the full response to the terminal (visible in headless runs)
        cy.task('log', '--- INTERCEPTED RESPONSE BODY ---')
        cy.task('log', `messageId:  ${body.messageId}`)
        cy.task('log', `model:      ${body.model}`)
        cy.task('log', `confidence: ${body.confidence}`)
        cy.task('log', `response:   ${body.response}`)
        cy.task('log', `hints:      ${JSON.stringify(body.hints)}`)
        cy.task('log', `references: ${JSON.stringify(body.references)}`)
        cy.task('log', `timestamp:  ${body.timestamp}`)
        cy.task('log', '---------------------------------')
        // Error response schema
        expect(body).to.have.all.keys('error', 'message', 'retryAfter')
        expect(body.error).to.be.a('string').and.not.be.empty
        expect(body.message).to.be.a('string').and.not.be.empty
        expect(body.retryAfter).to.be.a('number').and.be.greaterThan(0)
      })
    })
  })
})

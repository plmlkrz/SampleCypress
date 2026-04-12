// Module 6 | Spec 21: Khan Academy — AI Response Latency / SLA Assertions
//
// Demonstrates timing-based assertions for AI API calls.
// Measures response duration using win.performance.now() in the browser context
// so the clock starts and stops inside the same fetch() call chain.
//
// SLA_MS = 5000ms — a realistic threshold for an AI tutor response.
//
// Tests cover:
//   1. Fast response (no delay) — must complete within SLA
//   2. Monitoring-only — log duration without asserting (observability pattern)
//   3. Simulated slow response (3s delay) — verifies delay fires AND still within bound
//   4. Consistency — 3 sequential calls, no single call >2× the average

import KhanAcademyPage from '../../pages/KhanAcademyPage'

const AI_ENDPOINT = '**/api/v1/khanmigo/message**'
const AI_FULL_URL = `${Cypress.env('khanacademy_url')}/api/v1/khanmigo/message`
const SLA_MS = 5000

describe('Module 6 | KA AI Latency — SLA Assertions', { testIsolation: false }, () => {
  before(() => {
    KhanAcademyPage.visit()
  })

  it('AI tutor responds within SLA (no artificial delay)', () => {
    cy.fixture('ai_tutor_responses').then((data) => {
      cy.intercept('POST', AI_ENDPOINT, {
        statusCode: 200,
        body: data.tutorResponse,
      }).as('fastCall')

      cy.window().then((win) => {
        const start = win.performance.now()
        return win.fetch(AI_FULL_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Explain the Pythagorean theorem' }),
        })
          .catch(() => {})
          .then(() => win.performance.now() - start)
      }).then((duration) => {
        cy.log(`AI response time: ${Math.round(duration)}ms (SLA: ${SLA_MS}ms)`)
        expect(duration).to.be.lessThan(SLA_MS)
      })

      cy.wait('@fastCall')
    })
  })

  it('AI response time is logged for monitoring (non-asserting observability test)', () => {
    cy.fixture('ai_tutor_responses').then((data) => {
      cy.intercept('POST', AI_ENDPOINT, {
        statusCode: 200,
        body: data.tutorResponse,
      }).as('monitorCall')

      cy.window().then((win) => {
        const start = win.performance.now()
        return win.fetch(AI_FULL_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'What is photosynthesis?' }),
        })
          .catch(() => {})
          .then(() => win.performance.now() - start)
      }).then((duration) => {
        // Log for dashboards / CI artifacts — this test always passes
        cy.log(`[MONITORING] AI response time: ${Math.round(duration)}ms`)
      })

      cy.wait('@monitorCall')
    })
  })

  it('simulated slow AI response (3s delay) still completes within extended bound', () => {
    cy.fixture('ai_tutor_responses').then((data) => {
      cy.intercept('POST', AI_ENDPOINT, {
        statusCode: 200,
        body: data.tutorResponse,
        delay: 3000,
      }).as('slowCall')

      cy.window().then((win) => {
        const start = win.performance.now()
        return win.fetch(AI_FULL_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Explain gravity' }),
        })
          .catch(() => {})
          .then(() => win.performance.now() - start)
      }).then((duration) => {
        cy.log(`Slow response time: ${Math.round(duration)}ms`)
        // The 3s delay was respected
        expect(duration).to.be.at.least(3000)
        // Still within a generous SLA ceiling
        expect(duration).to.be.lessThan(SLA_MS + 1000)
      })

      // Extend the cy.wait timeout to accommodate the injected delay
      cy.wait('@slowCall', { timeout: 10000 })
    })
  })

  it('three sequential AI calls all complete within SLA and latency is consistent', () => {
    cy.fixture('ai_tutor_responses').then((data) => {
      const questions = [
        'What is the quadratic formula?',
        'Explain Newton\'s first law',
        'What is the water cycle?',
      ]
      const durations = []

      // Chain three sequential fetch calls, each intercepted independently
      questions.forEach((question, index) => {
        cy.intercept('POST', AI_ENDPOINT, {
          statusCode: 200,
          body: data.tutorResponse,
        }).as(`call${index}`)

        cy.window().then((win) => {
          const start = win.performance.now()
          return win.fetch(AI_FULL_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: question }),
          })
            .catch(() => {})
            .then(() => win.performance.now() - start)
        }).then((duration) => {
          durations.push(duration)
          cy.log(`Call ${index + 1} response time: ${Math.round(duration)}ms`)
          expect(duration).to.be.lessThan(SLA_MS)
        })

        cy.wait(`@call${index}`)
      })

      // After all three calls, check latency consistency
      cy.then(() => {
        const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length
        cy.log(`Average response time: ${Math.round(avg)}ms`)
        durations.forEach((d, i) => {
          expect(d, `Call ${i + 1} should not be more than 2x the average`).to.be.lessThan(avg * 2 + 50)
        })
      })
    })
  })
})

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
    cy.task('log', `\nSLA threshold: ${SLA_MS}ms`)
    cy.task('log', `Endpoint:      ${AI_FULL_URL}\n`)
  })

  it('AI tutor responds within SLA (no artificial delay)', () => {
    cy.task('log', '\n--- TEST 1: Fast response (no delay) ---')
    cy.fixture('ai_tutor_responses').then((data) => {
      cy.intercept('POST', AI_ENDPOINT, {
        statusCode: 200,
        body: data.tutorResponse,
      }).as('fastCall')

      cy.task('log', 'intercept registered — no delay applied')
      cy.task('log', 'sending: "Explain the Pythagorean theorem"')

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
        cy.task('log', `response received in: ${Math.round(duration)}ms`)
        cy.task('log', `SLA check: ${Math.round(duration)}ms < ${SLA_MS}ms → ${duration < SLA_MS ? 'PASS' : 'FAIL'}`)
        expect(duration).to.be.lessThan(SLA_MS)
      })

      cy.wait('@fastCall')
    })
  })

  it('AI response time is logged for monitoring (non-asserting observability test)', () => {
    cy.task('log', '\n--- TEST 2: Monitoring only (no assertion) ---')
    cy.fixture('ai_tutor_responses').then((data) => {
      cy.intercept('POST', AI_ENDPOINT, {
        statusCode: 200,
        body: data.tutorResponse,
      }).as('monitorCall')

      cy.task('log', 'sending: "What is photosynthesis?"')

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
        cy.task('log', `[MONITORING] response time: ${Math.round(duration)}ms (logged only — no assertion)`)
      })

      cy.wait('@monitorCall')
    })
  })

  it('simulated slow AI response (3s delay) still completes within extended bound', () => {
    cy.task('log', '\n--- TEST 3: Slow response (3000ms injected delay) ---')
    cy.fixture('ai_tutor_responses').then((data) => {
      cy.intercept('POST', AI_ENDPOINT, {
        statusCode: 200,
        body: data.tutorResponse,
        delay: 3000,
      }).as('slowCall')

      cy.task('log', 'intercept registered — 3000ms delay injected')
      cy.task('log', 'sending: "Explain gravity"')

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
        cy.task('log', `response received in: ${Math.round(duration)}ms`)
        cy.task('log', `delay check:  ${Math.round(duration)}ms >= 3000ms → ${duration >= 3000 ? 'PASS' : 'FAIL'}`)
        cy.task('log', `ceiling check: ${Math.round(duration)}ms < ${SLA_MS + 1000}ms → ${duration < SLA_MS + 1000 ? 'PASS' : 'FAIL'}`)
        expect(duration).to.be.at.least(3000)
        expect(duration).to.be.lessThan(SLA_MS + 1000)
      })

      cy.wait('@slowCall', { timeout: 10000 })
    })
  })

  it('three sequential AI calls all complete within SLA and latency is consistent', () => {
    cy.task('log', '\n--- TEST 4: Consistency check (3 sequential calls) ---')
    cy.fixture('ai_tutor_responses').then((data) => {
      const questions = [
        'What is the quadratic formula?',
        "Explain Newton's first law",
        'What is the water cycle?',
      ]
      const durations = []

      questions.forEach((question, index) => {
        cy.intercept('POST', AI_ENDPOINT, {
          statusCode: 200,
          body: data.tutorResponse,
        }).as(`call${index}`)

        cy.task('log', `sending call ${index + 1}: "${question}"`)

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
          cy.task('log', `  call ${index + 1} response: ${Math.round(duration)}ms`)
          expect(duration).to.be.lessThan(SLA_MS)
        })

        cy.wait(`@call${index}`)
      })

      cy.then(() => {
        const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length
        const max = Math.max(...durations)
        const min = Math.min(...durations)
        cy.task('log', `\n  results:  [${durations.map(Math.round).join('ms, ')}ms]`)
        cy.task('log', `  min:      ${Math.round(min)}ms`)
        cy.task('log', `  max:      ${Math.round(max)}ms`)
        cy.task('log', `  average:  ${Math.round(avg)}ms`)
        cy.task('log', `  consistency check: no call > 2x average`)
        durations.forEach((d, i) => {
          const pass = d < avg * 2 + 50
          cy.task('log', `    call ${i + 1}: ${Math.round(d)}ms vs limit ${Math.round(avg * 2 + 50)}ms → ${pass ? 'PASS' : 'FAIL'}`)
          expect(d, `Call ${i + 1} should not be more than 2x the average`).to.be.lessThan(avg * 2 + 50)
        })
      })
    })
  })
})

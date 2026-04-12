// ─── Module 5 | Self-Healing Agent ────────────────────────────────────────────
// Demonstrates two modes of the Self-Healing Agent:
//
// PASSIVE MODE (automatic, runs on every test failure):
//   The Cypress.on('fail', ...) hook in cypress/support/e2e.js fires whenever
//   a test fails with a selector-not-found error. It calls cy.task('suggestSelectors')
//   and prints ranked alternatives to the Cypress timeline — without suppressing
//   the failure. Test 1 shows what this looks like in practice.
//
// ACTIVE MODE (manual CLI tool):
//   scripts/heal-selectors.js reads a spec or POM file and asks Claude to review
//   ALL selectors, suggesting improvements for fragile ones. Test 2 demonstrates
//   the cy.task('healSpec') handler that powers this CLI.
//
// Without an anthropic_api_key these tests log an AI_SKIPPED notice and pass.
// Run with a key:
//   npx cypress run --spec 'cypress/e2e/module5-ai-qa/17_ai_self_healing.cy.js' \
//     --env anthropic_api_key=sk-ant-...

import LoginPage from '../../pages/LoginPage'

describe('Module 5 | Self-Healing Agent', { testIsolation: false }, () => {
  // ── Setup ──────────────────────────────────────────────────────────────────
  before(() => {
    cy.task('log', '\n=== MODULE 5 | SPEC 17: Self-Healing Agent ===')
    cy.task('log', 'Test 1: suggestSelectors — passive healing simulation')
    cy.task('log', 'Test 2: healSpec        — active full-file review')
    cy.task('log', '==============================================\n')
    LoginPage.visit()
  })

  beforeEach(() => {
    cy.get('#react-burger-menu-btn').click({ force: true })
    cy.get('#logout_sidebar_link').should('be.visible').click()
    cy.clearLocalStorage()
    LoginPage.login(Cypress.env('standard_user'), Cypress.env('password'))
    cy.url().should('include', '/inventory')
    cy.get('.inventory_item').should('have.length.greaterThan', 0)
  })

  // ── Test 1: suggestSelectors ───────────────────────────────────────────────
  it('suggests alternative selectors for a fragile class selector', () => {
    const fragileSel = '.title'
    const fakeError  = 'Timed out retrying after 4000ms: Expected to find element: .title, but never found it.'

    cy.task('log', '\n--- TEST 1: suggestSelectors (passive healing simulation) ---')
    cy.task('log', `  fragile selector: "${fragileSel}"`)
    cy.task('log', `  simulated error:  "${fakeError}"`)
    cy.task('log', '  calling cy.task("suggestSelectors")...')

    cy.task(
      'suggestSelectors',
      { selector: fragileSel, errorMessage: fakeError },
      { timeout: 30000 }
    ).then((response) => {
      if (response.startsWith('[AI_SKIPPED')) {
        cy.task('log', `  SKIPPED — ${response}`)
        cy.task('log', '  Set anthropic_api_key in cypress.env.json to run AI assertions.')
        return
      }

      let parsed
      try {
        parsed = JSON.parse(response)
      } catch {
        cy.task('log', '  WARNING: non-JSON response — logging raw output:')
        cy.task('log', response)
        return
      }

      const suggestions = parsed.suggestions || []
      cy.task('log', `\n  ${suggestions.length} suggestion(s) returned:`)
      suggestions.forEach((s, i) => {
        cy.task('log', `    [${i + 1}] selector:  "${s.selector}"`)
        cy.task('log', `         strategy:  ${s.strategy}`)
        cy.task('log', `         confidence: ${s.confidence}`)
        cy.task('log', `         reason:    ${s.explanation}`)
      })

      expect(suggestions).to.be.an('array')
      if (suggestions.length > 0) {
        expect(suggestions[0]).to.have.all.keys('selector', 'strategy', 'confidence', 'explanation')
        expect(['HIGH', 'MEDIUM', 'LOW']).to.include(suggestions[0].confidence)
        cy.task('log', '\n  schema assertions: PASS')
      }
    })
  })

  // ── Test 2: healSpec ───────────────────────────────────────────────────────
  it('reviews InventoryPage.js and reports fragile selectors via healSpec task', () => {
    cy.task('log', '\n--- TEST 2: healSpec (active full-file review) ---')
    cy.task('log', '  file: cypress/pages/InventoryPage.js')
    cy.task('log', '  calling cy.task("healSpec")...')

    cy.task(
      'healSpec',
      { specPath: 'cypress/pages/InventoryPage.js' },
      { timeout: 30000 }
    ).then((response) => {
      if (response.startsWith('[AI_SKIPPED')) {
        cy.task('log', `  SKIPPED — ${response}`)
        cy.task('log', '  Set anthropic_api_key in cypress.env.json to run AI assertions.')
        return
      }

      let parsed
      try {
        parsed = JSON.parse(response)
      } catch {
        cy.task('log', '  WARNING: non-JSON response — logging raw:')
        cy.task('log', response)
        return
      }

      const suggestions = parsed.suggestions || []
      cy.task('log', `\n  Heal report: ${suggestions.length} suggestion(s)`)

      if (suggestions.length === 0) {
        cy.task('log', '  InventoryPage.js selectors are already robust — no changes needed.')
      } else {
        suggestions.forEach((s) => {
          cy.task('log', `    Line ${s.line}: "${s.original}"`)
          cy.task('log', `            → "${s.suggested}"  [${s.confidence}]`)
          cy.task('log', `            reason: ${s.reason}`)
        })
        cy.task('log', '\n  To apply these suggestions, run:')
        cy.task('log', '    node scripts/heal-selectors.js --file cypress/pages/InventoryPage.js --patch')
      }

      expect(parsed).to.have.property('suggestions').that.is.an('array')
      if (suggestions.length > 0) {
        expect(suggestions[0]).to.have.all.keys('line', 'original', 'suggested', 'reason', 'confidence')
        cy.task('log', '\n  schema assertions: PASS')
      }
    })
  })
})

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

  // ── Test 1: cy.suggestSelectors() as a direct unit test ────────────────────
  // Calls suggestSelectors manually to demonstrate what the passive healing hook
  // would produce when a real test fails. We simulate a broken selector scenario:
  // a class name that is too generic (like .title) would be flagged as fragile.
  it('suggests alternative selectors for a fragile class selector', () => {
    // Simulate the scenario: a developer wrote `.title` as the selector for the
    // "Products" page heading. The self-healing agent should recommend the more
    // robust [data-test] or the specific class instead.
    const fragileSel   = '.title'
    const fakeError    = 'Timed out retrying after 4000ms: Expected to find element: .title, but never found it.'

    cy.task(
      'suggestSelectors',
      { selector: fragileSel, errorMessage: fakeError },
      { timeout: 30000 }
    ).then((response) => {
      if (response.startsWith('[AI_SKIPPED')) {
        cy.log(`Self-Healing Agent SKIPPED — ${response}`)
        cy.log('Set anthropic_api_key in cypress.env.json to run AI assertions.')
        return
      }

      let parsed
      try {
        parsed = JSON.parse(response)
      } catch {
        cy.log('WARNING: non-JSON response — logging raw output:')
        cy.log(response)
        return
      }

      const suggestions = parsed.suggestions || []
      cy.log(`Self-Healing Agent returned ${suggestions.length} suggestion(s) for "${fragileSel}":`)
      suggestions.forEach((s, i) => {
        cy.log(`  [${i + 1}] ${s.selector}  (${s.confidence}) — ${s.explanation}`)
      })

      // Structural assertions — not content assertions (AI output is non-deterministic)
      expect(suggestions).to.be.an('array')
      if (suggestions.length > 0) {
        expect(suggestions[0]).to.have.all.keys('selector', 'strategy', 'confidence', 'explanation')
        expect(['HIGH', 'MEDIUM', 'LOW']).to.include(suggestions[0].confidence)
      }
    })
  })

  // ── Test 2: cy.task('healSpec') — active healing on an existing file ───────
  // Asks the Self-Healing Agent to review an entire POM file for fragile selectors.
  // This is the same analysis that scripts/heal-selectors.js performs, but
  // callable from inside a test — useful for building automated quality gates.
  //
  // Key insight: the heal report identifies improvement OPPORTUNITIES.
  // Use --patch in the CLI to apply them; this test only reads and logs.
  it('reviews InventoryPage.js and reports fragile selectors via healSpec task', () => {
    cy.task(
      'healSpec',
      {
        specPath: 'cypress/pages/InventoryPage.js',
      },
      { timeout: 30000 }
    ).then((response) => {
      if (response.startsWith('[AI_SKIPPED')) {
        cy.log(`Self-Healing Agent (active) SKIPPED — ${response}`)
        cy.log('Set anthropic_api_key in cypress.env.json to run AI assertions.')
        return
      }

      let parsed
      try {
        parsed = JSON.parse(response)
      } catch {
        cy.log('WARNING: non-JSON response — logging raw:')
        cy.log(response)
        return
      }

      const suggestions = parsed.suggestions || []
      cy.log(`Heal report for InventoryPage.js: ${suggestions.length} suggestion(s)`)
      suggestions.forEach((s) => {
        cy.log(`  Line ${s.line}: "${s.original}"  →  "${s.suggested}"  [${s.confidence}]`)
        cy.log(`    Reason: ${s.reason}`)
      })

      if (suggestions.length === 0) {
        cy.log('✓ InventoryPage.js selectors are already robust — no changes needed.')
      } else {
        cy.log('\nTo apply these suggestions in-place, run:')
        cy.log('  node scripts/heal-selectors.js --file cypress/pages/InventoryPage.js --patch')
      }

      // Structural assertion only — AI content is non-deterministic
      expect(parsed).to.have.property('suggestions').that.is.an('array')
      if (suggestions.length > 0) {
        expect(suggestions[0]).to.have.all.keys('line', 'original', 'suggested', 'reason', 'confidence')
      }
    })
  })
})

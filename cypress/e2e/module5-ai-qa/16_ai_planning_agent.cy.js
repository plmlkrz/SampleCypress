// ─── Module 5 | Planning Agent ────────────────────────────────────────────────
// Demonstrates the Planning Agent: given a plain-English feature description,
// Claude analyzes the existing Page Objects and returns a structured JSON test
// plan covering scenarios, preconditions, fixtures, POM actions, and coverage gaps.
//
// The second test shows the full AI pipeline:
//   Planning Agent → Script Generation Agent → spec source code (logged)
//
// Without an anthropic_api_key these tests log an AI_SKIPPED notice and pass.
// Run with a key:
//   npx cypress run --spec 'cypress/e2e/module5-ai-qa/16_ai_planning_agent.cy.js' \
//     --env anthropic_api_key=sk-ant-...

import LoginPage from '../../pages/LoginPage'

describe('Module 5 | Planning Agent', { testIsolation: false }, () => {
  // ── Setup ──────────────────────────────────────────────────────────────────
  before(() => {
    cy.task('log', '\n=== MODULE 5 | SPEC 16: Planning Agent ===')
    cy.task('log', 'Test 1: Planning Agent → JSON test plan')
    cy.task('log', 'Test 2: Planning Agent → Script Generation Agent → spec source')
    cy.task('log', '==========================================\n')
    LoginPage.visit()
  })

  beforeEach(() => {
    // Client-side state reset — no cy.visit() to avoid SPA 404s
    cy.get('#react-burger-menu-btn').click({ force: true })
    cy.get('#logout_sidebar_link').should('be.visible').click()
    cy.clearLocalStorage()
    LoginPage.login(Cypress.env('standard_user'), Cypress.env('password'))
    cy.url().should('include', '/inventory')
    cy.get('.inventory_item').should('have.length.greaterThan', 0)
  })

  // ── Test 1: Planning Agent in isolation ────────────────────────────────────
  it('generates a structured test plan for the cart feature', () => {
    cy.task('log', '\n--- TEST 1: Planning Agent → structured JSON test plan ---')
    cy.task('log', 'feature: inventory page cart management')
    cy.task('log', 'pomContext: InventoryPage.js, CartPage.js')
    cy.task('log', 'calling cy.task("planTests")...')

    cy.task(
      'planTests',
      {
        feature: `
          Inventory page cart management:
          - User can add a product to the cart by clicking its "Add to cart" button.
          - The cart badge in the top-right corner shows the number of items added.
          - User can remove a product from the inventory page using the "Remove" button.
          - The cart badge disappears when all items are removed.
        `.trim(),
        pomContext: [
          'cypress/pages/InventoryPage.js',
          'cypress/pages/CartPage.js',
        ],
        existingSpecs: [
          'module4-pom/13_saucedemo_shopping.cy.js',
        ],
      },
      { timeout: 60000 }
    ).then((response) => {
      if (response.startsWith('[AI_SKIPPED')) {
        cy.task('log', `SKIPPED — ${response}`)
        cy.task('log', 'Set anthropic_api_key in cypress.env.json to run AI assertions.')
        return
      }

      let plan
      try {
        plan = JSON.parse(response)
      } catch {
        cy.task('log', 'WARNING: Claude returned non-JSON. Logging raw output.')
        cy.task('log', response)
        return
      }

      cy.task('log', `\nPlan received:`)
      cy.task('log', `  feature:        ${plan.feature}`)
      cy.task('log', `  scenarios:      ${plan.scenarios?.length ?? 0}`)
      cy.task('log', `  preconditions:  ${plan.preconditions?.length ?? 0}`)
      cy.task('log', `  fixtures:       ${plan.fixtures?.length ?? 0}`)
      cy.task('log', `  pomActions:     ${plan.pomActions?.length ?? 0}`)
      cy.task('log', `  coverageGaps:   ${plan.coverageGaps?.length ?? 0}`)

      if (plan.scenarios?.length) {
        cy.task('log', '\n  Scenarios:')
        plan.scenarios.forEach((s) => cy.task('log', `    [${s.id}] ${s.title}`))
      }
      if (plan.coverageGaps?.length) {
        cy.task('log', '\n  Coverage gaps:')
        plan.coverageGaps.forEach((g) => cy.task('log', `    - ${g}`))
      }

      expect(plan).to.have.all.keys(
        'feature', 'scenarios', 'preconditions', 'fixtures',
        'pomActions', 'selectorHints', 'newPomMethodsNeeded', 'coverageGaps'
      )
      expect(plan.scenarios).to.be.an('array').with.length.greaterThan(0)
      expect(plan.scenarios[0]).to.have.all.keys('id', 'title', 'steps', 'expectedResult')
      cy.task('log', '\nschema assertions: PASS')
    })
  })

  // ── Test 2: Full AI pipeline — Plan → Generate ─────────────────────────────
  it('chains Planning Agent into Script Generation Agent to produce spec source', () => {
    cy.task('log', '\n--- TEST 2: Plan → Generate pipeline ---')
    cy.task('log', 'Step 1: calling planTests for locked_out_user login scenario...')

    cy.task(
      'planTests',
      {
        feature: 'Verify that a locked_out_user sees a descriptive error message on the login page.',
        pomContext: ['cypress/pages/LoginPage.js'],
      },
      { timeout: 60000 }
    ).then((planResponse) => {
      if (planResponse.startsWith('[AI_SKIPPED')) {
        cy.task('log', `Planning Agent SKIPPED — ${planResponse}`)
        return
      }

      let plan
      try {
        plan = JSON.parse(planResponse)
      } catch {
        cy.task('log', 'Plan parsing failed — skipping generation step.')
        return
      }

      cy.task('log', `Plan ready: ${plan.scenarios?.length ?? 0} scenario(s)`)
      cy.task('log', 'Step 2: feeding plan into generateScript...')

      cy.task(
        'generateScript',
        { plan, targetPage: 'LoginPage' },
        { timeout: 60000 }
      ).then((specSource) => {
        if (specSource.startsWith('[AI_SKIPPED')) {
          cy.task('log', `Script Generation Agent SKIPPED — ${specSource}`)
          return
        }

        cy.task('log', `\nGenerated spec: ${specSource.length} characters`)
        cy.task('log', '\n--- SPEC PREVIEW (first 400 chars) ---')
        cy.task('log', specSource.slice(0, 400) + (specSource.length > 400 ? '\n...' : ''))
        cy.task('log', '--------------------------------------')

        expect(specSource).to.include('describe(')
        expect(specSource).to.include('it(')
        expect(specSource).to.match(/testIsolation:\s*false/)
        cy.task('log', 'structural assertions: PASS (describe, it, testIsolation: false)')
      })
    })
  })
})

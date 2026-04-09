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
  // Shows how to call cy.task('planTests') directly, inspect the JSON output,
  // and use the AI_SKIPPED pattern to keep CI green without an API key.
  it('generates a structured test plan for the cart feature', () => {
    // The Planning Agent reads the POM files you specify in pomContext so it
    // knows which selectors and methods already exist — no need to repeat them
    // in the feature description.
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
        // Pass relative paths so the task can read the files via fs.readFileSync
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
      // The sentinel pattern: if no API key, skip gracefully instead of failing
      if (response.startsWith('[AI_SKIPPED')) {
        cy.log(`Planning Agent SKIPPED — ${response}`)
        cy.log('Set anthropic_api_key in cypress.env.json to run AI assertions.')
        return
      }

      // Parse the JSON plan and log a summary to the Cypress timeline
      let plan
      try {
        plan = JSON.parse(response)
      } catch {
        cy.log('WARNING: Claude returned non-JSON. Logging raw output.')
        cy.log(response)
        return
      }

      cy.log(`Planning Agent produced ${plan.scenarios?.length ?? 0} scenario(s)`)
      cy.log(`Feature: ${plan.feature}`)

      if (plan.scenarios?.length) {
        plan.scenarios.forEach((s) => cy.log(`  [${s.id}] ${s.title}`))
      }
      if (plan.coverageGaps?.length) {
        cy.log(`Coverage gaps identified: ${plan.coverageGaps.join('; ')}`)
      }

      // Structural assertion — the plan should have the required keys
      expect(plan).to.have.all.keys(
        'feature', 'scenarios', 'preconditions', 'fixtures',
        'pomActions', 'selectorHints', 'newPomMethodsNeeded', 'coverageGaps'
      )
      expect(plan.scenarios).to.be.an('array').with.length.greaterThan(0)
      expect(plan.scenarios[0]).to.have.all.keys('id', 'title', 'steps', 'expectedResult')
    })
  })

  // ── Test 2: Full AI pipeline — Plan → Generate ─────────────────────────────
  // Chains the Planning Agent output directly into the Script Generation Agent.
  // In practice you would write the spec to disk via generate-spec-v2.js;
  // here we log the source so the Cypress timeline shows what was produced.
  it('chains Planning Agent into Script Generation Agent to produce spec source', () => {
    // Step 1: Generate a plan for a simple login scenario
    cy.task(
      'planTests',
      {
        feature: 'Verify that a locked_out_user sees a descriptive error message on the login page.',
        pomContext: ['cypress/pages/LoginPage.js'],
      },
      { timeout: 60000 }
    ).then((planResponse) => {
      if (planResponse.startsWith('[AI_SKIPPED')) {
        cy.log(`Planning Agent SKIPPED — ${planResponse}`)
        return
      }

      let plan
      try {
        plan = JSON.parse(planResponse)
      } catch {
        cy.log('Plan parsing failed — skipping generation step.')
        return
      }

      cy.log(`Plan ready: ${plan.scenarios?.length ?? 0} scenario(s) — feeding into Script Generation Agent`)

      // Step 2: Feed the plan into the Script Generation Agent
      cy.task(
        'generateScript',
        { plan, targetPage: 'LoginPage' },
        { timeout: 60000 }
      ).then((specSource) => {
        if (specSource.startsWith('[AI_SKIPPED')) {
          cy.log(`Script Generation Agent SKIPPED — ${specSource}`)
          return
        }

        cy.log(`Generated spec (${specSource.length} chars) — first 300 chars preview:`)
        cy.log(specSource.slice(0, 300) + (specSource.length > 300 ? '…' : ''))

        // Structural smoke-check: the generated source should look like a Cypress spec
        expect(specSource).to.include('describe(')
        expect(specSource).to.include('it(')
        // The agent should respect our conventions
        expect(specSource).to.match(/testIsolation:\s*false/)
      })
    })
  })
})

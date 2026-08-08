# CLAUDE.md

<!-- Last audited: 2026-08-07 -->

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install                      # install Cypress (first-time setup)
npm run cy:open                  # interactive Test Runner (GUI)
npm run cy:run                   # headless run — all 15 specs
npm run cy:run:module1           # run only Module 1 specs
npm run cy:run:module2           # run only Module 2 specs
npm run cy:run:module3           # run only Module 3 specs
npm run cy:run:module4           # run only Module 4 specs
npm run cy:run:module5           # run only Module 5 specs
npm run cy:run:module6           # run only Module 6 specs

# Run a single spec file
npx cypress run --spec 'cypress/e2e/module4-pom/13_saucedemo_shopping.cy.js'
```

## Architecture

This is a **Cypress 13 training framework** with no application code — only test code. The structure is a progressive learning curriculum divided into five modules.

### Module-to-site mapping

| Module | Target site | Key focus |
|--------|-------------|-----------|
| 1 — Basics | `the-internet.herokuapp.com` (baseUrl) | navigation, assertions, locators |
| 2 — UI Interactions | `the-internet.herokuapp.com` (baseUrl) | forms, dropdowns, alerts, file upload |
| 3 — Advanced | `jsonplaceholder.typicode.com` (via `Cypress.env('api_url')`) | `cy.request`, `cy.intercept`, env vars |
| 4 — POM | `saucedemo.com` (via `Cypress.env('saucedemo_url')`) | Page Object Model, login/cart flow |
| 5 — AI QA | `saucedemo.com` (via `Cypress.env('saucedemo_url')`) | mocking AI endpoints, LLM-evaluated assertions |
| 6 — eLearning AI | `khanacademy.org` (via `Cypress.env('khanacademy_url')`) | AI tutor mocking, LLM quality assertions, latency SLA |

### Page Object Model (Modules 4–5)

Page objects live in `cypress/pages/` and are imported directly into spec files using ES module syntax (`import LoginPage from '../../pages/LoginPage'`). Each page object is exported as a singleton (`export default new LoginPage()`). Selectors are grouped in an `elements` object of arrow functions returning `cy.get(...)` calls, so elements are always freshly queried.

### Custom commands (`cypress/support/commands.js`)

Five commands extend `cy.*`:
- `cy.login(username, password)` — visits saucedemo and logs in via UI
- `cy.addToCart(productName)` — adds a product by visible name using closest-ancestor traversal
- `cy.logout()` — burger menu → logout
- `cy.apiGet(endpoint)` — `cy.request GET` against `Cypress.env('api_url')` with `failOnStatusCode: false`
- `cy.aiAssert(text, criteria)` — sends `text` to Claude via `cy.task('askAI')` and expects a YES response; skips gracefully (logs, does not fail) when `anthropic_api_key` is not configured

All commands are auto-loaded via `cypress/support/e2e.js`, which is the global support file.

### `cy.intercept()` requires browser-side requests

`cy.intercept()` only intercepts requests that originate from the browser. `cy.request()` runs in Node.js and bypasses the browser network layer entirely — `cy.intercept()` will never fire for it. To trigger an interceptable request in a test, load a page first and use `cy.window().then(win => win.fetch(...))`:

```js
cy.intercept('GET', '**/posts/1').as('getPost')
cy.window().then((win) => win.fetch('https://jsonplaceholder.typicode.com/posts/1'))
cy.wait('@getPost')
```

### `testIsolation: false` pattern (Modules 4–5 shopping specs)

`13_saucedemo_shopping.cy.js` and `15_ai_feature_testing.cy.js` both disable Cypress's default test isolation to avoid `cy.visit()` timeouts on SauceDemo's React SPA (virtual routes return 404 from the server). Instead they:
1. Log in once in `before()`
2. Use `beforeEach()` to reset state via client-side navigation: burger menu → logout → `cy.clearLocalStorage()` → login again → wait for `.inventory_item` to confirm the page has rendered

Do not add `cy.visit()` or `cy.reload()` in those specs' `beforeEach` — it will timeout on virtual routes like `/inventory.html`.

### AI bridge (`cypress.config.js` → `setupNodeEvents`)

`cy.task('askAI', { prompt, context? })` is registered in `setupNodeEvents`. It calls the Anthropic API using `@anthropic-ai/sdk` (model: `claude-sonnet-5`, max 256 tokens) and returns the model's text. If `anthropic_api_key` is empty, it returns the sentinel string `[AI_SKIPPED: no anthropic_api_key configured]` — callers check for this prefix to skip rather than fail.

### Environment variables (`cypress.config.js`)

```
saucedemo_url      → https://www.saucedemo.com
api_url            → https://jsonplaceholder.typicode.com
standard_user      → standard_user
password           → secret_sauce
anthropic_api_key  → (empty — set via cypress.env.json or CI secret)
```

For local secret overrides, create a git-ignored `cypress.env.json` at the project root. In CI, prefix variable names with `CYPRESS_` (e.g. `CYPRESS_password`, `CYPRESS_anthropic_api_key`).

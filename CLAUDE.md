# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install                      # install Cypress (first-time setup)
npm run cy:open                  # interactive Test Runner (GUI)
npm run cy:run                   # headless run — all 13 specs
npm run cy:run:module1           # run only Module 1 specs
npm run cy:run:module2           # run only Module 2 specs
npm run cy:run:module3           # run only Module 3 specs
npm run cy:run:module4           # run only Module 4 specs

# Run a single spec file
npx cypress run --spec 'cypress/e2e/module4-pom/13_saucedemo_shopping.cy.js'
```

## Architecture

This is a **Cypress 13 training framework** with no application code — only test code. The structure is a progressive learning curriculum divided into four modules.

### Module-to-site mapping

| Module | Target site | Key focus |
|--------|-------------|-----------|
| 1 — Basics | `the-internet.herokuapp.com` (baseUrl) | navigation, assertions, locators |
| 2 — UI Interactions | `the-internet.herokuapp.com` (baseUrl) | forms, dropdowns, alerts, file upload |
| 3 — Advanced | `jsonplaceholder.typicode.com` (via `Cypress.env('api_url')`) | `cy.request`, `cy.intercept`, env vars |
| 4 — POM | `saucedemo.com` (via `Cypress.env('saucedemo_url')`) | Page Object Model, login/cart flow |

### Page Object Model (Module 4)

Page objects live in `cypress/pages/` and are imported directly into spec files using ES module syntax (`import LoginPage from '../../pages/LoginPage'`). Each page object is exported as a singleton (`export default new LoginPage()`). Selectors are grouped in an `elements` object of arrow functions returning `cy.get(...)` calls, so elements are always freshly queried.

### Custom commands (`cypress/support/commands.js`)

Four commands extend `cy.*`:
- `cy.login(username, password)` — visits saucedemo and logs in via UI
- `cy.addToCart(productName)` — adds a product by visible name using closest-ancestor traversal
- `cy.logout()` — burger menu → logout
- `cy.apiGet(endpoint)` — `cy.request GET` against `Cypress.env('api_url')` with `failOnStatusCode: false`

All commands are auto-loaded via `cypress/support/e2e.js`, which is the global support file.

### `testIsolation: false` pattern (Module 4 shopping spec)

`13_saucedemo_shopping.cy.js` disables Cypress's default test isolation to avoid `cy.visit()` timeouts on SauceDemo's React SPA (virtual routes return 404 from the server). Instead it:
1. Logs in once in `before()`
2. Uses `beforeEach()` to reset state via client-side navigation: burger menu → logout → `cy.clearLocalStorage()` → login again

Do not add `cy.visit()` or `cy.reload()` in that spec's `beforeEach` — it will timeout on virtual routes like `/inventory.html`.

### Environment variables (`cypress.config.js`)

```
saucedemo_url  → https://www.saucedemo.com
api_url        → https://jsonplaceholder.typicode.com
standard_user  → standard_user
password       → secret_sauce
```

For local secret overrides, create a git-ignored `cypress.env.json` at the project root. In CI, prefix variable names with `CYPRESS_` (e.g. `CYPRESS_password`).

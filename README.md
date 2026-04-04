# Cypress Automation Training Framework

A hands-on Cypress training project structured as progressive learning modules — from the absolute basics through API testing, network interception, and the Page Object Model.

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18+ |
| npm | 9+ |

Install Node.js from https://nodejs.org (LTS version recommended).

---

## Setup

```bash
# Clone the repository
git clone https://github.com/plmlkrz/SampleCypress.git
cd SampleCypress

# Install Cypress and all dependencies
npm install

# Open the interactive Cypress Test Runner (great for development)
npm run cy:open

# Run all tests headlessly in the terminal
npm run cy:run
```

---

## Project Structure

```
cypress/
├── e2e/
│   ├── module1-basics/             ← Start here
│   │   ├── 01_navigation.cy.js
│   │   ├── 02_assertions.cy.js
│   │   └── 03_locators.cy.js
│   ├── module2-ui-interactions/
│   │   ├── 04_forms.cy.js
│   │   ├── 05_dropdowns.cy.js
│   │   ├── 06_checkboxes_radio.cy.js
│   │   ├── 07_alerts_dialogs.cy.js
│   │   └── 08_file_upload.cy.js
│   ├── module3-advanced/
│   │   ├── 09_api_testing.cy.js
│   │   ├── 10_intercept_stub.cy.js
│   │   └── 11_env_variables.cy.js
│   └── module4-pom/                ← Page Object Model
│       ├── 12_saucedemo_login.cy.js
│       └── 13_saucedemo_shopping.cy.js
├── fixtures/                       ← Test data (JSON)
│   ├── users.json
│   ├── products.json
│   └── api_responses.json
├── pages/                          ← Page Object classes
│   ├── LoginPage.js
│   ├── InventoryPage.js
│   └── CartPage.js
└── support/
    ├── commands.js                 ← Custom cy.* commands
    └── e2e.js                      ← Global support file
cypress.config.js                   ← Cypress configuration
```

---

## Running Individual Modules

```bash
# Module 1 — Basics (navigation, assertions, locators)
npm run cy:run:module1

# Module 2 — UI Interactions (forms, dropdowns, alerts, file upload)
npm run cy:run:module2

# Module 3 — Advanced (API testing, intercept/stub, env vars)
npm run cy:run:module3

# Module 4 — Page Object Model (SauceDemo login + shopping flow)
npm run cy:run:module4
```

---

## Learning Path

### Module 1 — Basics
> **Goal:** Understand how Cypress works and write your first assertions.

| File | Concepts |
|------|----------|
| `01_navigation.cy.js` | `cy.visit()`, `cy.url()`, `cy.title()`, `cy.go()`, `cy.reload()` |
| `02_assertions.cy.js` | `.should()`, `.and()`, `expect()`, BDD vs TDD style |
| `03_locators.cy.js` | `cy.get()`, `.contains()`, `.find()`, `.within()`, `.eq()`, `.filter()` |

### Module 2 — UI Interactions
> **Goal:** Interact with every common UI element type.

| File | Concepts |
|------|----------|
| `04_forms.cy.js` | `.type()`, `.clear()`, `.submit()`, form validation |
| `05_dropdowns.cy.js` | `.select()` for native `<select>`, custom dropdowns |
| `06_checkboxes_radio.cy.js` | `.check()`, `.uncheck()`, `:checked` filter |
| `07_alerts_dialogs.cy.js` | `cy.on('window:alert')`, `cy.on('window:confirm')`, `cy.stub()` |
| `08_file_upload.cy.js` | `.selectFile()`, `cy.fixture()`, `Cypress.Buffer` |

### Module 3 — Advanced
> **Goal:** Test the network layer and learn environment configuration.

| File | Concepts |
|------|----------|
| `09_api_testing.cy.js` | `cy.request()`, GET/POST/PUT/DELETE, query params, status codes |
| `10_intercept_stub.cy.js` | `cy.intercept()`, `.as()`, `cy.wait()`, stubbing with fixtures |
| `11_env_variables.cy.js` | `Cypress.env()`, `cypress.env.json`, `--env` CLI flag |

### Module 4 — Page Object Model
> **Goal:** Apply the POM pattern to write maintainable, readable tests.

| File | Concepts |
|------|----------|
| `12_saucedemo_login.cy.js` | `LoginPage` POM, fixture-driven credentials, error scenarios |
| `13_saucedemo_shopping.cy.js` | `InventoryPage` + `CartPage` POM, `cy.login()` custom command |

---

## Demo Sites

| Site | Used In | Purpose |
|------|---------|---------|
| [the-internet.herokuapp.com](https://the-internet.herokuapp.com) | Module 1 & 2 | Rich UI element variety |
| [jsonplaceholder.typicode.com](https://jsonplaceholder.typicode.com) | Module 3 | Free REST API for testing |
| [saucedemo.com](https://www.saucedemo.com) | Module 4 | Login + shopping flow |

---

## Sensitive Credentials

For a real project, never commit passwords to source control. Create a `cypress.env.json` file (already git-ignored) to store secrets locally:

```json
{
  "password": "your-real-password"
}
```

In CI (GitHub Actions), use repository secrets:
```yaml
env:
  CYPRESS_password: ${{ secrets.MY_PASSWORD }}
```

---

## CI/CD

This project includes a GitHub Actions workflow (`.github/workflows/cypress.yml`) that runs all tests automatically on every push and pull request to `main`.

Artifacts (screenshots on failure, videos always) are uploaded and retained for 7 days.

---

## Key Cypress Concepts Quick Reference

```javascript
// Navigation
cy.visit('/path')           // relative to baseUrl
cy.visit('https://...')     // absolute URL

// Finding elements
cy.get('#id')               // by ID
cy.get('.class')            // by class
cy.get('[data-test="x"]')  // by data attribute (preferred)
cy.contains('text')         // by visible text
cy.get('ul').find('li')    // find within parent

// Assertions
cy.get('h1').should('be.visible')
cy.get('h1').should('have.text', 'Hello')
cy.url().should('include', '/dashboard')

// Interactions
cy.get('input').type('hello')
cy.get('input').clear()
cy.get('button').click()
cy.get('select').select('Option 1')
cy.get('[type=checkbox]').check()

// API Testing
cy.request('GET', 'https://api.example.com/items')
cy.intercept('GET', '/api/items').as('getItems')
cy.wait('@getItems')

// Environment
Cypress.env('key')          // read env var
Cypress.config('baseUrl')   // read config value
```

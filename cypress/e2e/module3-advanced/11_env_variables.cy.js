// ─── Module 3 | Lesson 11: Environment Variables ─────────────────────────────
// Environment variables let you configure tests for different environments
// (dev, staging, production) without changing test code.
//
// Cypress env vars are NOT the same as Node's process.env.
// They live in the Cypress config and are accessible via Cypress.env().
//
// Ways to set Cypress env vars (in priority order — higher overrides lower):
//   1. cypress run --env key=value           (CLI flag — highest priority)
//   2. CYPRESS_key=value environment variable (OS env)
//   3. cypress.env.json file               (git-ignored — for secrets)
//   4. cypress.config.js env: {} object    (checked into source control)
//
// Key API:
//   Cypress.env('key')           → read a single env var
//   Cypress.env()                → read ALL env vars as an object
//   Cypress.env('key', value)    → set an env var at runtime (test-scoped)
//   Cypress.config('key')        → read Cypress config (baseUrl, viewport, etc.)

describe('Module 3 | Environment Variables', () => {
  it('reads env vars configured in cypress.config.js', () => {
    // These are set under env: {} in cypress.config.js.
    const saucedemoUrl = Cypress.env('saucedemo_url')
    const apiUrl       = Cypress.env('api_url')

    expect(saucedemoUrl).to.eq('https://www.saucedemo.com')
    expect(apiUrl).to.eq('https://jsonplaceholder.typicode.com')
  })

  it('reads credentials from env vars', () => {
    const username = Cypress.env('standard_user')
    const password = Cypress.env('password')

    expect(username).to.be.a('string').and.not.be.empty
    expect(password).to.be.a('string').and.not.be.empty
  })

  it('reads ALL env vars as an object', () => {
    const allEnv = Cypress.env()
    // Cypress.env() returns a plain object — useful for debugging.
    expect(allEnv).to.be.an('object')
    expect(allEnv).to.have.property('saucedemo_url')
    expect(allEnv).to.have.property('api_url')
  })

  it('sets an env var at runtime (scoped to this test only)', () => {
    // Setting an env var in a test modifies it for the duration of the spec run,
    // NOT globally. Use this sparingly — it can make tests order-dependent.
    Cypress.env('temp_flag', true)
    expect(Cypress.env('temp_flag')).to.eq(true)
  })

  it('reads Cypress config values (not env vars) with Cypress.config()', () => {
    // Cypress.config() reads the top-level config (NOT the env: {} block).
    const viewport = Cypress.config('viewportWidth')
    const timeout  = Cypress.config('defaultCommandTimeout')

    expect(viewport).to.eq(1280)
    expect(timeout).to.eq(8000)
  })

  it('uses an env var to build a dynamic URL in a test', () => {
    // Practical example: combine baseUrl + env var to construct a full URL.
    const apiUrl = Cypress.env('api_url')

    cy.request(`${apiUrl}/posts/1`).then((res) => {
      expect(res.status).to.eq(200)
      expect(res.body.id).to.eq(1)
    })
  })

  // ── How to use cypress.env.json for secrets ──────────────────────────────
  // 1. Create a file called cypress.env.json at the project root:
  //    {
  //      "password": "my-real-secret-password"
  //    }
  // 2. Add cypress.env.json to .gitignore — NEVER commit secrets.
  // 3. Access with: Cypress.env('password')
  //
  // Values in cypress.env.json override values in cypress.config.js env: {}.
  //
  // For CI (GitHub Actions), pass secrets as --env flags:
  //   cypress run --env password=${{ secrets.MY_PASSWORD }}
})

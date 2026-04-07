// ─── Module 3 | Lesson 10: Network Interception & Stubbing ───────────────────
// cy.intercept() is one of Cypress's most powerful features. It lets you:
//   • Spy on real network requests (see what the app sends/receives)
//   • Stub responses (replace real API data with fixture data)
//   • Delay responses (test loading states and spinners)
//   • Assert that a specific request was made (verify the app called the right endpoint)
//
// Why stub?
//   • Tests run faster (no real network call)
//   • Tests are deterministic (you control the data)
//   • You can test edge cases (errors, empty states) without a backend that supports them
//
// Why spy without stubbing?
//   • Integration / contract tests — verify real backend behaviour
//   • Check that the frontend sends the correct request payload
//
// Key commands:
//   cy.intercept(method, pattern)           — spy on requests
//   cy.intercept(method, pattern, body)     — stub with static body
//   cy.intercept(method, pattern, fixture)  — stub with a fixture file
//   .as('alias')                            — give the intercept a name
//   cy.wait('@alias')                       — pause until the request fires
//   cy.wait('@alias').its('response.body')  — access request/response data

describe('Module 3 | Network Intercept & Stubbing', () => {
  // cy.intercept() only catches requests that originate from the browser.
  // cy.request() runs in Node.js and bypasses the browser network layer, so
  // cy.intercept() never sees it. We need a loaded page so we can trigger
  // requests via win.fetch() — that goes through the browser and IS intercepted.
  beforeEach(() => {
    cy.visit('/')
  })

  // ── Spying on Real Requests ──────────────────────────────────────────────────
  it('spies on a real API request and asserts request details', () => {
    // Set up the intercept BEFORE triggering the request (so nothing is missed).
    cy.intercept('GET', 'https://jsonplaceholder.typicode.com/posts/1').as('getPost')

    // Trigger the request from the browser context so cy.intercept() can see it.
    cy.window().then((win) => win.fetch('https://jsonplaceholder.typicode.com/posts/1'))

    // cy.wait() pauses test execution until the aliased request completes.
    cy.wait('@getPost').then((interception) => {
      // interception.request  → what the browser sent
      // interception.response → what the server returned
      expect(interception.response.statusCode).to.eq(200)
      expect(interception.response.body).to.have.property('id', 1)
    })
  })

  // ── Stubbing with a Static Body ──────────────────────────────────────────────
  it('stubs an API call with a static JSON body', () => {
    const stubbedResponse = {
      userId: 99,
      id: 1,
      title: 'Stubbed by Cypress!',
      body: 'This never hit the real server.',
    }

    cy.intercept(
      'GET',
      'https://jsonplaceholder.typicode.com/posts/1',
      stubbedResponse  // the third argument is the stub body
    ).as('stubbedPost')

    cy.window().then((win) => win.fetch('https://jsonplaceholder.typicode.com/posts/1'))

    cy.wait('@stubbedPost').then((interception) => {
      // The stub body should be returned instead of the real response.
      expect(interception.response.body.title).to.eq('Stubbed by Cypress!')
      expect(interception.response.body.userId).to.eq(99)
    })
  })

  // ── Stubbing with a Fixture File ─────────────────────────────────────────────
  it('stubs a response using a cypress/fixtures file', () => {
    // { fixture: 'filename' } tells Cypress to read the file and use it as the body.
    cy.intercept(
      'GET',
      'https://jsonplaceholder.typicode.com/posts/1',
      { fixture: 'api_responses' }  // loads cypress/fixtures/api_responses.json
    ).as('fixtureStub')

    cy.window().then((win) => win.fetch('https://jsonplaceholder.typicode.com/posts/1'))

    cy.wait('@fixtureStub').then((interception) => {
      // The fixture's "post" object is the stubbed response.
      // (Cypress returns the entire JSON file, so the body = the whole fixture)
      expect(interception.response.body).to.have.property('post')
    })
  })

  // ── Simulating an Error Response ─────────────────────────────────────────────
  it('stubs a server error to test the UI error state', () => {
    cy.intercept('GET', 'https://jsonplaceholder.typicode.com/posts/**', {
      statusCode: 500,
      body: { error: 'Internal Server Error' },
    }).as('serverError')

    cy.window().then((win) => win.fetch('https://jsonplaceholder.typicode.com/posts/1'))

    cy.wait('@serverError').then((interception) => {
      expect(interception.response.statusCode).to.eq(500)
    })
  })

  // ── Intercepting with a URL Pattern (glob/regex) ─────────────────────────────
  it('uses glob patterns to intercept multiple endpoints', () => {
    // '**' is a glob wildcard — matches any path segment(s).
    cy.intercept('GET', '**/posts/*').as('anyPost')

    cy.window().then((win) => win.fetch('https://jsonplaceholder.typicode.com/posts/5'))

    // cy.wait('@anyPost') resolves on the first matching request.
    cy.wait('@anyPost').its('response.statusCode').should('eq', 200)
  })

  // ── Verifying Request Count ──────────────────────────────────────────────────
  it('verifies how many times a request was made', () => {
    cy.intercept('GET', '**/posts**').as('posts')

    cy.window().then((win) => win.fetch('https://jsonplaceholder.typicode.com/posts'))
    cy.window().then((win) => win.fetch('https://jsonplaceholder.typicode.com/posts'))

    // Wait for both requests (call cy.wait() with the count option).
    cy.wait(['@posts', '@posts'])
  })
})

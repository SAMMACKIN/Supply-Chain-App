/// <reference types="cypress" />
// ***********************************************
// Custom commands for CSLA E2E tests
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Mock authentication for tests
Cypress.Commands.add('mockAuth', () => {
  cy.window().then((win) => {
    // Mock Supabase auth state
    win.localStorage.setItem('supabase.auth.token', JSON.stringify({
      currentSession: {
        access_token: 'mock-token',
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString()
        }
      }
    }))
  })
})

// Custom command to bypass authentication
Cypress.Commands.add('bypassAuth', () => {
  cy.intercept('GET', '**/auth/v1/user', {
    statusCode: 200,
    body: {
      id: 'test-user-id',
      email: 'test@example.com',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString()
    }
  })
  
  cy.intercept('GET', '**/rest/v1/user_profiles*', {
    statusCode: 200,
    body: [{
      id: 'test-profile-id',
      user_id: 'test-user-id',
      email: 'test@example.com',
      display_name: 'Test User',
      business_unit: 'Test Unit',
      role: 'TRADE',
      warehouse_ids: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }]
  })
})

// Custom command to navigate and wait for page load
Cypress.Commands.add('visitAndWait', (url: string) => {
  cy.visit(url)
  cy.get('[data-testid="page-loaded"]').should('be.visible')
})

// Custom command to create a call-off through the UI
Cypress.Commands.add('createCallOff', (options: {
  counterparty: string
  quotaBundles?: string
  callOffBundles: string
}) => {
  // Navigate to call-offs page
  cy.visit('/call-offs')
  
  // Click create button
  cy.get('[data-testid="create-call-off-button"]').click()
  
  // Step 1: Select counterparty
  cy.get('[data-testid="counterparty-select"]').click()
  cy.get(`[data-testid="counterparty-option-${options.counterparty}"]`).click()
  cy.get('[data-testid="wizard-next-button"]').click()
  
  // Step 2: Select quota
  if (options.quotaBundles) {
    cy.get(`[data-testid="quota-option-${options.quotaBundles}"]`).click()
  } else {
    cy.get('[data-testid="quota-select"] .MuiSelect-select').click()
    cy.get('.MuiMenuItem-root').first().click()
  }
  cy.get('[data-testid="wizard-next-button"]').click()
  
  // Step 3: Enter call-off details
  cy.get('[data-testid="bundle-qty-input"]').clear().type(options.callOffBundles)
  cy.get('[data-testid="create-call-off-submit"]').click()
  
  // Wait for success message
  cy.contains('Call-off created successfully').should('be.visible')
})

// Custom command to check if call-off exists in list
Cypress.Commands.add('verifyCallOffInList', (expectedData: {
  counterparty?: string
  bundles?: string
  status?: string
}) => {
  cy.visit('/call-offs')
  
  if (expectedData.counterparty) {
    cy.contains(expectedData.counterparty).should('be.visible')
  }
  if (expectedData.bundles) {
    cy.contains(`${expectedData.bundles} bundles`).should('be.visible')
  }
  if (expectedData.status) {
    cy.get(`[data-testid="status-chip-${expectedData.status.toLowerCase()}"]`).should('be.visible')
  }
})

declare global {
  namespace Cypress {
    interface Chainable {
      mockAuth(): Chainable<void>
      bypassAuth(): Chainable<void>
      visitAndWait(url: string): Chainable<void>
      createCallOff(options: {
        counterparty: string
        quotaBundles?: string
        callOffBundles: string
      }): Chainable<void>
      verifyCallOffInList(expectedData: {
        counterparty?: string
        bundles?: string
        status?: string
      }): Chainable<void>
    }
  }
}
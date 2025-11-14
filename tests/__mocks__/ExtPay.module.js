/**
 * Mock ExtPay module for testing
 * Provides lightweight fake implementation without browser dependencies
 */

const mockUser = {
  paid: false,
  trialStartedAt: null,
  installedAt: null,
  email: null
};

const mockExtPay = {
  getUser: jest.fn(() => Promise.resolve(mockUser)),
  getPlans: jest.fn(() => Promise.resolve([])),
  openPaymentPage: jest.fn(),
  openLoginPage: jest.fn(),
  openTrialPage: jest.fn(),
  startBackground: jest.fn(),
  onPaid: {
    addListener: jest.fn()
  }
};

const ExtPay = jest.fn(() => mockExtPay);

// Add methods to the constructor itself for easy access
ExtPay.mockUser = mockUser;
ExtPay.mockExtPay = mockExtPay;

export default ExtPay;

import '@testing-library/jest-dom';
import { configureAxe } from 'jest-axe';

configureAxe({
  rules: {
    region: { enabled: false },
  },
});

Object.defineProperty(window, 'scrollIntoView', {
  value: jest.fn(),
  writable: true,
});

Object.defineProperty(Element.prototype, 'scrollIntoView', {
  value: jest.fn(),
  writable: true,
});

global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

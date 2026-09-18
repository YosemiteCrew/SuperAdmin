import '@testing-library/jest-dom';
import { configureAxe } from 'jest-axe';

configureAxe({
  rules: {
    region: { enabled: false },
  },
});

if (globalThis.window !== undefined) {
  Object.defineProperty(globalThis.window, 'scrollIntoView', {
    value: jest.fn(),
    writable: true,
  });
}

if (typeof Element !== 'undefined') {
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    value: jest.fn(),
    writable: true,
  });
}

type ObserverGlobals = {
  ResizeObserver: typeof ResizeObserver;
  IntersectionObserver: typeof IntersectionObserver;
};
const observerGlobals = globalThis as unknown as ObserverGlobals;
observerGlobals.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));
observerGlobals.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// jsdom doesn't implement HTMLDialogElement.showModal / close — polyfill so
// components that use <dialog> can be exercised in tests.
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
}
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.close) {
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
}

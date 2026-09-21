import '@testing-library/jest-dom';
import { configureAxe } from 'jest-axe';
import { TextEncoder } from 'node:util';

// jsdom omits TextEncoder, while Prisma 7's PostgreSQL adapter loads pg's SASL
// helpers even when a test never opens a database connection.
if (typeof globalThis.TextEncoder === 'undefined') {
  Object.defineProperty(globalThis, 'TextEncoder', { value: TextEncoder });
}

// @superadmin/database builds its pg adapter when the module is imported, so
// importing it needs a connection string to parse. A few suites reach it through
// a server action they are testing for other reasons, and before the Prisma 7
// move they did so without one. ci-affected.yaml already exports a placeholder
// for every job, so default rather than assign: this makes a local run behave
// like CI instead of depending on whatever is in the shell. No connection is
// opened; a suite that cares about the value sets its own.
process.env.DATABASE_URL ??= 'postgresql://localhost:5432/placeholder?schema=superadmin';

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

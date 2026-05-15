// Empty stub returned by tests/setup/server-only-shim.cjs in place of the
// real `server-only` package. The real package guards production bundles from
// leaking server modules to the client; under `node --test` we don't need
// (and can't satisfy) that guard.
module.exports = {};

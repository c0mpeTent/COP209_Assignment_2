import test from "node:test";
import assert from "node:assert/strict";

// Test basic imports first
try {
  const app = await import('../main.js');
  console.log('App imported successfully');
  assert.ok(app.default);
} catch (error) {
  console.error('Failed to import app:', error);
  throw error;
}

test('app import', () => {
  assert.ok(true, 'Basic import test');
});

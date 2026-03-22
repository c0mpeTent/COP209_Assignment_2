
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Starting Backend API Tests...\n');

// Set test environment variables
process.env.NODE_ENV = 'test';

// Run the test command
const testProcess = spawn('npm', ['test'], {
  cwd: join(__dirname, '..'),
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'test'
  }
});

testProcess.on('close', (code) => {
  if (code === 0) {
    console.log('\n All tests passed successfully!');
  } else {
    console.log(`\n Tests failed with exit code ${code}`);
    process.exit(code);
  }
});

testProcess.on('error', (error) => {
  console.error(' Error running tests:', error);
  process.exit(1);
});

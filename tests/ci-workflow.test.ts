import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('GitHub Actions CI/CD Pipeline Configuration (IMP-007)', () => {
  const ciPath = path.resolve(__dirname, '../.github/workflows/ci.yml');

  it('contains .github/workflows/ci.yml workflow file', () => {
    expect(fs.existsSync(ciPath)).toBe(true);
  });

  it('validates workflow configuration, concurrency, triggers and CI: true environment', () => {
    const content = fs.readFileSync(ciPath, 'utf8');

    // Trigger on push and pull_request to main
    expect(content).toMatch(/push:\s+branches:\s*\[?\s*main\s*\]?/);
    expect(content).toMatch(/pull_request:\s+branches:\s*\[?\s*main\s*\]?/);

    // Concurrency control to cancel redundant in-progress runs
    expect(content).toContain('concurrency:');
    expect(content).toContain('cancel-in-progress: true');

    // Runner environment and non-interactive CI env
    expect(content).toContain('ubuntu-latest');
    expect(content).toMatch(/CI:\s*['"]?true['"]?/i);

    // Steps verification
    expect(content).toContain('actions/checkout@v4');
    expect(content).toContain('actions/setup-node@v4');
    expect(content).toContain('npm ci');
    expect(content).toContain('npm run lint');
    expect(content).toContain('npm test');
    expect(content).toContain('npm run build');
  });
});


import { describe, it, expect } from 'vitest';
import { parseSemver, compareSemver, isNewerVersion, updateService } from '../../api/services/update.service';

describe('Update Service - SemVer Comparison', () => {
  it('parses standard semver strings with or without v prefix', () => {
    expect(parseSemver('2.5.1')).toEqual([2, 5, 1]);
    expect(parseSemver('v2.5.1')).toEqual([2, 5, 1]);
    expect(parseSemver('V3.0.0')).toEqual([3, 0, 0]);
    expect(parseSemver('v1.0')).toEqual([1, 0, 0]);
  });

  it('correctly compares version numbers', () => {
    // Newer major
    expect(compareSemver('3.0.0', '2.5.1')).toBeGreaterThan(0);
    // Newer minor
    expect(compareSemver('2.6.0', '2.5.1')).toBeGreaterThan(0);
    // Newer patch
    expect(compareSemver('2.5.2', '2.5.1')).toBeGreaterThan(0);

    // Equal versions
    expect(compareSemver('2.5.1', 'v2.5.1')).toBe(0);
    expect(compareSemver('v2.5.1', '2.5.1')).toBe(0);

    // Older versions
    expect(compareSemver('2.5.0', '2.5.1')).toBeLessThan(0);
    expect(compareSemver('1.9.9', '2.5.1')).toBeLessThan(0);
  });

  it('identifies when an update is newer than current', () => {
    expect(isNewerVersion('v2.5.2', '2.5.1')).toBe(true);
    expect(isNewerVersion('2.6.0', '2.5.1')).toBe(true);
    expect(isNewerVersion('3.0.0', '2.5.1')).toBe(true);

    expect(isNewerVersion('v2.5.1', '2.5.1')).toBe(false);
    expect(isNewerVersion('2.5.0', '2.5.1')).toBe(false);
    expect(isNewerVersion('2.4.9', '2.5.1')).toBe(false);
  });

  it('never flags v3.5.2 or v3.5.3 as an update when running v3.5.3', () => {
    expect(isNewerVersion('v3.5.2', '3.5.3')).toBe(false);
    expect(isNewerVersion('3.5.2', '3.5.3')).toBe(false);
    expect(isNewerVersion('v3.5.3', '3.5.3')).toBe(false);
    expect(isNewerVersion('3.5.3', '3.5.3')).toBe(false);
    expect(isNewerVersion('v3.5.4', '3.5.3')).toBe(true);
  });

  it('allows setting runtime version dynamically via setCurrentVersion', () => {
    updateService.setCurrentVersion('v3.5.3');
    expect(updateService.getCurrentVersion()).toBe('3.5.3');

    updateService.setCurrentVersion('3.6.0');
    expect(updateService.getCurrentVersion()).toBe('3.6.0');

    // Reset back to 3.5.3
    updateService.setCurrentVersion('3.5.3');
    expect(updateService.getCurrentVersion()).toBe('3.5.3');
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { getOverridesRegistry } from '../overrides-registry';
import { RequestOverride } from '../../shared/client';

describe('OverridesRegistry', () => {
  let registry: ReturnType<typeof getOverridesRegistry>;

  beforeEach(() => {
    registry = getOverridesRegistry();
    registry.setOverrides([]);
  });

  it('should return the same instance', () => {
    const registry1 = getOverridesRegistry();
    const registry2 = getOverridesRegistry();
    expect(registry1).toBe(registry2);
  });

  it('should set and retrieve overrides', () => {
    const url = 'http://example.com';
    const override: RequestOverride = {
      responseCode: 200,
      responseContentType: 'application/json',
      responseBody: '{}',
    };

    registry.setOverrides([[url, override]]);

    expect(registry.getOverrideForUrl(url)).toBe(override);
  });

  it('should return undefined for non-existent override', () => {
    expect(registry.getOverrideForUrl('http://example.com')).toBeUndefined();
  });

  it('should replace overrides when setOverrides is called', () => {
    const url1 = 'http://example.com/1';
    const override1: RequestOverride = { responseCode: 200, responseContentType: 'text/plain', responseBody: '1' };
    
    const url2 = 'http://example.com/2';
    const override2: RequestOverride = { responseCode: 200, responseContentType: 'text/plain', responseBody: '2' };

    registry.setOverrides([[url1, override1]]);
    expect(registry.getOverrideForUrl(url1)).toBe(override1);

    registry.setOverrides([[url2, override2]]);
    expect(registry.getOverrideForUrl(url1)).toBeUndefined();
    expect(registry.getOverrideForUrl(url2)).toBe(override2);
  });
});

import { describe, it, expect } from 'vitest';
import { checkAutoModTriggers } from '../utils/autoModHelpers';
import { AutoModTrigger } from '../stores/autoModerationStore';

describe('autoModHelpers', () => {
  describe('checkAutoModTriggers', () => {
    it('should return false for empty message', () => {
      const triggers: AutoModTrigger[] = [
        { id: '1', type: 'word', value: 'test', enabled: true }
      ];
      expect(checkAutoModTriggers('', triggers)).toBe(false);
    });

    it('should return false for empty triggers', () => {
      expect(checkAutoModTriggers('test message', [])).toBe(false);
    });

    it('should return false when all triggers are disabled', () => {
      const triggers: AutoModTrigger[] = [
        { id: '1', type: 'word', value: 'test', enabled: false }
      ];
      expect(checkAutoModTriggers('test message', triggers)).toBe(false);
    });

    it('should match exact word (case insensitive)', () => {
      const triggers: AutoModTrigger[] = [
        { id: '1', type: 'word', value: 'spoiler', enabled: true }
      ];
      expect(checkAutoModTriggers('This is a spoiler', triggers)).toBe(true);
      expect(checkAutoModTriggers('This is a SPOILER', triggers)).toBe(true);
      expect(checkAutoModTriggers('This is a Spoiler', triggers)).toBe(true);
      expect(checkAutoModTriggers('spoiler', triggers)).toBe(true);
    });

    it('should not match partial word', () => {
      const triggers: AutoModTrigger[] = [
        { id: '1', type: 'word', value: 'test', enabled: true }
      ];
      expect(checkAutoModTriggers('testing', triggers)).toBe(false);
      expect(checkAutoModTriggers('contest', triggers)).toBe(false);
      expect(checkAutoModTriggers('attest', triggers)).toBe(false);
      expect(checkAutoModTriggers('testable', triggers)).toBe(false);
    });

    it('should match word with boundaries', () => {
      const triggers: AutoModTrigger[] = [
        { id: '1', type: 'word', value: 'test', enabled: true }
      ];
      expect(checkAutoModTriggers('test', triggers)).toBe(true);
      expect(checkAutoModTriggers('this is a test', triggers)).toBe(true);
      expect(checkAutoModTriggers('test message', triggers)).toBe(true);
      expect(checkAutoModTriggers('message test', triggers)).toBe(true);
    });

    it('should match regex pattern', () => {
      const triggers: AutoModTrigger[] = [
        { id: '1', type: 'regex', value: 'https?://', enabled: true }
      ];
      expect(checkAutoModTriggers('Check this http://example.com', triggers)).toBe(true);
      expect(checkAutoModTriggers('Check this https://example.com', triggers)).toBe(true);
      expect(checkAutoModTriggers('No link here', triggers)).toBe(false);
    });

    it('should match multiple patterns', () => {
      const triggers: AutoModTrigger[] = [
        { id: '1', type: 'word', value: 'spam', enabled: true },
        { id: '2', type: 'word', value: 'scam', enabled: true }
      ];
      expect(checkAutoModTriggers('This is spam', triggers)).toBe(true);
      expect(checkAutoModTriggers('This is scam', triggers)).toBe(true);
      expect(checkAutoModTriggers('This is normal', triggers)).toBe(false);
    });

    it('should handle invalid regex gracefully', () => {
      const triggers: AutoModTrigger[] = [
        { id: '1', type: 'regex', value: '[invalid(', enabled: true }
      ];
      // Should not throw, just return false
      expect(() => checkAutoModTriggers('test', triggers)).not.toThrow();
      expect(checkAutoModTriggers('test', triggers)).toBe(false);
    });

    it('should match complex regex patterns', () => {
      const triggers: AutoModTrigger[] = [
        { id: '1', type: 'regex', value: '(buy|sell|cheap)', enabled: true }
      ];
      expect(checkAutoModTriggers('buy now!', triggers)).toBe(true);
      expect(checkAutoModTriggers('sell cheap', triggers)).toBe(true);
      expect(checkAutoModTriggers('normal message', triggers)).toBe(false);
    });

    it('should match caps pattern', () => {
      const triggers: AutoModTrigger[] = [
        { id: '1', type: 'regex', value: '[A-Z]{10,}', enabled: true }
      ];
      expect(checkAutoModTriggers('THISISALLCAPS', triggers)).toBe(true);
      expect(checkAutoModTriggers('This is normal', triggers)).toBe(false);
    });

    it('should only check enabled triggers', () => {
      const triggers: AutoModTrigger[] = [
        { id: '1', type: 'word', value: 'spam', enabled: false },
        { id: '2', type: 'word', value: 'test', enabled: true }
      ];
      expect(checkAutoModTriggers('This is spam', triggers)).toBe(false);
      expect(checkAutoModTriggers('This is test', triggers)).toBe(true);
    });
  });
});

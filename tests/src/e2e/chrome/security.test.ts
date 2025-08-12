import { test, expect } from '@playwright/test';

test.describe('Chrome Extension Security Tests', () => {
  test.describe('Malicious File Detection', () => {
    test('should detect executable content in text files', async ({ page }) => {
      await page.goto('http://localhost:8080');
      
      // Mock executable content detection
      await page.evaluate(() => {
        (window as any).securityScanResult = null;
        
        const detectExecutableContent = (content: string) => {
          const executablePatterns = [
            /MZ[\x00-\xFF]{2,}/, // DOS executable header
            /\x7FELF/, // ELF executable header
            /#!/, // Shebang
            /<script[^>]*>.*<\/script>/i, // Script tags
            /eval\s*\(/, // eval() calls
            /Function\s*\(/, // Function constructor
            /document\.write/, // document.write
            /innerHTML\s*=/, // innerHTML assignment
          ];
          
          const matches = executablePatterns.filter(pattern => pattern.test(content));
          
          return {
            isMalicious: matches.length > 0,
            detectedPatterns: matches.map(pattern => pattern.source),
            riskScore: matches.length * 0.3,
            reasons: matches.length > 0 ? ['Executable content detected'] : []
          };
        };
        
        (window as any).detectExecutableContent = detectExecutableContent;
      });

      // Test malicious content
      const maliciousContent = `
        #!/bin/bash
        echo "This is a shell script"
        <script>alert('XSS')</script>
        eval("console.log('malicious')");
      `;

      // Trigger security scan
      const scanResult = await page.evaluate((content) => {
        return (window as any).detectExecutableContent(content);
      }, maliciousContent);

      // Verify malicious content detection
      expect(scanResult.isMalicious).toBe(true);
      expect(scanResult.detectedPatterns.length).toBeGreaterThan(0);
      expect(scanResult.riskScore).toBeGreaterThan(0.5);
      expect(scanResult.reasons).toContain('Executable content detected');
    });

    test('should detect obfuscated content', async ({ page }) => {
      await page.goto('http://localhost:8080');
      
      // Mock obfuscation detection
      await page.evaluate(() => {
        (window as any).obfuscationResult = null;
        
        const detectObfuscation = (content: string) => {
          // Check for common obfuscation patterns
          const obfuscationPatterns = [
            /\\x[0-9A-Fa-f]{2}/g, // Hex encoding
            /%[0-9A-Fa-f]{2}/g, // URL encoding
            /[\\x00-\\x1F]{3,}/g, // Control characters
            /[\\x7F-\\xFF]{3,}/g, // Extended ASCII
            /eval\s*\(/g, // eval() calls
            /Function\s*\(/g, // Function constructor
            /document\.write/g, // document.write
            /innerHTML\s*=/g, // innerHTML assignment
          ];
          
          const detectedPatterns = obfuscationPatterns.filter(pattern => 
            pattern.test(content)
          );
          
          const isObfuscated = detectedPatterns.length > 0;
          
          return {
            isObfuscated,
            detectedPatterns: detectedPatterns.map(p => p.source),
            riskScore: isObfuscated ? 0.8 : 0.1,
            reasons: isObfuscated ? ['Obfuscation patterns detected'] : []
          };
        };
        
        (window as any).detectObfuscation = detectObfuscation;
      });

      // Test obfuscated content
      const obfuscatedContent = '\\x7F\\x1F\\x8B\\x08\\x00\\x00\\x00\\x00\\x00\\x00\\x03\\xCB\\x48\\xCD\\xC9\\xC9\\x57\\x28\\xCF\\x2F\\xCA\\x49\\x01\\x00';

      // Trigger obfuscation detection
      const result = await page.evaluate((content) => {
        return (window as any).detectObfuscation(content);
      }, obfuscatedContent);

      // Verify obfuscation detection
      expect(result.isObfuscated).toBe(true);
      expect(result.detectedPatterns.length).toBeGreaterThan(0);
      expect(result.riskScore).toBeGreaterThan(0.5);
      expect(result.reasons).toContain('Obfuscation patterns detected');
    });

    test('should detect banned phrases and patterns', async ({ page }) => {
      await page.goto('http://localhost:8080');
      
      // Mock banned phrase detection
      await page.evaluate(() => {
        (window as any).bannedPhraseResult = null;
        
        const detectBannedPhrases = (content: string) => {
          const bannedPhrases = [
            'password',
            'credit card',
            'social security',
            'ssn',
            'bank account',
            'private key',
            'secret',
            'confidential'
          ];
          
          const detectedPhrases = bannedPhrases.filter(phrase => 
            content.toLowerCase().includes(phrase.toLowerCase())
          );
          
          return {
            hasBannedPhrases: detectedPhrases.length > 0,
            detectedPhrases,
            riskScore: detectedPhrases.length * 0.2,
            reasons: detectedPhrases.length > 0 ? ['Banned phrases detected'] : []
          };
        };
        
        (window as any).detectBannedPhrases = detectBannedPhrases;
      });

      // Test content with banned phrases
      const sensitiveContent = `
        My password is: secret123
        Credit card: 1234-5678-9012-3456
        SSN: 123-45-6789
        Bank account: 987654321
      `;

      // Trigger banned phrase detection
      const result = await page.evaluate((content) => {
        return (window as any).detectBannedPhrases(content);
      }, sensitiveContent);

      // Verify banned phrase detection
      expect(result.hasBannedPhrases).toBe(true);
      expect(result.detectedPhrases.length).toBeGreaterThan(0);
      expect(result.riskScore).toBeGreaterThan(0.5);
      expect(result.reasons).toContain('Banned phrases detected');
    });
  });

  test.describe('Input Validation and Sanitization', () => {
    test('should validate file extensions', async ({ page }) => {
      await page.goto('http://localhost:8080');
      
      // Mock file extension validation
      await page.evaluate(() => {
        (window as any).extensionValidationResult = null;
        
        const validateFileExtension = (filename: string) => {
          const allowedExtensions = ['.txt', '.csv', '.json', '.log'];
          const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
          
          const isValid = allowedExtensions.includes(extension);
          
          return {
            isValid,
            extension,
            allowedExtensions,
            riskScore: isValid ? 0.1 : 0.9,
            reasons: isValid ? [] : ['Unsupported file extension']
          };
        };
        
        (window as any).validateFileExtension = validateFileExtension;
      });

      // Test various file extensions
      const testCases = [
        { filename: 'document.txt', expectedValid: true },
        { filename: 'data.csv', expectedValid: true },
        { filename: 'config.json', expectedValid: true },
        { filename: 'script.js', expectedValid: false },
        { filename: 'executable.exe', expectedValid: false },
        { filename: 'archive.zip', expectedValid: false }
      ];

      for (const testCase of testCases) {
        const result = await page.evaluate((filename) => {
          return (window as any).validateFileExtension(filename);
        }, testCase.filename);

        expect(result.isValid).toBe(testCase.expectedValid);
        if (!testCase.expectedValid) {
          expect(result.riskScore).toBeGreaterThan(0.5);
          expect(result.reasons).toContain('Unsupported file extension');
        }
      }
    });

    test('should sanitize file content', async ({ page }) => {
      await page.goto('http://localhost:8080');
      
      // Mock content sanitization
      await page.evaluate(() => {
        (window as any).sanitizationResult = null;
        
        const sanitizeContent = (content: string) => {
          // Remove potentially dangerous patterns
          let sanitized = content;
          
          // Remove script tags
          sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '');
          
          // Remove eval() calls
          sanitized = sanitized.replace(/eval\s*\([^)]*\)/gi, '');
          
          // Remove Function constructor calls
          sanitized = sanitized.replace(/Function\s*\([^)]*\)/gi, '');
          
          // Remove document.write calls
          sanitized = sanitized.replace(/document\.write\s*\([^)]*\)/gi, '');
          
          const wasModified = sanitized !== content;
          
          return {
            originalContent: content,
            sanitizedContent: sanitized,
            wasModified,
            removedPatterns: wasModified ? ['Potentially dangerous patterns'] : [],
            riskScore: wasModified ? 0.7 : 0.1
          };
        };
        
        (window as any).sanitizeContent = sanitizeContent;
      });

      // Test content with dangerous patterns
      const dangerousContent = `
        Normal text content
        <script>alert('XSS')</script>
        More normal text
        eval("console.log('malicious')");
        <script>document.write('injection')</script>
      `;

      const result = await page.evaluate((content) => {
        return (window as any).sanitizeContent(content);
      }, dangerousContent);

      // Verify sanitization
      expect(result.wasModified).toBe(true);
      expect(result.sanitizedContent).not.toContain('<script>');
      expect(result.sanitizedContent).not.toContain('eval(');
      expect(result.sanitizedContent).not.toContain('document.write');
      expect(result.riskScore).toBeGreaterThan(0.5);
      expect(result.removedPatterns).toContain('Potentially dangerous patterns');
    });

    test('should validate file size limits', async ({ page }) => {
      await page.goto('http://localhost:8080');
      
      // Mock file size validation
      await page.evaluate(() => {
        (window as any).sizeValidationResult = null;
        
        const validateFileSize = (size: number) => {
          const maxSize = 100 * 1024 * 1024; // 100MB
          const isWithinLimit = size <= maxSize;
          
          return {
            isValid: isWithinLimit,
            fileSize: size,
            maxSize,
            sizeInMB: size / (1024 * 1024),
            riskScore: isWithinLimit ? 0.1 : 0.9,
            reasons: isWithinLimit ? [] : ['File size exceeds limit']
          };
        };
        
        (window as any).validateFileSize = validateFileSize;
      });

      // Test various file sizes
      const testCases = [
        { size: 1024, expectedValid: true }, // 1KB
        { size: 1024 * 1024, expectedValid: true }, // 1MB
        { size: 50 * 1024 * 1024, expectedValid: true }, // 50MB
        { size: 100 * 1024 * 1024, expectedValid: true }, // 100MB (exact limit)
        { size: 101 * 1024 * 1024, expectedValid: false }, // 101MB (over limit)
        { size: 200 * 1024 * 1024, expectedValid: false } // 200MB (way over limit)
      ];

      for (const testCase of testCases) {
        const result = await page.evaluate((size) => {
          return (window as any).validateFileSize(size);
        }, testCase.size);

        expect(result.isValid).toBe(testCase.expectedValid);
        expect(result.fileSize).toBe(testCase.size);
        expect(result.maxSize).toBe(100 * 1024 * 1024);
        
        if (!testCase.expectedValid) {
          expect(result.riskScore).toBeGreaterThan(0.5);
          expect(result.reasons).toContain('File size exceeds limit');
        }
      }
    });
  });

  test.describe('Security Edge Cases', () => {
    test('should handle null byte injection attempts', async ({ page }) => {
      await page.goto('http://localhost:8080');
      
      // Mock null byte detection
      await page.evaluate(() => {
        (window as any).nullByteResult = null;
        
        const detectNullBytes = (content: string) => {
          const hasNullBytes = content.includes('\x00');
          const nullByteCount = (content.match(/\x00/g) || []).length;
          
          return {
            hasNullBytes,
            nullByteCount,
            riskScore: hasNullBytes ? 0.8 : 0.1,
            reasons: hasNullBytes ? ['Null byte injection detected'] : []
          };
        };
        
        (window as any).detectNullBytes = detectNullBytes;
      });

      // Test null byte injection
      const maliciousContent = 'normal\x00content\x00with\x00nulls';

      const result = await page.evaluate((content) => {
        return (window as any).detectNullBytes(content);
      }, maliciousContent);

      // Verify null byte detection
      expect(result.hasNullBytes).toBe(true);
      expect(result.nullByteCount).toBe(3);
      expect(result.riskScore).toBeGreaterThan(0.5);
      expect(result.reasons).toContain('Null byte injection detected');
    });

    test('should handle path traversal attempts', async ({ page }) => {
      await page.goto('http://localhost:8080');
      
      // Mock path traversal detection
      await page.evaluate(() => {
        (window as any).pathTraversalResult = null;
        
        const detectPathTraversal = (filename: string) => {
          const traversalPatterns = [
            /\.\.\//, // ../
            /\.\.\\/, // ..\
            /\/etc\/passwd/, // Unix system files
            /\/windows\/system32/, // Windows system files
            /c:\\windows/, // Windows drive paths
          ];
          
          const detectedPatterns = traversalPatterns.filter(pattern => 
            pattern.test(filename)
          );
          
          return {
            hasPathTraversal: detectedPatterns.length > 0,
            detectedPatterns: detectedPatterns.map(p => p.source),
            riskScore: detectedPatterns.length > 0 ? 0.9 : 0.1,
            reasons: detectedPatterns.length > 0 ? ['Path traversal attempt detected'] : []
          };
        };
        
        (window as any).detectPathTraversal = detectPathTraversal;
      });

      // Test path traversal attempts
      const maliciousFilenames = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32\\config',
        'normal.txt',
        'data/../../../etc/shadow',
        'c:\\windows\\system32\\drivers\\etc\\hosts'
      ];

      for (const filename of maliciousFilenames) {
        const result = await page.evaluate((name) => {
          return (window as any).detectPathTraversal(name);
        }, filename);

        if (filename.includes('..') || filename.includes('/etc/') || filename.includes('\\windows\\')) {
          expect(result.hasPathTraversal).toBe(true);
          expect(result.riskScore).toBeGreaterThan(0.5);
          expect(result.reasons).toContain('Path traversal attempt detected');
        } else {
          expect(result.hasPathTraversal).toBe(false);
          expect(result.riskScore).toBeLessThan(0.5);
        }
      }
    });

    test('should handle encoding-based attacks', async ({ page }) => {
      await page.goto('http://localhost:8080');
      
      // Mock encoding attack detection
      await page.evaluate(() => {
        (window as any).encodingAttackResult = null;
        
        const detectEncodingAttacks = (content: string) => {
          const encodingPatterns = [
            /%[0-9A-Fa-f]{2}/g, // URL encoding
            /\\x[0-9A-Fa-f]{2}/g, // Hex encoding
            /\\u[0-9A-Fa-f]{4}/g, // Unicode encoding
            /&#[0-9]+;/g, // HTML entity encoding
          ];
          
          const detectedEncodings = encodingPatterns.filter(pattern => 
            pattern.test(content)
          );
          
          // Check for suspicious encoded content
          const hasSuspiciousEncoding = detectedEncodings.length > 0 && 
            (content.includes('%3Cscript%3E') || // <script> URL encoded
             content.includes('\\x3Cscript\\x3E') || // <script> hex encoded
             content.includes('&#60;script&#62;')); // <script> HTML encoded
          
          return {
            hasEncodingAttacks: hasSuspiciousEncoding,
            detectedEncodings: detectedEncodings.map(p => p.source),
            riskScore: hasSuspiciousEncoding ? 0.8 : 0.1,
            reasons: hasSuspiciousEncoding ? ['Encoding-based attack detected'] : []
          };
        };
        
        (window as any).detectEncodingAttacks = detectEncodingAttacks;
      });

      // Test encoding attacks
      const encodingAttackContent = `
        Normal text
        %3Cscript%3Ealert('XSS')%3C/script%3E
        \\x3Cscript\\x3Econsole.log('attack')\\x3C/script\\x3E
        &#60;script&#62;document.write('injection')&#60;/script&#62;
      `;

      const result = await page.evaluate((content) => {
        return (window as any).detectEncodingAttacks(content);
      }, encodingAttackContent);

      // Verify encoding attack detection
      expect(result.hasEncodingAttacks).toBe(true);
      expect(result.detectedEncodings.length).toBeGreaterThan(0);
      expect(result.riskScore).toBeGreaterThan(0.5);
      expect(result.reasons).toContain('Encoding-based attack detected');
    });

    test('should handle buffer overflow attempts', async ({ page }) => {
      await page.goto('http://localhost:8080');
      
      // Mock buffer overflow detection
      await page.evaluate(() => {
        (window as any).bufferOverflowResult = null;
        
        const detectBufferOverflow = (content: string) => {
          // Check for patterns that might indicate buffer overflow attempts
          const overflowPatterns = [
            /A{1000,}/, // Long sequences of 'A' characters
            /\\x41{1000,}/, // Long sequences of hex 'A'
            /%41{1000,}/, // Long sequences of URL-encoded 'A'
            /[\\x00-\\x1F]{100,}/, // Long sequences of control characters
          ];
          
          const detectedPatterns = overflowPatterns.filter(pattern => 
            pattern.test(content)
          );
          
          return {
            hasBufferOverflow: detectedPatterns.length > 0,
            detectedPatterns: detectedPatterns.map(p => p.source),
            contentLength: content.length,
            riskScore: detectedPatterns.length > 0 ? 0.7 : 0.1,
            reasons: detectedPatterns.length > 0 ? ['Buffer overflow attempt detected'] : []
          };
        };
        
        (window as any).detectBufferOverflow = detectBufferOverflow;
      });

      // Test buffer overflow attempts
      const overflowContent = 'A'.repeat(2000) + '\\x41'.repeat(500) + '\\x00'.repeat(200);

      const result = await page.evaluate((content) => {
        return (window as any).detectBufferOverflow(content);
      }, overflowContent);

      // Verify buffer overflow detection
      expect(result.hasBufferOverflow).toBe(true);
      expect(result.detectedPatterns.length).toBeGreaterThan(0);
      expect(result.contentLength).toBeGreaterThan(1000);
      expect(result.riskScore).toBeGreaterThan(0.5);
      expect(result.reasons).toContain('Buffer overflow attempt detected');
    });
  });

  test.describe('Security Response and Mitigation', () => {
    test('should quarantine suspicious files', async ({ page }) => {
      await page.goto('http://localhost:8080');
      
      // Mock file quarantine system
      await page.evaluate(() => {
        (window as any).quarantineResult = null;
        
        const quarantineFile = (file: any, reason: string) => {
          const quarantineId = 'quarantine_' + Date.now();
          
          (window as any).quarantineResult = {
            quarantined: true,
            quarantineId,
            originalFile: file.name,
            reason,
            timestamp: Date.now(),
            riskLevel: 'HIGH',
            actions: ['BLOCKED', 'QUARANTINED', 'LOGGED']
          };
        };
        
        (window as any).quarantineFile = quarantineFile;
      });

      // Simulate quarantining a suspicious file
      await page.evaluate(() => {
        const suspiciousFile = {
          name: 'malicious.exe',
          size: 1024,
          type: 'application/x-executable'
        };
        
        (window as any).quarantineFile(suspiciousFile, 'Executable file detected');
      });

      // Verify quarantine action
      const result = await page.evaluate(() => {
        return (window as any).quarantineResult;
      });

      expect(result.quarantined).toBe(true);
      expect(result.quarantineId).toMatch(/^quarantine_\d+$/);
      expect(result.originalFile).toBe('malicious.exe');
      expect(result.reason).toBe('Executable file detected');
      expect(result.riskLevel).toBe('HIGH');
      expect(result.actions).toContain('BLOCKED');
      expect(result.actions).toContain('QUARANTINED');
    });

    test('should log security events', async ({ page }) => {
      await page.goto('http://localhost:8080');
      
      // Mock security event logging
      await page.evaluate(() => {
        (window as any).securityLog = [];
        
        const logSecurityEvent = (event: any) => {
          (window as any).securityLog.push({
            ...event,
            timestamp: Date.now(),
            sessionId: 'session_' + Math.random().toString(36).substr(2, 9)
          });
        };
        
        (window as any).logSecurityEvent = logSecurityEvent;
      });

      // Simulate various security events
      await page.evaluate(() => {
        const logger = (window as any).logSecurityEvent;
        
        logger({
          type: 'MALICIOUS_FILE_DETECTED',
          severity: 'HIGH',
          filename: 'virus.exe',
          reason: 'Executable file blocked'
        });
        
        logger({
          type: 'SIZE_LIMIT_EXCEEDED',
          severity: 'MEDIUM',
          filename: 'large.zip',
          size: 150 * 1024 * 1024
        });
        
        logger({
          type: 'PATH_TRAVERSAL_ATTEMPT',
          severity: 'HIGH',
          filename: '../../../etc/passwd',
          reason: 'Path traversal detected'
        });
      });

      // Verify security logging
      const log = await page.evaluate(() => {
        return (window as any).securityLog;
      });

      expect(log.length).toBe(3);
      
      const maliciousEvent = log.find((e: any) => e.type === 'MALICIOUS_FILE_DETECTED');
      const sizeEvent = log.find((e: any) => e.type === 'SIZE_LIMIT_EXCEEDED');
      const traversalEvent = log.find((e: any) => e.type === 'PATH_TRAVERSAL_ATTEMPT');
      
      expect(maliciousEvent).toBeTruthy();
      expect(maliciousEvent.severity).toBe('HIGH');
      expect(maliciousEvent.filename).toBe('virus.exe');
      
      expect(sizeEvent).toBeTruthy();
      expect(sizeEvent.severity).toBe('MEDIUM');
      expect(sizeEvent.size).toBe(150 * 1024 * 1024);
      
      expect(traversalEvent).toBeTruthy();
      expect(traversalEvent.severity).toBe('HIGH');
      expect(traversalEvent.filename).toBe('../../../etc/passwd');
      
      // Verify all events have required fields
      log.forEach((event: any) => {
        expect(event.timestamp).toBeDefined();
        expect(event.sessionId).toMatch(/^session_[a-z0-9]+$/);
      });
    });

    test('should implement rate limiting for security checks', async ({ page }) => {
      await page.goto('http://localhost:8080');
      
      // Mock rate limiting system
      await page.evaluate(() => {
        (window as any).rateLimitResult = null;
        (window as any).requestCount = 0;
        (window as any).lastRequestTime = 0;
        
        const checkRateLimit = () => {
          const now = Date.now();
          const timeWindow = 60000; // 1 minute
          const maxRequests = 10;
          
          // Reset counter if time window has passed
          if (now - (window as any).lastRequestTime > timeWindow) {
            (window as any).requestCount = 0;
          }
          
          (window as any).requestCount++;
          (window as any).lastRequestTime = now;
          
          const isRateLimited = (window as any).requestCount > maxRequests;
          
          (window as any).rateLimitResult = {
            isRateLimited,
            requestCount: (window as any).requestCount,
            maxRequests,
            timeWindow,
            remainingRequests: Math.max(0, maxRequests - (window as any).requestCount)
          };
          
          return !isRateLimited;
        };
        
        (window as any).checkRateLimit = checkRateLimit;
      });

      // Simulate multiple rapid requests
      for (let i = 0; i < 12; i++) {
        await page.evaluate(() => {
          (window as any).checkRateLimit();
        });
      }

      // Verify rate limiting
      const result = await page.evaluate(() => {
        return (window as any).rateLimitResult;
      });

      expect(result.isRateLimited).toBe(true);
      expect(result.requestCount).toBe(12);
      expect(result.maxRequests).toBe(10);
      expect(result.remainingRequests).toBe(0);
    });
  });
});

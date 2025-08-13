import fs from 'fs';
import path from 'path';

/**
 * Large file generator and throughput/memory measurement.
 *
 * Usage:
 *   npm run test:performance
 *   SIZE_MB=200 npm run test:performance
 */

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let idx = 0;
  let val = bytes;
  while (val >= 1024 && idx < units.length - 1) {
    val /= 1024;
    idx += 1;
  }
  return `${val.toFixed(2)} ${units[idx]}`;
}

function generateChunk(size: number): Buffer {
  // Create a deterministic chunk to avoid CPU cost of random fills
  const pattern = Buffer.from('ABCDEFGHIJKLMNOPQRSTUVWXZY0123456789\n');
  const buf = Buffer.allocUnsafe(size);
  for (let i = 0; i < size; i++) {
    buf[i] = pattern[i % pattern.length];
  }
  return buf;
}

describe('Performance: large file throughput and memory usage', () => {
  const tmpDir = path.join(__dirname, '../../../..', 'tmp');
  const sizeMb = parseInt(process.env.SIZE_MB || '100', 10); // default 100 MB
  const filePath = path.join(tmpDir, `large_${sizeMb}MB.dat`);

  beforeAll(() => {
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterAll(() => {
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      // Optionally keep tmp dir for debugging
    } catch {}
  });

  test(`generate ${sizeMb}MB file and measure write/read throughput`, async () => {
    const targetBytes = sizeMb * 1024 * 1024;
    const chunkSize = 1024 * 1024; // 1MB chunks
    const chunk = generateChunk(chunkSize);

    // Measure write
    const startMemWrite = process.memoryUsage().heapUsed;
    const startWrite = Date.now();
    const ws = fs.createWriteStream(filePath);
    let written = 0;
    await new Promise<void>((resolve, reject) => {
      function writeLoop() {
        let canContinue = true;
        while (canContinue && written < targetBytes) {
          const remaining = targetBytes - written;
          const toWrite = remaining >= chunkSize ? chunk : chunk.subarray(0, remaining);
          canContinue = ws.write(toWrite);
          written += toWrite.length;
        }
        if (written >= targetBytes) {
          ws.end();
        } else {
          ws.once('drain', writeLoop);
        }
      }
      ws.on('error', reject);
      ws.on('finish', resolve);
      writeLoop();
    });
    const writeMs = Date.now() - startWrite;
    const endMemWrite = process.memoryUsage().heapUsed;

    const writeThroughputMBps = sizeMb / (writeMs / 1000);

    // Measure read
    const startMemRead = process.memoryUsage().heapUsed;
    const startRead = Date.now();
    let readBytes = 0;
    await new Promise<void>((resolve, reject) => {
      const rs = fs.createReadStream(filePath, { highWaterMark: chunkSize });
      rs.on('data', (buf) => {
        readBytes += buf.length;
      });
      rs.on('error', reject);
      rs.on('end', resolve);
    });
    const readMs = Date.now() - startRead;
    const endMemRead = process.memoryUsage().heapUsed;

    const readThroughputMBps = sizeMb / (readMs / 1000);

    // Report
    // eslint-disable-next-line no-console
    console.log('\nPerformance Report');
    // eslint-disable-next-line no-console
    console.log('  File size:        ', `${sizeMb} MB (${formatBytes(targetBytes)})`);
    // eslint-disable-next-line no-console
    console.log('  Write time:       ', `${writeMs} ms`);
    // eslint-disable-next-line no-console
    console.log('  Write throughput: ', `${writeThroughputMBps.toFixed(2)} MB/s`);
    // eslint-disable-next-line no-console
    console.log('  Read time:        ', `${readMs} ms`);
    // eslint-disable-next-line no-console
    console.log('  Read throughput:  ', `${readThroughputMBps.toFixed(2)} MB/s`);
    // eslint-disable-next-line no-console
    console.log('  Heap delta (write):', formatBytes(Math.max(0, endMemWrite - startMemWrite)));
    // eslint-disable-next-line no-console
    console.log('  Heap delta (read): ', formatBytes(Math.max(0, endMemRead - startMemRead)));

    // Optional SLA enforcement (defaults chosen conservatively; override via env)
    const enforce = process.env.ENFORCE_PERF === '1' || !!process.env.CI;
    const minWriteMBps = parseFloat(process.env.THROUGHPUT_WRITE_MBPS_MIN || '20');
    const minReadMBps = parseFloat(process.env.THROUGHPUT_READ_MBPS_MIN || '30');
    const maxWriteHeapMB = parseFloat(process.env.HEAP_WRITE_MAX_MB || '128');
    const maxReadHeapMB = parseFloat(process.env.HEAP_READ_MAX_MB || '96');

    if (enforce) {
      expect(writeThroughputMBps).toBeGreaterThanOrEqual(minWriteMBps);
      expect(readThroughputMBps).toBeGreaterThanOrEqual(minReadMBps);
      const writeHeapMB = (Math.max(0, endMemWrite - startMemWrite)) / (1024 * 1024);
      const readHeapMB = (Math.max(0, endMemRead - startMemRead)) / (1024 * 1024);
      expect(writeHeapMB).toBeLessThanOrEqual(maxWriteHeapMB);
      expect(readHeapMB).toBeLessThanOrEqual(maxReadHeapMB);
    }

    // Always validate IO correctness
    expect(readBytes).toBe(targetBytes);
    expect(fs.existsSync(filePath)).toBe(true);
  }, 120000);
});



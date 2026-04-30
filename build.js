/**
 * build.js
 * vite build 완료 후 dist/ 이미지를 sharp로 최적화합니다.
 * 실행: node build.js
 */

import { execSync } from 'child_process';
import { glob } from 'glob';
import { readFileSync, writeFileSync } from 'fs';
import { extname, basename } from 'path';

// ── 1. Vite 빌드 ────────────────────────────────────────
console.log('\n🔨 Vite build 시작...');
execSync('npx vite build', { stdio: 'inherit' });

// ── 2. Sharp 설치 여부 확인 ─────────────────────────────
let sharp;
try {
  sharp = (await import('sharp')).default;
} catch {
  console.warn('\n⚠️  sharp 미설치 — 이미지 최적화를 건너뜁니다.');
  console.warn('   설치: npm install sharp -D\n');
  process.exit(0);
}

// ── 3. dist/ 이미지 최적화 ──────────────────────────────
console.log('\n🖼️  이미지 최적화 시작...');

const images = glob.sync('dist/**/*.{jpg,jpeg,png,gif,webp,avif}');
let count = 0;

for (const imgPath of images) {
  const ext = extname(imgPath).toLowerCase().slice(1);
  const input = readFileSync(imgPath);

  try {
    let output;

    if (ext === 'jpg' || ext === 'jpeg') {
      output = await sharp(input).jpeg({ quality: 82, progressive: true }).toBuffer();
    } else if (ext === 'png') {
      output = await sharp(input).png({ compressionLevel: 9, palette: true }).toBuffer();
    } else if (ext === 'webp') {
      output = await sharp(input).webp({ quality: 82 }).toBuffer();
    } else if (ext === 'avif') {
      output = await sharp(input).avif({ quality: 60 }).toBuffer();
    } else if (ext === 'gif') {
      // gif는 sharp가 제한적 — 원본 유지
      console.log(`  ⏭  skip (gif): ${imgPath}`);
      continue;
    }

    const before = input.length;
    const after = output.length;
    const saved = (((before - after) / before) * 100).toFixed(1);

    writeFileSync(imgPath, output);
    console.log(`  ✅ ${basename(imgPath)}  ${(before / 1024).toFixed(1)}KB → ${(after / 1024).toFixed(1)}KB  (${saved}% 절감)`);
    count++;
  } catch (err) {
    console.error(`  ❌ ${imgPath}: ${err.message}`);
  }
}

console.log(`\n✅ 빌드 완료 — ${count}개 이미지 최적화됨\n`);

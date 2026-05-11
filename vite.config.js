import { defineConfig } from 'vite';
import { resolve, relative, dirname, basename } from 'path';
import { existsSync, mkdirSync, writeFileSync, readFileSync, copyFileSync } from 'fs';
import { glob } from 'glob';
import * as sass from 'sass';
import postcss from 'postcss';
import autoprefixer from 'autoprefixer';

const ROOT = process.cwd();
const SRC = resolve(ROOT, 'src');
const DIST = resolve(ROOT, 'dist');
const slash = (p) => p.replace(/\\/g, '/');

// autoprefixer PostCSS 프로세서
const prefixer = postcss([
  autoprefixer({
    overrideBrowserslist: ['> 0.2% in KR', 'cover 99.5% in KR', 'not dead'],
    cascade: false,
  }),
]);

// ─────────────────────────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────────────────────────
function ensureDir(p) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

// include 파일 경로 판별 (include/ 폴더 내 파일은 빌드에서 제외)
function isIncludePath(p) {
  return slash(p).includes('/components/');
}

// ─────────────────────────────────────────────────────────────
// 1. HTML Include 처리
//    <!--#include "상대경로"--> → 파일 내용으로 교체
// ─────────────────────────────────────────────────────────────
function processIncludes(html, currentFile, depth = 0) {
  if (depth > 20) return html;
  return html.replace(/<!--\s*#include\s+["']([^"']+)['"]\s*-->/g, (_, includePath) => {
    const absPath = resolve(dirname(currentFile), includePath);
    if (!existsSync(absPath)) {
      console.warn(`[include] 파일 없음: ${absPath}`);
      return `<!-- include not found: ${includePath} -->`;
    }
    return processIncludes(readFileSync(absPath, 'utf-8'), absPath, depth + 1);
  });
}

// ─────────────────────────────────────────────────────────────
// 2. SCSS 컴파일 + Autoprefixer 플러그인
//    src/**/scss/*.scss → (sass) → (autoprefixer) → src/**/css/*.css
// ─────────────────────────────────────────────────────────────
function scssCompilePlugin() {
  async function compile(scssFile) {
    if (basename(scssFile).startsWith('_')) return;
    try {
      // ① Sass 컴파일
      const sassResult = sass.compile(scssFile, {
        style: 'expanded',
        sourceMap: false,
        loadPaths: [dirname(scssFile)],
      });

      // ② Autoprefixer 적용
      const postcssResult = await prefixer.process(sassResult.css, {
        from: scssFile,
        to: scssFile.replace(/[\\/]scss[\\/](.+)\.scss$/, '/css/$1.css'),
      });

      const cssFile = scssFile.replace(/[\\/]scss[\\/](.+)\.scss$/, '/css/$1.css');
      ensureDir(dirname(cssFile));
      writeFileSync(cssFile, postcssResult.css, 'utf-8');
      console.log(`  [scss] ${slash(relative(SRC, scssFile))} → ${slash(relative(SRC, cssFile))}`);
    } catch (err) {
      console.error(`  [scss] ❌ ${scssFile}\n  ${err.message}`);
    }
  }

  return {
    name: 'vite-plugin-scss-compile',
    buildStart() {
      const files = glob.sync('src/**/scss/**/*.scss');
      return Promise.all(files.map(compile));
    },
    handleHotUpdate({ file, server }) {
      if (!file.endsWith('.scss')) return;
      const targets = basename(file).startsWith('_') ? glob.sync(`${dirname(file)}/*.scss`) : [file];
      Promise.all(targets.map(compile)).then(() => {
        server.ws.send({ type: 'full-reload' });
      });
      return [];
    },
  };
}

// ─────────────────────────────────────────────────────────────
// 3. 완전 정적 빌드 플러그인
//    Rollup 번들 결과를 전부 버리고 src/ → dist/ 직접 구성
// ─────────────────────────────────────────────────────────────
function staticBuildPlugin() {
  return {
    name: 'vite-plugin-static-build',
    apply: 'build',
    enforce: 'post',

    // Rollup 번들 전부 폐기
    generateBundle(_, bundle) {
      for (const key of Object.keys(bundle)) delete bundle[key];
    },

    async writeBundle() {
      ensureDir(DIST);

      // ── HTML: include 처리 후 복사 (include/ 폴더 자체는 제외) ──
      for (const file of glob.sync('src/**/*.html')) {
        if (isIncludePath(file)) continue;
        const rel = relative(SRC, file);
        const dest = resolve(DIST, rel);
        ensureDir(dirname(dest));

        let html = processIncludes(readFileSync(file, 'utf-8'), file);
        // type="module" 제거 → file:// 직접 열기 대응 (CORS 차단 방지)
        html = html.replace(/<script([^>]*)\stype="module"([^>]*)>/g, '<script$1$2>');

        writeFileSync(dest, html, 'utf-8');
        console.log(`  [html] ${slash(rel)}`);
      }

      // ── JS: include/ 제외, _ 시작 파일 제외 후 복사 ────────────
      for (const file of glob.sync('src/**/*.js')) {
        if (isIncludePath(file)) continue;
        if (basename(file).startsWith('_')) continue;
        const rel = relative(SRC, file);
        const dest = resolve(DIST, rel);
        ensureDir(dirname(dest));
        copyFileSync(file, dest);
        console.log(`  [js]   ${slash(rel)}`);
      }

      // ── CSS: scss 컴파일 결과(css/ 폴더)만 복사 ────────────────
      for (const file of glob.sync('src/**/css/**/*.css')) {
        const rel = relative(SRC, file);
        const dest = resolve(DIST, rel);
        ensureDir(dirname(dest));
        copyFileSync(file, dest);
        console.log(`  [css]  ${slash(rel)}`);
      }

      // ── 이미지: 원본 그대로 복사 ────────────────────────────────
      for (const file of glob.sync('src/**/*.{jpg,jpeg,png,gif,svg,webp,avif,ico}')) {
        if (isIncludePath(file)) continue;
        const rel = relative(SRC, file);
        const dest = resolve(DIST, rel);
        ensureDir(dirname(dest));
        copyFileSync(file, dest);
        console.log(`  [img]  ${slash(rel)}`);
      }

      for (const file of glob.sync('src/**/*.{woff,woff2,ttf,otf,eot}')) {
        if (isIncludePath(file)) continue;
        const rel = relative(SRC, file);
        const dest = resolve(DIST, rel);
        ensureDir(dirname(dest));
        copyFileSync(file, dest);
        console.log(`  [font] ${slash(rel)}`);
      }

      console.log('\n✅ 빌드 완료\n');
    },
  };
}

// ─────────────────────────────────────────────────────────────
// 4. 개발 서버: HTML include 처리
// ─────────────────────────────────────────────────────────────
function htmlIncludeDevPlugin() {
  return {
    name: 'vite-plugin-html-include-dev',
    apply: 'serve',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        return processIncludes(html, ctx.filename);
      },
    },
  };
}

// ─────────────────────────────────────────────────────────────
// HTML 엔트리 수집 (include/ 제외)
// ─────────────────────────────────────────────────────────────
function collectHtmlEntries() {
  const entries = {};
  glob.sync('src/**/*.html').forEach((file) => {
    if (isIncludePath(file)) return;
    const key = relative('src', file).replace(/\.html$/, '');
    entries[key] = resolve(ROOT, file);
  });
  return entries;
}

// ─────────────────────────────────────────────────────────────
// 메인 Config
// ─────────────────────────────────────────────────────────────
export default defineConfig({
  root: 'src',
  publicDir: false,

  server: {
    port: 3000,
    open: true,
    watch: {
      include: ['src/**/*.html', 'src/**/*.scss', 'src/**/*.css', 'src/**/*.js'],
    },
  },

  css: {
    devSourcemap: true,
  },

  plugins: [htmlIncludeDevPlugin(), scssCompilePlugin(), staticBuildPlugin()],

  build: {
    outDir: DIST,
    emptyOutDir: true,

    rollupOptions: {
      input: collectHtmlEntries(),
      output: {
        entryFileNames: '_del/[name].js',
        chunkFileNames: '_del/[name].js',
        assetFileNames: '_del/[name][extname]',
      },
    },
  },
});

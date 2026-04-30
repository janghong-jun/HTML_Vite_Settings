# 📦 Project Setup (Vite + SCSS)

## 1. 개요

이 프로젝트는 **Vite 기반 프론트엔드 환경**이며,
`src` 디렉토리를 기준으로 HTML과 정적 리소스를 함께 관리합니다.

정적 리소스는 `resources` 폴더에서 직접 관리하며,
모든 경로는 **상대경로를 기준으로 사용**합니다.

---

## 2. 폴더 구조

```id="2k4m8q"
src/
 ├─ components/
 ├─ guide/
 ├─ html/
 ├─ resources/
 │  ├─ img/
 │  ├─ fonts/
 │  └─ ...
 └─ index.html
```

---

## 3. 실행 방법

### 개발 서버

```id="r3m5zq"
npm install
npm run dev
```

접속:

```id="n8f2lx"
http://localhost:3000
```

---

### 빌드

```id="t6k1qa"
npm run build
```

---

# 📦 Project Setup (Vite + SCSS)

## 1. 개요

이 프로젝트는 **Vite 기반 프론트엔드 환경**이며,
`src` 디렉토리를 기준으로 HTML과 정적 리소스를 함께 관리합니다.

정적 리소스는 `resources` 폴더에서 관리하며,
경로는 **상대경로를 기본으로 사용하되, 구조에 따라 일관되게 유지**해야 합니다.

---

## 2. 폴더 구조

```
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

## 3. 명령어

```
npm run dev          개발 서버 실행 (port: 3000, 자동 오픈)
npm run build        Vite 빌드 + 이미지 최적화 (sharp)
npm run build:vite   Vite 빌드만 수행
npm run preview      빌드 결과 미리보기
```

---

## 4. 경로 규칙 (중요)

### 기본 원칙

* HTML, CSS 모두 **현재 파일 기준 상대경로 사용**
* 경로 depth가 깊어질 경우 규칙을 유지하여 작성

### 예시

```html
<img src="../resources/img/icon.svg" />
```

```css
background: url("../resources/img/icon.svg");
```

❗ `file:///` 절대경로 사용 금지

---

## 5. include 문법

HTML 내부에서 아래 구문을 사용하여 파일을 삽입합니다.
경로는 **현재 HTML 파일 기준 상대경로**입니다.

```
<!--#include "./include/header.html"-->
<!--#include "../../include/footer.html"-->
```

### 주의사항

* 해당 문법은 브라우저 기능이 아님
* 빌드 또는 개발 서버에서 처리되는 **전처리 방식**
* 파일 경로 오류 시 포함되지 않음

---

## 6. 리소스 규칙

* 모든 이미지 / 폰트는 `resources` 내부에서 관리
* CSS, HTML에서 동일한 경로 규칙 유지

---

## 7. 주의사항

* 반드시 **개발 서버 환경에서 실행**
* `file://`로 HTML 직접 실행 시 CORS 오류 발생
* 경로는 항상 상대경로 기준으로 통일

---

## 8. 문제 해결

### 이미지 / 폰트 로드 실패

* 경로 확인 (상대경로 기준)
* 파일 존재 여부 확인

### CORS 오류

* `file://` 실행 문제
* `npm run dev` 또는 `preview` 사용

---

## ✔️ 한줄 정리

`src` 기준 구조에서 **상대경로로 리소스를 관리하고, 반드시 서버 환경에서 실행하는 프로젝트**

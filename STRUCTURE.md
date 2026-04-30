# 디렉토리 구조

src/
├── include/                    ← 공통 include 파일 모음
│   ├── meta.html
│   ├── header.html
│   └── footer.html
│
├── index.html                  ← <!--#include "./include/header.html"--> 사용
│
├── assets/
│   ├── scss/
│   │   ├── _variables.scss
│   │   └── common.scss
│   ├── css/                    ← 자동 생성 (git ignore)
│   │   └── common.css
│   ├── js/
│   │   └── main.js
│   └── img/
│
└── pages/
    └── about/
        ├── index.html          ← <!--#include "../../include/header.html"-->
        ├── scss/
        │   └── about.scss
        ├── css/                ← 자동 생성 (git ignore)
        │   └── about.css
        └── js/
            └── about.js

dist/                           ← 빌드 output (원본 구조 그대로)
├── include/
│   ├── header.html
│   └── footer.html
├── index.html
├── assets/
│   ├── css/common.css
│   ├── js/main.js
│   └── img/
└── pages/
    └── about/
        ├── index.html
        ├── css/about.css
        └── js/about.js

---

# include 문법

HTML 파일 안에서 아래 구문으로 다른 파일을 삽입합니다.
경로는 현재 HTML 파일 위치 기준 상대경로입니다.

  <!--#include "./include/header.html"-->
  <!--#include "../../include/footer.html"-->

- 중첩 include 가능 (include 안에 include)
- _로 시작하는 scss는 컴파일 스킵 (partial)
- 빌드 시 모든 경로는 자동으로 상대경로 처리됨

---

# 명령어

  npm run dev          개발 서버 (포트 3000, 브라우저 자동 오픈)
  npm run build        vite 빌드 + sharp 이미지 최적화
  npm run build:vite   vite 빌드만
  npm run preview      빌드 결과 미리보기

# 전체 유지보수 pipeline 가이드 (운영자용)

이 문서는 MMAI Lab 사이트를 **지속 운영**할 때 필요한 전체 흐름을 한 번에 설명합니다.  
목표는 “무엇을 수정하고, 어떤 명령을 실행하고, 무엇이 자동 생성되며, GitHub Pages에 어떻게 반영되는지”를 명확히 이해하는 것입니다.

> 전제: 이 project는 **GitHub Pages 정적 사이트**입니다. server/DB/CMS 없이 파일 + build + GitHub Actions로 운영합니다.

---

## 1) 먼저 이해할 운영 구조

운영 대상은 크게 5개입니다.

1. Research
2. News
3. Publication
4. Photo
5. People(교수/학생/인턴/졸업생)

주요 원칙:

- 운영자는 **원본 data/content 파일만 수정**합니다.
- 생성 파일은 script가 다시 만들기 때문에 직접 수정하지 않습니다.

---

## 2) 어떤 파일을 직접 수정하는가 / 자동 생성되는가

## 2-1. 운영자가 직접 수정하는 경로 (Hand-edited)

1. Research 원본
    - `src/assets/dataset/research_areas.json`
    - `src/assets/dataset/research_area_details.json`
    - `src/assets/dataset/research_resources.json`
    - `src/assets/images/research_concepts/optimized/*.webp`
2. News 원본
    - `content/news/*.md`
3. Publication 원본
    - `content/publications/**/*.md`
4. Photo 원본 + 선택 metadata
    - `content/photos/raw/**`
    - `content/photos/metadata.json` (선택)
5. People 데이터
    - `src/assets/dataset/people.json`
    - `src/assets/images/people/*.{jpg,jpeg,png,webp}` (프로필 원본)

## 2-2. 자동 생성되는 경로 (Auto-generated)

1. 동기화 결과(JSON)
    - `src/generated/news.generated.json`
    - `src/generated/publications.generated.json`
    - `src/generated/photos.generated.json`
2. Photo 최적화 결과
    - `public/uploads/photos/...`
3. People 최적화 결과
    - `src/assets/images/people/optimized/*.webp`
    - `src/assets/images/people/optimized/manifest.generated.json`
4. build 산출물
    - `dist/...`
5. Research route와 Publication category label
    - `research_areas.json`을 기준으로 build 시 구성

## 2-3. 직접 수정 금지 경로

- `src/generated/*`
- `public/uploads/photos/*`
- `src/assets/images/people/optimized/*`
- `dist/*`

이 경로들은 직접 고치는 대신, `content:sync` / `photos:sync` / `people:sync` / `build`로 재생성해야 합니다.
Research route 목록과 category label도 component에 중복 입력하지 않고 Research catalog에서 파생합니다.

---

## 3) 전체 유지보수 흐름(처음 맡은 사람용)

아래 순서대로 진행하면 안전합니다.

1. Research 영역·상세·리소스 수정
    - `src/assets/dataset/research_*.json`
    - 필요 시 Research WebP 추가/교체
2. News 추가/수정
    - `content/news/*.md`
3. Publication 추가/수정
    - `content/publications/**/*.md`
4. Photo 원본 추가
    - `content/photos/raw/<category>/<YYYY-MM-DD>__<slug>/...`
5. People 정보 수정
    - `src/assets/dataset/people.json`
    - 필요 시 `src/assets/images/people/`에 프로필 원본 추가
6. Research 구조와 content 동기화
    ```bash
    npm run research:validate
    npm run content:sync
    ```
7. content 검증
    ```bash
    npm run validate:content
    ```
8. 로컬 확인(개발 server)
    ```bash
    npm run dev
    ```
9. build 확인
    ```bash
    npm run build
    ```
10. Git commit / push
11. GitHub Actions deploy 확인
    - `Content Build Check`
    - `Deploy GitHub Pages`

---

## 4) 운영 명령어(실제 project 기준)

아래는 `package.json` 기준 실제 명령어입니다.

```bash
# (초기 1회 권장) 레거시 데이터에서 content 구조 생성 보조
npm run content:bootstrap

# Research 검증 + News/Publication/Photo/People 전체 동기화
npm run content:sync

# Research 영역·상세·리소스 관계 검증
npm run research:validate

# Photo만 동기화(resize/최적화/manifest)
npm run photos:sync

# People 프로필만 동기화(WebP 생성/자동 연결)
npm run people:sync

# People 데이터와 이미지 매칭만 검증
npm run people:validate

# schema/형식 검증
npm run validate:content

# npm 의존성 취약점 검증
npm run audit:dependencies

# 로컬 개발 server 실행
npm run dev

# 프로덕션 build (prebuild에서 People를 포함한 validate:content 자동 실행)
npm run build

# build 결과 로컬 preview
npm run preview

# 운영자용 종합 점검(dependency audit + 동기화 + build)
npm run operator:verify
```

---

## 5) Photo 최적화 pipeline은 어떻게 동작하는가

Photo은 원본만 넣으면 자동으로 파생 산출물이 생성됩니다.

1. 입력: `content/photos/raw/**`
2. 실행: `npm run photos:sync` (또는 `npm run content:sync`)
3. 출력:
    - 갤러리용 썸네일
    - 확대보기용 큰 이미지
    - `src/generated/photos.generated.json`
4. UI 사용:
    - 목록: 썸네일 사용
    - 라이트박스: 큰 이미지 사용

즉, 운영자는 Photo import 코드/component 코드를 수동으로 추가하지 않아도 됩니다.

---

## 6) 검증(Validation)은 무엇을 확인하는가

`npm run validate:content`는 다음을 점검합니다.

1. Research key/slug/detail/image/resource 관계
2. 필수 필드 누락 여부
3. 날짜 형식(`YYYY-MM-DD`)
4. 링크 형식(`http://`, `https://`)
5. content 구조 schema 오류

검증에서 실패하면 deploy 전에 반드시 수정해야 합니다.

---

## 7) GitHub Pages deploy 흐름

현재 deploy는 GitHub Actions로 자동화되어 있습니다.

## 7-1. 어떤 workflow가 동작하는가

1. `.github/workflows/content-build.yml`
    - 이름: `Content Build Check`
    - 트리거: `main` push, PR
    - 수행: `content:sync` → `validate:content` → `build`
2. `.github/workflows/deploy-pages.yml`
    - 이름: `Deploy GitHub Pages`
    - 트리거: `main` push, 수동 실행
    - 수행: `content:sync` → `validate:content` → `build` → `gh-pages` deploy

## 7-2. push 후 무슨 일이 일어나는가

1. `main`에 push
2. Actions가 Node 설치 + 의존성 설치
3. content 동기화/검증/build 수행
4. `dist`가 `gh-pages`에 게시됨
5. GitHub Pages URL에 반영됨

## 7-3. deploy 완료 확인 방법

1. GitHub 저장소 → `Actions` tab
2. 최신 실행에서 아래 2개가 성공(초록)인지 확인
    - `Content Build Check`
    - `Deploy GitHub Pages`
3. 사이트에서 변경된 내용 확인
    - Home 미리보기
    - `/research`, `/news`, `/publication`, `/photo`, `/people`

## 7-4. 오래된 내용이 계속 보일 때

1. 브라우저 강력 새로고침 (`Ctrl+F5` / `Cmd+Shift+R`)
2. Actions 재실행 여부 확인
3. 실패 로그 확인
4. content 파일 오타/형식 오류 수정 후 재푸시

---

## 8) 절대 수정하면 안 되는 것

다음은 운영자가 직접 편집하지 않는 것이 원칙입니다.

1. `src/generated/*.generated.json`
    - 수동 수정 금지, 동기화로 재생성
2. `public/uploads/photos/*`
    - 수동 수정 금지, `photos:sync`로 재생성
3. `dist/*`
    - 수동 수정 금지, `build`로 재생성
4. deploy workflow 파일(`.github/workflows/*`)
    - 운영 목적(content 수정)에서는 함부로 변경 금지
5. page component(`src/components/tabs/*`)
    - Content Operations 단계에서 불필요한 코드 수정 금지

---

## 9) 점검 체크리스트

## 9-1. Research 수정 체크리스트

1. canonical key가 화면 제목의 의미와 일치하는지 확인
2. `area_order`, `areas`, `topics`의 key 일치
3. slug가 key의 `_`를 `-`로 바꾼 값인지 확인
4. 이미지 세 variant와 Resource image key 확인
5. `npm run research:validate`
6. `/research`와 각 상세 route 확인

## 9-2. News 추가 체크리스트

1. `content/news/*.md`에 파일 추가
2. 필수 필드(`id/type/title/summary/date`) 입력
3. 날짜 형식 확인
4. 외부 링크면 `is_external: true` + `external_url`
5. `npm run content:sync`
6. `npm run validate:content`

## 9-3. Publication 추가 체크리스트

1. `content/publications/<category>/*.md` 추가
2. `category` 허용값 확인
3. 필수 필드 입력
4. `npm run content:sync`
5. `npm run validate:content`

## 9-4. Photo 추가 체크리스트

1. `content/photos/raw/...`에 원본 추가
2. 필요 시 `content/photos/metadata.json` 수정
3. `npm run photos:sync` (또는 `content:sync`)
4. `npm run validate:content`
5. `/photo` page에서 썸네일/확대보기 확인

## 9-5. People 수정 체크리스트

1. `src/assets/dataset/people.json` 수정
2. section 이동 시 기존 section에서 제거(중복 방지)
3. Photo 추가/교체 시 `src/assets/images/people/`에 원본 저장
4. `npm run people:sync` 실행
5. 링크 URL 형식 확인
6. `npm run build`로 JSON/렌더링 오류 확인

## 9-6. deploy 전 체크리스트

1. `npm run research:validate`
2. `npm run content:sync`
3. `npm run validate:content`
4. `npm run build`
5. 필요 시 `npm run preview`
6. 변경사항 커밋/푸시

## 9-7. deploy 후 확인 체크리스트

1. Actions 2개 성공 여부 확인
2. 실제 사이트 반영 확인
3. 주요 경로 확인
    - `/research`, `/news`, `/publication`, `/photo`, `/people`
4. 캐시 문제 시 강력 새로고침

---

## 10) 관련 문서 바로가기

- 운영 총괄: `docs/README.md`
- Research: `docs/research/README.md`
- News: `docs/news/README.md`
- Publication: `docs/publications/README.md`
- Photo: `docs/photos/README.md`
- People: `docs/people/README.md`
- deploy: `docs/deployment/README.md`
- 문제 해결: `docs/troubleshooting/README.md`

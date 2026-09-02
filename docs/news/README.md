# News Operations Guide

이 문서는 `content/news` 기반 News 운영 절차를 안내합니다.

---

## 1) News type 범위

현재 코드 기준으로 공식 지원되는 `type` 값은 아래 5개입니다.

- `paper_accepted`
- `new_member`
- `graduation`
- `award`
- `notice`

참고:

- 과거 type(`equipment`, `seminar`, `visit`, `workshop`, `general`)이 입력되어도 runtime에서 `notice`로 정규화됩니다.
- 신규 등록 시에는 반드시 위 5개 중 하나를 사용해 주세요.

---

## 2) 파일 위치와 구조

- 원본: `content/news/*.md`
- 생성 데이터: `src/generated/news.generated.json`
- 원본 template: `content/news/_template.md`
- docs용 template: `docs/templates/news.template.md`

`_template.md`는 예시 파일이므로, 실제 운영 시에는 새 파일을 생성해 사용해 주세요.

---

## 3) 새 News 추가 방법 (local 작업)

### 1단계. 파일 생성

예: `content/news/2026-new-lab-seminar.md`

### 2단계. frontmatter 작성

#### 필수 필드

- `id`: 고유 ID (중복 금지)
- `type`: 지원 type 중 하나
- `title`: News 제목
- `summary`: 한 줄 요약
- `date`: `YYYY-MM-DD`

#### 선택 필드

- `related_person`: 관련 인물
- `venue`: 장소/학회/행사명
- `external_url`: 외부 링크
- `is_external`: 외부 링크 News 여부 (`true/false`)
- `publication_id`: (paper_accepted 권장) publication id와 직접 매핑
- `publication_title`: (paper_accepted 권장) publication title 매핑
- `publication_query`: (paper_accepted 권장) publication 검색 fallback query
- `featured`: 강조 표시 여부 (`true/false`)
- `internal_slug`: 내부 앵커 slug

### 3단계. 동기화/검증

```bash
npm run content:sync
npm run validate:content
```

### 4단계. 화면 확인

- Home 최신 News section
- `/news` archive page

---

## 4) GitHub 웹에서 바로 추가하는 방법

1. 저장소 접속
2. `content/news` 폴더 이동
3. Add file -> Create new file
4. 파일명 입력 (예: `2026-new-lab-seminar.md`)
5. template 내용을 복사해 값 수정
6. `main`에 commit (또는 branch/PR)
7. Actions `Content Build Check` 성공 확인
8. Actions `Deploy GitHub Pages` 성공 확인

---

## 5) 외부 링크 News vs 내부 News

### 외부 링크 News

- `is_external: true`
- `external_url` 필수
- Home/News에서 클릭 시 외부 page로 이동

### 내부 News

- `is_external: false` (또는 생략)
- `external_url` 생략 가능
- Home에서는 `/news` archive로 이동

### paper_accepted News (중요)

- `paper_accepted` type은 UI에서 외부 링크보다 `/publication` 검색 이동을 우선합니다.
- 따라서 `title`을 "Paper accepted ..."처럼 일반 문구로 쓰는 경우에는 아래 중 하나를 채워주세요.
    - `publication_id`
    - `publication_title`
    - `publication_query`
- 이 값이 있으면 Home/News에서 해당 논문 위치를 더 정확히 찾을 수 있습니다.

---

## 6) Publication -> News 자동 생성

`status: published` publication을 추가하면 `content:sync` 시 `paper_accepted` news가 자동 생성됩니다.

- source: `content/publications/**/*.md`
- output 포함 위치: `src/generated/news.generated.json`
- 생성되는 항목 특징:
    - `type: paper_accepted`
    - `publication_id`, `publication_title`, `publication_query` 자동 포함
    - 외부 링크 대신 `/publication` 이동 중심

중복 방지 규칙:

- 수동 News에 동일 `publication_id`가 있으면 자동 항목은 추가되지 않습니다.
- 수동 News와 자동 News의 `date + title`이 같으면 자동 항목은 추가되지 않습니다.

운영 권장:

- 일반적으로는 publication만 추가해도 News가 자동 생성됩니다.
- 별도 문구가 필요한 경우에만 `content/news`에 수동 `paper_accepted`를 작성하고 `publication_id`를 함께 넣어 주세요.

---

## 7) 예시 파일

```md
---
id: 2026-notice-efficient-vlm
type: notice
title: Efficient Vision-Learning Model 세미나 공유
summary: 연구실 내부 세미나에서 최신 실험 결과와 재현 전략을 공유했습니다.
date: 2026-03-16
related_person: MMAI Lab Seminar Team
venue: Ajou University
external_url: ""
is_external: false
featured: false
internal_slug: notice-efficient-vlm-2026
---

선택 본문 메모: 발표자, 발표 순서, 후속 action을 기록하실 수 있습니다.
```

---

## 8) Home 최신 News 반영 방식

현재 Home은 최신 News를 **최대 4개** preview로 표시합니다.

- source: `src/generated/news.generated.json`
- sort: 날짜 최신순
- 위치: Home 상단 Latest News section

즉, News 파일 추가 또는 published publication 추가 후 동기화하면 Home/News에 자동 반영됩니다.

---

## 9) News 추가 체크리스트

1. 파일 생성 위치가 `content/news`인지 확인
2. 파일 확장자가 `.md`인지 확인
3. 필수 필드 입력 확인: `id`, `type`, `title`, `summary`, `date`
4. `date` 형식이 `YYYY-MM-DD`인지 확인
5. 외부 링크 News면 `is_external: true` + `external_url` 입력
6. `paper_accepted`면 `publication_id`/`publication_title`/`publication_query` 중 최소 1개 권장
7. 아래 명령 실행
    ```bash
    npm run content:sync
    npm run validate:content
    ```
8. Home + `/news`에서 실제 노출 확인

---

## 10) 자주 발생하는 실수

1. 날짜 형식 오류 (`2026/03/16`)
2. `type` 오타 (`paperaccepted`)
3. `id` 중복
4. `is_external: true`인데 `external_url` 누락
5. `src/generated/news.generated.json` 직접 편집
6. `paper_accepted`를 일반 문구 제목으로만 쓰고 publication 매핑 필드를 비워 둠

오류가 발생하면 `docs/troubleshooting/README.md`를 함께 확인해 주세요.

# MMAI Lab 홈페이지

아주대학교 MMAI Lab 홈페이지입니다. React와 Vite로 만든 정적 사이트이며, GitHub Pages에 배포됩니다.

이 저장소에서 하는 일은 대략 이렇게 나뉩니다.

| 해야 할 일 | 주로 보는 곳 | 실행할 명령 |
| --- | --- | --- |
| 화면 디자인과 UI 수정 | `src/components`, `src/styles` | `npm run dev`, `npm run build` |
| Research 영역·상세·리소스 관리 | `src/assets/dataset/research_*.json` | `npm run research:validate`, `npm run build` |
| News, Publication, Photo 운영 | `content`, `docs` | `npm run content:sync`, `npm run build` |
| 구성원 정보/사진 수정 | `src/assets/dataset/people.json`, `src/assets/images/people` | `npm run people:sync`, `npm run build` |
| 의존성·보안 점검 | `package.json`, `package-lock.json` | `npm run audit:dependencies`, `npm run build` |
| GitHub Pages 배포 확인 | `.github/workflows`, `dist` | GitHub Actions 확인 |

## 빠른 시작

```bash
npm ci
npm run dev
```

프로덕션 빌드는 아래 명령으로 확인합니다. `build` 전에 콘텐츠 검증이 자동으로 먼저 실행됩니다.

```bash
npm run build
```

의존성 보안 점검은 아래 명령으로 실행합니다.

```bash
npm run audit:dependencies
```

## 폴더 구조

| 경로 | 설명 |
| --- | --- |
| `src/components` | 실제 화면 컴포넌트 |
| `src/styles` | 디자인 토큰, 반응형 기준, 공통 스타일 |
| `content/news` | News 원본 Markdown |
| `content/publications` | Publication 원본 Markdown |
| `content/photos/raw` | Photo 원본 이미지 |
| `src/assets/dataset/research_areas.json` | Research 영역, 순서, route와 이미지 매핑 |
| `src/assets/dataset/research_area_details.json` | Research Area Details |
| `src/assets/dataset/research_resources.json` | Lab Resources & Infrastructure |
| `src/assets/images/people` | People 프로필 원본 이미지 |
| `src/assets/images/people/optimized` | 자동 생성된 People WebP 이미지 |
| `src/generated` | 동기화 스크립트가 만든 데이터 |
| `public/uploads/photos` | 최적화된 Photo 출력물 |
| `docs` | 콘텐츠 운영 문서 |

`src/generated/*`, `public/uploads/photos/*`, People의 `optimized/*`와 이미지 manifest는 직접 고치지 않습니다. 원본을 수정한 뒤 스크립트로 다시 생성합니다.

## 콘텐츠 수정 흐름

Research, News, Publication, Photo, People를 수정할 때는 보통 이 순서로 작업합니다.

```bash
npm run content:sync
npm run validate:content
npm run build
```

Research만 먼저 점검하려면 아래 명령을 사용합니다.

```bash
npm run research:validate
```

Photo만 다시 만들고 싶을 때는 아래 명령을 사용할 수 있습니다.

```bash
npm run photos:sync
```

People 프로필 이미지만 다시 만들고 싶을 때는 아래 명령을 사용합니다.

```bash
npm run people:sync
```

`status: published`인 Publication은 `content:sync` 과정에서 News 항목으로도 자동 반영됩니다.

## 운영 문서

자세한 운영 규칙은 `docs` 아래에 나누어 두었습니다.

| 상황 | 문서 |
| --- | --- |
| 전체 운영 흐름을 처음 파악할 때 | `docs/README.md` |
| Research 영역·상세·리소스 수정 | `docs/research/README.md` |
| News 추가/수정 | `docs/news/README.md` |
| Publication 추가/수정 | `docs/publications/README.md` |
| Photo 추가/최적화 | `docs/photos/README.md` |
| People 정보 수정 | `docs/people/README.md` |
| 의존성·보안 업데이트 | `docs/dependencies/README.md` |
| 배포와 반영 확인 | `docs/deployment/README.md` |
| 오류 해결 | `docs/troubleshooting/README.md` |
| 복사용 템플릿 | `docs/templates/README.md` |

## 배포

`main` 브랜치에 push되면 GitHub Actions가 빌드 후 GitHub Pages로 배포합니다.

관련 워크플로:

- `Content Build Check`: 콘텐츠 동기화, 검증, 빌드 확인
- `Deploy GitHub Pages`: `dist`를 `gh-pages` 브랜치로 배포

일반적인 GitHub Pages 주소가 `https://<user>.github.io/<repo>/`처럼 저장소 이름을 포함한다면, 빌드 시 base path를 지정합니다.

```bash
VITE_BASE_PATH=/<repo>/ npm run build
```

정적 HTML을 경로별로 미리 만들고 싶을 때는 아래 명령을 사용합니다.

```bash
npm run build:static
VITE_BASE_PATH=/<repo>/ npm run build:static
npm run deploy:static
```

## 라우팅 참고

GitHub Pages는 새로고침하거나 직접 URL로 들어왔을 때 SPA 라우팅이 깨질 수 있습니다. 이 저장소는 그 문제를 막기 위해 `public/404.html`과 `index.html`에 fallback 처리를 넣어 두었습니다.

덕분에 아래 경로를 직접 열거나 새로고침해도 앱이 정상적으로 복원됩니다.

- `/news`
- `/research`
- `/publication`
- `/people`
- `/photo`
- `/contact`

## 용어 기준

문서에서는 딱딱한 번역투를 피하고, 아래 표현을 우선 사용합니다.

- `사이트`: MMAI Lab 홈페이지 전체
- `앱`: 브라우저에서 동작하는 React 화면
- `콘텐츠`: News, Publication, Photo, People처럼 운영자가 추가/수정하는 원본
- `배포`: GitHub Pages에 반영하는 과정

길고 딱딱한 외래어 표기는 특별한 이유가 없으면 쓰지 않습니다.

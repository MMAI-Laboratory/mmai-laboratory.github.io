# MMAI Lab 운영 문서

이 폴더는 MMAI Lab 홈페이지를 꾸준히 운영하기 위한 문서 모음입니다. 화면 코드를 고치지 않고도 Research, News, Publication, Photo, People 정보를 안전하게 갱신하는 것을 목표로 합니다.

## 먼저 볼 것

| 상황 | 이동할 문서 |
| --- | --- |
| 전체 운영 흐름을 알고 싶다 | `docs/pipeline/README.md` |
| Research 영역, 상세 정보 또는 Lab Resources를 수정한다 | `docs/research/README.md` |
| News를 추가하거나 수정한다 | `docs/news/README.md` |
| 논문 정보를 추가하거나 수정한다 | `docs/publications/README.md` |
| 사진을 추가하거나 정리한다 | `docs/photos/README.md` |
| 구성원 정보를 수정한다 | `docs/people/README.md` |
| 의존성 경고를 확인하거나 업데이트한다 | `docs/dependencies/README.md` |
| 배포가 잘 됐는지 확인한다 | `docs/deployment/README.md` |
| 오류가 났다 | `docs/troubleshooting/README.md` |
| 예시 파일이 필요하다 | `docs/templates/README.md` |

## 운영자가 자주 만지는 파일

| 항목 | 원본 위치 | 사이트가 읽는 결과 |
| --- | --- | --- |
| Research | `src/assets/dataset/research_*.json`, Research WebP | 영역별 route, 상세 탭, Resource 카드 |
| News | `content/news/*.md` | `src/generated/news.generated.json` |
| Publication | `content/publications/**/*.md` | `src/generated/publications.generated.json` |
| Photo | `content/photos/raw/**` | `src/generated/photos.generated.json`, `public/uploads/photos/**` |
| People | `src/assets/dataset/people.json`, `src/assets/images/people/*` | 최적화된 WebP와 자동 생성 이미지 index |
| Dependencies | `package.json` | `package-lock.json`의 재현 가능한 전체 graph |

`src/generated/*`, `public/uploads/photos/*`, People의 `optimized/*`와 이미지 index는 자동 생성 결과입니다. 직접 고치지 말고 원본을 수정한 뒤 스크립트를 다시 실행합니다.

## 기본 작업 순서

로컬에서 콘텐츠를 바꿀 때는 아래 순서를 기본으로 생각하면 됩니다.

```bash
npm run content:sync
npm run validate:content
npm run build
```

Research 구조만 점검할 때는 `npm run research:validate`를 사용합니다.
Photo만 다시 만들 때는 `npm run photos:sync`를 사용할 수 있습니다.
People 이미지만 다시 만들 때는 `npm run people:sync`를 사용할 수 있습니다.

## GitHub에서 바로 수정할 때

1. `content/...`, `src/assets/dataset/people.json` 또는 People 프로필 원본을 수정합니다.
2. PR을 만들거나 `main`에 반영합니다.
3. GitHub Actions에서 `Content Build Check`가 통과하는지 확인합니다.
4. `Deploy GitHub Pages`가 끝난 뒤 실제 사이트를 확인합니다.

## 기억할 규칙

- 날짜는 `YYYY-MM-DD` 형식을 사용합니다.
- 외부 링크는 `https://...` 또는 `http://...`로 시작해야 합니다.
- 파일명은 영문 소문자, 숫자, 하이픈 조합을 권장합니다.
- Publication의 `status: published` 항목은 News에도 자동 반영됩니다.
- 오류가 나면 먼저 `docs/troubleshooting/README.md`를 확인합니다.

## 배포 전 체크

```bash
npm run audit:dependencies
npm run content:sync
npm run validate:content
npm run build
```

위 네 명령이 통과하면 의존성, 운영 데이터와 빌드 상태는 기본적으로 안전합니다.

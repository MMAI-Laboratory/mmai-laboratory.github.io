# MMAI Lab 관리자(`/admin`) 및 Cloudflare 연결 가이드

구성은 두 부분입니다.

- **공개 홈페이지**: Cloudflare Web Analytics 비콘으로 방문 데이터를 보냅니다
  (`src/components/CloudflareAnalytics.jsx`).
- **`/admin`**: Cloudflare Worker(`cloudflare/admin-api`)를 통해 집계 통계를
  조회하고 Publication을 추가·수정합니다. Google 로그인으로 보호되며, 허용 목록에
  있는 운영자만 사용할 수 있습니다.

Cloudflare API 토큰과 허용 이메일 목록은 브라우저 번들에 들어가지 않고 Worker의
암호화된 secret으로만 저장됩니다. Google 클라이언트 ID와 비콘 token은 공개
식별자라 빌드 변수로 넣어도 됩니다.

AAIG 관리자 구현을 기반으로 했고, Publication도 AAIG와 같은 Google Sheet
파이프라인을 씁니다. MMAI 논문은 AAIG publication 스프레드시트 안의 **`mmai_publications` 탭**에
따로 두며, Worker는 코드에 고정된 이 탭만 읽고 씁니다(AAIG의 `Publications` 탭과
연구실 홈페이지 수집 기능은 쓰지 않습니다).

```text
/admin 저장 ─▶ Worker ─▶ Sheet(mmai_publications 탭)
                 └─▶ publications-sheet-sync.yml 실행
                        └─▶ 공개 CSV → content/publications/sheet.snapshot.json
                               └─▶ 검토 PR → 병합 → 배포
```

사이트 빌드는 `content/publications/sheet.snapshot.json`만 읽습니다. 예전
`content/publications/<분야>/*.md` 파일은 더 이상 쓰이지 않습니다.

## 1. Cloudflare Web Analytics 사이트 만들기

1. Cloudflare Dashboard → **Analytics & Logs → Web Analytics → Add a site**
2. hostname에 `mmai-laboratory.github.io`만 입력합니다(`https://`·경로 제외).
3. **Manage site**의 스니펫에서 `token` 값만 복사합니다.
4. GitHub 저장소 **Settings → Secrets and variables → Actions → Variables**에
   추가합니다.

```text
VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN=<비콘 token>
```

## 2. 통계 조회용 값 준비

| 값 | 얻는 곳 |
| --- | --- |
| Account ID | 대시보드에서 `Cmd/Ctrl + K` → *Copy account ID* |
| Site Tag | Web Analytics 사이트 화면 URL, 또는 GraphQL `dimensions { siteTag }` (비콘 token과 다름) |
| API Token | My Profile → API Tokens → Create Custom Token: `Account › Account Analytics › Read` (+ Site Tag 조회용 `Account Settings › Read`) |

## 3. Google 로그인 준비

1. [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services
   → Credentials → Create credentials → OAuth client ID** (웹 애플리케이션)
2. **Authorized JavaScript origins**:

```text
https://mmai-laboratory.github.io
http://localhost:5173
```

3. Redirect URI는 비워둡니다(ID 토큰만 받는 방식).
4. 발급된 **클라이언트 ID**를 `cloudflare/admin-api/wrangler.toml`의
   `GOOGLE_CLIENT_ID`(두 곳)와 GitHub Variable `VITE_GOOGLE_CLIENT_ID`에 넣습니다.

허용할 운영자 이메일은 쉼표로 구분합니다. 목록에 없는 계정은 로그인에 성공해도
통계를 볼 수 없습니다.

## 4. Worker 배포

```bash
cd cloudflare/admin-api
npx wrangler login
npx wrangler secret put CLOUDFLARE_API_TOKEN
npx wrangler secret put CLOUDFLARE_ACCOUNT_ID
npx wrangler secret put CLOUDFLARE_SITE_TAG
npx wrangler secret put ADMIN_ALLOWED_EMAILS
npx wrangler deploy --env=""
```

출력된 `https://mmai-admin-api.<subdomain>.workers.dev` 주소를 GitHub Variable에
추가합니다.

```text
VITE_ADMIN_API_URL=https://mmai-admin-api.<subdomain>.workers.dev
```

로컬 Worker 테스트는 `cloudflare/admin-api/.dev.vars`(Git 무시됨)에 위 secret을
적은 뒤 `npx wrangler dev --env dev`로 실행합니다. 로컬 사이트는 `.env.example`을
`.env.local`로 복사해 값을 채웁니다.

## 5. Publication Sheet 연결

### 5-1. mmai_publications 탭 채우기

1. AAIG publication 스프레드시트(`PUBLICATIONS_SHEET_ID`)의 `mmai_publications`
   탭(gid `96961462`)을 엽니다. 탭 이름은 Worker 코드에 고정되어 있으니 바꾸지
   않습니다.
2. **파일 → 가져오기 → 업로드**로 `docs/admin/publications-sheet-import.csv`를
   올리고, *가져오기 위치*를 **현재 시트 바꾸기**로 고릅니다. *텍스트를 숫자, 날짜,
   수식으로 변환*은 **체크 해제**합니다.
3. 첫 행(열 이름)은 고치지 않습니다.
4. 날짜 열(`date`, `accepted_date`)이 날짜 서식으로 바뀌었다면 **서식 → 숫자 →
   일반 텍스트**로 되돌려 `2026-03-01` 형태를 유지합니다.

CSV는 `npm run publications:sheet:bootstrap`이 현재 snapshot으로 만든 것이며,
`npm run publications:sheet:check`로 다시 검사할 수 있습니다.

열 규칙:

| 열 | 설명 |
| --- | --- |
| `enabled` | `FALSE`면 홈페이지에서 숨김(행은 남음) |
| `id` | 대표 그림·News 연결 키. 비우면 동기화 때 `분야-연도-제목` 형식으로 생성 |
| `category` | `research_areas.json`의 분야 키 |
| `date` / `accepted_date` | `YYYY-MM-DD`. 채택일은 선택 |
| `venue` | 정식 이름(약칭). 예: `Conference on Robot Learning (CoRL)` |
| `keywords` | `A \| B`처럼 `\|`로 구분 |
| `notes` | 운영 메모. 홈페이지에 표시되지 않음 |

### 5-2. 공개 CSV 주소 (GitHub Variables)

동기화 워크플로는 로그인 없이 CSV를 읽습니다. 스프레드시트가 *링크가 있는 모든
사용자 보기*로 공유되어 있는지 확인하고, 로그아웃한 브라우저에서 아래 주소가 CSV를
반환하는지 봅니다.

```text
PUBLICATIONS_SHEET_CSV_URL=https://docs.google.com/spreadsheets/d/1PRm4WZoLHfLwasA2GI3XbuZhO-Qnm8HNAfeRhdZzwCE/gviz/tq?tqx=out:csv&gid=96961462
PUBLICATIONS_SHEET_URL=https://docs.google.com/spreadsheets/d/1PRm4WZoLHfLwasA2GI3XbuZhO-Qnm8HNAfeRhdZzwCE/edit?gid=96961462#gid=96961462
```

두 값을 저장소 **Settings → Secrets and variables → Actions → Variables**에
추가합니다. `PUBLICATIONS_SHEET_URL`은 `/admin`의 *Google Sheet 열기* 링크로도
쓰입니다.

### 5-3. 서비스 계정 (Worker → Sheet 쓰기)

1. Google Cloud Console(로그인용 OAuth 클라이언트와 같은 프로젝트) → **APIs &
   Services → Library → Google Sheets API → Enable**
2. **IAM & Admin → Service Accounts → Create service account** (역할 없음)
3. 서비스 계정 → **Keys → Add key → JSON**으로 키 파일을 받습니다.
4. 스프레드시트 **공유**에 서비스 계정 이메일(`...@...iam.gserviceaccount.com`)을
   **편집자**로 추가합니다.
5. JSON 파일 내용 전체를 Worker secret으로 등록합니다(대시보드 `mmai-admin-api →
   Settings → Variables and Secrets` 또는 아래 명령). 등록한 뒤 키 파일은 지웁니다.

```bash
npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_KEY --env="" < key.json
```

Google 공유는 파일 단위라 서비스 계정은 AAIG 탭도 편집할 수 있는 권한을 받습니다.
Worker 코드는 `mmai_publications` 탭만 다루지만, 더 막으려면 AAIG 쪽에서 `Publications` 탭에
**데이터 → 시트 및 범위 보호**를 걸어 MMAI 서비스 계정을 편집자에서 빼면 됩니다.

### 5-4. 동기화 실행용 GitHub 토큰

1. GitHub → **Settings → Developer settings → Fine-grained personal access tokens
   → Generate new token**
2. **Resource owner**: `MMAI-Laboratory` / **Repository access**: Only select
   repositories → `mmai-laboratory.github.io`
3. **Permissions → Repository**: `Actions` Read and write, `Pull requests` Read
   (Metadata Read는 자동)
4. Worker secret `GITHUB_ACTIONS_TOKEN`으로 등록합니다.
5. 저장소 **Settings → Actions → General → Workflow permissions**에서 *Allow GitHub
   Actions to create and approve pull requests*를 켭니다(조직 설정에서 막혀 있으면
   조직 관리자가 먼저 허용해야 합니다).

이 토큰이 없어도 저장은 되고, 매일 02:15 UTC 예약 동기화 때 반영됩니다.

편집 규칙:

- **Sheet 수집**은 Sheet를 다시 읽어, 지금 배포된 홈페이지와 다른 행(추가·수정·
  내림 예정)을 보여줍니다. 목록이 남아 있으면 **지금 동기화** → 검토 PR 병합 순서로
  반영합니다. Sheet에서 직접 고친 내용도 여기서 확인할 수 있습니다.
- 저장 전·후에 Worker가 빌드와 같은 규칙(`src/utils/publicationSheetRules.js`)으로
  검사합니다.
- 다른 사람이 Sheet에서 같은 행을 먼저 고쳤다면 덮어쓰지 않고 다시 불러오게 합니다.
- 기존 행의 ID는 화면에서 바꿀 수 없습니다. 새 행은 ID를 자동 제안합니다.
- 대표 그림(figure)은 화면에서 올릴 수 없습니다. 필요하면 저장소에서 추가합니다.
- Sheet 수정 기록에는 서비스 계정만 남으므로, 편집한 운영자 이메일은 Worker 로그에
  남깁니다.
- 동기화가 기존보다 25% 넘게 줄어든 결과를 만들면 실패합니다. 의도한 삭제라면
  Actions에서 워크플로를 `allow_large_deletion`으로 직접 실행합니다.

## 6. 확인 항목

1. `https://<worker>/health`가 `configured`, `googleSignInConfigured`,
   `publicationEditingConfigured`, `publicationSyncConfigured`를 모두 `true`로
   반환한다.
2. 공개 사이트 방문 후 Cloudflare Web Analytics에 데이터가 들어온다(수 분 소요).
3. `/admin`이 내비게이션·sitemap에 없고 `robots.txt`에서 `Disallow`된다.
4. 허용 계정으로 로그인하면 7일/30일 통계와 Publication 관리가 보인다.
5. Publication 하나의 요약을 고쳐 저장하면 Sheet `mmai_publications` 탭의 해당 행이 바뀌고,
   동기화 실행 후 검토 PR이 열린다.
6. 허용되지 않은 계정은 `이 계정에는 관리자 권한이 없습니다.`가 표시된다.
7. 로그아웃 후 다른 계정으로 다시 로그인할 수 있다.

## 7. 보안 범위

- Worker가 Google ID 토큰의 서명(Google 공개 키), 발급자, 대상 클라이언트 ID,
  만료, 이메일 확인 여부를 직접 검증한 뒤 허용 목록과 대조합니다.
- 허용된 origin만 API를 호출할 수 있고, 실패한 로그인은 IP·경로별 분당 10회로
  제한됩니다(`wrangler.toml`의 Rate Limiting binding).
- `/admin` 경로의 방문은 통계 집계에서 제외됩니다.
- 서비스 계정 키와 GitHub 토큰은 Worker secret에만 있습니다. GitHub 토큰은 이
  저장소의 워크플로 실행·PR 조회만 할 수 있고, 모든 변경은 PR 병합 전까지
  `main`에 들어가지 않습니다.
- GitHub Pages는 정적 호스팅이라 `/admin` 페이지 파일 자체는 내려받을 수 있지만,
  로그인 전 화면에는 비밀 정보나 통계가 없습니다.
- 로그인은 1시간 유지되며 브라우저에 저장되지 않습니다(새로고침 시 종료, 이미
  동의한 계정은 Google이 조용히 다시 로그인).

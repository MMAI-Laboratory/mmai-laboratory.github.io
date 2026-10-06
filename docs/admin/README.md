# MMAI Lab 관리자(`/admin`) 및 Cloudflare 연결 가이드

구성은 두 부분입니다.

- **공개 홈페이지**: Cloudflare Web Analytics 비콘으로 방문 데이터를 보냅니다
  (`src/components/CloudflareAnalytics.jsx`).
- **`/admin`**: Cloudflare Worker(`cloudflare/admin-api`)를 통해 집계 통계를
  조회합니다. Google 로그인으로 보호되며, 허용 목록에 있는 운영자만 통계와
  콘텐츠 운영 현황을 볼 수 있습니다.

Cloudflare API 토큰과 허용 이메일 목록은 브라우저 번들에 들어가지 않고 Worker의
암호화된 secret으로만 저장됩니다. Google 클라이언트 ID와 비콘 token은 공개
식별자라 빌드 변수로 넣어도 됩니다.

AAIG 관리자 구현을 기반으로 했으며, AAIG의 Publication Google Sheet 편집 기능은
제외했습니다. MMAI는 Publication을 `content/publications/*.md`로 관리하므로,
로그인 후에는 대신 Publication·News·학회 CFP 확인 상태를 요약해 보여줍니다.

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

## 5. 확인 항목

1. `https://<worker>/health`가 `configured: true`, `googleSignInConfigured: true`를
   반환한다.
2. 공개 사이트 방문 후 Cloudflare Web Analytics에 데이터가 들어온다(수 분 소요).
3. `/admin`이 내비게이션·sitemap에 없고 `robots.txt`에서 `Disallow`된다.
4. 허용 계정으로 로그인하면 7일/30일 통계와 운영 현황이 보인다.
5. 허용되지 않은 계정은 `이 계정에는 관리자 권한이 없습니다.`가 표시된다.
6. 로그아웃 후 다른 계정으로 다시 로그인할 수 있다.

## 6. 보안 범위

- Worker가 Google ID 토큰의 서명(Google 공개 키), 발급자, 대상 클라이언트 ID,
  만료, 이메일 확인 여부를 직접 검증한 뒤 허용 목록과 대조합니다.
- 허용된 origin만 API를 호출할 수 있고, 실패한 로그인은 IP·경로별 분당 10회로
  제한됩니다(`wrangler.toml`의 Rate Limiting binding).
- `/admin` 경로의 방문은 통계 집계에서 제외됩니다.
- GitHub Pages는 정적 호스팅이라 `/admin` 페이지 파일 자체는 내려받을 수 있지만,
  로그인 전 화면에는 비밀 정보나 통계가 없습니다.
- 로그인은 1시간 유지되며 브라우저에 저장되지 않습니다(새로고침 시 종료, 이미
  동의한 계정은 Google이 조용히 다시 로그인).

---
version: hud-1.0
name: NODE Command HUD
description: AI 도메인 전문가 네트워크를 레이더 원반 위 3D 지식그래프로 보여주는 관제(HUD)형 다크 대시보드. 그린 기운의 near-black 캔버스, 저채도 민트·녹회색 HUD 잉크, 단 하나의 일렉트릭 그린 액센트, 2px 각진 프레임과 코너 브래킷, JetBrains Mono 크롬으로 이루어진다. 토큰의 단일 출처는 css/tokens.css.

# 키 → CSS 변수: hud-* → --hud-*, graph-* → --graph-*, 그 외 색 → --color-*
colors:
  # 액센트
  primary: "#00d992"
  primary-soft: "#2fd6a1"
  on-primary: "#101010"
  # HUD 표면
  hud-canvas: "#070a09"
  hud-canvas-glow: "#0f1a14"
  hud-panel: "rgba(5, 10, 8, 0.72)"
  hud-cell: "rgba(5, 10, 8, 0.95)"
  hud-veil: "rgba(7, 10, 9, 0.92)"
  hud-fill: "rgba(0, 217, 146, 0.06)"
  hud-frame: "rgba(0, 217, 146, 0.22)"
  hud-frame-strong: "rgba(0, 217, 146, 0.45)"
  hud-scan: "rgba(255, 255, 255, 0.018)"
  # HUD 잉크
  hud-ink: "#d7f5e8"
  hud-dim: "#4f8f74"
  hud-faint: "#2f5c49"
  ink-strong: "#ffffff"
  # 그래프
  hud-grid: "#1f6b4f"
  hud-grid-soft: "#123d2e"
  hud-blip: "#5fcf9f"
  graph-collaboration: "#ffd65a"
  # 브랜드 마크 중립색(로고 궤도·위성, 허브 위성)
  body: "#bdbdbd"
  mute: "#8b949e"

fonts:
  hud: '"JetBrains Mono", "Noto Sans KR", ui-monospace, monospace'   # --font-hud
  sans: '"Inter", "Noto Sans KR", system-ui, -apple-system, sans-serif' # --font-sans

typography:
  brand:
    fontFamily: "{fonts.hud}"
    fontSize: 20px
    fontWeight: 700
    letterSpacing: 0.3em
  eyebrow:
    fontFamily: "{fonts.hud}"
    fontSize: 11px
    fontWeight: 600
    letterSpacing: 0.3em
    textTransform: uppercase
  label:
    fontFamily: "{fonts.hud}"
    fontSize: 11px
    fontWeight: 600
    letterSpacing: 0.2em
    textTransform: uppercase
  kpi-key:
    fontFamily: "{fonts.hud}"
    fontSize: 9px
    fontWeight: 400
    letterSpacing: 0.2em
  kpi-value:
    fontFamily: "{fonts.hud}"
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.2
  hero:
    fontFamily: "{fonts.hud}"
    fontSize: 56px
    fontWeight: 600
    lineHeight: 0.9
    letterSpacing: -0.02em
  body:
    fontFamily: "{fonts.hud}"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 20px
  caption:
    fontFamily: "{fonts.hud}"
    fontSize: 11px
    fontWeight: 400
  mini:
    fontFamily: "{fonts.hud}"
    fontSize: 10px
    fontWeight: 400
    letterSpacing: 0.08em
  name-lg:
    fontFamily: "{fonts.sans}"
    fontSize: 20px
    fontWeight: 700
    lineHeight: 28px
  prose:
    fontFamily: "{fonts.sans}"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  message:
    fontFamily: "{fonts.sans}"
    fontSize: 16px
    fontWeight: 400
  graph-name:
    fontFamily: "{fonts.sans}"
    fontSize: 13px
    fontWeight: 600
  graph-sub:
    fontFamily: "{fonts.hud}"
    fontSize: 11px
    fontWeight: 400
  graph-hub:
    fontFamily: "{fonts.sans}"
    fontSize: 15px
    fontWeight: 700

rounded:
  hud: 2px      # 모든 패널·버튼·입력·칩·배지
  full: 9999px  # 원형 점(출처 배지 점), 모바일 시트 핸들 grip

spacing:
  xxs: 2px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 20px
  2xl: 24px
  3xl: 32px
  4xl: 40px
  5xl: 48px
  6xl: 64px

layout:
  header-h: 64px
  kpi-top: 64px
  panel-top: 140px
  status-h: 32px
  gutter: 20px
  panel-left: 300px
  panel-right: 260px
  search-w: 420px
  bracket: 12px
  handle-h: 44px
  blur: 10px

components:
  hud-header:
    background: "linear-gradient(to bottom, {colors.hud-veil}, transparent)"
    height: "{layout.header-h}"
    padding: "0 {spacing.2xl}"
  source-badge:
    textColor: "{colors.hud-dim}"
    borderColor: "{colors.hud-frame}"
    typography: "{typography.body}"
    fontWeight: 600
    rounded: "{rounded.hud}"
    padding: "{spacing.xs} {spacing.md}"
  source-badge-live:
    textColor: "{colors.primary}"
    borderColor: "{colors.hud-frame-strong}"
    backgroundColor: "{colors.hud-fill}"
  search-box:
    backgroundColor: "{colors.hud-panel}"
    borderColor: "{colors.hud-frame}"
    focusBorderColor: "{colors.hud-frame-strong}"
    textColor: "{colors.hud-ink}"
    placeholderColor: "{colors.hud-dim}"
    rounded: "{rounded.hud}"
    width: "{layout.search-w}"
    height: "{spacing.4xl}"
  search-list:
    backgroundColor: "{colors.hud-cell}"
    borderColor: "{colors.hud-frame}"
    activeRowBackground: "{colors.hud-fill}"
  kpi-strip:
    dividerColor: "{colors.hud-frame}"
    cellBackground: "{colors.hud-cell}"
    cellPadding: "{spacing.sm} {spacing.lg}"
    cellMinWidth: 112px
  hud-panel:
    backgroundColor: "{colors.hud-panel}"
    borderColor: "{colors.hud-frame}"
    rounded: "{rounded.hud}"
    backdropFilter: "blur({layout.blur})"
    bracketColor: "{colors.primary}"
    bracketSize: "{layout.bracket}"
    bracketWidth: "{spacing.xxs}"
  stat-grid:
    dividerColor: "{colors.hud-frame}"
    cellBackground: "{colors.hud-cell}"
    cellPadding: "{spacing.sm} {spacing.md}"
  bar:
    trackColor: "{colors.hud-fill}"
    fillColor: "{colors.primary}"
    fillPattern: "dash 4px / gap 2px"
    height: "{spacing.sm}"
  hist:
    fillColor: "{colors.primary}"
    fillPattern: "stripe 2px / gap 2px"
    maxHeight: "{spacing.6xl}"
  avatar:
    size: "{spacing.5xl}"
    borderColor: "{colors.primary}"
    backgroundColor: "{colors.hud-fill}"
    textColor: "{colors.primary}"
    rounded: "{rounded.hud}"
  chip:
    borderColor: "{colors.hud-frame}"
    textColor: "{colors.hud-ink}"
    fontFamily: "{fonts.sans}"
    rounded: "{rounded.hud}"
    padding: "{spacing.xxs} {spacing.sm}"
  kv-row:
    keyTypography: "{typography.caption}"
    keyColor: "{colors.hud-dim}"
    valueTypography: "{typography.prose}"
    valueColor: "{colors.hud-ink}"
    dividerColor: "{colors.hud-frame}"
  conn-row:
    hoverBorderColor: "{colors.hud-frame}"
    hoverBackground: "{colors.hud-fill}"
    nameColor: "{colors.hud-ink}"
    viaColor: "{colors.hud-dim}"
  seg-btn:
    backgroundColor: transparent
    borderColor: "{colors.hud-frame}"
    textColor: "{colors.hud-dim}"
    rounded: "{rounded.hud}"
    padding: "{spacing.xs} {spacing.md}"
  seg-btn-active:
    backgroundColor: "{colors.primary}"
    borderColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    fontWeight: 600
  rel-toggle:
    backgroundColor: transparent
    borderColor: transparent
    textColor: "{colors.hud-dim}"
    padding: "{spacing.sm} {spacing.md}"
  rel-toggle-active:
    backgroundColor: "{colors.hud-fill}"
    borderColor: "{colors.hud-frame}"
    textColor: "{colors.hud-ink}"
  legend-swatch:
    width: "{spacing.xl}"
    height: "{spacing.xs}"
  hud-btn:
    backgroundColor: "{colors.hud-fill}"
    borderColor: "{colors.hud-frame}"
    hoverBorderColor: "{colors.hud-frame-strong}"
    textColor: "{colors.hud-ink}"
    fontWeight: 600
    rounded: "{rounded.hud}"
    padding: "{spacing.sm} 0"
  hud-btn-primary:
    backgroundColor: "{colors.primary}"
    borderColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
  status-bar:
    background: "linear-gradient(to top, {colors.hud-veil}, transparent)"
    height: "{layout.status-h}"
    typography: "{typography.mini}"
    textColor: "{colors.hud-faint}"
    valueColor: "{colors.hud-dim}"
  loading-hud:
    backgroundColor: "{colors.hud-veil}"
    barTrack: "{colors.hud-fill}"
    barFill: "{colors.primary}"
  error-ui:
    surface: "{components.hud-panel}"
    padding: "{spacing.3xl}"
  graph-label:
    nameColor: "{colors.hud-ink}"
    subColor: "{colors.hud-dim}"
    hubColor: "{colors.primary}"
    halo: "0 0 6px rgba(0, 0, 0, 0.95), 0 0 2px #000"
  ring-tag:
    typography: "{typography.mini}"
    textColor: "{colors.hud-dim}"
  reticle:
    color: "{colors.primary}"
    armLength: "{spacing.md}"
    thickness: "{spacing.xxs}"
    padding: 14px
---


## 개요

NODE는 **관제실 레이더**를 메타포로 삼는다. 운영자 유광명(허브)이 화면 정중앙에 고정되고, 전문가 52명은 기울어진 원반 위에 레이더 blip처럼 놓인다. 인연이 오래될수록 허브에 가깝다. 그래프가 뷰포트 전체를 채우고, 헤더·KPI·패널·상태줄은 모두 그 위에 떠 있는 반투명 HUD 크롬이다.

디자인 목표는 **세련되고 화려하되 반짝이지 않는 것**이다. 노드는 빛나지 않는 평면 마커이고, 장식은 레이더 그리드·느린 스윕·코너 브래킷·미세 스캔라인 정도로 절제한다. 크롬 문자는 거의 전부 JetBrains Mono라서 화면이 계기판처럼 읽힌다.

**핵심 특징**
- **그린 기운의 near-black 캔버스**(`--hud-canvas` `#070a09`) 한 가지 표면. 라이트 모드는 없다.
- **단일 액센트** 일렉트릭 그린(`--color-primary` `#00d992`). 협업 엣지의 골드(`--graph-collaboration`)만이 의도된 유일한 비녹색이다.
- **HUD 잉크**: 수치·이름은 민트 화이트(`--hud-ink`), 라벨·보조는 녹회색(`--hud-dim`), 힌트는 `--hud-faint`.
- **각진 프레임**: 모든 패널·버튼·칩이 2px 라운드(`--radius-hud`)에 1px 그린 프레임. 패널에는 좌상·우하 코너 브래킷이 붙는다. 드롭섀도는 쓰지 않는다.
- **모노 크롬 + 한글 산세리프 본문**: UI는 JetBrains Mono, 사람 이름·조직명·상세 본문은 Inter → Noto Sans KR.
- **영문 대문자 eyebrow**: `// NETWORK`, `// DISPLAY`처럼 그린 `//` 접두와 넓은 자간.

## 색

토큰은 모두 `css/tokens.css`에 정의돼 있다. CSS는 `var(--…)`로, JS(그래프)는 `getComputedStyle`로 같은 변수를 읽는다. CSS·JS에 hex를 새로 적지 않는다.

### 액센트

| 토큰 | 값 | 쓰는 곳 |
|---|---|---|
| `--color-primary` | `#00d992` | 로고 허브 점, Live 배지, 허브 노드·라벨·오빗, 활성 세그먼트 토글, 패널 코너 브래킷, 선택 레티클, eyebrow `//`·상태줄 `>` 글리프, 아바타 테두리·이니셜, 요약 막대·히스토그램 채움, 로딩 바, 주 버튼(재시도), 소속 엣지, 레이더 스윕 |
| `--color-primary-soft` | `#2fd6a1` | 관심사 엣지, 관심사 범례 스와치(60% 불투명) |
| `--color-on-primary` | `#101010` | primary 배경 위 글자(활성 토글, 주 버튼) |

액센트 그린은 **본문(문장·값 텍스트)에 쓰지 않는다**. 위 표에 적힌 자리에서만 쓴다.

### HUD 표면

| 토큰 | 값 | 쓰는 곳 |
|---|---|---|
| `--hud-canvas` | `#070a09` | 페이지·그래프 배경 |
| `--hud-canvas-glow` | `#0f1a14` | 그래프 배경 중심부 방사형 글로우 |
| `--hud-panel` | `rgba(5,10,8,.72)` | 반투명 패널·검색 입력 배경(+블러) |
| `--hud-cell` | `rgba(5,10,8,.95)` | KPI·스탯 셀, 검색 드롭다운, 모바일 시트 핸들 |
| `--hud-veil` | `rgba(7,10,9,.92)` | 헤더·상태줄 그라디언트, 로딩 오버레이 |
| `--hud-fill` | `rgba(0,217,146,.06)` | 호버·활성 채움, 막대 트랙, 아바타·버튼 바탕 |
| `--hud-frame` | `rgba(0,217,146,.22)` | 1px 프레임 선, 셀 사이 구분선 |
| `--hud-frame-strong` | `rgba(0,217,146,.45)` | 포커스·호버 프레임, Live 배지 테두리, `:focus-visible` 외곽선 |
| `--hud-scan` | `rgba(255,255,255,.018)` | 전체 화면 스캔라인(1px 선 / 3px 주기) |

### HUD 잉크(텍스트)

| 토큰 | 값 | 쓰는 곳 |
|---|---|---|
| `--color-ink-strong` | `#ffffff` | 로고 워드마크 `NODE`, 상세 패널 이름 |
| `--hud-ink` | `#d7f5e8` | 기본 텍스트, 수치(KPI·스탯·히어로), 이름, 활성 토글 글자, 선택 노드 Blip |
| `--hud-dim` | `#4f8f74` | eyebrow·라벨·키, 보조 텍스트, 비활성 토글, 플레이스홀더, 라벨 보조 줄, 링 눈금, 허브 엣지 |
| `--hud-faint` | `#2f5c49` | 상태줄 키, 로딩 보조 문구, 스크롤바 thumb, 모바일 핸들 grip |

녹회색 HUD 잉크(`--hud-ink`·`--hud-dim`)는 본문에 써도 된다. 액센트 그린 금지 규칙과는 별개다.

### 그래프

| 토큰 | 값 | 쓰는 곳 |
|---|---|---|
| `--hud-grid` | `#1f6b4f` | 연차 링(불투명도 0.55) |
| `--hud-grid-soft` | `#123d2e` | 극좌표 그리드 12섹터 + 외곽 원(불투명도 0.7) |
| `--hud-blip` | `#5fcf9f` | 일반 노드 Blip 마커 |
| `--graph-collaboration` | `#ffd65a` | 협업 엣지·범례 스와치·파티클(골드) |
| `--color-body` | `#bdbdbd` | 허브 오빗의 위성 점, 로고 위성 |
| `--color-mute` | `#8b949e` | 로고 궤도 링 |

### 레거시 토큰(현재 미사용)

`tokens.css`에는 남아 있지만 현재 화면 어디에서도 참조하지 않는 토큰이다. 새로 쓰지 않는다.

- 색: `--color-primary-deep`, `--color-canvas`, `--color-canvas-soft`, `--color-hairline`, `--color-hairline-soft`, `--color-ink`, `--label-career`·`--label-nickname`·`--label-interest`·`--label-affiliation`(라벨 보조 줄은 이제 단색 `--hud-dim`)
- 타이포: `--font-mono`, `--text-display-md-size/line/tracking`, `--text-display-sm-weight`, `--text-eyebrow-size/line/tracking`, `--text-body-md-weight/line`, `--text-caption-*`
- 형태·깊이: `--radius-xs`·`--radius-sm`·`--radius-md`, `--border-hairline`, `--glow-hover`

## 타이포그래피

### 폰트 패밀리

Google Fonts로 세 서체를 불러온다(Inter 400/500/600/700 · JetBrains Mono 400/500/700 · Noto Sans KR 400/500/700).

1. **`--font-hud`** = JetBrains Mono → Noto Sans KR → ui-monospace. `body` 기본값이다. eyebrow·KPI·버튼·토글·배지·상태줄·숫자·라벨 보조 줄 등 UI 크롬 전반에 쓴다. 한글은 Noto Sans KR로 넘어간다.
2. **`--font-sans`** = Inter → Noto Sans KR. 한글 위주 텍스트에만 쓴다: 그래프 라벨 이름, 상세 패널 이름·Now/Past 값, Focus·Wish 칩, Connections 이름, 에러 메시지.

### 위계

| 역할 | 서체 | 크기 / 굵기 / 행간 | 자간 | 쓰는 곳 |
|---|---|---|---|---|
| `hero` | hud | 56px / 600 / 0.9 | -0.02em | 요약 패널 멤버 수 |
| `brand` | hud | 20px / 700 | 0.3em | 헤더 `NODE` 워드마크(`--color-ink-strong`) |
| `name-lg` | sans | 20px / 700 / 28px | 0 | 상세 패널 이름(`--color-ink-strong`) |
| `kpi-value` | hud | 18px / 600 / 1.2 | 0 | KPI 값, 스탯 셀 값 |
| `message` | sans | 16px / 400 | 0 | 에러 메시지 |
| `graph-hub` | sans | 15px / 700 | 0 | 허브 라벨(`--color-primary`) |
| `prose` | sans | 14px / 400 / 1.5 | 0 | 상세 Now/Past 값 |
| `graph-name` | sans | 13px / 600 | 0 | 그래프 노드 이름 |
| `body` | hud | 12px / 400 / 20px | 0 | 기본 본문, 배지, 노드 수, 토글, 검색 |
| `eyebrow` | hud | 11px / 600 | 0.3em, 대문자 | `// NETWORK`, `// DISPLAY`, 로딩 제목, 핸들 라벨 |
| `label` | hud | 11px / 600 | 0.2em, 대문자 | 그룹 라벨(`LABELS`, `TOP ORGANIZATIONS`, `CONNECTIONS`) |
| `caption` | hud | 11px / 400 | 0 | 태그라인, 패널 각주, 관계 개수, 클러스터 태그, Now/Past 키(0.2em 대문자) |
| `graph-sub` | hud | 11px / 400 | 0 | 라벨 보조 줄(조직·경력·닉네임·관심사) |
| `mini` | hud | 10px / 400 | 0.08em | 상태줄, 레이더 링 눈금(`02Y`), 히스토그램 축 |
| `kpi-key` | hud | 9px / 400 | 0.2em | KPI 키(`MEMBERS` 등) |

### 원칙

- **숫자는 모노.** KPI·스탯·연차·개수는 모두 JetBrains Mono라 자릿수가 맞는다.
- **eyebrow는 영문 대문자**로만 쓴다. 한글에 넓은 자간(0.2em 이상)을 주지 않는다.
- **굵기는 400 / 600 / 700 세 단계.** 600은 값·활성 상태, 700은 이름·워드마크에 쓴다.
- **우측 설정 패널 문구는 영어**(Labels·Relations·Reset view 등). 한글은 사용자 데이터와 에러 문구에만 나온다.

## 레이아웃

### 화면 구성(데스크톱 ≥1024px)

```
+--------------------------------------------------------------------------+
| (o) NODE  Network Of...     [ Search experts...   ^K ]   *Live  N nodes  |  header 64px
|                +-------+--------+-------+-------+-------+-------+        |
|                |MEMBERS|CLUSTERS| AFFIL |COLLAB |  AVG  |LONGEST|        |  KPI strip
|                +-------+--------+-------+-------+-------+-------+        |
| +--------------+                                       +-------------+   |  panels top 140px
| | // NETWORK   |                                       | // DISPLAY  |   |
| |              |        RADAR DISK + 3D GRAPH          | Labels      |   |
| | LEFT 300px   |        (full-bleed viewport)          | Relations   |   |
| |              |                                       | RIGHT 260px |   |
| +--------------+                                       +-------------+   |
| SRC Google Sheet  OWNER ...  SYNC 14:05        > Drag to rotate ...      |  status bar 32px
+--------------------------------------------------------------------------+
```

- **그래프**(`#graph`): `position: fixed; inset: 0`. 커서는 `grab` → 드래그 중 `grabbing`, 노드 위 `pointer`.
- **헤더**: `grid 1fr auto 1fr`. 좌 = 로고(마크 24px + 워드마크 + 태그라인), 중앙 = 검색, 우 = 출처 배지 · 노드 수 · GitHub 아이콘. 배경은 위에서 아래로 사라지는 `--hud-veil` 그라디언트다.
- **KPI 스트립**: 헤더 바로 아래 가운데 정렬. 6개 셀을 1px 간격 그리드로 두고 바탕을 `--hud-frame`으로 칠해 셀 사이가 프레임 선처럼 보이게 한다.
- **좌측 패널**(300px): 미선택이면 네트워크 요약, 선택하면 인력 상세.
- **우측 패널**(260px): Display 설정(Labels · Relations · Reset view).
- **상태줄**: 하단 32px. 아래에서 위로 사라지는 `--hud-veil` 그라디언트.
- 패널 최대 높이 = `100dvh − panel-top − status-h − gutter`. 넘치면 얇은 스크롤바(`--hud-faint`)가 생긴다.

### 스페이싱

4px 베이스. `--space-xxs` 2 · `xs` 4 · `sm` 8 · `md` 12 · `lg` 16 · `xl` 20 · `2xl` 24 · `3xl` 32 · `4xl` 40 · `5xl` 48 · `6xl` 64. 패널 안쪽 여백은 `xl`(20px), 헤더·상태줄 좌우는 `2xl`(24px), 화면 가장자리 거터는 `--hud-gutter`(20px)다. 크기 값도 이 스케일을 조합해 만든다(예: KPI 셀 최소폭 = `6xl + 5xl` = 112px).

### HUD 치수

| 토큰 | 값 | 의미 |
|---|---|---|
| `--hud-header-h` | 64px | 헤더 높이 |
| `--hud-kpi-top` | 64px | KPI 스트립 top |
| `--hud-panel-top` | 140px | 좌우 패널 top |
| `--hud-status-h` | 32px | 상태줄 높이 |
| `--hud-gutter` | 20px | 패널과 화면 가장자리 간격 |
| `--panel-width` / `--panel-width-right` | 300px / 260px | 좌 / 우 패널 폭 |
| `--hud-search-w` | 420px | 검색 입력 폭(높이 40px) |
| `--hud-bracket` | 12px | 코너 브래킷 길이 |
| `--handle-height` | 44px | 모바일 시트 핸들(peek) 높이 |

### 레이어(z-index)

그래프 0 → KPI·패널·상태줄 15 → 헤더 20 → 검색 드롭다운 25(모바일 펼침 입력 26) → 스캔라인 30 → 로딩 HUD 40 → 에러 UI 41. 스캔라인은 `pointer-events: none`이라 입력을 막지 않는다.

### 반응형

| 구간 | 변화 |
|---|---|
| **≥1024px** | 위 기본 구성. 카메라 홈 시점은 좌우 패널을 뺀 폭에 원반을 맞춘다. |
| **640–1023px** | 태그라인·조작 힌트 숨김. 검색 폭 `min(420px, 42vw)`. KPI는 4개(`MEMBERS`·`CLUSTERS`·`COLLAB LINKS`·`LONGEST BOND`)로 줄인다. 좌측 패널은 화면 밖에 있다가 노드를 선택하면 슬라이드 드로어로 들어온다. 우측 패널은 제자리(우측 top 140px)에 `DISPLAY` 핸들 버튼으로 접혀 있고 누르면 260px로 펼쳐진다. |
| **<640px** | 헤더 `auto 1fr auto`, 좌우 16px. 워드마크 16px, 노드 수 숨김. 검색은 40px 아이콘 버튼이고 누르면 헤더 아래에 전체 폭 입력이 펼쳐진다(⌘K 표시 숨김). KPI는 6개 전부 전체 폭 가로 스크롤 1행(값 16px). 좌측 상세는 KPI 아래 전체 폭 드로어. 우측 설정은 하단 시트(44px 핸들 + grip만 보이다가 열면 최대 50dvh). 상태줄 숨김. 그래프 라벨 축소(이름 12 / 보조 10 / 허브 13px). |

## 깊이·프레임

드롭섀도는 쓰지 않는다. 깊이는 아래 네 가지로만 표현한다.

1. **프레임 선**: 1px `--hud-frame`. 호버·포커스·활성일 때 `--hud-frame-strong`.
2. **반투명 + 블러**: 패널·검색은 `--hud-panel` 배경에 `backdrop-filter: blur(10px)`를 걸어 아래 그래프가 비쳐 보인다.
3. **코너 브래킷**: `.hud-panel`의 `::before`(좌상)·`::after`(우하)에 12px × 2px `--color-primary` ㄱ자 브래킷을 단다.
4. **스캔라인**: `body::after` 전체 화면 반복 그라디언트(`--hud-scan` 1px / 3px 주기).

예외 하나: 그래프 라벨에는 배경과 분리되도록 텍스트 후광 `--hud-label-shadow`(`0 0 6px rgba(0,0,0,.95), 0 0 2px #000`)를 준다. 상자 그림자가 아니라 글자 가독성용이다.

## 형태

| 토큰 | 값 | 쓰는 곳 |
|---|---|---|
| `--radius-hud` | 2px | 패널·버튼·입력·칩·배지·kbd·스와치·아바타 등 모든 HUD 요소 |
| `--radius-full` | 9999px | 출처 배지의 상태 점(8px 원) |
| `--radius-pill` | 9999px | 모바일 시트 핸들 grip(32×4px)에만 |

pill 모양 버튼·태그는 쓰지 않는다. 모서리는 각지게 둔다.

## 컴포넌트

### 헤더

- **브랜드**: 오빗 마크 SVG(24px — 궤도 링 `--color-mute`, 위성 `--color-body`, 허브 `--color-primary`) + `NODE`(`brand`, `--color-ink-strong`) + `Network Of Domain Experts`(11px, `--hud-dim`).
- **검색 입력**(`.search-box`): 420×40px, `--hud-panel` + 블러, 1px `--hud-frame`(포커스 시 strong). 돋보기 16px · 입력(`--hud-ink`, 플레이스홀더 `Search experts or organizations` `--hud-dim`) · `⌘K` kbd 칩. ⌘K/Ctrl+K 또는 `/`로 포커스.
- **검색 드롭다운**(`.search-list`): 입력 아래 4px, `--hud-cell` + 블러. 최대 8행. 행 = 이름(600 `--hud-ink`) ↔ 조직(`--hud-dim`, 말줄임). ↑↓로 이동하면 활성 행에 `--hud-fill`. 결과가 없으면 `No match` 행.
- **출처 배지**(`.source-badge`): 2px 각진 배지 + 8px 상태 점. `Live` = 그린 글자·strong 프레임·`--hud-fill` 바탕. `Snapshot` = `--hud-dim`. 로딩 중(`…`)·`Error`는 점 없이 `--hud-dim`.
- **노드 수**(`N nodes`, `--hud-dim`) · **GitHub 아이콘**(16px, `--hud-dim` → 호버 시 `--hud-ink`).

### KPI 스트립

`MEMBERS` · `CLUSTERS` · `AFFIL LINKS` · `COLLAB LINKS` · `AVG CAREER` · `LONGEST BOND`. 셀마다 키(`kpi-key`, `--hud-dim`) 위, 값(`kpi-value`, `--hud-ink`) 아래. 연차 값에는 `Y`를 붙인다(`9Y`).

### HUD 패널(공통)

`.hud-panel` = 고정 위치 + `--hud-panel` 배경 + 블러 + 1px `--hud-frame` + 2px 라운드 + 코너 브래킷. 좌우 패널, 에러 UI가 이 크롬을 공유한다. 패널 안 구성 요소:

- **eyebrow**(`.hud-eyebrow`): `eyebrow` 서체, `--hud-dim`, 앞에 그린 `// ` 접두. 패널 제목 역할.
- **그룹 라벨**(`.hud-label`): `label` 서체, `--hud-dim`. 오른쪽 `<em>` 값은 `--hud-ink`(예: `CONNECTIONS 7`).

### 좌측 패널 — 네트워크 요약(미선택)

1. `// NETWORK`
2. **히어로**: 멤버 수(`hero` 56px, `--hud-ink`) + `domain experts / around 유광명`(`--hud-dim`).
3. **스탯 그리드** 2×2(KPI와 같은 1px 프레임 그리드, `--hud-cell` 셀): Clusters · Affiliations · Collabs · Avg career. 값 18px/600 + 단위 `<small>`(`y`).
4. **TOP ORGANIZATIONS**: 상위 조직 5개 가로 막대. 이름(96px, 말줄임) · 트랙(높이 8px, `--hud-fill`) · 값. 채움은 그린 4px 대시 / 2px 간격 패턴.
5. **SINCE**: 인연 시작 연대별 세로 히스토그램. 막대 높이 = 비율 × 64px, 그린 2px 줄무늬. 위에 개수(`--hud-ink`), 아래 연대(`mini`).
6. 각주: `Longest bond · since 2000`(`caption`, `--hud-dim`).

### 좌측 패널 — 인력 상세(선택)

1. **헤드**(`auto 1fr auto` 그리드): 아바타(48px 정사각, 그린 1px 테두리 + `--hud-fill`, 이름 끝 두 글자를 그린 700으로) · 이름(`name-lg`) + 보조 줄(닉네임 `--hud-dim` · `<조직> cluster` 태그 · 허브면 `Hub` 태그) · 닫기 버튼(32px, `✕`).
2. **스탯 그리드** 2칸: Career(`Ny`) · Since(연도).
3. **키-값 행**(`.kv`): `NOW` / `PAST` 키(48px 열, 11px 0.2em 대문자 `--hud-dim`) + 값(`prose`, `--hud-ink`). 행 아래 1px `--hud-frame`. Past는 ` · `로 연결.
4. **FOCUS / WISH 칩**: 하는일·관심사, 희망사항 태그. sans, 2px 라운드, 1px 프레임.
5. **CONNECTIONS N**: 사람 단위로 병합한 연결 목록. 정렬은 협업 > 소속 > 관심사 순. 각 행은 버튼이다: 관계 스와치(12px) · 이름(sans 600 `--hud-ink`) · 경로(`Collaborated` / 공유 조직 / 공유 관심사, `--hud-dim`, 오른쪽 정렬·말줄임). 호버하면 프레임과 `--hud-fill`이 생기고, 클릭하면 그 노드로 선택·fly-to. 허브는 `Connected to all N experts.`, 연결이 없으면 `No direct relations yet.`

패널 내용이 바뀔 때 0.2s 페이드인한다.

### 우측 패널 — Display

- `// DISPLAY`
- **LABELS** 세그먼트(`.seg-btn`, 줄바꿈 허용): `Name` · `Org` · `Career` · `Nick` · `Interests`. 기본 = Name + Org 켜짐. 꺼짐 = 투명 바탕·프레임·`--hud-dim`. 켜짐(`aria-pressed="true"`) = 그린 바탕 + `--color-on-primary` 600.
- **RELATIONS** 토글(`.rel`, 범례 겸용): `[스와치] 이름 개수` 3열 그리드. `Affiliation`·`Collaboration`·`Hub` 기본 켜짐, `Interest` 기본 꺼짐. 켜짐 = 프레임 + `--hud-fill` + `--hud-ink`, 꺼짐 = 테두리 없음 + `--hud-dim`. 개수는 11px `--hud-dim`.
- **Reset view**(`.hud-btn`): 전체 폭, `--hud-fill` 바탕, 1px 프레임(호버 시 strong), `--hud-ink` 600.

### 관계 스와치

20×4px(연결 목록 안에서는 12px 폭). 그래프 엣지와 같은 색을 쓴다.

| 관계 | 스와치 |
|---|---|
| Affiliation | `--color-primary` 실선 |
| Collaboration | `--graph-collaboration` 실선 |
| Interest | `--color-primary-soft` 60% |
| Hub | 1px `--hud-dim` 점선(4px / 4px) |

### 버튼

- **`.hud-btn`** 기본: 위 Reset view 스타일.
- **`.hud-btn.is-primary`**: 그린 바탕 + `--color-on-primary`. 에러 UI의 `다시 시도`에만 쓴다.
- **`:focus-visible`**: 모든 포커스 가능 요소에 1px `--hud-frame-strong` 외곽선(오프셋 2px).

### 상태줄

`SRC <Google Sheet|Snapshot>` · `OWNER Kwang Myung Yu` · `SYNC <HH:MM>`. 키는 `--hud-faint`, 값(`<b>`)은 `--hud-dim` 400. 오른쪽 끝 조작 힌트 `Drag to rotate · Scroll to zoom · Click a node` 앞에 그린 `> ` 프롬프트를 붙인다.

### 로딩 HUD

전체 화면 `--hud-veil` 오버레이. 가운데에 `// LINKING SHEET`(`eyebrow`) → 192×2px 트랙(`--hud-fill`) 위로 40% 폭 그린 바가 1.1s 주기로 왕복 → 보조 문구(`mini`, `--hud-faint`: `Fetching Google Sheet…` → `Building graph…`). 인트로 첫 프레임이 그려지면 0.6s 페이드아웃.

### 에러 UI

화면 중앙 `.hud-panel`(안쪽 32px, 가운데 정렬): `// ERROR` → 메시지(`message`, `--hud-ink`: `데이터를 불러오지 못했습니다.` / WebGL 미지원 안내) → `다시 시도` 주 버튼. 에러가 나면 출처 배지는 `Error`.

### 그래프 오버레이(CSS2D)

- **노드 라벨**(`.graph-label`): 노드 바로 위(마커 반경 + 6 월드 단위)에 고정 px 크기로 붙는다. 주 줄 = 이름(`graph-name`, `--hud-ink`), 보조 줄 = 켜진 Labels 필드를 ` · `로 연결(`graph-sub`, `--hud-dim`; 조직·`NY`·닉네임·관심사 최대 2개). 허브는 이름만(`graph-hub`, `--color-primary`). 겹치는 라벨은 숨기는데 우선순위는 허브 > 선택 > 호버 > 이웃 > 크기 > 카메라 근접이고, 숨길 때 opacity 0으로 0.25s 전환한다. 선택 시 비활성 노드 라벨은 숨긴다.
- **링 눈금**(`.ring-tag`): `02Y`·`06Y`·`16Y`·`26Y`(`mini`, `--hud-dim`). 각 연차 링 위, 카메라 쪽 앞면(0.42π)에 놓인다.
- **선택 레티클**(`.reticle`): 네 모서리 ㄱ자 브래킷(팔 12px · 두께 2px · `--color-primary`). 한 변 = 화면상 마커 지름 + 14px이고 줌에 따라 매 프레임 갱신된다. 나타날 때 scale 1.6 → 1(0.3s).

## 3D 그래프 시각

렌더는 3d-force-graph(Three.js). 색은 모두 위 CSS 변수에서 읽는다.

### 무대

- **배경**: 캔버스 텍스처. `--hud-canvas` 위에 중심부 `--hud-canvas-glow` 방사형 글로우.
- **레이더 그리드**: 원반 평면보다 2단위 아래에 `PolarGridHelper` 12섹터 + 외곽 원(`--hud-grid-soft`, 0.7).
- **연차 링**: 인연 시작 2024 / 2020 / 2010 / 2000년의 궤도 반경에 원(`--hud-grid`, 0.55) + 눈금 `02Y`/`06Y`/`16Y`/`26Y`.
- **레이더 스윕**: π/7 부채꼴, `--color-primary` 불투명도 0.06(가산), 18초에 1회전.
- **라이트·블룸**: 보조 방향광 0.6. UnrealBloom은 strength 0.18 · radius 0.25 · threshold 0.85로, 사실상 허브 후광에만 걸린다.
- **색관리**: `renderer.outputColorSpace = SRGB`. OutputPass가 마지막에 한 번 인코딩한다. Linear로 바꾸면 모든 색이 토큰보다 어둡게 나온다.

### 레이아웃

- 허브는 원점에 고정. 나머지 노드의 허브 거리 = `orbitRadius(yearsKnown)`이고 로그 스케일이다(`R_MIN` 64 ~ `R_MAX` 280, 30년 이상은 최소 반경). **오래 알수록 중심에 가깝다.**
- `forceY`로 원반을 얇게 누르고, 소속·협업 링크는 짧게(28) 당겨 군집을 만든다. 허브 엣지는 배치에 관여하지 않는다(strength 0).
- warmup 300틱으로 미리 계산한 뒤 인트로에서 허브로부터 퍼져 나가고, 그다음 정적 고정된다(노드 드래그 없음).

### 노드

| 종류 | 표현 |
|---|---|
| **일반 = Blip** | 카메라를 향한 평면 스프라이트: 옅은 내부 채움(10%) + 링 + 중심 점. `--hud-blip` 틴트, 불투명도 0.9, **발광 없음**(Normal 블렌딩). 반경 = ∛val × 4.2, 지름 = 반경 × 2.4. val = √경력 기반. |
| **허브** | `--color-primary` Lambert 구체(무발광) + 로고 오빗 모티프(반경 × 2.4 궤도 링, 0.35rad 기울기, 0.7 불투명) + `--color-body` 위성 점(약 10.5초 1회 공전) + 아주 약한 후광 스프라이트(가산, 0.22). |

### 엣지

| 관계 | 표현 | 굵기 | 불투명도 | 기본 |
|---|---|---|---|---|
| affiliation | `--color-primary` 튜브 | 0.7 | 0.42 | on |
| collaboration | `--graph-collaboration` 골드 튜브(가장 굵음) | 1.1 | 0.70 | on |
| interest | `--color-primary-soft` 얇은 튜브 | 0.4 | 0.35 | off |
| hub | `--hud-dim` 점선 가이드(dash 2.2 / gap 2.6) | 선 | 0.45 | on |

모든 엣지는 Normal 블렌딩이다. flow 파티클(엣지당 2개, 폭 1.4)은 **선택 노드에 닿은 소속·협업 엣지에만** 흐른다.

### 상태

| 상태 | 변화 |
|---|---|
| **호버** | 커서 pointer, Blip 1.25배, 라벨 우선 표시 |
| **선택** | Blip 색 → `--hud-ink`, 레티클 표시, 카메라 fly-to, 좌측 상세. 이웃이 아닌 노드는 불투명도 × 0.025. 선택 노드에 닿은 엣지 0.95, 나머지 0.012, 허브 점선 0.036. |
| **해제** | 같은 노드 재클릭 또는 배경 클릭. 카메라는 그대로 둔다. |

### 카메라

- **홈 시점**: 원반을 고도 약 37°에서 살짝 옆으로 비껴 내려다본다. 원반 전체 + 라벨 여유 40이 패널을 뺀 가용 폭(모바일 100%, 태블릿 92%)과 세로 75% 안에 들어오게 맞춘다.
- **조작**: 드래그 회전 + 관성(damping 0.12), 휠 줌. **자동 회전 없음.**
- **fly-to**: 900ms, 일반 노드 거리 340 / 허브 460. **Reset view**: 홈으로 800ms(선택은 유지).

## 모션

| 대상 | 동작 | 시간 |
|---|---|---|
| 인트로 | 노드가 허브에서 최종 위치로 확산(easeOutCubic) + 카메라 1.9배 거리에서 dolly-in | 1.6s |
| 레이더 스윕 | 부채꼴 회전 | 18s / 1회전 |
| 허브 위성 | 오빗 공전 | 약 10.5s / 1회전 |
| fly-to / Reset | 카메라 tween | 0.9s / 0.8s |
| 로딩 | 바 왕복 / 오버레이 페이드아웃 | 1.1s / 0.6s |
| 레티클 | scale 1.6 → 1 + 페이드인 | 0.3s |
| 패널 | 상세 페이드인 / 드로어·시트 슬라이드 | 0.2s / 0.25s |
| 라벨 | 겹침 숨김 opacity 전환 | 0.25s |
| 호버 | 프레임·글자색 전환 | 0.15s |

`prefers-reduced-motion: reduce`에서는 위 모션을 모두 끈다. 스윕·위성·인트로는 JS에서 생략하고, fly-to·Reset은 즉시 이동하며, CSS 애니메이션·트랜지션은 `none`이다.

## 브랜드 자산

- **로고**(`assets/logo/`): 오빗 단일 노드 컨셉. 궤도 링(`#8b949e`) + 위성(`#bdbdbd`) + 중심 허브(`#00d992`). `node-mark.svg`(아이콘), `node-horizontal.svg`(가로 락업), `node-stack.svg`(세로 스택), `favicon.svg`(16/32px 단순화). 헤더는 같은 도형을 인라인 SVG로 그리고 색은 CSS 변수로 지정한다.
- **OG 이미지**(`assets/og/`): `og-image.html`(HUD 디자인 1200×630 소스) → chromium 캡처 → `og-image.png`. 독립 렌더 소스라서 토큰 값을 hex로 직접 적는 유일한 예외 파일이다. 토큰을 바꾸면 이 파일도 같이 고친다.

## Do / Don't

### Do
- 색·치수는 `css/tokens.css` 변수로만 참조한다. JS 그래프 색도 `getComputedStyle`로 읽는다.
- 액센트 그린은 위 [액센트](#액센트) 표의 자리에만 쓴다.
- 패널은 반투명 + 블러 + 1px 프레임 + 코너 브래킷 조합으로 만든다.
- 모든 HUD 요소에 `--radius-hud`(2px)를 쓴다.
- 패널 제목은 `// ` 접두 영문 대문자 eyebrow로 쓴다.
- 숫자·크롬은 `--font-hud`, 한글 이름·본문은 `--font-sans`로 쓴다.
- Relations 토글의 스와치 색과 그래프 엣지 색을 항상 같게 유지한다(범례 겸용).
- 새 모션을 추가하면 `prefers-reduced-motion` 분기를 함께 넣는다.

### Don't
- 라이트 모드를 만들지 않는다.
- `box-shadow` 드롭섀도를 쓰지 않는다(그래프 라벨 텍스트 후광만 예외).
- 노드를 발광시키지 않는다. 가산 혼합·블룸은 허브 후광과 레이더 스윕에만 쓴다("지나치게 반짝인다" 피드백 이력).
- 비녹색 다색 팔레트를 도입하지 않는다. 협업 골드가 유일한 예외다("촌스럽다" 피드백 이력).
- 액센트 그린으로 본문 문장·값을 쓰지 않는다.
- pill 버튼·태그, 6~8px 둥근 카드를 만들지 않는다.
- 한글 eyebrow에 넓은 자간을 주지 않는다.
- 자동 회전을 넣지 않는다.
- [레거시 토큰](#레거시-토큰현재-미사용)을 새로 쓰지 않는다.

## 계보

초기 DESIGN.md는 Voltagent 마케팅 사이트 분석(#101010 캔버스 + 일렉트릭 그린 단일 액센트, Inter + SF Mono, 하어라인 카드, 6/8px 라운드)이었다. 2026-10 Command HUD 리디자인([설계 스펙](docs/superpowers/specs/2026-10-07-hud-redesign-design.md))으로 이 문서가 대체됐다.

- **이어받은 것**: 다크 전용, 단일 그린 액센트 `#00d992`, 드롭섀도 금지, 4px 스페이싱 스케일, 본문에 액센트 금지.
- **바뀐 것**: 캔버스 `#101010` → `#070a09`(그린 기운), 하어라인 `#3d3a39` → 그린 프레임 `rgba(0,217,146,.22)`, 회색 텍스트 → 민트·녹회색 HUD 잉크, 6/8px·pill → 2px 각진 형태, SF Mono → JetBrains Mono 크롬, 회색 구체 노드 → Blip 마커, 라벨 종류별 다색 → 단색 `--hud-dim`.

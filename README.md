# NODE — Network Of Domain Experts

운영자 **유광명**을 중심 허브로, AI 도메인 전문가 33명(확장 가능)의 네트워크를 **인터랙티브 3D 지식그래프**로 탐색하는 **제로빌드 정적 웹 대시보드**입니다. 경력·소속·관심사를 바탕으로 전문가 사이의 관계를 추론해 시각화합니다.

빌드 도구·백엔드·DB 없이 `index.html`과 CSS, 바닐라 JS(ES Modules), CDN 라이브러리만으로 동작합니다. 데이터는 공개 Google Sheets에서 런타임에 CSV로 가져오고, 실패하면 저장소에 동봉한 스냅샷으로 자동 전환됩니다.

- 요구사항 원천: [docs/PRD.md](docs/PRD.md)
- 개발 계획서: [docs/plan.md](docs/plan.md)
- 디자인 시스템(토큰): [DESIGN.md](DESIGN.md)

## 기술 스택

| 영역 | 기술 |
|---|---|
| 마크업/스타일 | HTML5, CSS (DESIGN.md 토큰을 CSS 변수로 매핑) |
| 로직 | 바닐라 JavaScript (ES Modules), 프레임워크·빌드 없음 |
| 그래프 | [3d-force-graph](https://github.com/vasturiano/3d-force-graph) + [Three.js](https://threejs.org/) + CSS2DRenderer — 인터랙티브 3D 렌더·드래그 회전·엣지 flow·고정크기 라벨 (CDN ESM) |
| CSV 파싱 | [PapaParse](https://www.papaparse.com/) (CDN) |
| 데이터 | Google Sheets 런타임 CSV fetch → 실패 시 `data/snapshot.csv` 폴백 |
| 배포 | 리포 루트 정적 파일 → GitHub Pages (빌드 없음) |

## 디렉토리 구조

```
/ (repo root, GitHub Pages 루트)
├── index.html          # 헤더 / 3분할 본문 / 푸터, CDN <script>
├── css/
│   ├── tokens.css      # DESIGN.md 토큰 → CSS 변수 매핑
│   └── styles.css      # 레이아웃·패널·반응형
├── js/
│   ├── main.js         # 부트스트랩 오케스트레이션 (엔트리)
│   ├── data.js         # CSV fetch·폴백·PapaParse 파싱
│   ├── normalize.js    # 동의어 맵·정규화·결측치 처리
│   ├── graph.js        # buildGraph(): 노드/엣지 모델 + 추론
│   ├── render.js       # 3d-force-graph 3D 렌더·드래그 회전·CSS2D 고정크기 라벨·엣지 flow·선택
│   └── panels.js       # 좌측 상세 / 우측 설정 패널
├── data/
│   └── snapshot.csv    # fetch 실패 시 폴백 스냅샷 (수동 갱신)
└── DESIGN.md           # 디자인 시스템(토큰) — 페이지 크롬 한정(그래프 레이어는 비구속)
```

## 데이터 갱신 (Google Sheet)

데이터의 단일 진실 원천(SSOT)은 공개 Google Sheet입니다. 운영자가 시트의 행을 추가·수정하면 대시보드 새로고침 시 즉시 반영됩니다(별도 배포 불필요).

- CSV 엔드포인트(gviz): `https://docs.google.com/spreadsheets/d/1fychV7omFIle0GpBAF2_ccAyF0cZAtY7IFsmkIS5sic/gviz/tq?tqx=out:csv&gid=0`
- 폴백 스냅샷 `data/snapshot.csv`는 **수동 갱신**입니다. 주기적으로 위 엔드포인트의 CSV를 내려받아 동일 스키마로 커밋하세요.

## 배포 (GitHub Pages)

빌드·GitHub Actions 없이 main 브랜치 루트를 GitHub Pages로 직접 서빙합니다.

1. GitHub 저장소 → **Settings → Pages**
2. **Source**: `Deploy from a branch`
3. **Branch**: `main` / **폴더**: `/ (root)` 선택 후 저장
4. 발급된 URL에서 정상 동작 확인

## 라이선스

Apache 2.0. [LICENSE](LICENSE) 참고.

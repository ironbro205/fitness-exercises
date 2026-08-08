# 자극 근육 인체도 — 자산 출처와 라이선스

`js/bodymap.js` 가 그리는 앞/뒤 전신 인체도의 **그림(SVG path)이 어디서 왔는지** 기록한 문서다.
나중에 "이 그림 어디서 가져왔지?" 하는 질문이 나오면 이 문서가 답이다.

## 결론 한 줄

> **자체 제작 원본이다. 외부 에셋을 하나도 쓰지 않았다. 라이선스 의무도 없다.**

`js/bodymap.js` 의 `BODY_CONTOUR`, `MUSCLE_REGIONS`, `PEC_*`, `DELT_*` 등 모든 path 문자열은
이 저장소를 위해 직접 그린 도형이다. 외부 인체도를 베끼거나 트레이싱하지 않았고, 참고 자산도 쓰지 않았다.
저작권자는 이 프로젝트이고, 출처 표기·share-alike 같은 3rd-party 의무가 붙지 않는다.

근육이 앞/뒤 어느 면에 보이는지, 서로 어디서 맞닿는지 같은 **해부학적 사실**만 일반 해부학 지식을 따랐다.
사실(fact)은 저작권 대상이 아니다.

## 왜 빌려오지 않았나 (조사 결과)

작업 전 오픈라이선스 근육 인체도 SVG를 전수 조사했다. 후보는 네 무리로 갈렸고, **네 무리 모두 못 쓴다.**

### (a) 그림 출처가 기록돼 있지 않은 MIT/Apache 저장소 — 이번 건의 진짜 함정

| 저장소 | 코드 라이선스 | 문제 |
|---|---|---|
| `HichamELBSI/react-native-body-highlighter` | MIT (© 2022 ELABBASSI Hicham) | 저장소 어디에도 **그림 출처 표기가 없다**(credits 없음, SOURCES 파일 없음, 커밋 메시지에도 없음). MIT LICENSE 는 이슈 #20/#23 에서 뒤늦게 추가됐다. "저장소 주인이 직접 그렸을 것"이라는 추정만 있고, 그림에 대한 명시적 권리 부여가 없다. |
| `vulovix/body-muscles` | Apache-2.0 | 동일 문제. NOTICE 에 "Copyright 2024 Ivan Vulović" 만 있고 제3자 아트워크 표기가 없다. |

**코드 라이선스가 MIT라는 사실이 그림의 권리 사슬을 증명해 주지 않는다.** 침해 증거도 없지만 결백 증거도 없다.
"라이선스가 불명확한 자산은 사용 금지" 원칙의 정확한 해당 사례로 봤다.

### (b) 표기 사슬이 이미 끊어진 파생물 — 쓰면 우리가 위반 하류에 놓임

- `melihcolpan/MuscleMap`: Hicham 의 앞면 88/88 · 뒷면 70/70 path 가 한 글자도 안 틀리고 들어 있는데
  헤더는 "© 2026 Melih Colpan. All rights reserved." 이고 Hicham 표기가 없다.
- `soroojshehryar/react-muscle-highlighter`: `bodyFront.ts` 가 바이트 단위 동일(25,205 bytes,
  md5 `5acaa0258878f578d23e638b0a51eb3a`)인데 LICENSE 에서 **저작권자 줄 자체를 삭제**했다.
- `abdofallah/MuscleMapJS`: melihcolpan 은 표기했지만 melihcolpan 이 아무도 표기 안 해 사슬이 한 칸 못 미쳐 끊긴다.

### (c) 출처가 완벽히 추적되는 유일한 그림 = 전염성 copyleft

- Wikimedia `File:Muscular_system.svg` / `Muscular_system-back.svg` (작가 Termininja) = **CC BY-SA 3.0**.
- `wger-project/wger` 가 이 둘을 잘라 근육별 오버레이로 쓰고, `SOURCES` 파일에 출처를 밝힌다(코드는 AGPL-3.0).
- **share-alike 가 전염된다** — 수정본도 CC BY-SA 로 공개해야 한다. 상업/비공개 앱에 부적합.
- 이 도해를 **밑에 깔고 따라 그리는 것도 2차적저작물**이라 마찬가지로 전염된다. 그래서 참고 자체를 안 했다.

### (d) 라이선스는 좋은데 구조적으로 못 쓰는 것들

- Openclipart CC0 "Male Musculature": 584개 무명 조각, 근육 경계와 path 경계 불일치, 앞면만.
- Openclipart "Muscles of a man": path 가 딱 2개.
- Servier CC BY 4.0: SVG 다운로드가 없다(PNG/PPTX).
- wger 개별 근육 오버레이 SVG: RDF 메타데이터에 `cc:license` 요소가 아예 없다.
- svgrepo.com: 봇 차단으로 라이선스 검증 자체가 불가.

### 결정타 — 빌려와도 손으로 그리는 양이 별로 안 준다

`js/data.js` 의 `BODY_PART_KR` 는 정확히 **21개 키**다.
`react-native-body-highlighter` 에는 이 중 **7개(`chest_upper`, `chest_lower`, `shoulders_front/side/rear`,
`lats`, `glutes_med`)가 없고** 대신 head/hair/ankles 처럼 안 쓰는 슬러그를 얹어 준다.
어차피 3분의 1을 직접 그려야 하고, 그러면 화풍이 섞인 혼혈 도형이 된다.
`vulovix` 는 반대로 89개라 다대일 병합이 필요한데, 병합 = path 수정 = Apache "변경 사실 명시" 의무가 발동한다.

→ **손으로 그리면 라이선스 리스크 0, 우리가 저작권자, 앞뒤 합쳐 약 6KB.** 비용 대비 이득이 명백했다.

## 앞으로 지킬 것

- `js/bodymap.js` 에 **muscle-highlighter 계열 오픈소스의 path 를 붙여 넣지 말 것.**
- 그림을 고칠 일이 있으면 기존 좌표계(viewBox `0 0 200 400`, 왼쪽 절반만 그리고 미러링) 안에서 직접 수정한다.
- 시각 참고가 꼭 필요하면 CC0 자료(Mikael Häggström 인체 외곽선, 1918년 Gray's Anatomy)만 쓴다.

## 그림 구조 (수정할 사람을 위한 요약)

- 좌표계: `viewBox="0 0 200 400"` — 머리 꼭대기 y≈8, 발바닥 y≈392, **좌우 대칭축 x=100**.
- **왼쪽 절반(x<100)만 그리고**, 오른쪽은 `transform="translate(200,0) scale(-1,1)"` 로 뒤집어 복사한다.
  → path 를 절반만 관리하면 되고 좌우가 어긋날 수 없다.
- 앞뒤 실루엣은 같은 path(`BODY_CONTOUR`)를 공유하고, 위에 얹는 `MUSCLE_REGIONS.front` / `.back` 만 다르다.
- 윤곽선은 **닫지 않은 열린 path** 다. 닫아서 테두리를 그리면 몸 한가운데 세로줄이 생겨 그림이 갈라져 보인다.
- 같은 층(tier)끼리는 살짝 겹쳐도 된다 — 색이 같아 티가 안 나고, 강조 근육은 항상 마지막에 그려 위로 올라온다.
- 대흉근은 상·중·하 3단으로 그린다. `chest`(전체) 키가 3단 전부를 갖고, `chest_upper`/`chest_lower` 는 자기 단만 갖는다.
  → 인클라인은 윗단만, 플랫 벤치는 가슴 전체가 진하게 칠해진다.
- 앞뷰 옆구리 띠는 해부학적으로는 전거근에 가깝지만 앱에 `serratus` 키가 없어 `lats` 로 흡수했다.

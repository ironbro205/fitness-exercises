# 세트법 개편 v2 — 라이브 배포 QA 화면

`v57` 배포(https://fitness-exercises-iota.vercel.app) 를 헤드리스 크롬으로 열어 찍었다.
360px 포트레이트 · deviceScaleFactor 2. 콘솔 에러 없음, 가로 스크롤 없음.

| 파일 | 무엇을 확인했나 |
|---|---|
| `01-scheme-sheet-top.png` | 세트법 시트 **7종** 상단 — 스트레이트 / 탑+백오프(기본) / 탑+백다운 / 피라미드 / 역피라미드 |
| `02-scheme-sheet-bottom.png` | 같은 시트 하단 — 드롭세트 / 마이오렙, 그리고 근거상 주의 문구(`var(--warn)`) |
| `03-session-backdown.png` | 세션 화면의 탑+백다운 — 백다운 목표가 `12~15회` 로 뜬다 |
| `04-prescription-table.png` | 2단계 처방 표 — 세트 구성 줄이 실제 세트 배열에서 나온다 |

배경·판정 근거는 [`../set-schemes-v2.md`](../set-schemes-v2.md) 상단 '구현 상태' 표 참조.

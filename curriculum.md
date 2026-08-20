# 시스템 설계 학습 커리큘럼

교재: `./system-design-primer/` (System Design Primer 로컬 사본)
기준: 총 25개 섹션, 주 1~2개 진도 (약 4~6개월 과정)
난이도: 하(입문) / 중(개념 조합) / 상(여러 개념 종합)

면접 대비 전용 자료(Anki 덱, 기출 문제 링크 모음, 회사별 기술 블로그
모음)는 커리큘럼에서 제외했다.

원문 경로의 `L숫자` 는 해당 파일의 시작 줄 번호다 (로컬 사본 기준).

## 1부 — 기초 개념

| # | 섹션 | 원문 경로 | 난이도 |
|---|------|-----------|--------|
| 1 | 확장성(Scalability) 첫걸음 — 강의·글 리뷰 | `system-design-primer/README.md` L372 (System design topics: start here) | 하 |
| 2 | 성능(Performance) vs 확장성(Scalability) · 지연시간(Latency) vs 처리량(Throughput) | `system-design-primer/README.md` L412, L426 | 하 |
| 3 | 가용성(Availability) vs 일관성(Consistency) — CAP 정리 | `system-design-primer/README.md` L438 | 중 |
| 4 | 일관성 패턴(Consistency patterns) | `system-design-primer/README.md` L473 | 중 |
| 5 | 가용성 패턴(Availability patterns) — 장애 조치(Failover)·복제(Replication)·가용성 수치 | `system-design-primer/README.md` L499 | 중 |

## 2부 — 시스템 구성요소

| # | 섹션 | 원문 경로 | 난이도 |
|---|------|-----------|--------|
| 6 | 도메인 네임 시스템(DNS) | `system-design-primer/README.md` L581 | 하 |
| 7 | 콘텐츠 전송 네트워크(CDN) — 푸시/풀 방식 | `system-design-primer/README.md` L619 | 하 |
| 8 | 로드밸런서(Load balancer) — L4/L7, 수평 확장 | `system-design-primer/README.md` L660 | 중 |
| 9 | 리버스 프록시(Reverse proxy) — 로드밸런서와의 차이 | `system-design-primer/README.md` L730 | 하 |
| 10 | 애플리케이션 계층(Application layer) — 마이크로서비스(Microservices)·서비스 디스커버리(Service discovery) | `system-design-primer/README.md` L773 | 중 |
| 11 | 데이터베이스 ① — 관계형 DB(RDBMS)와 복제(Replication) | `system-design-primer/README.md` L808 | 중 |
| 12 | 데이터베이스 ② — 페더레이션(Federation)·샤딩(Sharding)·비정규화(Denormalization)·SQL 튜닝 | `system-design-primer/README.md` L874 | 상 |
| 13 | 데이터베이스 ③ — NoSQL 4종 (키-값(Key-value)·문서(Document)·와이드 컬럼(Wide column)·그래프(Graph)) | `system-design-primer/README.md` L991 | 중 |
| 14 | SQL vs NoSQL — 무엇을 언제 쓰나 | `system-design-primer/README.md` L1090 | 중 |
| 15 | 캐시(Cache) ① — 캐시 계층 (클라이언트·CDN·웹서버·DB·애플리케이션) | `system-design-primer/README.md` L1132 | 중 |
| 16 | 캐시(Cache) ② — 갱신 전략 (캐시 어사이드(Cache-aside)·라이트 스루(Write-through)·라이트 비하인드(Write-behind)·리프레시 어헤드(Refresh-ahead)) | `system-design-primer/README.md` L1199 | 상 |
| 17 | 비동기 처리(Asynchronism) — 메시지 큐(Message queue)·태스크 큐(Task queue)·백프레셔(Back pressure) | `system-design-primer/README.md` L1324 | 중 |
| 18 | 통신 ① — HTTP · TCP · UDP | `system-design-primer/README.md` L1370 | 중 |
| 19 | 통신 ② — 원격 프로시저 호출(RPC) vs REST | `system-design-primer/README.md` L1455 | 중 |
| 20 | 보안(Security) 기초 | `system-design-primer/README.md` L1560 | 하 |

## 3부 — 심화

| # | 섹션 | 원문 경로 | 난이도 |
|---|------|-----------|--------|
| 21 | 어림 계산(Back-of-the-envelope) — 2의 거듭제곱 표·지연시간 수치표 | `system-design-primer/README.md` L1577 (Appendix: L1581, L1600) | 중 |
| 22 | 설계 문제 접근법 4단계 — 요구사항 → 상위 설계 → 핵심 구성요소 → 확장 | `system-design-primer/README.md` L218 | 중 |

## 4부 — 실전 설계문제

| # | 섹션 | 원문 경로 | 난이도 |
|---|------|-----------|--------|
| 23 | Pastebin.com (또는 Bit.ly) 설계 — 짧은 주소/글 저장 서비스 | `system-design-primer/solutions/system_design/pastebin/README.md` | 상 |
| 24 | Twitter 타임라인과 검색 설계 — 피드(Feed) 시스템 | `system-design-primer/solutions/system_design/twitter/README.md` | 상 |
| 25 | AWS에서 수백만 사용자로 확장하기 — 전체 종합 | `system-design-primer/solutions/system_design/scaling_aws/README.md` | 상 |

## 비고

- 3부 22번(접근법 4단계)까지 마친 뒤 4부에 들어간다. 4부는 앞의
  모든 개념을 종합하는 단계다.
- 4부를 마친 뒤 더 원하면 추가 문제를 이어서 진행할 수 있다:
  웹 크롤러(`solutions/system_design/web_crawler/README.md`),
  Mint.com(`solutions/system_design/mint/README.md`),
  소셜 그래프(`solutions/system_design/social_graph/README.md`),
  검색엔진용 키-값 저장소(`solutions/system_design/query_cache/README.md`),
  Amazon 판매 순위(`solutions/system_design/sales_rank/README.md`).
- 각 섹션의 그림은 `system-design-primer/images/` 폴더에 있고, 원문
  해당 위치에 파일명이 표시되어 있다.

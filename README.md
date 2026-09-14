# Paper Archive

로컬 논문 폴더를 그대로 탐색하고, 원문과 해설 PDF를 한 화면에서 나란히 읽는 데스크톱 애플리케이션입니다. 파일은 외부 서버로 업로드되지 않습니다.

## 주요 기능

- 최상위 폴더부터 하위 폴더까지 같은 카드 구조로 탐색
- 각 폴더 안의 대표 논문을 자동으로 골라 첫 페이지를 흐린 표지로 표시
- 원문 PDF와 해설 PDF를 1:1 분할 화면으로 렌더링
- `좌우 바꾸기`, 독립 확대/축소, 긴 PDF 지연 렌더링 지원
- 자동 매칭이 실패하면 해설 PDF를 직접 지정하고 다음 실행에도 기억

## 파일 정리 방법

기존 폴더 구조를 바꿀 필요는 없습니다. 같은 폴더에서 아래처럼 이름을 맞추면 자동으로 한 쌍으로 인식합니다.

```text
Paper Library/
├─ Superconductivity/
│  ├─ BCS theory.pdf
│  └─ BCS theory_해설.pdf
└─ Quantum Hall/
   ├─ Braiding experiment.pdf
   └─ Braiding experiment-notes.pdf
```

해설 파일명에는 `해설`, `설명`, `주석`, `노트`, `commentary`, `explanation`, `notes`, `guide`, `summary`, `annotated`, `analysis`를 사용할 수 있습니다. 한 폴더에 원문과 해설이 각각 하나뿐이면 이름이 달라도 자동으로 연결합니다.

폴더 표지는 다음 순서로 정합니다.

1. 파일명에 `대표`, `representative`, `featured`, `main`, `overview`, `review`, `introduction`이 있는 논문
2. 현재 폴더에 바로 들어 있는 논문
3. 폴더명과 파일명이 가까운 논문
4. 경로가 얕고 파일명이 짧은 논문

## 실행

Node.js 20 이상이 필요합니다.

```bash
npm install
npm run dev
```

일반 실행은 다음 명령을 사용합니다.

```bash
npm start
```

Windows 설치 파일과 포터블 실행 파일은 Windows에서 다음 명령으로 만들 수 있습니다.

```bash
npm run dist:win
```

결과물은 `release/` 폴더에 생성됩니다. macOS는 `npm run dist:mac`, Linux는 `npm run dist:linux`를 사용합니다.

## 검증

```bash
npm run check
```

폴더/파일명 매칭 테스트와 프로덕션 빌드를 함께 실행합니다.

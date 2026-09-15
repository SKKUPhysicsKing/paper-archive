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


## Windows 설치 및 자동 업데이트

일반 사용자는 GitHub Releases에서 `Paper-Archive-Setup-<version>.exe`를 내려받아 한 번 설치합니다. 설치 후에는 Node.js나 npm 명령이 필요하지 않습니다.

설치형 Windows 앱은 시작 5초 후 새 GitHub Release를 확인하고, 이후 6시간마다 다시 확인합니다. 새 버전이 있으면 다운로드 여부를 묻고, 다운로드가 완료되면 `Restart and update`를 선택하여 설치합니다. 논문 파일과 사용자 설정은 업데이트 과정에서 변경되지 않습니다.

자동 업데이트는 NSIS 설치본에서만 지원합니다. Portable 실행 파일은 수동으로 교체해야 합니다.

### 새 버전 배포

1. 새 기능을 `main`에 병합할 준비를 합니다.
2. 아래 명령처럼 `package.json`과 `package-lock.json`의 버전을 함께 증가시킵니다.
3. 버전 변경을 포함한 PR을 `main`에 병합합니다.
4. GitHub Actions가 자동으로 테스트하고, `v<version>` Release와 Windows 설치 파일, `latest.yml`, blockmap을 게시합니다.

```bash
npm version patch --no-git-tag-version
```

수동 재실행이 필요하면 GitHub의 Actions 페이지에서 **Release Windows app → Run workflow**를 사용할 수 있습니다.

### 보안 및 설치 파일 검증

배포 전에 전체 npm 의존성 감사, 테스트, 프로덕션 빌드와 CodeQL 검사를 수행합니다. 각 Release에는 설치 파일과 함께 `SHA256SUMS.txt`, CycloneDX 형식의 `sbom.cdx.json`, GitHub 빌드 출처 증명이 게시됩니다.

Windows에서 다운로드한 설치 파일의 해시를 확인하려면 PowerShell에서 다음을 실행하고, 결과를 해당 Release의 `SHA256SUMS.txt`와 비교합니다.

```powershell
Get-FileHash .\Paper-Archive-Setup-0.2.3.exe -Algorithm SHA256
```

코드 서명이 없는 빌드에서는 검사 결과가 깨끗해도 SmartScreen의 `알 수 없는 게시자` 경고가 나타날 수 있습니다. 이 경고를 정식으로 제거하려면 신뢰된 Windows Authenticode 코드 서명 인증서가 필요합니다. 인증서를 준비한 뒤 GitHub Actions 저장소 비밀에 `WINDOWS_CSC_LINK`(Base64 또는 인증서 링크)와 `WINDOWS_CSC_KEY_PASSWORD`를 설정하면 이후 Release 빌드가 자동으로 서명됩니다. 인증서와 암호를 저장소 파일이나 로그에 넣으면 안 됩니다.

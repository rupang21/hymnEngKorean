# 📖 찬송가 / Hymnal — 한영 이중 언어 찬송가 앱

> 한국어와 영어 가사를 함께 볼 수 있는 웹 기반 찬송가 앱입니다.  
> A bilingual Korean-English hymnal Progressive Web App (PWA).

🌐 **Live Site**: [https://rupang21.github.io/hymnEngKorean/](https://rupang21.github.io/hymnEngKorean/)

---

## ✨ 주요 기능 / Features

### 찬송가 / Hymnals
- 🎵 **새찬송가** (Korean New Hymnal) — 645곡, 한영 가사 + 악보
- ⛪ **트리니티 찬송가** (Trinity Hymnal) — 영어 + 한국어 가사

### 문답 / Catechism
- 📚 **소요리문답** (Westminster Shorter Catechism) — 한영 107문답
- 📖 **대요리문답** (Westminster Larger Catechism) — 한영 196문답

### 예배 / Liturgy
- 🙏 **고백과 사함** (Confession & Pardon)
- 🕊️ **주기도문** (Lord's Prayer)

### 앱 기능 / App Features
- 🌓 다크 / 라이트 모드 (Dark / Light Mode)
- 🔤 한국어 / 영어 전환 (Language Toggle)
- 📱 PWA — 홈 화면에 설치 가능 (Installable, Offline Capable)
- 🔍 제목·가사 검색 (Title & Lyrics Search)
- 🎼 악보 보기 (Sheet Music View)
- 🔖 마지막 열람 찬송 기억 (Last Viewed Memory)

---

## 🖥️ 로컬 실행 / Run Locally

```bash
# 1. 클론 / Clone
git clone https://github.com/rupang21/hymnEngKorean.git
cd hymnEngKorean

# 2. 서버 실행 / Start server
node server.js

# 3. 브라우저 열기 / Open browser
# http://localhost:3000
```

> **Node.js** 가 설치되어 있어야 합니다.

또는 VS Code의 **Live Server** 익스텐션으로 `index.html` 을 직접 열어도 됩니다.

---

## 🗂️ 프로젝트 구조 / Project Structure

```
hymnEngKorean/
├── index.html          # 메인 페이지
├── sw.js               # Service Worker (PWA 오프라인 지원)
├── manifest.json       # PWA 매니페스트
├── css/
│   └── styles.css      # 스타일시트
├── js/
│   └── app.js          # 메인 앱 로직
├── data/
│   ├── hymns.json          # 새찬송가 데이터
│   ├── trinity_hymns.json  # 트리니티 찬송가
│   ├── catechism.json      # 소요리문답
│   ├── larger_catechism.json # 대요리문답
│   └── liturgies.json      # 예배 순서 (고백, 주기도문 등)
└── assets/
    ├── scores/         # 악보 이미지 (GIF)
    └── icons/          # 앱 아이콘
```

---

## 📦 기술 스택 / Tech Stack

| 항목 | 기술 |
|------|------|
| Frontend | Vanilla HTML / CSS / JavaScript |
| 배포 | GitHub Pages |
| PWA | Service Worker + Web App Manifest |
| 데이터 | JSON (정적 파일) |

별도의 빌드 도구나 프레임워크 없이 순수 웹 기술로 구현되었습니다.

---

## 📝 데이터 출처 / Data Sources

- **새찬송가**: 한국찬송가공회 (Korean Hymnal Society)
- **트리니티 찬송가**: Trinity Hymnal (OPC/PCA)
- **웨스트민스터 소요리문답 / 대요리문답**: Westminster Standards (Public Domain)
- **악보**: 공개 제공 자료 기반

---

## 🤝 기여 / Contributing

버그 리포트나 개선 제안은 [Issues](https://github.com/rupang21/hymnEngKorean/issues) 탭에 남겨주세요!

Pull Request도 환영합니다 :)

---

## 📄 라이선스 / License

개인 및 교회 예배 사용 목적으로 자유롭게 사용하실 수 있습니다.  
찬송가 가사 및 악보의 저작권은 각 저작권자에게 있습니다.

Free to use for personal and church worship purposes.  
Lyrics and sheet music copyrights belong to their respective owners.

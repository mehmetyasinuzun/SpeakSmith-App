# SpeakSmith

Türkçe konuşanlar için ücretsiz İngilizce uygulaması. **İngilizcenin içinde kal. Yalnız kalma.**

- **Site ve indirme:** https://ingilizce.mehmetyasinuzun.com.tr/ · [İndirme sayfası](https://ingilizce.mehmetyasinuzun.com.tr/indir/)
- **Tarayıcıda dene:** https://ingilizce.mehmetyasinuzun.com.tr/uygulama/
- **Android APK'ları:** [Releases](https://github.com/mehmetyasinuzun/SpeakSmith-App/releases/latest)
  - Çoğu telefon için `speaksmith-arm64.apk` (sürüm sayfasında `speaksmith-v<sürüm>-arm64.apk` adıyla duran aynı dosya).
  - 32 bit telefonlar için `-arm32.apk`; x86_64 cihazlar ve emülatör için `-x64.apk`.
  - `-universal.apk` yalnız alışılmadık işlemcili bir cihaza ilk kurulum içindir; kurulu bir SpeakSmith'in üstüne kurulmaz. Güncellerken ilk kurduğun türü indir.
- **Gizlilik politikası:** https://ingilizce.mehmetyasinuzun.com.tr/gizlilik/ · **Kullanım koşulları:** https://ingilizce.mehmetyasinuzun.com.tr/gizlilik/kosullar.html
- **Destek ve hata bildirimi:** [Issues](https://github.com/mehmetyasinuzun/SpeakSmith-App/issues)

**Güncellemeler:** uygulama açılışta bu depodaki `update.json` dosyasını okur; yeni sürüm varsa sorar,
telefonuna uygun APK'yı bu deponun sürüm sayfasından indirir ve kurmadan önce SHA-256 özetini
`update.json`'daki özetle karşılaştırır. Özet tutmazsa kurulmaz.

Bu depo yalnızca dağıtım içindir: tanıtım sitesi, web sürümü, Android sürümleri ve uygulama içi
güncellemenin okuduğu `update.json`. Uygulamanın kaynak kodu ayrı bir özel depodadır.

Her APK aynı anahtarla imzalıdır (sertifika SHA-256
`1F:0B:A7:7D:57:FB:C1:1E:28:F0:AC:27:87:DD:03:31:B0:DF:76:95:61:EF:4F:06:BA:72:66:1A:E8:64:F7:CD`);
sürüm sayfasında her dosyanın SHA-256 özeti yazar.

---

SpeakSmith is a free app that teaches English to Turkish speakers. This repository only hosts the
promo site, the web build, Android releases and the in-app update manifest (`update.json`, which the
app reads to find new versions and to verify each downloaded APK's SHA-256); the source code lives in
a separate private repository. Site: https://ingilizce.mehmetyasinuzun.com.tr/en/

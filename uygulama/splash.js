// Flutter ilk frame'i çizdikten sonra HTML açılış ekranını kaldır.
// (Satır içi değil ayrı dosya: içerik güvenlik politikası satır içi betiğe izin vermez.)
window.addEventListener('flutter-first-frame', function () {
  var s = document.getElementById('app-splash');
  if (s) {
    s.classList.add('hidden');
    setTimeout(function () { s.remove(); }, 400);
  }
});

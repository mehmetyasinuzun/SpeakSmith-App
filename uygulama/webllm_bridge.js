// SpeakSmith — WebLLM bridge.
// MLC-LLM / WebLLM kullanarak tarayıcıda LLM çalıştırır.
// WebGPU gerekir (Chrome 113+, Edge, Safari 18+).

//
// TEMBEL YÜKLEME: WebLLM kütüphanesi açılışta YÜKLENMEZ. Bu dosya
// yalnız küçük bir köprü nesnesi kurar; kütüphane, kullanıcı tarayıcı modelini
// ilk kullandığında (init / deleteCached / load) dinamik import ile gelir.
// Tarayıcı modelini hiç kullanmayan kullanıcıda dış betik isteği gitmez.
// Denetim: tools/web_audit.js.

/// Kesin sürüm, uygulamanın kendi kökünden (dış CDN yok). npm paketinden
/// bayt bayt kopya; kaynak ve özet: vendor/web-llm-0.2.79/KAYNAK.txt.
/// Özet nöbetçisi: test/webllm_vendor_guard_test.dart.
export const WEBLLM_URL = new URL("./vendor/web-llm-0.2.79/index.js", import.meta.url).href;

let webllm = null;
let libPromise = null;

/// Kütüphaneyi bir kez yükler; başarısız yükleme sonraki çağrıda yeniden denenir.
function loadLib() {
  if (webllm) return Promise.resolve(webllm);
  if (!libPromise) {
    libPromise = import(WEBLLM_URL).then(
      (m) => { webllm = m; return m; },
      (e) => { libPromise = null; throw e; },
    );
  }
  return libPromise;
}

/// Tarayıcı önbelleğinde WebLLM'in bıraktığı bir kova var mı? (Kütüphaneyi
/// yüklemeden.) Yoksa model hiç indirilmemiştir: kütüphane gerekmez.
async function hasWebLlmCache() {
  try {
    if (typeof caches === 'undefined') return false;
    const keys = await caches.keys();
    return keys.some((k) => k.startsWith('webllm'));
  } catch (_) {
    return false;
  }
}

class SpeakSmithLLM {
  constructor() {
    this.engine = null;
    this.currentModel = null;
    this.loading = false;
  }

  hasWebGpu() {
    return typeof navigator !== 'undefined' && 'gpu' in navigator;
  }

  isReady() {
    return this.engine !== null;
  }

  currentModelId() {
    return this.currentModel;
  }

  /// Kütüphane yüklendi mi (dış istek gitti mi)?
  isLoaded() {
    return webllm !== null;
  }

  /// Kütüphaneyi yükler (gerekirse). Dart köprüsü model işlemlerinden önce bekler.
  async load() {
    await loadLib();
    return true;
  }

  /// MLC catalog'da kayıtlı tüm model_id'leri döner (validasyon için).
  /// Kütüphane yüklenmeden boş liste döner (önce load()).
  /// Dart tarafı bu listede olmayan ID'yi indirmeye çalışırsa, kullanıcıya
  /// "bu model şu an WebLLM tarafından desteklenmiyor" diye uyarı çıkarır.
  availableModelIds() {
    try {
      const list = webllm?.prebuiltAppConfig?.model_list ?? [];
      return list.map(m => m.model_id);
    } catch (e) {
      return [];
    }
  }

  isModelSupported(modelId) {
    return this.availableModelIds().includes(modelId);
  }

  async init(modelId, progressCallback) {
    if (this.engine && this.currentModel === modelId) return true;
    if (this.loading) throw new Error('Model zaten yükleniyor');
    if (!this.hasWebGpu()) {
      throw new Error('Bu tarayıcıda WebGPU yok. Chrome / Edge / Safari 18+ gerekir.');
    }
    this.loading = true;
    try {
      await loadLib();
      // Erken validasyon — listede olmayan model_id ile uğraşma
      if (!this.isModelSupported(modelId)) {
        const sample = this.availableModelIds().slice(0, 3).join(', ');
        throw new Error(
          `"${modelId}" WebLLM kataloğunda yok. Desteklenenler örn.: ${sample}. ` +
          `Uygulamayı güncelle veya başka model seç.`
        );
      }
      if (this.engine) {
        try { await this.engine.unload(); } catch (_) {}
        this.engine = null;
      }
      this.engine = await webllm.CreateMLCEngine(modelId, {
        initProgressCallback: (report) => {
          if (typeof progressCallback === 'function') {
            try { progressCallback(report.progress || 0, report.text || ''); } catch (_) {}
          }
        },
      });
      this.currentModel = modelId;
      return true;
    } finally {
      this.loading = false;
    }
  }

  async unload() {
    if (this.engine) {
      try { await this.engine.unload(); } catch (_) {}
      this.engine = null;
      this.currentModel = null;
    }
  }

  /// Verilen kimliklerden tarayıcı önbelleğinde ağırlıkları DURANLAR.
  /// Sayfa yenilenince motor bellekten gider ama ağırlıklar Cache Storage'da
  /// kalır: "indirilmedi" demek yerine önbellekten yeniden yüklenebilir.
  async cachedModelIds(modelIds) {
    const out = [];
    // Hiç indirme yapılmamışsa kütüphaneyi (dış isteği) tetikleme.
    if (!webllm && !(await hasWebLlmCache())) return out;
    try { await loadLib(); } catch (_) { return out; }
    for (const id of modelIds || []) {
      try {
        if (this.isModelSupported(id) && await webllm.hasModelInCache(id)) out.push(id);
      } catch (_) {}
    }
    return out;
  }

  /// Modelin önbellekteki ağırlıklarını siler (yüklüyse önce boşaltır).
  async deleteCached(modelId) {
    if (this.currentModel === modelId) await this.unload();
    await loadLib();
    try { await webllm.deleteModelAllInfoInCache(modelId); } catch (_) {}
  }

  async complete(messages, options) {
    if (!this.engine) throw new Error('Model henüz yüklenmedi');
    const opts = options || {};
    const response = await this.engine.chat.completions.create({
      messages: messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 512,
    });
    return response.choices?.[0]?.message?.content ?? '';
  }

  // Streaming with callback for each chunk (Dart bridge çağırır)
  async stream(messages, options, chunkCallback) {
    if (!this.engine) throw new Error('Model henüz yüklenmedi');
    const opts = options || {};
    const completion = await this.engine.chat.completions.create({
      messages: messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 512,
      stream: true,
    });
    for await (const chunk of completion) {
      const text = chunk.choices?.[0]?.delta?.content;
      if (text && typeof chunkCallback === 'function') {
        chunkCallback(text);
      }
    }
  }
}

window.speakSmithLLM = new SpeakSmithLLM();
console.log('[SpeakSmith] WebLLM bridge ready (lazy), WebGPU:', window.speakSmithLLM.hasWebGpu());

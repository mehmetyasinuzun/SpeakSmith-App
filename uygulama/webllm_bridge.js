// SpeakSmith — WebLLM bridge.
// MLC-LLM / WebLLM kullanarak tarayıcıda LLM çalıştırır.
// WebGPU gerekir (Chrome 113+, Edge, Safari 18+).

import * as webllm from "https://esm.run/@mlc-ai/web-llm@0.2.79";

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

  /// MLC catalog'da kayıtlı tüm model_id'leri döner (validasyon için).
  /// Dart tarafı bu listede olmayan ID'yi indirmeye çalışırsa, kullanıcıya
  /// "bu model şu an WebLLM tarafından desteklenmiyor" diye uyarı çıkarır.
  availableModelIds() {
    try {
      const list = webllm.prebuiltAppConfig?.model_list ?? [];
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
    // Erken validasyon — listede olmayan model_id ile uğraşma
    if (!this.isModelSupported(modelId)) {
      const sample = this.availableModelIds().slice(0, 3).join(', ');
      throw new Error(
        `"${modelId}" WebLLM kataloğunda yok. Desteklenenler örn.: ${sample}. ` +
        `Uygulamayı güncelle veya başka model seç.`
      );
    }
    this.loading = true;
    try {
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
console.log('[SpeakSmith] WebLLM bridge ready, WebGPU:', window.speakSmithLLM.hasWebGpu());

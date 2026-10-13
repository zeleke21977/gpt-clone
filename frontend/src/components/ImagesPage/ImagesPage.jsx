import { useEffect, useState } from "react";
import { Sparkles, Trash2, Download, Loader2 } from "lucide-react";

import api, { API_ORIGIN, errorMessage } from "../../api.js";
import styles from "./ImagesPage.module.css";

export default function ImagesPage() {
  const [images, setImages] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    api
      .get("/images")
      .then((response) => {
        if (!cancelled) setImages(response.data.images || []);
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();

    const text = prompt.trim();
    if (!text || isGenerating) return;

    try {
      setIsGenerating(true);
      setError("");

      const response = await api.post("/images/generate", { prompt: text });

      setImages((prev) => [response.data.image, ...prev]);
      setPrompt("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this image?")) return;

    try {
      await api.delete(`/images/${id}`);
      setImages((prev) => prev.filter((image) => image.id !== id));
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div className="page">
      <div className="pageInner">
        <h1 className="pageTitle">Images</h1>
        <p className="pageSubtitle">
          Describe an image and generate it. Everything you create is saved
          here.
        </p>

        <form className={styles.form} onSubmit={handleGenerate}>
          <input
            className={styles.input}
            placeholder="Describe the image you want..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isGenerating}
            maxLength={2000}
          />

          <button
            type="submit"
            className="primaryBtn"
            disabled={isGenerating || !prompt.trim()}
          >
            {isGenerating ? (
              <Loader2 size={16} className={styles.spin} />
            ) : (
              <Sparkles size={16} />
            )}
            {isGenerating ? "Creating..." : "Create"}
          </button>
        </form>

        {error && <p className="errorText">{error}</p>}

        {isLoading ? (
          <p className={styles.empty}>Loading images...</p>
        ) : images.length === 0 && !isGenerating ? (
          <p className={styles.empty}>
            No images yet. Try “a lion wearing a traditional Ethiopian
            shamma, watercolor”.
          </p>
        ) : (
          <div className={styles.grid}>
            {isGenerating && (
              <div className={`${styles.card} ${styles.placeholder}`}>
                <Loader2 size={26} className={styles.spin} />
              </div>
            )}

            {images.map((image) => {
              const src = `${API_ORIGIN}${image.url}`;

              return (
                <figure key={image.id} className={styles.card}>
                  <img src={src} alt={image.prompt} loading="lazy" />

                  <figcaption>{image.prompt}</figcaption>

                  <div className={styles.actions}>
                    <a
                      href={src}
                      download={image.file_name}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Download image"
                    >
                      <Download size={16} />
                    </a>

                    <button
                      type="button"
                      aria-label="Delete image"
                      onClick={() => handleDelete(image.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </figure>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

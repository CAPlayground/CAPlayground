import { useEditor } from '@/components/editor/editor-context';
import { useEffect } from 'react';

export function useClipboard() {
  const {
    copySelectedLayer,
    pasteFromClipboard,
    addImageLayerFromBlob,
    addVideoLayerFromFile,
  } = useEditor();
  
  useEffect(() => {
    const isImageUrl = (txt: string) => /^(https?:\/\/).+\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i.test(txt.trim());
    const isGifUrl = (txt: string) => /^(https?:\/\/).+\.(gif)(\?.*)?$/i.test(txt.trim());
    const isDataUrl = (txt: string) => /^data:image\//i.test(txt.trim());

    const getFilenameFromUrl = (u: string) => {
      try {
        const url = new URL(u);
        const base = (url.pathname.split('/').pop() || 'image').split('?')[0];
        return base || 'image.png';
      } catch {
        return 'image.png';
      }
    };

    const fetchToBlob = async (url: string): Promise<{ blob: Blob; filename?: string } | null> => {
      try {
        const res = await fetch(url, { mode: 'cors' });
        if (!res.ok) return null;
        const ct = res.headers.get('content-type') || '';
        if (!/image\//i.test(ct)) return null;
        const blob = await res.blob();
        return { blob, filename: getFilenameFromUrl(url) };
      } catch {
        return null;
      }
    };

    const keyHandler = async (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;
      const key = e.key.toLowerCase();
      if (key !== 'c' && key !== 'v') return;
      e.preventDefault();

      if (key === 'c') {
        copySelectedLayer();
        return;
      }

      if (key === 'v') {
        try {
          if (navigator.clipboard && 'read' in navigator.clipboard) {
            const items = await (navigator.clipboard as any).read();
            for (const item of items) {
              const types: string[] = item.types || [];
              const imgType = types.find((t: string) => /image\//i.test(t));

              if (imgType) {
                const blob = await item.getType(imgType);
                const isGif = /image\/gif/i.test(imgType);
                if (isGif) {
                  try {
                    await addVideoLayerFromFile(new File([blob], 'pasted.gif', { type: 'image/gif' }));
                  } catch {}
                } else {
                  await addImageLayerFromBlob(blob);
                }
                return;
              }

              const txtType = types.find((t: string) => /text\/(uri-list|plain)/i.test(t));
              if (txtType) {
                try {
                  const t = await item.getType(txtType);
                  const text = await t.text();
                  const line = (text || '').trim().split(/\r?\n/).find(Boolean) || '';

                  if (isDataUrl(line)) {
                    const isGif = /^data:image\/gif/i.test(line);
                    const resp = await fetch(line);
                    const blob = await resp.blob();
                    if (isGif) {
                      try {
                        await addVideoLayerFromFile(new File([blob], 'pasted.gif', { type: 'image/gif' }));
                      } catch {}
                    } else {
                      await addImageLayerFromBlob(blob);
                    }
                    return;
                  }

                  if (isImageUrl(line)) {
                    if (isGifUrl(line)) {
                      const got = await fetchToBlob(line);
                      if (got) {
                        try {
                          await addVideoLayerFromFile(new File([got.blob], got.filename || 'image.gif', { type: 'image/gif' }));
                        } catch {}
                      }
                      return;
                    }
                    const got = await fetchToBlob(line);
                    if (got) {
                      await addImageLayerFromBlob(got.blob, getFilenameFromUrl(line));
                      return;
                    }
                  }
                } catch {}
              }
            }
          }
        } catch {}

        try {
          const txt = await navigator.clipboard?.readText?.();
          if (txt) {
            try {
              const data = JSON.parse(txt);
              pasteFromClipboard(data);
              return;
            } catch {}

            const firstLine = txt.trim().split(/\r?\n/).find(Boolean) || '';
            if (isDataUrl(firstLine)) {
              const isGif = /^data:image\/gif/i.test(firstLine);
              try {
                const resp = await fetch(firstLine);
                const blob = await resp.blob();
                if (isGif) {
                  try {
                    await addVideoLayerFromFile(new File([blob], 'pasted.gif', { type: 'image/gif' }));
                  } catch {}
                } else {
                  await addImageLayerFromBlob(blob);
                }
                return;
              } catch {}
            }

            if (isImageUrl(firstLine)) {
              if (isGifUrl(firstLine)) {
                const got = await fetchToBlob(firstLine);
                if (got) {
                  try {
                    await addVideoLayerFromFile(new File([got.blob], got.filename || 'image.gif', { type: 'image/gif' }));
                  } catch {}
                }
                return;
              }
              const got = await fetchToBlob(firstLine);
              if (got) {
                await addImageLayerFromBlob(got.blob, getFilenameFromUrl(firstLine));
                return;
              }
            }
          }
        } catch {}
      }
    };

    const pasteHandler = async (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const items = Array.from(e.clipboardData.items || []);
      const fileItem = items.find((it) => it.kind === 'file' && /image\//i.test(it.type));

      if (fileItem) {
        e.preventDefault();
        const blob = fileItem.getAsFile();
        if (blob) {
          if (/image\/gif/i.test(blob.type || '')) {
            try {
              await addVideoLayerFromFile(new File([blob], 'pasted.gif', { type: 'image/gif' }));
            } catch {}
          } else {
            await addImageLayerFromBlob(blob);
          }
        }
        return;
      }

      const textItem = items.find((it) => it.kind === 'string');
      if (textItem) {
        textItem.getAsString((txt) => {
          try {
            const data = JSON.parse(txt);
            if (data && data.__caplay__) {
              e.preventDefault();
              pasteFromClipboard(data);
            }
          } catch {}
        });
      }

      const uriList = e.clipboardData.getData('text/uri-list') || '';
      const plain = e.clipboardData.getData('text/plain') || '';
      const candidate = (uriList || plain || '').trim().split(/\r?\n/).find(Boolean) || '';

      if (candidate) {
        if (isDataUrl(candidate)) {
          const isGif = /^data:image\/gif/i.test(candidate);
          try {
            e.preventDefault();
            const resp = await fetch(candidate);
            const blob = await resp.blob();
            if (isGif) {
              try {
                await addVideoLayerFromFile(new File([blob], 'pasted.gif', { type: 'image/gif' }));
              } catch {}
            } else {
              await addImageLayerFromBlob(blob);
            }
            return;
          } catch {}
        }

        if (/^file:\/\//i.test(candidate)) {
          // File URLs are not handled
        } else if (isImageUrl(candidate)) {
          if (isGifUrl(candidate)) {
            const got = await fetchToBlob(candidate);
            if (got) {
              e.preventDefault();
              try {
                await addVideoLayerFromFile(new File([got.blob], got.filename || 'image.gif', { type: 'image/gif' }));
              } catch {}
              return;
            }
          }
          const got = await fetchToBlob(candidate);
          if (got) {
            e.preventDefault();
            await addImageLayerFromBlob(got.blob, getFilenameFromUrl(candidate));
            return;
          }
        }
      }
    };

    window.addEventListener('keydown', keyHandler);
    window.addEventListener('paste', pasteHandler);

    return () => {
      window.removeEventListener('keydown', keyHandler);
      window.removeEventListener('paste', pasteHandler);
    };
  }, [copySelectedLayer, pasteFromClipboard, addImageLayerFromBlob, addVideoLayerFromFile]);
}

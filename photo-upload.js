/* CURRENT — shared photo upload helper (Phase 5). Used by create-profile.js
   (profile photo) and post-sail.js (sail cover photo). Every photo goes
   through the same three steps everywhere: resize/re-encode to a JPEG Blob
   client-side, upload it to a fixed path with upsert (so "replace" is just
   "upload again" — no orphaned old-extension files), and return a
   cache-busted public URL (the path never changes, so without the cache-bust
   query param a browser would keep showing the old image after a replace).

   Deliberately does NOT touch Storage until the caller decides to — picking
   a file only ever produces a Blob in memory. Uploading, and any deferred
   deletion of a photo the user removed, happens only when the page's own
   save flow actually writes to the database — see create-profile.js's
   finish() and post-sail.js's save() for exactly when each runs. */
(() => {
  const MAX_SOURCE_BYTES = 5 * 1024 * 1024;

  /* Validates and resizes a picked file down to maxDimension on its longest
     edge, re-encoding as JPEG — always JPEG, regardless of the source
     format, which is what lets every upload target a fixed filename. */
  const pickAndResize = (file, maxDimension) =>
    new Promise((resolve, reject) => {
      if (!file.type || !file.type.startsWith("image/")) {
        reject(new Error("Please choose an image file."));
        return;
      }
      if (file.size > MAX_SOURCE_BYTES) {
        reject(new Error("That image is too large — please choose one under 5 MB."));
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Could not read that file."));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("Could not read that image."));
        img.onload = () => {
          const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
          const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
          const canvas = document.createElement("canvas");
          canvas.width = w; canvas.height = h;
          canvas.getContext("2d").drawImage(img, 0, 0, w, h);
          canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error("Could not process that image."))),
            "image/jpeg",
            0.85
          );
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });

  /* Uploads (upsert) a Blob to a fixed path and returns its cache-busted
     public URL. RLS on storage.objects is what actually decides whether this
     succeeds — not this function. */
  const uploadPhoto = async (bucket, path, blob) => {
    const supa = window.CURRENT_SUPABASE;
    const { error } = await supa.storage.from(bucket).upload(path, blob, { upsert: true, contentType: "image/jpeg" });
    if (error) return { url: null, error };
    const { data } = supa.storage.from(bucket).getPublicUrl(path);
    return { url: `${data.publicUrl}?v=${Date.now()}`, error: null };
  };

  /* Best-effort removal — called only after the database no longer
     references the file, so a failure here just leaves a harmless orphaned
     object rather than a broken image reference. */
  const deletePhoto = async (bucket, path) => {
    const supa = window.CURRENT_SUPABASE;
    return supa.storage.from(bucket).remove([path]);
  };

  window.CURRENT_PHOTO = { MAX_SOURCE_BYTES, pickAndResize, uploadPhoto, deletePhoto };
})();

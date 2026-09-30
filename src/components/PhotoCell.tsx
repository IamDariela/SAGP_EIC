import React, { useState, useEffect } from 'react';
import { ImageIcon } from 'lucide-react';
import { getImage } from '../lib/idb';
import ImageViewer from './ImageViewer';

export default function PhotoCell({ photoId }: { photoId?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [showViewer, setShowViewer] = useState(false);

  useEffect(() => {
    if (photoId) {
      getImage(photoId).then(setUrl);
    } else {
      setUrl(null);
    }
  }, [photoId]);

  if (!photoId) {
    return (
      <div className="h-10 w-10 rounded border border-slate-200 bg-slate-50 flex items-center justify-center">
        <ImageIcon className="h-5 w-5 text-slate-300" />
      </div>
    );
  }

  return (
    <>
      <button 
        onClick={(e) => {
          e.stopPropagation();
          setShowViewer(true);
        }}
        className="h-10 w-10 rounded border border-slate-200 overflow-hidden hover:scale-105 transition-transform"
      >
        {url ? (
          <img src={url} alt="Miniatura" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-slate-100 animate-pulse" />
        )}
      </button>

      {showViewer && <ImageViewer photoId={photoId} onClose={() => setShowViewer(false)} />}
    </>
  );
}

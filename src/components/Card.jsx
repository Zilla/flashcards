import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

const markdownComponents = {
  p: ({ children }) => {
    if (!children) return null;
    const arr = React.Children.toArray(children);
    if (arr.length === 0) return <p>{children}</p>;

    const first = arr[0];
    const last = arr[arr.length - 1];
    
    if (
      typeof first === 'string' && first.startsWith('->') &&
      typeof last === 'string' && last.endsWith('<-')
    ) {
      if (arr.length === 1) {
        return <p style={{ textAlign: 'center', width: '100%' }}>{first.slice(2, -2)}</p>;
      } else {
        arr[0] = first.slice(2);
        arr[arr.length - 1] = last.slice(0, -2);
        return <p style={{ textAlign: 'center', width: '100%' }}>{arr}</p>;
      }
    }
    return <p>{children}</p>;
  }
};

export default function Card({ front, back, isFlipped, onFlip }) {
  const frontScrollRef = useRef(null);
  const backScrollRef = useRef(null);

  useEffect(() => {
    if (frontScrollRef.current) {
      frontScrollRef.current.scrollTop = 0;
    }
    if (backScrollRef.current) {
      backScrollRef.current.scrollTop = 0;
    }

    const frontEl = frontScrollRef.current;
    const backEl = backScrollRef.current;

    const handleWheel = (e) => {
      const container = e.currentTarget;
      if (container.scrollHeight > container.clientHeight) {
        const isScrollingUp = e.deltaY < 0;
        const isScrollingDown = e.deltaY > 0;
        const atTop = container.scrollTop <= 0;
        const atBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 1;

        if ((isScrollingDown && !atBottom) || (isScrollingUp && !atTop)) {
          container.scrollTop += e.deltaY;
          e.preventDefault();
        }
      }
    };

    if (frontEl) {
      frontEl.addEventListener('wheel', handleWheel, { passive: false });
    }
    if (backEl) {
      backEl.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      if (frontEl) {
        frontEl.removeEventListener('wheel', handleWheel);
      }
      if (backEl) {
        backEl.removeEventListener('wheel', handleWheel);
      }
    };
  }, [front, back]);

  const checkIsLong = (text) => {
    if (!text) return false;
    return text.length > 120 || text.split('\n').length > 3;
  };

  const isFrontLong = checkIsLong(front);
  const isBackLong = checkIsLong(back);

  return (
    <div className="card-container" onClick={onFlip}>
      <div className={`card-inner ${isFlipped ? 'is-flipped' : ''}`}>
        {/* Front Face */}
        <div className="card-face card-front">
          <div className="card-face-title">Question / Prompt</div>
          <div className="card-text-wrapper" ref={frontScrollRef}>
            <div className={`card-text ${isFrontLong ? 'is-long' : ''}`}>
              <ReactMarkdown 
                remarkPlugins={[remarkMath]} 
                rehypePlugins={[rehypeKatex]}
                urlTransform={(url) => url}
                components={markdownComponents}
              >
                {front}
              </ReactMarkdown>
            </div>
          </div>
        </div>
        
        {/* Back Face */}
        <div className="card-face card-back">
          <div className="card-face-title">Answer</div>
          <div className="card-text-wrapper" ref={backScrollRef}>
            <div className={`card-text ${isBackLong ? 'is-long' : ''}`}>
              <ReactMarkdown 
                remarkPlugins={[remarkMath]} 
                rehypePlugins={[rehypeKatex]}
                urlTransform={(url) => url}
                components={markdownComponents}
              >
                {back}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

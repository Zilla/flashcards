import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

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
              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
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
              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                {back}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

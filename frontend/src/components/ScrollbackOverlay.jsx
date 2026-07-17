import { useRef } from 'react';

export default function ScrollbackOverlay({ 
  scrollbackContent, rawScrollback, isSelectMode, 
  onToggleSelectMode, onClose, hasScrolledUpRef 
}) {
  return (
    <>
      <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 1001, display: 'flex', gap: '8px' }}>
        <button 
          onClick={onToggleSelectMode}
          style={{ background: '#3b82f6', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          {isSelectMode ? '🎨 Color View' : '📝 Select Text'}
        </button>
        <button 
          onClick={onClose}
          style={{ background: '#ef4444', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          ✖ Close
        </button>
      </div>
      <div 
        className="native-scrollback-overlay"
        onTouchStart={e => e.stopPropagation()}
        onTouchMove={e => e.stopPropagation()}
        onTouchEnd={e => e.stopPropagation()}
        onScroll={(e) => {
           if (isSelectMode) return;
           
           const { scrollTop, scrollHeight, clientHeight } = e.target;
           if (scrollTop + clientHeight < scrollHeight - 50) {
               hasScrolledUpRef.current = true;
           }
           if (hasScrolledUpRef.current && scrollTop + clientHeight >= scrollHeight - 10) {
               onClose();
           }
        }}
        ref={(el) => {
          if (el && scrollbackContent && scrollbackContent !== 'Loading scrollback...' && !el.dataset.scrolled) {
             el.scrollTop = el.scrollHeight - el.clientHeight - 30;
             el.dataset.scrolled = "true";
          }
        }}
      >
         {isSelectMode ? (
           <div 
             contentEditable={true}
             suppressContentEditableWarning={true}
             onKeyDown={e => { e.preventDefault(); return false; }}
             style={{ 
               width: '100%', 
               backgroundColor: 'transparent', 
               color: '#e2e8f0', 
               fontFamily: 'monospace', 
               fontSize: '14px', 
               whiteSpace: 'pre-wrap', 
               paddingBottom: '50px',
               WebkitUserSelect: 'text',
               userSelect: 'text',
               cursor: 'text',
               outline: 'none'
             }}
           >
             {rawScrollback}
           </div>
         ) : (
           <div dangerouslySetInnerHTML={{ __html: scrollbackContent }} style={{ paddingBottom: '50px' }} />
         )}
      </div>
    </>
  );
}

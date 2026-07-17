export default function FileExplorer({ 
  fileItems, currentPath, isEditingFile, openFileContent, openFilePath,
  onLoadFiles, onLoadFileContent, onSaveFile, onCreateItem, onDeleteItem,
  onSetOpenFileContent, onSetIsEditingFile
}) {
  return (
    <div className="file-explorer" style={{ display: 'flex' }}>
      <div className="file-toolbar">
        {isEditingFile ? (
          <>
            <button className="macro-btn" onClick={() => { onSetIsEditingFile(false); onSetOpenFileContent(''); }}>← Back</button>
            <span className="file-path">{openFilePath.split('/').pop()}</span>
            <button id="save-btn" className="macro-btn action" onClick={onSaveFile}>Save</button>
          </>
        ) : (
          <>
            <button className="macro-btn" onClick={() => onLoadFiles(currentPath.split('/').slice(0, -1).join('/') || '/')}>
              ← Back
            </button>
            <span className="file-path">{currentPath}</span>
            <button className="macro-btn" onClick={() => onCreateItem(false)}>+ File</button>
            <button className="macro-btn" onClick={() => onCreateItem(true)}>+ Dir</button>
          </>
        )}
      </div>
      <div className="file-content-area">
        {isEditingFile ? (
          <textarea 
            className="file-editor" 
            value={openFileContent} 
            onChange={e => onSetOpenFileContent(e.target.value)} 
            spellCheck="false"
          />
        ) : (
          <ul className="file-list">
            {fileItems.map((item, idx) => (
              <li key={idx} className="file-item" onClick={() => item.is_dir ? onLoadFiles(item.path) : onLoadFileContent(item.path)}>
                <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                  <span className="file-icon">{item.is_dir ? '📁' : '📄'}</span>
                  <span className="file-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                </div>
                <button className="macro-btn" style={{ padding: '4px 8px', fontSize: '12px', background: 'transparent' }} onClick={(e) => onDeleteItem(item.path, e)}>🗑️</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

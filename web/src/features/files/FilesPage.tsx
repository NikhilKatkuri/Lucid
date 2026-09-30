import React, { useRef, useState } from 'react'
import { useTenant } from '../tenant/TenantProvider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../shared/api/queryKeys'
import { fetchFiles, uploadFile } from '../../mocks/db'
import { Icon } from '../../shared/components'
import { formatDateTime, formatFileSize } from '../../shared/utils/format'
import { usePermission } from '../../shared/hooks/usePermission'
import './files.css'

function FileTypeIcon({ mimeType }: { mimeType: string }) {
  const isImage = mimeType.startsWith('image/')
  const isPdf = mimeType === 'application/pdf'
  return (
    <div className={`file-icon ${isImage ? 'file-icon--image' : 'file-icon--doc'}`}>
      <Icon name={isImage ? 'image' : isPdf ? 'picture_as_pdf' : 'description'} size={24} filled />
    </div>
  )
}

export function FilesPage() {
  const { activeTenant } = useTenant()
  const tenantId = activeTenant?.tenantId ?? ''
  const canUpload = usePermission('file.upload')
  const canDelete = usePermission('file.delete')
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const { data: files, isLoading } = useQuery({
    queryKey: queryKeys.files(tenantId),
    queryFn: () => fetchFiles(tenantId),
    enabled: !!tenantId,
  })

  const { mutateAsync: upload, isPending: uploading } = useMutation({
    mutationFn: (file: File) => uploadFile(tenantId, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.files(tenantId) }),
  })

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList) return
    for (const file of Array.from(fileList)) {
      await upload(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div className="files-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Files</h1>
          <p className="page-subtitle">{files?.length ?? '—'} file{files?.length !== 1 ? 's' : ''}</p>
        </div>
        {canUpload && (
          <button className="btn btn--primary" onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Icon name="upload" size={18} />
            {uploading ? 'Uploading…' : 'Upload Files'}
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)}
        accept="image/jpeg,image/png,image/webp,application/pdf"
      />

      {/* Upload Drop Zone */}
      {canUpload && (
        <div
          className={`drop-zone ${dragOver ? 'drop-zone--over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
          aria-label="Drop files or click to browse"
        >
          <Icon name={uploading ? 'hourglass_empty' : 'cloud_upload'} size={40} />
          <p>{uploading ? 'Uploading…' : 'Drop files here or click to browse'}</p>
          <p className="drop-zone-hint">JPEG, PNG, WebP, PDF · Max 10 MB</p>
        </div>
      )}

      {/* File Grid */}
      {isLoading ? (
        <div className="files-grid">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton-file-card" />
          ))}
        </div>
      ) : !files || files.length === 0 ? (
        <div className="empty-state">
          <Icon name="folder_open" size={48} />
          <h3>No files yet</h3>
          <p>Upload product images or documents.</p>
        </div>
      ) : (
        <div className="files-grid">
          {files.map((file) => (
            <div key={file.id} className="file-card">
              <FileTypeIcon mimeType={file.mimeType} />
              <div className="file-info">
                <span className="file-name" title={file.name}>{file.name}</span>
                <span className="file-meta">{formatFileSize(file.size)} · {formatDateTime(file.uploadedAt)}</span>
              </div>
              {canDelete && (
                <button
                  className="icon-btn file-delete"
                  aria-label={`Delete ${file.name}`}
                  onClick={(e) => { e.stopPropagation(); /* TODO delete */ }}
                >
                  <Icon name="delete_outline" size={18} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './theme/tokens.css'
import './theme/typography.css'
import './theme/shape-elevation.css'
import './theme/base.css'

import { App } from './app/App'
import { AppProviders } from './app/providers'

const container = document.getElementById('root')
if (!container) throw new Error('Root container #root not found')

createRoot(container).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
)

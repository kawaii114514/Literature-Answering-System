import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { applyMotionPreference, readMotionPreference } from './pixel/effects'
import './styles.css'
import './pixel.css'

applyMotionPreference(readMotionPreference())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

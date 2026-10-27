import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { CatalogPage } from './pages/CatalogPage'
import { CardDetailPage } from './pages/CardDetailPage'
import { ProgressPage } from './pages/ProgressPage'
import { WishlistPage } from './pages/WishlistPage'
import { ImportPage } from './pages/ImportPage'
import { ExportPage } from './pages/ExportPage'
import { ManualPage } from './pages/ManualPage'
import { SettingsPage } from './pages/SettingsPage'
import { SyncPage } from './pages/SyncPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/card/:id" element={<CardDetailPage />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/sync" element={<SyncPage />} />
        <Route path="/import" element={<ImportPage />} />
        <Route path="/export" element={<ExportPage />} />
        <Route path="/manual" element={<ManualPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Dashboard />} />
      </Route>
    </Routes>
  )
}

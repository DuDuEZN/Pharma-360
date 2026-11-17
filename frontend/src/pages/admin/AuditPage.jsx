import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Shield,
  Search,
  RefreshCw,
  Download,
  Trash2,
  Filter,
  AlertTriangle,
  FileText,
  History,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Select } from '@/components/ui/Select/Select'
import { Badge } from '@/components/ui/badge.jsx'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table.jsx'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/common/Toast'
import { useAuth } from '@/hooks/useAuth'
import { useDebounce } from '@/hooks/useDebounce'
import api from '@/lib/api'
import { cn, formatDate } from '@/lib/utils'

const PAGE_SIZE = 50

const methodColors = {
  GET: 'info',
  POST: 'success',
  PUT: 'warning',
  PATCH: 'warning',
  DELETE: 'danger',
}

const methodOptions = [
  { value: '', label: 'Toutes les méthodes' },
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'PATCH', label: 'PATCH' },
  { value: 'DELETE', label: 'DELETE' },
]

function formatDateTime(value) {
  if (!value) return '—'
  try {
    const date = new Date(value)
    return `${formatDate(date)} ${date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })}`
  } catch (error) {
    return value
  }
}

function AuditPage() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const isAdmin = user?.role === 'admin'

  const [activeTab, setActiveTab] = useState('logs')

  // ----- Journal d'audit -----
  const [logs, setLogs] = useState([])
  const [logsTotal, setLogsTotal] = useState(0)
  const [logsPage, setLogsPage] = useState(1)
  const [logsLoading, setLogsLoading] = useState(true)
  const [logFilters, setLogFilters] = useState({
    search: '',
    action: '',
    method: '',
    dateFrom: '',
    dateTo: '',
  })
  const debouncedLogSearch = useDebounce(logFilters.search, 400)

  // ----- Produits périmés -----
  const [expiredLogs, setExpiredLogs] = useState([])
  const [expiredTotal, setExpiredTotal] = useState(0)
  const [expiredPage, setExpiredPage] = useState(1)
  const [expiredLoading, setExpiredLoading] = useState(false)
  const [expiredFilters, setExpiredFilters] = useState({
    search: '',
    dateFrom: '',
    dateTo: '',
  })
  const debouncedExpiredSearch = useDebounce(expiredFilters.search, 400)

  const logParams = useMemo(
    () => ({
      limit: PAGE_SIZE,
      offset: (logsPage - 1) * PAGE_SIZE,
      search: debouncedLogSearch || undefined,
      action: logFilters.action || undefined,
      method: logFilters.method || undefined,
      date_from: logFilters.dateFrom ? `${logFilters.dateFrom}T00:00:00` : undefined,
      date_to: logFilters.dateTo ? `${logFilters.dateTo}T23:59:59` : undefined,
    }),
    [logsPage, debouncedLogSearch, logFilters.action, logFilters.method, logFilters.dateFrom, logFilters.dateTo]
  )

  const expiredParams = useMemo(
    () => ({
      limit: PAGE_SIZE,
      offset: (expiredPage - 1) * PAGE_SIZE,
      search: debouncedExpiredSearch || undefined,
      date_from: expiredFilters.dateFrom ? `${expiredFilters.dateFrom}T00:00:00` : undefined,
      date_to: expiredFilters.dateTo ? `${expiredFilters.dateTo}T23:59:59` : undefined,
    }),
    [expiredPage, debouncedExpiredSearch, expiredFilters.dateFrom, expiredFilters.dateTo]
  )

  const fetchLogs = useCallback(async () => {
    try {
      setLogsLoading(true)
      const response = await api.get('/audit/logs', { params: logParams })
      setLogs(response.data?.logs || [])
      setLogsTotal(response.data?.total || 0)
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: error.response?.data?.detail || 'Impossible de charger le journal d\'audit',
      })
    } finally {
      setLogsLoading(false)
    }
  }, [logParams, addToast])

  const fetchExpiredLogs = useCallback(async () => {
    try {
      setExpiredLoading(true)
      const response = await api.get('/audit/expired-products', { params: expiredParams })
      setExpiredLogs(response.data?.logs || [])
      setExpiredTotal(response.data?.total || 0)
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: error.response?.data?.detail || 'Impossible de charger l\'historique des périmés',
      })
    } finally {
      setExpiredLoading(false)
    }
  }, [expiredParams, addToast])

  useEffect(() => {
    if (activeTab === 'logs') fetchLogs()
  }, [activeTab, fetchLogs])

  useEffect(() => {
    if (activeTab === 'expired') fetchExpiredLogs()
  }, [activeTab, fetchExpiredLogs])

  useEffect(() => {
    setLogsPage(1)
  }, [debouncedLogSearch, logFilters.action, logFilters.method, logFilters.dateFrom, logFilters.dateTo])

  useEffect(() => {
    setExpiredPage(1)
  }, [debouncedExpiredSearch, expiredFilters.dateFrom, expiredFilters.dateTo])

  const handleExportLogs = async () => {
    try {
      const response = await api.get('/audit/logs/export', {
        params: { ...logParams, limit: undefined, offset: undefined },
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv;charset=utf-8' }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`)
      document.body.appendChild(link)
      link.click()
      link.parentNode.removeChild(link)
      window.URL.revokeObjectURL(url)
      addToast({ type: 'success', title: 'Succès', message: 'Export CSV généré' })
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible d\'exporter le journal d\'audit',
      })
    }
  }

  const handlePurge = async () => {
    const raw = window.prompt(
      'Conserver les journaux des N derniers jours ? (les entrées plus anciennes seront supprimées définitivement)',
      '90'
    )
    if (raw === null) return
    const keepDays = parseInt(raw, 10)
    if (!Number.isFinite(keepDays) || keepDays < 1) {
      addToast({ type: 'error', title: 'Valeur invalide', message: 'Saisissez un nombre de jours valide' })
      return
    }
    if (!window.confirm(`Purger les journaux d'audit de plus de ${keepDays} jours ?`)) return

    try {
      const response = await api.delete('/audit/logs/purge', { params: { keep_days: keepDays } })
      addToast({
        type: 'success',
        title: 'Purge terminée',
        message: `${response.data?.deleted || 0} entrée(s) supprimée(s)`,
      })
      setLogsPage(1)
      fetchLogs()
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: error.response?.data?.detail || 'Impossible de purger les journaux',
      })
    }
  }

  const logsTotalPages = Math.max(1, Math.ceil(logsTotal / PAGE_SIZE))
  const expiredTotalPages = Math.max(1, Math.ceil(expiredTotal / PAGE_SIZE))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="w-7 h-7 text-primary-600" />
            Journal d'audit
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Traçabilité des actions et historique des produits périmés
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => (activeTab === 'logs' ? fetchLogs() : fetchExpiredLogs())}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
          {activeTab === 'logs' && (
            <>
              <Button variant="outline" onClick={handleExportLogs}>
                <Download className="w-4 h-4 mr-2" />
                Exporter CSV
              </Button>
              {isAdmin && (
                <Button variant="danger" onClick={handlePurge}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Purger
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Onglets */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          className={cn(
            'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'logs'
              ? 'bg-primary-600 text-white shadow-apple-sm'
              : 'bg-white text-secondary-600 border border-black/[0.08] hover:bg-black/[0.03] dark:bg-white/5 dark:text-secondary-300 dark:border-white/10'
          )}
        >
          <FileText className="w-4 h-4" />
          Journaux d'audit
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('expired')}
          className={cn(
            'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'expired'
              ? 'bg-primary-600 text-white shadow-apple-sm'
              : 'bg-white text-secondary-600 border border-black/[0.08] hover:bg-black/[0.03] dark:bg-white/5 dark:text-secondary-300 dark:border-white/10'
          )}
        >
          <AlertTriangle className="w-4 h-4" />
          Produits périmés
        </button>
      </div>

      {activeTab === 'logs' ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary-600" />
              Activité enregistrée
            </CardTitle>
            <CardDescription>{logsTotal} entrée(s)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filtres */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
              <div className="relative xl:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  className="pl-9"
                  placeholder="Rechercher (utilisateur, chemin, détail...)"
                  value={logFilters.search}
                  onChange={(event) => setLogFilters((prev) => ({ ...prev, search: event.target.value }))}
                />
              </div>
              <Input
                placeholder="Action (ex: POST /api/v1/...)"
                value={logFilters.action}
                onChange={(event) => setLogFilters((prev) => ({ ...prev, action: event.target.value }))}
              />
              <Select
                value={logFilters.method}
                onChange={(value) => setLogFilters((prev) => ({ ...prev, method: value }))}
                options={methodOptions}
                placeholder="Méthode"
              />
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={logFilters.dateFrom}
                  onChange={(event) => setLogFilters((prev) => ({ ...prev, dateFrom: event.target.value }))}
                  title="Du"
                />
                <Input
                  type="date"
                  value={logFilters.dateTo}
                  onChange={(event) => setLogFilters((prev) => ({ ...prev, dateTo: event.target.value }))}
                  title="Au"
                />
              </div>
            </div>

            {/* Tableau */}
            {logsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <Filter className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p>Aucune entrée ne correspond aux filtres</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entité</TableHead>
                      <TableHead>Méthode</TableHead>
                      <TableHead>Chemin</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>IP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap text-xs">
                          {formatDateTime(log.created_at)}
                        </TableCell>
                        <TableCell className="text-sm">{log.username || '—'}</TableCell>
                        <TableCell className="max-w-[220px] truncate text-xs" title={log.action || ''}>
                          {log.action || '—'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {log.entity_type
                            ? `${log.entity_type}${log.entity_id ? ` #${log.entity_id}` : ''}`
                            : '—'}
                        </TableCell>
                        <TableCell>
                          {log.method ? (
                            <Badge variant={methodColors[log.method] || 'secondary'} size="xs">
                              {log.method}
                            </Badge>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell className="max-w-[240px] truncate font-mono text-xs" title={log.path || ''}>
                          {log.path || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              log.status_code && log.status_code < 400 ? 'success' : 'danger'
                            }
                            size="xs"
                          >
                            {log.status_code ?? '—'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-gray-500">{log.ip_address || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Page {logsPage} sur {logsTotalPages} · {logsTotal} entrée(s)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLogsPage((page) => Math.max(1, page - 1))}
                  disabled={logsPage <= 1 || logsLoading}
                >
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLogsPage((page) => Math.min(logsTotalPages, page + 1))}
                  disabled={logsPage >= logsTotalPages || logsLoading}
                >
                  Suivant
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-danger-600" />
              Produits périmés sortis du stock
            </CardTitle>
            <CardDescription>{expiredTotal} entrée(s)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              <div className="relative xl:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  className="pl-9"
                  placeholder="Rechercher (lot, motif...)"
                  value={expiredFilters.search}
                  onChange={(event) =>
                    setExpiredFilters((prev) => ({ ...prev, search: event.target.value }))
                  }
                />
              </div>
              <Input
                type="date"
                value={expiredFilters.dateFrom}
                onChange={(event) =>
                  setExpiredFilters((prev) => ({ ...prev, dateFrom: event.target.value }))
                }
                title="Du"
              />
              <Input
                type="date"
                value={expiredFilters.dateTo}
                onChange={(event) =>
                  setExpiredFilters((prev) => ({ ...prev, dateTo: event.target.value }))
                }
                title="Au"
              />
            </div>

            {expiredLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : expiredLogs.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <AlertTriangle className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p>Aucun produit périmé retiré pour le moment</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Produit</TableHead>
                      <TableHead>Lot</TableHead>
                      <TableHead>Quantité</TableHead>
                      <TableHead>Péremption</TableHead>
                      <TableHead>Motif</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expiredLogs.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="whitespace-nowrap text-xs">
                          {formatDateTime(entry.created_at)}
                        </TableCell>
                        <TableCell className="text-xs">
                          {entry.product_id ? `#${entry.product_id}` : '—'}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{entry.batch_number || '—'}</TableCell>
                        <TableCell>{entry.quantity ?? 0}</TableCell>
                        <TableCell className="text-xs">
                          {entry.expiry_date ? formatDate(entry.expiry_date) : '—'}
                        </TableCell>
                        <TableCell className="max-w-[320px] truncate text-xs" title={entry.reason || ''}>
                          {entry.reason || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Page {expiredPage} sur {expiredTotalPages} · {expiredTotal} entrée(s)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExpiredPage((page) => Math.max(1, page - 1))}
                  disabled={expiredPage <= 1 || expiredLoading}
                >
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExpiredPage((page) => Math.min(expiredTotalPages, page + 1))}
                  disabled={expiredPage >= expiredTotalPages || expiredLoading}
                >
                  Suivant
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default AuditPage

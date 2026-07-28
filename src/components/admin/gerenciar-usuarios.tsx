import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Key, Users, Search, X, Loader2, Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase/client'
import { AlterarSenhaModal } from './alterar-senha-modal'
import { NovoUsuarioModal } from './novo-usuario-modal'
import { EditarUsuarioModal } from './editar-usuario-modal'
import { format } from 'date-fns'

export function GerenciarUsuarios() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [novoModalOpen, setNovoModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const loadUsers = async (search: string = '') => {
    setLoading(true)
    setError(false)

    let query = supabase.from('perfil_usuario').select('*').order('criado_em', { ascending: false })

    if (search.trim()) {
      query = query.or(`nome_completo.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%`)
    }

    const { data, error: err } = await query

    if (err) {
      setError(true)
    } else {
      setUsers(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadUsers(debouncedSearch)
  }, [debouncedSearch])

  const openPasswordModal = (u: any) => {
    setSelectedUser(u)
    setModalOpen(true)
  }

  const openEditModal = (u: any) => {
    setSelectedUser(u)
    setEditModalOpen(true)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciar Usuários</CardTitle>
        <CardDescription>
          Visualize todos os usuários do sistema e gerencie senhas e acessos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Buscar por nome ou e-mail"
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchTerm('')}
              className="h-10 text-slate-500 hover:text-slate-900"
            >
              <X className="h-4 w-4 mr-2" /> Limpar busca
            </Button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Button onClick={() => setNovoModalOpen(true)}>
              <Users className="h-4 w-4 mr-2" /> Novo Usuário
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin mb-4 text-slate-400" />
            <p>Buscando usuários...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">Erro ao buscar usuários</p>
            <Button onClick={() => loadUsers(debouncedSearch)} variant="outline">
              Tentar novamente
            </Button>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 flex flex-col items-center text-slate-500">
            <Users className="h-12 w-12 mb-4 text-slate-300" />
            <p>
              {debouncedSearch
                ? 'Nenhum usuário encontrado com esse critério'
                : 'Nenhum usuário encontrado'}
            </p>
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data de Criação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-mono text-xs text-slate-500">
                      {u.id.substring(0, 8)}...
                    </TableCell>
                    <TableCell className="font-medium">{u.nome_completo}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {u.tipo_usuario}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(u.criado_em), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col sm:flex-row justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditModal(u)}>
                          <Pencil className="h-4 w-4 mr-2" /> Editar
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openPasswordModal(u)}>
                          <Key className="h-4 w-4 mr-2" /> Alterar Senha
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <AlterarSenhaModal open={modalOpen} setOpen={setModalOpen} user={selectedUser} />
      <EditarUsuarioModal
        open={editModalOpen}
        setOpen={setEditModalOpen}
        user={selectedUser}
        onSuccess={() => loadUsers(debouncedSearch)}
      />
      <NovoUsuarioModal
        open={novoModalOpen}
        setOpen={setNovoModalOpen}
        onSuccess={() => loadUsers(debouncedSearch)}
      />
    </Card>
  )
}

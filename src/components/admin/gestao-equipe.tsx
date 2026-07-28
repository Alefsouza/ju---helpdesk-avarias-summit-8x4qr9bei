import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, MoreVertical, Edit2, Power, Trash2, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { useGestaoEquipe } from '@/hooks/use-gestao-equipe'
import { NovoUsuarioModal } from './novo-usuario-modal'
import { EditarUsuarioModal } from './editar-usuario-modal'

const getBadgeStyles = (tipo: string) => {
  switch (tipo) {
    case 'admin':
      return 'border-purple-200 text-purple-700 bg-purple-50'
    case 'vistoriador':
      return 'border-orange-200 text-orange-700 bg-orange-50'
    case 'coc':
      return 'border-yellow-200 text-yellow-700 bg-yellow-50'
    case 'sos':
      return 'border-red-200 text-red-700 bg-red-50'
    case 'juridico':
      return 'border-teal-200 text-teal-700 bg-teal-50'
    case 'sinistro':
      return 'border-indigo-200 text-indigo-700 bg-indigo-50'
    case 'secretaria_tecnica':
      return 'border-emerald-200 text-emerald-700 bg-emerald-50'
    case 'dp':
      return 'border-pink-200 text-pink-700 bg-pink-50'
    case 'financeiro':
      return 'border-sky-200 text-sky-700 bg-sky-50'
    case 'contabil':
      return 'border-green-200 text-green-700 bg-green-50'
    case 'basico':
      return 'border-gray-200 text-gray-700 bg-gray-50'
    default:
      return 'border-blue-200 text-blue-700 bg-blue-50'
  }
}

const getRoleLabel = (tipo: string) => {
  switch (tipo) {
    case 'admin':
      return 'Admin'
    case 'vistoriador':
      return 'Vistoriador'
    case 'coc':
      return 'COC'
    case 'sos':
      return 'SOS'
    case 'juridico':
      return 'Jurídico'
    case 'sinistro':
      return 'Sinistro'
    case 'secretaria_tecnica':
      return 'Sec. Técnica'
    case 'dp':
      return 'DP'
    case 'financeiro':
      return 'Financeiro'
    case 'contabil':
      return 'Contábil'
    case 'basico':
      return 'Básico'
    case 'responsavel':
      return 'Responsável'
    default:
      return 'Responsável'
  }
}

export function GestaoEquipe() {
  const { users, loading, loadUsers, toggleActive, handleDelete } = useGestaoEquipe()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase()
    return u.nome_completo?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term)
  })

  const openNewModal = () => {
    setEditingUser(null)
    setModalOpen(true)
  }

  const openEditModal = (u: any) => {
    setEditingUser(u)
    setModalOpen(true)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Gestão de Usuários</CardTitle>
          <CardDescription>Gerencie os usuários e suas permissões de acesso.</CardDescription>
        </div>
        <Button onClick={openNewModal}>
          <Plus className="h-4 w-4 mr-2" /> Novo
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex items-center mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou e-mail..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            Nenhum funcionário encontrado.
          </div>
        ) : (
          <>
            <div className="hidden md:block rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Registro</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Garagem</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.nome_completo}</TableCell>
                      <TableCell>{u.registro || '-'}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>{u.departamento || '-'}</TableCell>
                      <TableCell>{u.garagem || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getBadgeStyles(u.tipo_usuario)}>
                          {getRoleLabel(u.tipo_usuario)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={u.ativo ? 'default' : 'secondary'}
                          className={u.ativo ? 'bg-green-600 hover:bg-green-700' : ''}
                        >
                          {u.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditModal(u)}>
                              <Edit2 className="h-4 w-4 mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleActive(u)}>
                              <Power className="h-4 w-4 mr-2" /> {u.ativo ? 'Desativar' : 'Ativar'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(u)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Deletar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="grid gap-4 md:hidden">
              {filteredUsers.map((u) => (
                <Card key={u.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-base">{u.nome_completo}</CardTitle>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="-mr-2 h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditModal(u)}>
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleActive(u)}>
                            {u.ativo ? 'Desativar' : 'Ativar'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(u)}
                            className="text-red-600"
                          >
                            Deletar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <CardDescription>
                      {u.registro && `${u.registro} • `}
                      {u.email} {u.departamento && ` • ${u.departamento}`}{' '}
                      {u.garagem && ` • ${u.garagem}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Badge variant="outline" className={getBadgeStyles(u.tipo_usuario)}>
                        {getRoleLabel(u.tipo_usuario)}
                      </Badge>
                      <Badge
                        variant={u.ativo ? 'default' : 'secondary'}
                        className={u.ativo ? 'bg-green-600' : ''}
                      >
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </CardContent>

      <NovoUsuarioModal
        open={modalOpen && !editingUser}
        setOpen={(open) => {
          if (!open) setModalOpen(false)
        }}
        onSuccess={loadUsers}
      />

      <EditarUsuarioModal
        open={modalOpen && !!editingUser}
        setOpen={(open) => {
          if (!open) setModalOpen(false)
        }}
        user={editingUser}
        onSuccess={loadUsers}
      />
    </Card>
  )
}

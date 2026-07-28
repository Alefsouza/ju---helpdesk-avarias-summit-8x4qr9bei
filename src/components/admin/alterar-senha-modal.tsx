import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { changePasswordUser } from '@/services/manage-users'

export function AlterarSenhaModal({ open, setOpen, user }: any) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setPassword('')
      setConfirmPassword('')
    }
  }, [open])

  const handleSave = async () => {
    if (password.length < 8) {
      return toast.error('Mínimo 8 caracteres')
    }
    if (password !== confirmPassword) {
      return toast.error('Senhas não correspondem')
    }

    if (!window.confirm(`Tem certeza que deseja alterar a senha de ${user?.nome_completo}?`)) {
      return
    }

    setIsSaving(true)
    try {
      const { data, error } = await changePasswordUser(user.id, password, user.email)
      if (error || data?.error) throw error || new Error(data?.error)
      toast.success(`Senha de ${user.nome_completo} alterada com sucesso`)
      setOpen(false)
    } catch (err: any) {
      toast.error('Erro ao alterar senha. Tente novamente')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterar Senha</DialogTitle>
          <DialogDescription>
            Defina uma nova senha para o usuário selecionado. A senha não poderá ser recuperada
            posteriormente.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>E-mail do Usuário</Label>
            <Input value={user?.email || ''} disabled />
          </div>
          <div className="space-y-2">
            <Label>Nova Senha</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
            />
          </div>
          <div className="space-y-2">
            <Label>Confirmar Senha</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a nova senha"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Alterando...' : 'Alterar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

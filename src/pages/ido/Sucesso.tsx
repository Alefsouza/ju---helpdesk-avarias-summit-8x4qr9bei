import { CheckCircle2 } from 'lucide-react'

export default function SucessoIdo() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm p-8 text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">Formulário enviado com sucesso</h1>
          <p className="text-slate-500">Seu documento foi registrado</p>
        </div>
      </div>
    </div>
  )
}

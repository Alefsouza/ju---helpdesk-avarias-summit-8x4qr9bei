import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import Index from './pages/Index'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import MeusChamados from './pages/dashboard/MeusChamados'
import NovoChamado from './pages/dashboard/NovoChamado'
import ChamadosAbertos from './pages/dashboard/ChamadosAbertos'
import MeusAtendimentos from './pages/dashboard/MeusAtendimentos'
import Finalizados from './pages/dashboard/Finalizados'
import AdminDashboard from './pages/dashboard/Admin'
import Relatorios from './pages/dashboard/Relatorios'
import CobrancaTerceiros from './pages/dashboard/CobrancaTerceiros'
import DemandaJudicial from './pages/dashboard/DemandaJudicial'
import Documentos from './pages/dashboard/Documentos'
import ValesAprovacao from './pages/dashboard/ValesAprovacao'
import ValoresAprovadosFinanceiro from './pages/dashboard/ValoresAprovadosFinanceiro'
import ValoresAprovadosContabil from './pages/dashboard/ValoresAprovadosContabil'
import ValesAprovacaoAlexPage from './pages/dashboard/ValesAprovacaoAlexPage'
import AutorizacaoValesClaudinei from './pages/dashboard/AutorizacaoValesClaudinei'
import AutorizarParcelas from './pages/dashboard/AutorizarParcelas'
import ValesAprovadosDP from './pages/dp/ValesAprovadosDP'
import Perfil from './pages/dashboard/Perfil'
import ChamadoDetalhes from './pages/dashboard/ChamadoDetalhes'
import VistoriaForm from './pages/vistoria/VistoriaForm'
import DocumentosPendentes from './pages/vistoria/DocumentosPendentes'
import EspelhosDanos from './pages/vistoria/EspelhosDanos'
import NovoChamadoCoc from './pages/coc/NovoChamadoCoc'
import SinistrosCoc from './pages/coc/SinistrosCoc'
import FormularioIdo from './pages/ido/FormularioIdo'
import SucessoIdo from './pages/ido/Sucesso'
import FormularioIdoFixo from './pages/ido/FormularioIdoFixo'
import SucessoIdoFixo from './pages/ido/SucessoIdoFixo'
import FormularioEspelhoDanos from './pages/espelho-danos/FormularioEspelhoDanos'
import SucessoEspelhoDanos from './pages/espelho-danos/Sucesso'
import FormularioEspelhoDanosFixo from './pages/espelho-danos/FormularioEspelhoDanosFixo'
import SucessoEspelhoDanosFixo from './pages/espelho-danos/SucessoEspelhoDanosFixo'
import ChamadosPendentesSos from './pages/sos/ChamadosPendentes'
import OsManutencao from './pages/OsManutencao'
import CarrosLiberadosPlantao from './pages/CarrosLiberadosPlantao'
import NotFound from './pages/NotFound'
import Layout from './components/Layout'
import { AuthProvider, useAuth } from './hooks/use-auth'
import SecretariaTecnica from './pages/dashboard/SecretariaTecnica'

const DashboardRoute = () => {
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && user?.email === 'alex.fontes@viasudeste.com') {
      navigate('/dashboard/admin', { replace: true })
    }
    if (!loading && profile?.tipo_usuario === 'juridico') {
      navigate('/dashboard/meus-atendimentos', { replace: true })
    }
    if (!loading && profile?.tipo_usuario === 'secretaria_tecnica') {
      navigate('/dashboard/secretaria-tecnica', { replace: true })
    }
    if (!loading && (profile?.tipo_usuario === 'dp' || profile?.departamento === 'DP')) {
      navigate('/vales-aprovados', { replace: true })
    }
    if (!loading && profile?.tipo_usuario === 'financeiro') {
      navigate('/dashboard/valores-aprovados-financeiro', { replace: true })
    }
    if (!loading && profile?.tipo_usuario === 'contabil') {
      navigate('/dashboard/valores-aprovados-contabil', { replace: true })
    }
  }, [user, profile, loading, navigate])

  if (
    loading ||
    user?.email === 'alex.fontes@viasudeste.com' ||
    profile?.tipo_usuario === 'juridico' ||
    profile?.tipo_usuario === 'secretaria_tecnica' ||
    profile?.tipo_usuario === 'dp' ||
    profile?.departamento === 'DP' ||
    profile?.tipo_usuario === 'financeiro' ||
    profile?.tipo_usuario === 'contabil'
  ) {
    return null
  }

  return <Dashboard />
}

const App = () => (
  <AuthProvider>
    <BrowserRouter future={{ v7_startTransition: false, v7_relativeSplatPath: false }}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Index />} />
            <Route path="/cadastro" element={<Register />} />
            <Route path="/dashboard" element={<DashboardRoute />} />
            <Route path="/dashboard/meus-chamados" element={<MeusChamados />} />
            <Route path="/dashboard/novo-chamado" element={<NovoChamado />} />
            <Route path="/dashboard/chamados-abertos" element={<ChamadosAbertos />} />
            <Route path="/dashboard/meus-atendimentos" element={<MeusAtendimentos />} />
            <Route path="/dashboard/finalizados" element={<Finalizados />} />
            <Route path="/dashboard/cobranca-terceiros" element={<CobrancaTerceiros />} />
            <Route path="/dashboard/demanda-judicial" element={<DemandaJudicial />} />
            <Route path="/dashboard/chamados/:id" element={<ChamadoDetalhes />} />
            <Route path="/dashboard/admin" element={<AdminDashboard />} />
            <Route path="/dashboard/relatorios" element={<Relatorios />} />
            <Route path="/dashboard/documentos" element={<Documentos />} />
            <Route path="/dashboard/perfil" element={<Perfil />} />
            <Route path="/dashboard/secretaria-tecnica" element={<SecretariaTecnica />} />
            <Route path="/dashboard/vales-aprovacao" element={<ValesAprovacao />} />
            <Route path="/dashboard/vales-aprovacao-alex" element={<ValesAprovacaoAlexPage />} />
            <Route
              path="/dashboard/autorizacao-vales-claudinei"
              element={<AutorizacaoValesClaudinei />}
            />
            <Route path="/dashboard/autorizar-parcelas" element={<AutorizarParcelas />} />
            <Route path="/vales-aprovados" element={<ValesAprovadosDP />} />
            <Route
              path="/dashboard/valores-aprovados-financeiro"
              element={<ValoresAprovadosFinanceiro />}
            />
            <Route
              path="/dashboard/valores-aprovados-contabil"
              element={<ValoresAprovadosContabil />}
            />
            <Route path="/vistoria/novo" element={<VistoriaForm />} />
            <Route path="/vistoria/pendentes" element={<DocumentosPendentes />} />
            <Route path="/espelhos-danos" element={<EspelhosDanos />} />
            <Route path="/coc/novo" element={<NovoChamadoCoc />} />
            <Route path="/coc/sinistros" element={<SinistrosCoc />} />
            <Route path="/sos/pendentes" element={<ChamadosPendentesSos />} />
          </Route>
          <Route path="/espelho-danos-fixo/sucesso" element={<SucessoEspelhoDanosFixo />} />
          <Route path="/espelho-danos-fixo" element={<FormularioEspelhoDanosFixo />} />
          <Route path="/ido-fixo/sucesso" element={<SucessoIdoFixo />} />
          <Route path="/ido-fixo" element={<FormularioIdoFixo />} />
          <Route path="/ido/sucesso" element={<SucessoIdo />} />
          <Route path="/ido/:id" element={<FormularioIdo />} />
          <Route path="/espelho-danos/sucesso" element={<SucessoEspelhoDanos />} />
          <Route path="/espelho-danos/:id" element={<FormularioEspelhoDanos />} />
          <Route
            path="/os-manutencao"
            element={<OsManutencao garagemFilter="Cursino" title="OS - Manutenção (Cursino)" />}
          />
          <Route
            path="/os-manutencao-leste"
            element={<OsManutencao garagemFilter="Sapopemba" title="OS - Manutenção Leste" />}
          />
          <Route
            path="/carros-liberados-plantao"
            element={
              <CarrosLiberadosPlantao garagemFilter="Cursino" title="Carros Liberados (Cursino)" />
            }
          />
          <Route
            path="/carros-liberados-leste"
            element={
              <CarrosLiberadosPlantao garagemFilter="Sapopemba" title="Carros Liberados (Leste)" />
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </BrowserRouter>
  </AuthProvider>
)

export default App

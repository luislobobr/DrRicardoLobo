import React, { useState, useEffect, useMemo } from 'react';

// --- Importações do Firebase ---
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  setPersistence,
  inMemoryPersistence,
  signInWithCustomToken
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  setLogLevel,
  query,
  where,
  getDocs, // NOVO: Importado para checar CPF
  updateDoc as updateDocFirestore
} from "firebase/firestore";

// --- Importações de Ícones (lucide-react) ---
// CORREÇÃO: Restaurando todos os ícones necessários
import { 
  Loader2, 
  AlertCircle,
  CheckCircle,
  X,
  User,
  Eye,
  Save,
  Search,
  Plus,
  MapPin,
  Phone,
  ChevronRight,
  FileText,
  Calendar,
  Edit2,
  ArrowLeft,
  Users,
  Archive,
  Filter,
  Glasses,
  EyeOff,
  Clock,
  CalendarDays,
  BookUser,
  UserPlus
} from 'lucide-react';

// --- Constantes ---
const CIDADES_ATENDIMENTO = [
// ... (código existente sem alterações) ...
  'Outra'
];

// --- Helper: Calcular Idade ---
const calculateAge = (dob) => {
// ... (código existente sem alterações) ...
};

// --- Componente de Notificação ---
const Notification = ({ message, type, onClose }) => {
// ... (código existente sem alterações) ...
};

// --- Componente: Input (Reutilizável) ---
const InputGroup = ({ label, name, type = "text", value, onChange, placeholder = "", rows = 3 }) => {
// ... (código existente sem alterações) ...
};

// --- Componente: Formulário de Nova Consulta (Oftalmológico) ---
const ConsultationForm = ({ patient, onSave, onCancel, initialData = null }) => {
// ... (código existente sem alterações) ...
};

// --- Componente: Formulário de Paciente (Novo/Edição) ---
const PatientForm = ({ onSave, onCancel, initialData = {} }) => {
// ... (código existente sem alterações) ...
};

// --- Componente: Detalhes do Paciente ---
const PatientDetails = ({ patient, db, onBack, onSavePatient, onSaveNewConsultation, onSaveEditedConsultation, onArchivePatient }) => {
// ... (código existente sem alterações) ...
};

// --- NOVO Componente: Resumo do Dia ---
const DailySummary = ({ patients, onSelectPatient }) => {
// ... (código existente sem alterações) ...
};

// --- Componente: Lista de Pacientes ---
const PatientList = ({ patients, onSelectPatient, onNewPatient }) => {
// ... (código existente sem alterações) ...
  const [showArchived, setShowArchived] = useState(false); // NOVO: Estado para arquivados

  const filteredPatients = useMemo(() => {
// ... (código existente sem alterações) ...
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [patients, searchTerm, cityFilter, showArchived]); // ATUALIZADO: Adiciona showArchived
  
  const getLatestConsultationDate = (patient) => {
// ... (código existente sem alterações) ...
  };

  // NOVO: Contagem de pacientes de hoje
  const [todayString] = useState(new Date().toISOString().split('T')[0]);
// ... (código existente sem alterações) ...
  }, [patients, todayString]);

  return (
    <div className="p-4 md:p-8">
      {/* NOVO: Renderiza o Resumo do Dia */}
      <DailySummary patients={patients} onSelectPatient={onSelectPatient} />
            
      <header className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
           <Users size={30} />
           Todos os Pacientes ({patients.length})
           {/* NOVO: Badge de contagem */}
           {patientsTodayCount > 0 && (
             <span className="ml-2 bg-green-100 text-green-800 text-base font-medium px-3 py-1 rounded-full">
               {patientsTodayCount} vistos hoje
             </span>
           )}
        </h1>
        <div className="w-full md:w-auto flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-grow w-full md:w-auto">
// ... (código existente sem alterações) ...
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
          {/* Novo Filtro de Cidade */}
// ... (código existente sem alterações) ...
             <Filter size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
          
// ... (código existente sem alterações) ...
            <label htmlFor="showArchived">Incluir arquivados</label>
          </div>

          <button onClick={onNewPatient} className="bg-green-600 text-white px-5 py-2 rounded-lg font-medium shadow-lg hover:bg-green-700 transition-colors duration-300 flex items-center justify-center gap-2 disabled:opacity-50 flex-shrink-0 w-full md:w-auto">
            <UserPlus size={18} />
            Novo Paciente
          </button>
// ... (código existente sem alterações) ...
        <ul className="divide-y divide-gray-200">
          {filteredPatients.length > 0 ? (
            filteredPatients.map(patient => (
// ... (código existente sem alterações) ...
                  <div className="flex-1 min-w-0">
                    {/* NOVO: Adiciona classe se estiver arquivado */}
                    <p className={`font-medium text-blue-700 truncate ${patient.isArchived ? 'line-through' : ''}`}>{patient.name}</p>
                    <div className="flex flex-col md:flex-row md:items-center md:gap-4 text-sm text-gray-500">
                      <span><MapPin size={14} className="inline mr-1" /> {patient.city}</span>
                      <span className="hidden md:inline">|</span>
                      <span><FileText size={14} className="inline mr-1" /> {patient.cpf}</span>
                      <span className="hidden md:inline">|</span>
                      <span><Phone size={14} className="inline mr-1" /> {patient.phone || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right ml-4">
                     <p className="text-sm text-gray-500">Última Consulta:</p>
                     <p className="font-medium text-gray-700">{getLatestConsultationDate(patient)}</p>
                  </div>
                  <ChevronRight size={20} className="flex-shrink-0 text-gray-400 ml-3" />
                </button>
              </li>
// ... (código existente sem alterações) ...
  );
};

// --- Componente: Modal (Genérico) ---
const Modal = ({ isOpen, onClose, title, children }) => {
// ... (código existente sem alterações) ...
};

// --- NOVO Componente: Modal de Agendamento ---
const ScheduleModal = ({ isOpen, onClose, patients, onSavePatient, onSaveAppointment, isSubmitting }) => {
// ... (código existente sem alterações) ...
};

// --- NOVO Componente: Visualização da Agenda ---
const AgendaView = ({ appointments, patients, onSelectPatientById, onUpdateAppointmentStatus }) => {
// ... (código existente sem alterações) ...
};


// --- Componente Principal (App) ---
export default function App() {
// ... (código existente sem alterações) ...
  const [appId] = useState(
    typeof __app_id !== 'undefined' ? __app_id : 'default-clinic-app-id', 
  );

  // --- Estados da Aplicação ---
// ... (código existente sem alterações) ...
  const [notification, setNotification] = useState({ message: '', type: 'success' });

  // Caminho da coleção (compartilhado para todos os usuários da clínica)
// ... (código existente sem alterações) ...
  const appointmentsCollectionPath = `appointments`; // NOVO

  // 1. Inicialização do Firebase e Autenticação
// ... (código existente sem alterações) ...
  }, []); // CORREÇÃO: Removida dependência [appId] que não é necessária aqui

  // 2. Carregamento dos Pacientes (listener em tempo real)
// ... (código existente sem alterações) ...
  }, [isAuthReady, db, userId, patientsCollectionPath]); // CORREÇÃO: Adicionado userId como dependência
  
  // NOVO: 3. Carregamento dos Agendamentos (listener em tempo real)
// ... (código existente sem alterações) ...
  }, [isAuthReady, db, userId, appointmentsCollectionPath]);
  
  // Novo Memo: Filtra pacientes arquivados
  const activePatients = useMemo(() => patients.filter(p => !p.isArchived), [patients]);

  // --- Funções CRUD ---

  // C: Criar Novo Paciente
  const handleAddPatient = async (patientData, onSuccess = () => {}) => {
// ... (código existente sem alterações) ...
      const cpfToCkeck = patientData.cpf ? patientData.cpf.trim() : "";
      if (cpfToCkeck) { // Só checa se o CPF não estiver vazio
// ... (código existente sem alterações) ...
      // --- Fim da Verificação ---
      
      const docRef = await addDoc(collection(db, patientsCollectionPath), {
// ... (código existente sem alterações) ...
  };
  
  // U: Atualizar Paciente (Cadastro Básico)
  const handleUpdatePatient = async (patientData) => {
// ... (código existente sem alterações) ...
  };
  
  // U: Adicionar Nova Consulta (Atualiza o Paciente)
  const handleAddConsultation = async (consultationData) => {
// ... (código existente sem alterações) ...
  };
  
  // NOVO: Salvar Consulta Editada
  const handleSaveEditedConsultation = async (editedConsultationData) => {
// ... (cáodigo existente sem alterações) ...
  };
  
  // NOVO: Arquivar Paciente
  const handleArchivePatient = async () => {
// ... (código existente sem alterações) ...
  };
  
  // --- Novas Funções de Agendamento ---
  
  // C: Criar Novo Agendamento
  const handleSaveAppointment = async (patient, appointmentData) => {
// ... (código existente sem alterações) ...
  };
  
  // U: Atualizar Status do Agendamento
  const handleUpdateAppointmentStatus = async (appointmentId, newStatus) => {
// ... (código existente sem alterações) ...
  };
  
  // --- Funções de Navegação ---
  
  // NOVO: Seleciona paciente pela Agenda e muda de view
  const handleSelectPatientById = (patientId) => {
// ... (código existente sem alterações) ...
  };


  // --- Renderização ---
// ... (código existente sem alterações) ...
   }

  // 2. Renderização Principal do App
  return (
    <div className="w-full min-h-screen bg-gray-100 font-sans">
// ... (código existente sem alterações) ...
      <ScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        patients={activePatients} // Modal de agendamento só usa pacientes ativos
        onSavePatient={handleAddPatient}
// ... (código existente sem alterações) ...
          <div className="flex items-center gap-3">
            <Eye size={30} className="text-blue-600" />
            <div>
// ... (código existente sem alterações) ...
        {/* --- VISÃO DE PACIENTES --- */}
        {view === 'pacientes' && (
          selectedPatient ? (
// ... (código existente sem alterações) ...
            />
          ) : (
            <PatientList
              patients={patients} // MUDANÇA: Passa a lista *completa* de pacientes
              onSelectPatient={setSelectedPatient}
              onNewPatient={() => setIsModalOpen(true)}
            />
          )
        )}
      </main>
    </div>
  );
}


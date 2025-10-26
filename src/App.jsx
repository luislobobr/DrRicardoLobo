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
  'João Pinheiro - MG',
  'Vazante - MG',
  'Brasilândia de Minas - MG',
  'Lagamar - MG',
  'Outra'
];

// --- Helper: Calcular Idade ---
const calculateAge = (dob) => {
  if (!dob) return '';
  try {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    // Adiciona verificação para datas inválidas
    if (isNaN(age) || age < 0 || age > 120) return '';
    return `${age} anos`;
  } catch (e) {
    console.error("Erro ao calcular idade:", e);
    return '';
  }
};

// --- Componente de Notificação ---
const Notification = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000); // Fecha após 5 segundos
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-100 border-green-400' : 'bg-red-100 border-red-400';
  const textColor = type === 'success' ? 'text-green-700' : 'text-red-700';
  const Icon = type === 'success' ? CheckCircle : AlertCircle;

  return (
    <div className={`fixed bottom-5 right-5 z-[100] max-w-sm rounded-lg border p-4 shadow-lg ${bgColor} ${textColor}`}>
      <div className="flex items-start gap-3">
        <Icon size={20} className="flex-shrink-0" />
        <p className="text-sm font-medium">{message}</p>
        <button onClick={onClose} className="ml-auto -mr-1 -mt-1 rounded-lg p-1 hover:bg-black/10">
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

// --- Componente: Input (Reutilizável) ---
const InputGroup = ({ label, name, type = "text", value, onChange, placeholder = "", rows = 3 }) => {
  const commonProps = {
    id: name,
    name: name,
    value: value,
    onChange: onChange,
    placeholder: placeholder,
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
  };

  return (
    <div className="w-full">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      {type === "textarea" ? (
        <textarea {...commonProps} rows={rows}></textarea>
      ) : type === "select" ? (
         <select {...commonProps}>
           <option value="">Selecione...</option>
           {CIDADES_ATENDIMENTO.map(city => (
             <option key={city} value={city}>{city}</option>
           ))}
         </select>
      ) : (
        <input {...commonProps} type={type} />
      )}
    </div>
  );
};

// --- Componente: Formulário de Nova Consulta (Oftalmológico) ---
const ConsultationForm = ({ patient, onSave, onCancel, initialData = null }) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    doctor: "Dr. Ricardo Lobo",
    notes: "",
    diagnosis: "",
    av_sc: { od: "", oe: "" }, // Acuidade Visual S/ Correção
    av_cc: { od: "", oe: "" }, // Acuidade Visual C/ Correção
    refraction: { // Refração
      od: { sph: "", cyl: "", axis: "" },
      oe: { sph: "", cyl: "", axis: "" },
      add: ""
    },
    lensometry: { // Lensometria (Óculos atual)
      od: { sph: "", cyl: "", axis: "" },
      oe: { sph: "", cyl: "", axis: "" },
      add: ""
    },
    pio: { od: "", oe: "" },
    biomicroscopy: "", // Notas da Biomicroscopia
    fundoscopy: "" // Notas do Fundo de Olho
  });

  // Novo: Preenche o formulário se for uma edição
  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        date: initialData.date || new Date().toISOString().split('T')[0],
        av_sc: initialData.av_sc || { od: "", oe: "" },
        av_cc: initialData.av_cc || { od: "", oe: "" },
        refraction: initialData.refraction || { od: { sph: "", cyl: "", axis: "" }, oe: { sph: "", cyl: "", axis: "" }, add: "" },
        lensometry: initialData.lensometry || { od: { sph: "", cyl: "", axis: "" }, oe: { sph: "", cyl: "", axis: "" }, add: "" },
        pio: initialData.pio || { od: "", oe: "" },
        biomicroscopy: initialData.biomicroscopy || "",
        fundoscopy: initialData.fundoscopy || "",
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNestedChange = (category, eye, field, value) => {
    setFormData(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [eye]: {
          ...prev[category][eye],
          [field]: value
        }
      }
    }));
  };
  
  const handlePioChange = (eye, value) => {
    setFormData(prev => ({
      ...prev,
      pio: {
        ...prev.pio,
        [eye]: value
      }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const InputRefraction = ({ eye, label, category }) => (
    <div className="grid grid-cols-4 gap-2 items-center">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input
        type="text"
        placeholder="Esf."
        className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        value={formData[category][eye].sph}
        onChange={(e) => handleNestedChange(category, eye, 'sph', e.target.value)}
      />
      <input
        type="text"
        placeholder="Cil."
        className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        value={formData[category][eye].cyl}
        onChange={(e) => handleNestedChange(category, eye, 'cyl', e.target.value)}
      />
      <input
        type="text"
        placeholder="Eixo"
        className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        value={formData[category][eye].axis}
        onChange={(e) => handleNestedChange(category, eye, 'axis', e.target.value)}
      />
    </div>
  );
  
  const InputAcuidade = ({ eye, label }) => (
     <div className="grid grid-cols-3 gap-2 items-center">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <input
          type="text"
          placeholder="S/C (20/)"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          value={formData.av_sc[eye]}
          onChange={(e) => setFormData(p => ({ ...p, av_sc: { ...p.av_sc, [eye]: e.target.value }}))}
        />
        <input
          type="text"
          placeholder="C/C (20/)"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          value={formData.av_cc[eye]}
          onChange={(e) => setFormData(p => ({ ...p, av_cc: { ...p.av_cc, [eye]: e.target.value }}))}
        />
     </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputGroup label="Data da Consulta" name="date" type="date" value={formData.date} onChange={handleChange} />
        <InputGroup label="Médico Responsável" name="doctor" value={formData.doctor} onChange={handleChange} />
      </div>

      {/* NOVO: Acuidade Visual */}
      <fieldset className="border p-4 rounded-lg">
        <legend className="text-lg font-semibold px-2 text-blue-600">Acuidade Visual (AV)</legend>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 items-center">
            <div></div>
            <label className="text-sm font-medium text-gray-500 text-center">Sem Correção</label>
            <label className="text-sm font-medium text-gray-500 text-center">Com Correção</label>
          </div>
          <InputAcuidade eye="od" label="Olho Direito (OD)" />
          <InputAcuidade eye="oe" label="Olho Esquerdo (OE)" />
        </div>
      </fieldset>
      
      {/* NOVO: Lensometria */}
      <fieldset className="border p-4 rounded-lg">
        <legend className="text-lg font-semibold px-2 text-blue-600">Lensometria (Óculos Atual)</legend>
        <div className="space-y-3">
          <InputRefraction eye="od" label="Olho Direito (OD)" category="lensometry" />
          <InputRefraction eye="oe" label="Olho Esquerdo (OE)" category="lensometry" />
          <div className="grid grid-cols-4 gap-2 items-center">
            <label className="text-sm font-medium text-gray-700">Adição (ADD)</label>
             <input
              type="text"
              placeholder="Para perto"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              value={formData.lensometry.add}
              onChange={(e) => setFormData(p => ({...p, lensometry: {...p.lensometry, add: e.target.value}}))}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="border p-4 rounded-lg">
        <legend className="text-lg font-semibold px-2 text-blue-600">Refração</legend>
        <div className="space-y-3">
          <InputRefraction eye="od" label="Olho Direito (OD)" category="refraction" />
          <InputRefraction eye="oe" label="Olho Esquerdo (OE)" category="refraction" />
          <div className="grid grid-cols-4 gap-2 items-center">
            <label className="text-sm font-medium text-gray-700">Adição (ADD)</label>
             <input
              type="text"
              placeholder="Para perto"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              value={formData.refraction.add}
              onChange={(e) => setFormData(p => ({...p, refraction: {...p.refraction, add: e.target.value}}))}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="border p-4 rounded-lg">
        <legend className="text-lg font-semibold px-2 text-blue-600">Pressão Intraocular (PIO)</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputGroup label="Olho Direito (OD) - mmHg" name="pio_od" value={formData.pio.od} onChange={(e) => handlePioChange('od', e.target.value)} />
          <InputGroup label="Olho Esquerdo (OE) - mmHg" name="pio_oe" value={formData.pio.oe} onChange={(e) => handlePioChange('oe', e.target.value)} />
        </div>
      </fieldset>

      <InputGroup label="Diagnóstico Principal" name="diagnosis" value={formData.diagnosis} onChange={handleChange} />
      
      {/* NOVO: Campos de Anotações de Exames */}
      <fieldset className="border p-4 rounded-lg">
        <legend className="text-lg font-semibold px-2 text-blue-600">Notas de Exames</legend>
        <div className="space-y-4">
          <InputGroup label="Biomicroscopia" name="biomicroscopy" type="textarea" value={formData.biomicroscopy} onChange={handleChange} />
          <InputGroup label="Fundo de Olho" name="fundoscopy" type="textarea" value={formData.fundoscopy} onChange={handleChange} />
        </div>
      </fieldset>

      <InputGroup label="Anotações Gerais (Conduta)" name="notes" type="textarea" value={formData.notes} onChange={handleChange} />

      <footer className="flex justify-end gap-3 pt-4">
        <button type="button" onClick={onCancel} className="bg-gray-100 text-gray-700 px-5 py-2 rounded-lg font-medium shadow-sm border border-gray-200 hover:bg-gray-200 transition-colors duration-300 flex items-center justify-center gap-2">
          <X size={18} />
          Cancelar
        </button>
        <button type="submit" className="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium shadow-lg hover:bg-blue-700 transition-colors duration-300 flex items-center justify-center gap-2 disabled:opacity-50">
          <Save size={18} />
          {initialData ? 'Salvar Alterações' : 'Salvar Consulta'}
        </button>
      </footer>
    </form>
  );
};

// --- Componente: Formulário de Paciente (Novo/Edição) ---
const PatientForm = ({ onSave, onCancel, initialData = {} }) => {
  const [patient, setPatient] = useState({
    name: initialData.name || '',
    cpf: initialData.cpf || '',
    dob: initialData.dob || '', // Data de Nascimento (Date of Birth)
    phone: initialData.phone || '',
    city: initialData.city || '',
    notes: initialData.notes || '',
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false); // Estado de Submissão

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPatient(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!patient.name || !patient.cpf) {
      alert("Nome e CPF são obrigatórios."); // Substituir por notificação se houver tempo
      return;
    }
    setIsSubmitting(true);
    await onSave(patient);
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <InputGroup label="Nome Completo" name="name" value={patient.name} onChange={handleChange} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputGroup label="CPF" name="cpf" value={patient.cpf} onChange={handleChange} />
        <InputGroup label="Data de Nascimento" name="dob" type="date" value={patient.dob} onChange={handleChange} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputGroup label="Telefone" name="phone" value={patient.phone} onChange={handleChange} />
        <InputGroup label="Cidade" name="city" type="select" value={patient.city} onChange={handleChange} />
      </div>
      <InputGroup label="Anotações Gerais (Alergias, etc)" name="notes" type="textarea" value={patient.notes} onChange={handleChange} />
      
      <footer className="flex justify-end gap-3 pt-4">
        <button type="button" onClick={onCancel} className="bg-gray-100 text-gray-700 px-5 py-2 rounded-lg font-medium shadow-sm border border-gray-200 hover:bg-gray-200 transition-colors duration-300 flex items-center justify-center gap-2">
          <X size={18} />
          Cancelar
        </button>
        <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium shadow-lg hover:bg-blue-700 transition-colors duration-300 flex items-center justify-center gap-2 disabled:opacity-50">
          <Save size={18} />
          {isSubmitting ? "Salvando..." : (initialData.id ? "Salvar Alterações" : "Salvar Paciente")}
        </button>
      </footer>
    </form>
  );
};

// --- Componente: Detalhes do Paciente ---
const PatientDetails = ({ patient, db, onBack, onSavePatient, onSaveNewConsultation, onSaveEditedConsultation, onArchivePatient }) => {
  const [view, setView] = useState('details'); // 'details', 'edit_patient', 'new_consultation'
  const [selectedConsultation, setSelectedConsultation] = useState(null); // Novo
  
  const sortedConsultations = useMemo(() => {
    if (!patient || !patient.consultations) return [];
    return [...patient.consultations].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [patient]);

  const lastConsultation = sortedConsultations[0];
  const lastRefraction = lastConsultation?.refraction;
  const lastAV = lastConsultation?.av_cc; // Novo
  
  const handleSavePatient = async (patientData) => {
    await onSavePatient(patientData);
    setView('details');
  };
  
  const handleSaveNewConsultation = async (consultationData) => {
    await onSaveNewConsultation(consultationData);
    setView('details');
  }

  // Novo
  const handleEditConsultationClick = (consulta) => {
    setSelectedConsultation(consulta);
    setView('edit_consultation');
  };
  
  // Novo
  const handleSaveEditedConsultation = async (consultationData) => {
    await onSaveEditedConsultation(consultationData);
    setView('details');
    setSelectedConsultation(null);
  }

  if (view === 'edit_patient') {
    return (
      <div className="p-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Editar Cadastro</h2>
        <h3 className="text-lg text-gray-600 mb-6">{patient.name}</h3>
        <PatientForm
          onSave={handleSavePatient}
          onCancel={() => setView('details')}
          initialData={patient}
        />
      </div>
    );
  }

  if (view === 'new_consultation') {
    return (
      <div className="p-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Nova Consulta</h2>
        <h3 className="text-lg text-gray-600 mb-6">{patient.name}</h3>
        <ConsultationForm 
          patient={patient}
          onSave={handleSaveNewConsultation}
          onCancel={() => setView('details')}
          initialData={null}
        />
      </div>
    );
  }
  
  // Novo Bloco
  if (view === 'edit_consultation') {
     return (
      <div className="p-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Editar Consulta</h2>
        <h3 className="text-lg text-gray-600 mb-6">{patient.name} - {new Date(selectedConsultation.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</h3>
        <ConsultationForm 
          patient={patient}
          onSave={handleSaveEditedConsultation}
          onCancel={() => { setView('details'); setSelectedConsultation(null); }}
          initialData={selectedConsultation}
        />
      </div>
    );
  }

  return (
    <div className="p-1 md:p-4">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <button onClick={onBack} className="flex items-center gap-1 text-sm text-blue-600 hover:underline mb-2">
            <ArrowLeft size={16} />
            Voltar para lista
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{patient.name}</h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-600 mt-2">
             {/* NOVO: Idade */}
             {patient.dob && (
                <span className="flex items-center gap-1.5"><Calendar size={15} /> {calculateAge(patient.dob)} ({new Date(patient.dob).toLocaleDateString('pt-BR', {timeZone: 'UTC'})})</span>
              )}
             {patient.cpf && <span className="flex items-center gap-1.5"><FileText size={15} /> {patient.cpf}</span>}
             {patient.phone && <span className="flex items-center gap-1.5"><Phone size={15} /> {patient.phone}</span>}
             {patient.city && <span className="flex items-center gap-1.5"><MapPin size={15} /> {patient.city}</span>}
          </div>
        </div>
        <div className="flex-shrink-0 flex flex-col md:flex-row items-stretch gap-3">
          <button onClick={() => setView('edit_patient')} className="bg-gray-100 text-gray-700 px-5 py-2 rounded-lg font-medium shadow-sm border border-gray-200 hover:bg-gray-200 transition-colors duration-300 flex items-center justify-center gap-2">
            <Edit2 size={16} />
            Editar Cadastro
          </button>
           <button onClick={() => setView('new_consultation')} className="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium shadow-lg hover:bg-blue-700 transition-colors duration-300 flex items-center justify-center gap-2 disabled:opacity-50">
            <Plus size={18} />
            Adicionar Consulta
          </button>
          {/* Novo Botão Arquivar */}
           <button onClick={onArchivePatient} className="bg-red-100 text-red-700 px-5 py-2 rounded-lg font-medium shadow-sm border border-red-200 hover:bg-red-200 transition-colors duration-300 flex items-center justify-center gap-2">
            <Archive size={16} />
            Arquivar
          </button>
        </div>
      </header>
      
      {/* Resumo da Última Consulta */}
      {(lastRefraction || lastAV) && (
         <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
           <h3 className="text-lg font-semibold text-blue-800 mb-3">Resumo da Última Refração e AV</h3>
            <table className="w-full text-sm text-left">
                <thead className="font-medium text-gray-600">
                  <tr>
                    <td className="py-1 pr-2"></td>
                    <td className="py-1 px-2 text-center">Esf.</td>
                    <td className="py-1 px-2 text-center">Cil.</td>
                    <td className="py-1 px-2 text-center">Eixo</td>
                    <td className="py-1 px-2 text-center">AV C/C</td> {/* Novo */}
                    <td className="py-1 px-2 text-center">PIO</td>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white">
                    <td className="py-2 pr-2 font-medium">OD</td>
                    <td className="py-2 px-2 text-center">{lastRefraction?.od?.sph || '-'}</td>
                    <td className="py-2 px-2 text-center">{lastRefraction?.od?.cyl || '-'}</td>
                    <td className="py-2 px-2 text-center">{lastRefraction?.od?.axis || '-'}</td>
                    <td className="py-2 px-2 text-center font-bold text-blue-800">{lastAV?.od || '-'}</td> {/* Novo */}
                    <td className="py-2 px-2 text-center">{lastConsultation.pio?.od || '-'} mmHg</td>
                  </tr>
                   <tr className="bg-white">
                    <td className="py-2 pr-2 font-medium">OE</td>
                    <td className="py-2 px-2 text-center">{lastRefraction?.oe?.sph || '-'}</td>
                    <td className="py-2 px-2 text-center">{lastRefraction?.oe?.cyl || '-'}</td>
                    <td className="py-2 px-2 text-center">{lastRefraction?.oe?.axis || '-'}</td>
                    <td className="py-2 px-2 text-center font-bold text-blue-800">{lastAV?.oe || '-'}</td> {/* Novo */}
                    <td className="py-2 px-2 text-center">{lastConsultation.pio?.oe || '-'} mmHg</td>
                  </tr>
                   {lastRefraction?.add && (
                     <tr className="bg-white">
                       <td className="py-2 pr-2 font-medium">ADD</td>
                       <td colSpan="5" className="py-2 px-2">{lastRefraction.add}</td>
                     </tr>
                   )}
                </tbody>
            </table>
         </div>
      )}
      
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Histórico de Consultas</h2>
      <div className="space-y-4">
        {sortedConsultations.length > 0 ? (
          sortedConsultations.map((consulta, index) => (
            <div key={consulta.consultId || index} className="bg-white p-5 rounded-lg shadow-md border border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold text-gray-800">
                  {new Date(consulta.date).toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: 'long', year: 'numeric' })}
                </h3>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">{consulta.doctor}</span>
                  {/* Novo Botão Editar Consulta */}
                  <button onClick={() => handleEditConsultationClick(consulta)} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                    <Edit2 size={14} />
                    Editar
                  </button>
                </div>
              </div>
              {consulta.diagnosis && (
                <p className="text-gray-700 mb-2"><strong>Diagnóstico:</strong> {consulta.diagnosis}</p>
              )}
              {consulta.notes && (
                <p className="text-gray-700 whitespace-pre-wrap"><strong>Anotações:</strong> {consulta.notes}</p>
              )}
            </div>
          ))
        ) : (
          <div className="bg-white p-10 text-center rounded-lg shadow-md border border-gray-200">
            <EyeOff size={40} className="mx-auto text-gray-400 mb-3" />
            <h3 className="text-lg font-medium text-gray-700">Nenhuma consulta registrada</h3>
            <p className="text-gray-500 text-sm">Clique em "Adicionar Consulta" para começar.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- NOVO Componente: Resumo do Dia ---
const DailySummary = ({ patients, onSelectPatient }) => {
  const [todayString] = useState(new Date().toISOString().split('T')[0]);

  const patientsSeenToday = useMemo(() => {
    return patients
      .filter(p => 
        p.consultations && p.consultations.some(c => c.date === todayString)
      )
      .sort((a, b) => {
        // Opcional: ordenar por nome
        return a.name.localeCompare(b.name);
      });
  }, [patients, todayString]);

  if (patientsSeenToday.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200 mb-6 text-center">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center justify-center gap-2 mb-3">
          <Clock size={22} className="text-blue-600" />
          Pacientes Atendidos Hoje
        </h2>
        <p className="text-gray-500">Nenhum paciente com consulta registrada hoje ({new Date().toLocaleDateString('pt-BR')}).</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200 mb-6">
      <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2 mb-4">
        <Clock size={22} className="text-blue-600" />
        Pacientes Atendidos Hoje ({new Date().toLocaleDateString('pt-BR')})
      </h2>
      <ul className="divide-y divide-gray-100 max-h-60 overflow-y-auto">
        {patientsSeenToday.map(patient => (
          <li key={patient.id}>
            <button 
              onClick={() => onSelectPatient(patient)} 
              className="w-full text-left p-3 hover:bg-gray-50 rounded-lg flex justify-between items-center"
            >
              <div>
                <p className="font-medium text-blue-700">{patient.name}</p>
                <p className="text-sm text-gray-500">{patient.city}</p>
              </div>
              <ChevronRight size={18} className="text-gray-400" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

// --- Componente: Lista de Pacientes ---
const PatientList = ({ patients, onSelectPatient, onNewPatient }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState('Todos');
  const [showArchived, setShowArchived] = useState(false); // NOVO: Estado para arquivados

  const filteredPatients = useMemo(() => {
    return patients
      .filter(p => {
        // NOVO: Lógica de filtro para arquivados
        if (!showArchived && p.isArchived) {
          return false;
        }

        const nameMatch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
        const cpfMatch = (p.cpf || '').toLowerCase().includes(searchTerm.toLowerCase());
        const cityMatch = cityFilter === 'Todos' || p.city === cityFilter;
        
        return (nameMatch || cpfMatch) && cityMatch;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [patients, searchTerm, cityFilter, showArchived]); // ATUALIZADO: Adiciona showArchived
  
  const getLatestConsultationDate = (patient) => {
    if (!patient.consultations || patient.consultations.length === 0) {
      return "Sem consultas";
    }
    const latestDate = new Date(
      Math.max(...patient.consultations.map(c => new Date(c.date)))
    );
    return latestDate.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  };

  // NOVO: Contagem de pacientes de hoje
  const [todayString] = useState(new Date().toISOString().split('T')[0]);
  const patientsTodayCount = useMemo(() => {
    return patients.filter(p => 
      p.consultations && p.consultations.some(c => c.date === todayString)
    ).length;
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
            <input
              type="text"
              placeholder="Buscar por nome ou CPF..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
          {/* Novo Filtro de Cidade */}
          <div className="relative flex-grow w-full md:w-auto">
             <select 
               value={cityFilter}
               onChange={(e) => setCityFilter(e.target.value)}
               className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 pl-10 appearance-none"
             >
               <option value="Todos">Todas as Cidades</option>
               {CIDADES_ATENDIMENTO.map(city => (
                 <option key={city} value={city}>{city}</option>
               ))}
             </select>
             <Filter size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
          
          {/* NOVO: Checkbox de Arquivados */}
          <div className="flex items-center gap-2 text-sm text-gray-700 w-full md:w-auto flex-shrink-0">
            <input 
              type="checkbox"
              id="showArchived"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="showArchived">Incluir arquivados</label>
          </div>

          <button onClick={onNewPatient} className="bg-green-600 text-white px-5 py-2 rounded-lg font-medium shadow-lg hover:bg-green-700 transition-colors duration-300 flex items-center justify-center gap-2 disabled:opacity-50 flex-shrink-0 w-full md:w-auto">
            <UserPlus size={18} />
            Novo Paciente
          </button>
        </div>
      </header>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
        <ul className="divide-y divide-gray-200">
          {filteredPatients.length > 0 ? (
            filteredPatients.map(patient => (
              // NOVO: Adiciona classe se estiver arquivado
              <li key={patient.id} className={patient.isArchived ? 'bg-gray-100 opacity-60' : ''}>
                <button onClick={() => onSelectPatient(patient)} className="w-full text-left p-4 hover:bg-gray-50 transition-colors duration-150 flex justify-between items-center">
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
            ))
          ) : (
            <li className="p-6 text-center text-gray-500">
              {searchTerm || cityFilter !== 'Todos' ? 'Nenhum paciente encontrado para os filtros aplicados.' : 'Nenhum paciente cadastrado.'}
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

// --- Componente: Modal (Genérico) ---
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[99] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()} // Evita fechar ao clicar dentro
      >
        <header className="flex justify-between items-center p-4 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-800">
            <X size={22} />
          </button>
        </header>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- NOVO Componente: Modal de Agendamento ---
const ScheduleModal = ({ isOpen, onClose, patients, onSavePatient, onSaveAppointment, isSubmitting }) => {
  const [step, setStep] = useState(1); // 1: Find/Create Patient, 2: Details
  const [selectedPatientForAgenda, setSelectedPatientForAgenda] = useState(null);
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [appointmentData, setAppointmentData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: "09:00",
    notes: "",
    status: "Agendado"
  });

  // Limpa o estado ao fechar
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setSelectedPatientForAgenda(null);
      setShowNewPatientForm(false);
      setSearchTerm('');
      setAppointmentData({
        date: new Date().toISOString().split('T')[0],
        time: "09:00",
        notes: "",
        status: "Agendado"
      });
    }
  }, [isOpen]);
  
  const filteredPatients = useMemo(() => {
    if (searchTerm.length < 2) return [];
    return patients
      .filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (p.cpf || '').includes(searchTerm)
      )
      .slice(0, 5); // Limita a 5 resultados
  }, [patients, searchTerm]);

  // Salva o novo paciente e avança
  const handleSaveNewPatientInModal = async (patientData) => {
    // onSavePatient agora aceita um callback
    await onSavePatient(patientData, (savedDataWithId) => {
      setSelectedPatientForAgenda(savedDataWithId); // Seleciona o paciente recém-criado
      setShowNewPatientForm(false);
      setStep(2);
    });
  };

  // Salva o agendamento
  const handleSaveAppointmentClick = () => {
    if (!selectedPatientForAgenda) return;
    onSaveAppointment(selectedPatientForAgenda, appointmentData);
  };
  
  const handleSelectPatient = (patient) => {
    setSelectedPatientForAgenda(patient);
    setSearchTerm(patient.name);
    setStep(2);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={showNewPatientForm ? "Cadastrar Novo Paciente" : "Agendar Consulta"}>
      <div className="space-y-4">

        {/* --- ETAPA 1: SELECIONAR OU CRIAR PACIENTE --- */}
        {step === 1 && !showNewPatientForm && (
          <div className="space-y-4">
            <InputGroup 
              label="Buscar Paciente (Nome ou CPF)" 
              name="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Digite para buscar..."
            />
            {filteredPatients.length > 0 && (
              <ul className="border border-gray-200 rounded-lg divide-y divide-gray-200">
                {filteredPatients.map(p => (
                  <li key={p.id}>
                    <button onClick={() => handleSelectPatient(p)} className="w-full text-left p-3 hover:bg-gray-50">
                      <p className="font-medium">{p.name}</p>
                      <p className="text-sm text-gray-500">{p.cpf} - {p.city}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {searchTerm.length > 2 && filteredPatients.length === 0 && (
              <p className="text-center text-gray-500 p-4">Nenhum paciente encontrado.</p>
            )}
            <div className="text-center pt-2">
              <button 
                onClick={() => setShowNewPatientForm(true)}
                className="bg-green-600 text-white px-5 py-2 rounded-lg font-medium shadow-lg hover:bg-green-700 transition-colors duration-300 flex items-center justify-center gap-2 disabled:opacity-50 w-full"
              >
                <UserPlus size={18} />
                Cadastrar Novo Paciente
              </button>
            </div>
          </div>
        )}
        
        {/* --- ETAPA 1.5: FORMULÁRIO DE NOVO PACIENTE (DENTRO DO MODAL) --- */}
        {showNewPatientForm && (
          <PatientForm 
            onSave={handleSaveNewPatientInModal}
            onCancel={() => setShowNewPatientForm(false)}
            initialData={{}}
          />
        )}

        {/* --- ETAPA 2: DETALHES DO AGENDAMENTO --- */}
        {step === 2 && selectedPatientForAgenda && (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <label className="text-sm font-medium text-gray-700">Paciente Selecionado:</label>
              <p className="text-lg font-semibold text-blue-800">{selectedPatientForAgenda.name}</p>
              <p className="text-sm text-gray-600">{selectedPatientForAgenda.cpf} - {selectedPatientForAgenda.city}</p>
            </div>
            
             <div className="grid grid-cols-2 gap-4">
               <InputGroup 
                 label="Data"
                 name="date"
                 type="date"
                 value={appointmentData.date}
                 onChange={(e) => setAppointmentData(p => ({...p, date: e.target.value}))}
               />
               <InputGroup 
                 label="Hora"
                 name="time"
                 type="time"
                 value={appointmentData.time}
                 onChange={(e) => setAppointmentData(p => ({...p, time: e.target.value}))}
               />
             </div>
             
             <InputGroup 
                label="Observações (ex: Retorno, Exame)"
                name="notes"
                type="textarea"
                rows={2}
                value={appointmentData.notes}
                onChange={(e) => setAppointmentData(p => ({...p, notes: e.target.value}))}
              />
              
            <footer className="flex justify-between items-center gap-3 pt-4">
              <button 
                type="button" 
                onClick={() => { setStep(1); setSelectedPatientForAgenda(null); setSearchTerm(''); }} 
                className="bg-gray-100 text-gray-700 px-5 py-2 rounded-lg font-medium shadow-sm border border-gray-200 hover:bg-gray-200 transition-colors duration-300 flex items-center justify-center gap-2"
              >
                <ArrowLeft size={18} />
                Trocar Paciente
              </button>
              <button 
                type="button" 
                onClick={handleSaveAppointmentClick} 
                disabled={isSubmitting}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium shadow-lg hover:bg-blue-700 transition-colors duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save size={18} />
                {isSubmitting ? "Salvando..." : "Salvar Agendamento"}
              </button>
            </footer>
          </div>
        )}
      </div>
    </Modal>
  );
};

// --- NOVO Componente: Visualização da Agenda ---
const AgendaView = ({ appointments, patients, onSelectPatientById, onUpdateAppointmentStatus }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const filteredAppointments = useMemo(() => {
    return appointments
      .filter(a => a.date === selectedDate)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [appointments, selectedDate]);
  
  const getPatient = (patientId) => {
    return patients.find(p => p.id === patientId);
  }

  return (
    <div className="p-4 md:p-8">
      <header className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
           <CalendarDays size={30} />
           Agenda do Dia
        </h1>
        <div className="flex items-center gap-4">
          <label htmlFor="agenda-date" className="font-medium">Selecionar Data:</label>
          <input
            id="agenda-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </header>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
        <ul className="divide-y divide-gray-200">
          {filteredAppointments.length > 0 ? (
            filteredAppointments.map(appt => {
              const patient = getPatient(appt.patientId);
              return (
                <li key={appt.id} className="flex flex-col md:flex-row items-start md:items-center p-4 gap-4">
                  <span className="text-lg font-semibold text-blue-600 w-full md:w-24">{appt.time}</span>
                  <div className="flex-1">
                    <button 
                      onClick={() => onSelectPatientById(appt.patientId)}
                      className="text-md font-semibold text-blue-700 truncate hover:underline"
                    >
                      {appt.patientName}
                    </button>
                    <div className="flex flex-col md:flex-row md:items-center md:gap-4 text-sm text-gray-500">
                      <span><MapPin size={14} className="inline mr-1" /> {appt.patientCity}</span>
                      {appt.notes && (
                        <>
                          <span className="hidden md:inline">|</span>
                          <span>{appt.notes}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <select 
                      value={appt.status} 
                      onChange={(e) => onUpdateAppointmentStatus(appt.id, e.target.value)}
                      className="text-sm px-3 py-1 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Agendado">Agendado</option>
                      <option value="Confirmado">Confirmado</option>
                      <option value="Atendido">Atendido</option>
                      <option value="Faltou">Faltou</option>
                    </select>
                  </div>
                </li>
              );
            })
          ) : (
            <li className="p-10 text-center text-gray-500">
              Nenhum agendamento para {new Date(selectedDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};


// --- Componente Principal (App) ---
export default function App() {
  // --- Estados de Autenticação e Firebase ---
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authError, setAuthError] = useState(null);
  
  // ID do App (global ou padrão) - Não usado para o caminho do DB customizado
  const [appId] = useState(
    typeof __app_id !== 'undefined' ? __app_id : 'default-clinic-app-id', 
  );

  // --- Estados da Aplicação ---
  const [view, setView] = useState('agenda'); // NOVO: 'agenda' ou 'pacientes'. Começa na agenda.
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]); // NOVO: Para agendamentos
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false); // Para novo paciente
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false); // NOVO: Para agendamento
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState({ message: '', type: 'success' });

  // Caminho da coleção (compartilhado para todos os usuários da clínica)
  const patientsCollectionPath = `patients`;
  const appointmentsCollectionPath = `appointments`; // NOVO

  // 1. Inicialização do Firebase e Autenticação
  useEffect(() => {
    try {
      // CONFIGURAÇÃO DO FIREBASE FORNECIDA PELO USUÁRIO
      const firebaseConfig = {
        apiKey: "AIzaSyADy55J5KlccqbGXrh6jg1RYBt4qccIfoE",
        authDomain: "drricardolobo-3c37b.firebaseapp.com",
        projectId: "drricardolobo-3c37b",
        storageBucket: "drricardolobo-3c37b.firebasestorage.app",
        messagingSenderId: "597542516601",
        appId: "1:597542516601:web:b4c43dfe39527525aa21a8"
      };
      
      if (!firebaseConfig.apiKey) {
        setAuthError("Configuração do Firebase não encontrada.");
        setIsAuthReady(true);
        setIsLoading(false);
        return;
      }
      
      const app = initializeApp(firebaseConfig);
      const authInstance = getAuth(app);
      const dbInstance = getFirestore(app);
      setLogLevel('Debug'); // Conforme instrução

      setDb(dbInstance);
      setAuth(authInstance);

      // Persistência da autenticação (opcional, mas bom para web apps)
      setPersistence(authInstance, inMemoryPersistence)
        .then(() => {
          const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
            if (user) {
              setUserId(user.uid);
              setIsAuthReady(true);
            } else {
              // Tentar login com token ou anônimo
              // CORREÇÃO: Lógica de fallback melhorada
              try {
                const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
                if (token) {
                  await signInWithCustomToken(authInstance, token);
                } else {
                  console.warn("Token inicial não encontrado, tentando login anônimo.");
                  await signInAnonymously(authInstance);
                }
              } catch (authError) {
                console.error("Erro na autenticação (token):", authError.code, authError.message);
                // SE O TOKEN DO AMBIENTE FALHAR (o que é esperado com config customizada),
                // TENTA LOGIN ANÔNIMO COMO FALLBACK.
                if (authError.code === 'auth/custom-token-mismatch' || (token === null)) {
                  console.warn("Token mismatch (esperado com config customizada) ou token ausente. Tentando login anônimo.");
                  try {
                    await signInAnonymously(authInstance);
                  } catch (anonError) {
                    console.error("Erro no login anônimo:", anonError);
                    setAuthError("Falha no login anônimo. Verifique as configurações do Firebase.");
                    setIsAuthReady(true);
                  }
                } else {
                  // Outro erro de autenticação
                  setAuthError("Falha na autenticação. Verifique suas credenciais.");
                  setIsAuthReady(true);
                }
              }
            }
          });
          return () => unsubscribe();
        })
        .catch((error) => {
          console.error("Erro ao definir persistência:", error);
          setAuthError("Erro de configuração de autenticação.");
          setIsAuthReady(true);
        });

    } catch (e) {
      console.error("Erro fatal ao inicializar Firebase:", e);
      setAuthError("Erro crítico ao carregar o app.");
      setIsAuthReady(true);
      setIsLoading(false);
    }
  }, []); // CORREÇÃO: Removida dependência [appId] que não é necessária aqui

  // 2. Carregamento dos Pacientes (listener em tempo real)
  useEffect(() => {
    if (!isAuthReady || !db || !userId) {
      // Se a autenticação não estiver pronta ou falhar, não busca dados
      if (isAuthReady && !userId) {
         setIsLoading(false); // Libera o loading se a auth falhou
      }
      return;
    }
    
    setIsLoading(true);
    const q = query(collection(db, patientsCollectionPath));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const patientsData = [];
      querySnapshot.forEach((doc) => {
        patientsData.push({ id: doc.id, ...doc.data() });
      });
      setPatients(patientsData);
      setIsLoading(false); // Para o loading aqui
    }, (error) => {
      console.error("Erro ao buscar pacientes: ", error);
      setNotification({ message: "Erro ao carregar pacientes. Verifique as permissões do banco.", type: "error" });
      setIsLoading(false);
    });

    // Limpa o listener ao desmontar
    return () => unsubscribe();
  }, [isAuthReady, db, userId, patientsCollectionPath]); // CORREÇÃO: Adicionado userId como dependência
  
  // NOVO: 3. Carregamento dos Agendamentos (listener em tempo real)
  useEffect(() => {
    if (!isAuthReady || !db || !userId) {
      return;
    }
    
    // Poderia filtrar por data aqui, mas carregar todos e filtrar no front-end
    // é mais simples para este app, a menos que a base cresça muito.
    const q = query(collection(db, appointmentsCollectionPath));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const appointmentsData = [];
      querySnapshot.forEach((doc) => {
        appointmentsData.push({ id: doc.id, ...doc.data() });
      });
      setAppointments(appointmentsData);
      // Não mexe no isLoading aqui, deixa o listener de pacientes controlar
    }, (error) => {
      console.error("Erro ao buscar agendamentos: ", error);
      setNotification({ message: "Erro ao carregar agendamentos.", type: "error" });
    });

    // Limpa o listener ao desmontar
    return () => unsubscribe();
  }, [isAuthReady, db, userId, appointmentsCollectionPath]);
  
  // Novo Memo: Filtra pacientes arquivados
  const activePatients = useMemo(() => patients.filter(p => !p.isArchived), [patients]);

  // --- Funções CRUD ---

  // C: Criar Novo Paciente
  const handleAddPatient = async (patientData, onSuccess = () => {}) => {
    setIsSubmitting(true);
    try {
      
      // --- NOVO: Verificação de CPF ---
      const cpfToCkeck = patientData.cpf ? patientData.cpf.trim() : "";
      if (cpfToCkeck) { // Só checa se o CPF não estiver vazio
        const q = query(collection(db, patientsCollectionPath), where("cpf", "==", cpfToCkeck));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          // CPF já existe
          setNotification({ message: "Erro: O CPF informado já está cadastrado.", type: "error" });
          setIsSubmitting(false);
          return; // Para a execução
        }
      }
      // --- Fim da Verificação ---
      
      const docRef = await addDoc(collection(db, patientsCollectionPath), {
        ...patientData,
        createdAt: new Date().toISOString(),
        isArchived: false,
        consultations: []
      });
      setNotification({ message: "Paciente salvo com sucesso!", type: "success" });
      setIsModalOpen(false); // Fecha o modal padrão
      
      // Chama o callback de sucesso passando o novo paciente (com ID)
      onSuccess({ ...patientData, id: docRef.id }); 
      
    } catch (error) {
      console.error("Erro ao salvar paciente: ", error);
      setNotification({ message: "Erro ao salvar paciente.", type: "error" });
    }
    setIsSubmitting(false);
  };
  
  // U: Atualizar Paciente (Cadastro Básico)
  const handleUpdatePatient = async (patientData) => {
    if (!selectedPatient) return;
    setIsSubmitting(true);
    try {
      const patientRef = doc(db, patientsCollectionPath, selectedPatient.id);
      await updateDocFirestore(patientRef, patientData); // Usando o alias
      setNotification({ message: "Cadastro atualizado!", type: "success" });
      
      // Atualiza o estado local (importante)
      setSelectedPatient(prev => ({ ...prev, ...patientData }));
    } catch (error) {
      console.error("Erro ao atualizar paciente: ", error);
      setNotification({ message: "Erro ao atualizar paciente.", type: "error" });
    }
    setIsSubmitting(false);
  };
  
  // U: Adicionar Nova Consulta (Atualiza o Paciente)
  const handleAddConsultation = async (consultationData) => {
    if (!selectedPatient) return;
    setIsSubmitting(true);
    try {
      const patientRef = doc(db, patientsCollectionPath, selectedPatient.id);
      
      // Adiciona a nova consulta no início do array
      const newConsultations = [
        {
          ...consultationData,
          consultId: crypto.randomUUID() // Garante um ID único para edição futura
        }, 
        ...(selectedPatient.consultations || [])
      ];
      
      await updateDocFirestore(patientRef, { // Usando o alias
        consultations: newConsultations
      });
      
      setNotification({ message: "Nova consulta salva!", type: "success" });
      // Atualiza o estado local
      setSelectedPatient(prev => ({ ...prev, consultations: newConsultations }));
    } catch (error) {
      console.error("Erro ao salvar consulta: ", error);
      setNotification({ message: "Erro ao salvar consulta.", type: "error" });
    }
    setIsSubmitting(false);
  };
  
  // NOVO: Salvar Consulta Editada
  const handleSaveEditedConsultation = async (editedConsultationData) => {
    if (!selectedPatient || !editedConsultationData.consultId) {
      setNotification({ message: "Erro: ID da consulta não encontrado.", type: "error" });
      return;
    }
    setIsSubmitting(true);
    try {
      const patientRef = doc(db, patientsCollectionPath, selectedPatient.id);
      
      const newConsultations = selectedPatient.consultations.map(c => 
        c.consultId === editedConsultationData.consultId ? editedConsultationData : c
      );
      
      await updateDocFirestore(patientRef, { // Usando o alias
        consultations: newConsultations
      });
      
      setNotification({ message: "Consulta atualizada!", type: "success" });
      // Atualiza o estado local
      setSelectedPatient(prev => ({ ...prev, consultations: newConsultations }));
    } catch (error) {
      console.error("Erro ao atualizar consulta: ", error);
      setNotification({ message: "Erro ao atualizar consulta.", type: "error" });
    }
    setIsSubmitting(false);
  };
  
  // NOVO: Arquivar Paciente
  const handleArchivePatient = async () => {
    if (!selectedPatient) return;
    
    // Simulação de confirmação (substituindo o window.confirm)
    // Em um app real, usaríamos um modal de confirmação.
    // Por ora, vamos arquivar diretamente.
    // if (!window.confirm(`Tem certeza que deseja arquivar ${selectedPatient.name}?`)) {
    //   return;
    // }

    setIsSubmitting(true);
    try {
      const patientRef = doc(db, patientsCollectionPath, selectedPatient.id);
      await updateDocFirestore(patientRef, { // Usando o alias
        isArchived: true
      });
      setNotification({ message: "Paciente arquivado com sucesso.", type: "success" });
      setSelectedPatient(null); // Volta para a lista
    } catch (error) {
      console.error("Erro ao arquivar paciente: ", error);
      setNotification({ message: "Erro ao arquivar paciente.", type: "error" });
    }
    setIsSubmitting(false);
  };
  
  // --- Novas Funções de Agendamento ---
  
  // C: Criar Novo Agendamento
  const handleSaveAppointment = async (patient, appointmentData) => {
    if (!patient) {
       setNotification({ message: "Erro: Nenhum paciente selecionado.", type: "error" });
       return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, appointmentsCollectionPath), {
        ...appointmentData,
        patientId: patient.id, // Usa o ID do documento do paciente
        patientName: patient.name,
        patientCity: patient.city,
        createdAt: new Date().toISOString()
      });
      setNotification({ message: "Agendamento salvo com sucesso!", type: "success" });
      setIsScheduleModalOpen(false);
    } catch (error) {
      console.error("Erro ao salvar agendamento: ", error);
      setNotification({ message: "Erro ao salvar agendamento.", type: "error" });
    }
    setIsSubmitting(false);
  };
  
  // U: Atualizar Status do Agendamento
  const handleUpdateAppointmentStatus = async (appointmentId, newStatus) => {
    try {
      const apptRef = doc(db, appointmentsCollectionPath, appointmentId);
      await updateDocFirestore(apptRef, { status: newStatus }); // Usando o alias
      // A notificação não é necessária, pois o listener atualizará a UI
    } catch (error) {
      console.error("Erro ao atualizar status: ", error);
      setNotification({ message: "Erro ao atualizar status.", type: "error" });
    }
  };
  
  // --- Funções de Navegação ---
  
  // NOVO: Seleciona paciente pela Agenda e muda de view
  const handleSelectPatientById = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    if (patient) {
      setSelectedPatient(patient);
      setView('pacientes'); // Muda para a aba de pacientes
    } else {
      setNotification({ message: "Paciente não encontrado.", type: "error" });
    }
  };


  // --- Renderização ---

  // 0. Limpa a notificação ao mudar de view
  useEffect(() => {
    setNotification({ message: '', type: 'success' });
  }, [selectedPatient, view]);

  // 1. Tela de Carregamento ou Erro de Autenticação
  if (!isAuthReady || (isLoading && !authError)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-gray-700">
        <Loader2 size={40} className="animate-spin text-blue-600 mb-4" />
        <p className="text-lg">Carregando sistema da clínica...</p>
        {authError && (
          <div className="text-center text-red-600 mt-4 p-4 bg-red-100 rounded-lg">
             <h3 className="font-bold">Erro de Autenticação</h3>
             <p>{authError}</p>
          </div>
        )}
      </div>
    );
  }
  
  // 1.5. Tela de Erro de Autenticação (se o carregamento terminou mas a auth falhou)
   if (authError) {
     return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-gray-700 p-8">
           <AlertCircle size={40} className="text-red-500 mb-4" />
           <h2 className="text-2xl font-bold mb-2">Erro de Acesso</h2>
           <p className="text-lg text-center mb-4">Não foi possível conectar ao sistema.</p>
           <div className="text-center text-red-600 mt-4 p-4 bg-red-100 rounded-lg">
             <h3 className="font-bold">Detalhe do Erro:</h3>
             <p>{authError}</p>
           </div>
        </div>
     )
   }

  // 2. Renderização Principal do App
  return (
    <div className="w-full min-h-screen bg-gray-100 font-sans">
      {/* Sistema de Notificação Global */}
      {notification.message && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification({ message: '', type: 'success' })}
        />
      )}

      {/* Modal de Novo Paciente (usado pela lista principal) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Cadastrar Novo Paciente"
      >
        <PatientForm
          onSave={handleAddPatient} // Salva e fecha
          onCancel={() => setIsModalOpen(false)}
          initialData={{}}
        />
      </Modal>
      
      {/* NOVO: Modal de Agendamento */}
      <ScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        patients={activePatients} // Modal de agendamento só usa pacientes ativos
        onSavePatient={handleAddPatient}
        onSaveAppointment={handleSaveAppointment}
        isSubmitting={isSubmitting}
      />

      {/* Conteúdo Principal */}
      <header className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-screen-2xl mx-auto flex justify-between items-center p-4">
          <div className="flex items-center gap-3">
            <Eye size={30} className="text-blue-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-800">Clínica de Olhos</h1>
              <p className="text-sm text-gray-500">Dr. Ricardo Lobo - Prontuário Interno</p>
            </div>
          </div>
          
          {/* NOVO: Menu de Navegação (Abas) */}
          <nav className="flex items-center gap-2">
            <button 
              onClick={() => setView('agenda')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${view === 'agenda' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <CalendarDays size={18} />
              Agenda
            </button>
            <button 
              onClick={() => setView('pacientes')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${view === 'pacientes' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <BookUser size={18} />
              Pacientes
            </button>
          </nav>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsScheduleModalOpen(true)}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium shadow-lg hover:bg-blue-700 transition-colors duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Plus size={18} />
              Agendar Consulta
            </button>
            {userId && <span className="text-xs text-gray-400 hidden md:block">Logado: {userId.slice(0, 10)}...</span>}
          </div>
        </div>
      </header>
      
      <main className="max-w-screen-2xl mx-auto p-4 md:p-8">
        {/* NOVO: Renderização baseada na View */}
        
        {/* --- VISÃO DA AGENDA --- */}
        {view === 'agenda' && (
          <AgendaView 
            appointments={appointments}
            patients={patients} // Passa pacientes para encontrar dados
            onSelectPatientById={handleSelectPatientById}
            onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
          />
        )}
        
        {/* --- VISÃO DE PACIENTES --- */}
        {view === 'pacientes' && (
          selectedPatient ? (
            <PatientDetails
              patient={selectedPatient}
              db={db}
              onBack={() => setSelectedPatient(null)}
              onSavePatient={handleUpdatePatient}
              onSaveNewConsultation={handleAddConsultation}
              onSaveEditedConsultation={handleSaveEditedConsultation}
              onArchivePatient={handleArchivePatient}
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


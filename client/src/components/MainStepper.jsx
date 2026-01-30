import React, { useState, useContext } from 'react';
import DataIntake from './DataIntake';
import Composer from './Composer';
import Preview from './Preview';
import LiveExecution from './LiveExecution';
import { AppStateContext } from '../context/AppStateContext';
import toast from 'react-hot-toast';

const steps = [
  { name: 'Subir Datos', component: DataIntake, icon: '📤' },
  { name: 'Construccion de Mail', component: Composer, icon: '✍️' },
  { name: 'Preview & Test', component: Preview, icon: '🔍' },
  { name: 'Envio', component: LiveExecution, icon: '🚀' },
];

const MainStepper = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const { resetCampaign, sendingStatus, highestCompletedStep, setHighestCompletedStep, isDataDirty } = useContext(AppStateContext);
  const CurrentComponent = steps[currentStep].component;
  const isCompleted = sendingStatus === 'completed';

  const handleNextStep = () => {
    if (currentStep < steps.length - 1) {
      setHighestCompletedStep(Math.max(highestCompletedStep, currentStep + 1));
      setCurrentStep(currentStep + 1);
    }
  };
  
  const handleBackStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (index) => {
    if (isCompleted) return; 
    if (isDataDirty) {
      toast.error('Por favor, confirma los nuevos datos antes de continuar.');
      return;
    }
    if (index <= highestCompletedStep && sendingStatus !== 'sending') {
      setCurrentStep(index);
    } else {
      toast.error('Por favor, completa los pasos anteriores primero.');
    }
  };

  const handleReset = () => {
    resetCampaign();
    setCurrentStep(0);
  };

  const getStepClass = (index) => {
    if (isCompleted) {
      return 'p-4 rounded-lg border-2 text-center transition-all duration-300 border-gray-300 bg-gray-100 cursor-not-allowed';
    }
    const isClickable = index <= highestCompletedStep && sendingStatus !== 'sending';
    let baseClasses = 'p-4 rounded-lg border-2 text-center transition-all duration-300';
    
    if (index < currentStep) baseClasses += ' border-green-500 bg-green-50';
    else if (index === currentStep) baseClasses += ' border-blue-500 bg-blue-50 shadow-lg';
    else baseClasses += ' border-gray-300 bg-white';

    if (isClickable) baseClasses += ' cursor-pointer hover:bg-gray-100';
    
    return baseClasses;
  };
  
  const getTextColor = (index) => {
    if (isCompleted) return 'text-gray-400';
    if (index < currentStep) return 'text-green-700';
    if (index === currentStep) return 'text-blue-700';
    return 'text-gray-500';
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {steps.map((step, index) => (
          <div 
            key={index} 
            onClick={() => handleStepClick(index)}
            className={getStepClass(index)}
          >
            <div className="text-3xl mb-2">{step.icon}</div>
            <p className={`font-semibold text-sm ${getTextColor(index)}`}>{step.name}</p>
          </div>
        ))}
      </div>
      
      <div className="bg-white rounded-lg shadow-xl border border-gray-100">
        <CurrentComponent 
          onComplete={handleNextStep} 
          onBack={handleBackStep}
          onReset={handleReset} 
        />
      </div>
      
      {isCompleted && (
        <div className="mt-8 text-center">
          <button
            onClick={handleReset}
            className="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      )}
    </div>
  );
};

export default MainStepper;
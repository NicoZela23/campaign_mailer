import React, { useState, useContext, useEffect, useRef } from 'react';
import DataIntake from './DataIntake';
import Composer from './Composer';
import TestMailer from './TestMailer';
import LiveExecution from './LiveExecution';
import { AppStateContext } from '../context/AppStateContext';
import toast from 'react-hot-toast';

const steps = [
  { name: 'Subir Datos', component: DataIntake, icon: '📤' },
    { name: 'Construccion de Mail', component: Composer, icon: '✍️' },
    { name: 'Testear Correo', component: TestMailer, icon: '🔍' },
    { name: 'Envio', component: LiveExecution, icon: '🚀' },
];

const MainStepper = () => {
  const { resetCampaign, sendingStatus, highestCompletedStep, setHighestCompletedStep, isDataDirty, csvData, currentCampaignId } = useContext(AppStateContext);
  
  // Determine initial step: if CSV data exists and a campaign was loaded, start at composer (step 1)
  // Otherwise, always start at data intake (step 0) to allow uploading data
  const initialStep = csvData.length > 0 && currentCampaignId && currentCampaignId !== 'temp' ? 1 : 0;
  const [currentStep, setCurrentStep] = useState(initialStep);
  const CurrentComponent = steps[currentStep].component;
  const isCompleted = sendingStatus === 'completed';
  
  // Track if user explicitly navigated back to step 0
  const userNavigatedBack = useRef(false);
  
  // Update step and highestCompletedStep when campaign is loaded
  // Only move to composer if CSV data exists, otherwise stay at data intake
  // Always allow going back to step 0 to upload/edit data
  useEffect(() => {
    // Don't interfere if user explicitly navigated back
    if (userNavigatedBack.current) {
      userNavigatedBack.current = false;
      return;
    }
    
    if (currentCampaignId && currentCampaignId !== 'temp') {
      if (csvData.length > 0) {
        // If we have CSV data, allow going to composer step
        // But only if we're currently at step 0 (initial load)
        if (currentStep === 0) {
          setCurrentStep(1);
        }
        // Set highestCompletedStep to at least 1, but always allow step 0
        setHighestCompletedStep(Math.max(highestCompletedStep, 1));
      } else {
        // If no CSV data, ensure we're at step 0
        if (currentStep > 0) {
          setCurrentStep(0);
        }
        // Allow step 0, but don't block it
        setHighestCompletedStep(Math.max(highestCompletedStep, 0));
      }
    }
  }, [csvData, currentCampaignId, currentStep, highestCompletedStep, setHighestCompletedStep]);

  // Show toast when campaign is completed
  useEffect(() => {
    if (isCompleted && currentStep === steps.length - 1) {
      toast.success(
        (t) => (
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#7c3aed] rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xl">✓</span>
            </div>
            <div>
              <p className="font-bold text-[#7c3aed]">¡Campaña completada!</p>
              <p className="text-sm text-gray-600">Todos los correos han sido enviados exitosamente</p>
            </div>
          </div>
        ),
        {
          duration: 6000,
          position: 'top-center',
          style: {
            background: 'white',
            border: '2px solid #7c3aed',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 10px 25px rgba(124, 58, 237, 0.2)',
          },
        }
      );
    }
  }, [isCompleted, currentStep]);

  const handleNextStep = () => {
    if (currentStep < steps.length - 1) {
      setHighestCompletedStep(Math.max(highestCompletedStep, currentStep + 1));
      setCurrentStep(currentStep + 1);
    }
  };
  
  const handleBackStep = () => {
    if (currentStep > 0) {
      // Mark that user explicitly navigated back
      userNavigatedBack.current = true;
      // Always allow going back, especially to step 0 (data intake)
      const newStep = currentStep - 1;
      setCurrentStep(newStep);
      // Update highestCompletedStep to allow navigation back
      // But don't reduce it below the new step to maintain navigation flexibility
      setHighestCompletedStep(Math.max(newStep, highestCompletedStep));
    }
  };

  const handleStepClick = (index) => {
    if (isCompleted) return;
    
    // Always allow going back to step 0 (data intake) to upload/edit data
    if (index === 0) {
      // Mark that user explicitly navigated to step 0
      userNavigatedBack.current = true;
      setCurrentStep(0);
      // Update highestCompletedStep to allow navigation back
      // But don't reduce it below 0 to maintain navigation flexibility
      setHighestCompletedStep(Math.max(0, highestCompletedStep));
      return;
    }
    
    // Only check isDataDirty when trying to ADVANCE (go forward), not when going back
    // If clicking on a step that's ahead of current step, check for dirty data
    if (isDataDirty && index > currentStep) {
      toast.error('Por favor, confirma los nuevos datos antes de continuar.');
      return;
    }
    
    // Allow navigation to any completed step or current step
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
      return 'p-6 rounded-xl border-2 text-center transition-all duration-300 border-gray-200 bg-gray-50 cursor-not-allowed opacity-60';
    }
    // Step 0 (data intake) is always clickable to allow uploading/editing data
    // Other steps are clickable if they're within highestCompletedStep
    const isClickable = index === 0 || (index <= highestCompletedStep && sendingStatus !== 'sending');
    let baseClasses = 'p-6 rounded-xl border-2 text-center transition-all duration-300 relative overflow-hidden';
    
    if (index < currentStep) {
      baseClasses += ' border-[#7c3aed] bg-gradient-to-br from-violet-50 to-purple-50 shadow-md';
    } else if (index === currentStep) {
      baseClasses += ' border-[#7c3aed] bg-gradient-to-br from-violet-50 to-purple-50 shadow-xl ring-4 ring-[#7c3aed]/20 scale-105';
    } else {
      baseClasses += ' border-gray-200 bg-white/80 backdrop-blur-sm';
    }

    if (isClickable) {
      baseClasses += ' cursor-pointer hover:shadow-lg hover:scale-105 hover:border-[#7c3aed]/50';
    } else {
      baseClasses += ' cursor-not-allowed';
    }
    
    return baseClasses;
  };
  
  const getTextColor = (index) => {
    if (isCompleted) return 'text-gray-400';
    if (index < currentStep) return 'text-[#7c3aed] font-semibold';
    if (index === currentStep) return 'text-[#7c3aed] font-bold';
    return 'text-gray-500';
  }

  const getStepIcon = (index) => {
    if (isCompleted) return steps[index].icon;
    if (index < currentStep) return '✓';
    return steps[index].icon;
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <div className="mb-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {steps.map((step, index) => (
            <div 
              key={index} 
              onClick={() => handleStepClick(index)}
              className={getStepClass(index)}
            >
              <div className="relative mb-3">
                <div className={`text-4xl mb-2 transition-transform duration-300 ${index === currentStep ? 'scale-110' : ''}`}>
                  {getStepIcon(index)}
                </div>
                {index < currentStep && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                    <span className="text-white text-xs font-bold">✓</span>
                  </div>
                )}
              </div>
              <p className={`font-semibold text-sm ${getTextColor(index)}`}>{step.name}</p>
              {index === currentStep && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#7c3aed]"></div>
              )}
            </div>
          ))}
        </div>
        {/* Progress line - moved down with more spacing */}
        <div className="hidden md:block relative h-2 bg-gray-200 rounded-full mt-6 mb-8 mx-4">
          <div 
            className="absolute top-0 left-0 h-full bg-[#7c3aed] rounded-full transition-all duration-500 shadow-sm"
            style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
          ></div>
        </div>
      </div>
      
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200/50 overflow-hidden">
        {!isCompleted && <div className="bg-[#7c3aed] h-1"></div>}
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
            className="px-8 py-3 bg-[#7c3aed] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:bg-[#6d28d9] transition-all duration-200 transform hover:-translate-y-0.5"
          >
            Crear Nueva Campaña
          </button>
        </div>
      )}
    </div>
  );
};

export default MainStepper;
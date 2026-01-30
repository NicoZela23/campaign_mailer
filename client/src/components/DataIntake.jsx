import React, { useCallback, useContext, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { AppStateContext } from '../context/AppStateContext';
import toast from 'react-hot-toast';

const emailRegex = /^[\w!#$%&'*+\-\/=?^_`{|}~]+(?:\.[\w!#$%&'*+\-\/=?^_`{|}~]+)*@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/;
const DataIntake = ({ onComplete }) => {
  const { csvData, setCsvData, setHeaders, setIsDataDirty } = useContext(AppStateContext);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState([]);
  const [validationErrors, setValidationErrors] = useState({}); // { rowIndex: { header: true/false } }
  const [hasNewDataUploaded, setHasNewDataUploaded] = useState(false);

  useEffect(() => {
    if (csvData.length > 0) {
      setEditedData(csvData);
      // Re-validate data when csvData changes
      const initialValidationErrors = {};
      csvData.forEach((row, rowIndex) => {
        Object.keys(row).forEach(header => {
          if (header === 'email' && !emailRegex.test(String(row[header]).trim())) {
            if (!initialValidationErrors[rowIndex]) initialValidationErrors[rowIndex] = {};
            initialValidationErrors[rowIndex][header] = true;
          }
        });
      });
      setValidationErrors(initialValidationErrors);
    }
  }, [csvData]);

  const onDrop = useCallback((acceptedFiles) => {
    setError('');
    setValidationErrors({}); // Clear validation errors on new file upload
    setHasNewDataUploaded(false); // Reset upload status on new drop
    const file = acceptedFiles[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const binaryStr = event.target.result;
        const workbook = XLSX.read(binaryStr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (json.length === 0) {
          setError('The uploaded file is empty or could not be read.');
          return;
        }
        
        const originalHeaders = Object.keys(json[0]);
        const emailHeaderCandidates = ['email', 'correo', 'mail'];
        const emailHeader = originalHeaders.find(h => emailHeaderCandidates.includes(h.toLowerCase()));

        if (!emailHeader) {
          setError('The file must contain a column with email addresses.');
          return;
        }

        const processedData = json.map(row => {
          const newRow = { email: row[emailHeader] };
          originalHeaders.forEach(header => {
            if (header !== emailHeader) {
              newRow[header] = row[header];
            }
          });
          return newRow;
        });
        
        // Initial validation after processing data
        const initialValidationErrors = {};
        processedData.forEach((row, rowIndex) => {
          if (!emailRegex.test(String(row.email).trim())) {
            if (!initialValidationErrors[rowIndex]) initialValidationErrors[rowIndex] = {};
            initialValidationErrors[rowIndex].email = true;
          }
        });
        setValidationErrors(initialValidationErrors);

        const headersForComposer = Object.keys(processedData[0]).filter(h => h !== 'email');

        setCsvData(processedData);
        setHeaders(headersForComposer);
        setIsEditing(false);
        setHasNewDataUploaded(true); // Data successfully uploaded, show 'Siguiente' button
        setIsDataDirty(true); // Mark data as dirty
      } catch (e) {
        setError('Failed to process the file. Please ensure it is a valid CSV or XLSX file.');
        console.error(e);
      }
    };

    reader.onerror = () => {
      setError('Failed to read the file.');
    };

    reader.readAsBinaryString(file);
  }, [setCsvData, setHeaders, setIsDataDirty]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    multiple: false,
  });

  const handleCellChange = (e, rowIndex, header) => {
    const value = e.target.value;
    const newData = [...editedData];
    newData[rowIndex][header] = value;
    setEditedData(newData);

    if (header === 'email') {
      const isValid = emailRegex.test(String(value).trim());
      setValidationErrors(prevErrors => ({
        ...prevErrors,
        [rowIndex]: {
          ...prevErrors[rowIndex],
          [header]: !isValid,
        },
      }));
    }
  };

  const handleDeleteRow = (rowIndex) => {
    const newData = editedData.filter((_, index) => index !== rowIndex);
    setEditedData(newData);

    setValidationErrors(prevErrors => {
      const newErrors = { ...prevErrors };
      delete newErrors[rowIndex]; // Remove errors for deleted row
      // Adjust row indices for subsequent errors
      const adjustedErrors = {};
      Object.keys(newErrors).forEach(key => {
        const oldIndex = parseInt(key, 10);
        if (oldIndex > rowIndex) {
          adjustedErrors[oldIndex - 1] = newErrors[key];
        } else {
          adjustedErrors[oldIndex] = newErrors[key];
        }
      });
      return adjustedErrors;
    });
  };

  const hasValidationErrors = Object.values(validationErrors).some(rowErrors => 
    Object.values(rowErrors).some(isInvalid => isInvalid)
  );

  const handleSaveChanges = () => {
    if (hasValidationErrors) {
      toast.error('Arregle todos los correos antes de guardar');
      return;
    }
    setCsvData(editedData);
    setIsEditing(false);
  };
  
  const handleProceed = () => {
    if (hasValidationErrors) {
      toast.error('Arregle todos los correos antes de guardar');
      return;
    }
    const headers = headersToShow;
    const validatedData = editedData.filter(row => 
      headers.every(header => row[header] !== null && row[header] !== undefined && String(row[header]).trim() !== '')
    );
    setCsvData(validatedData);
    toast.success(`${validatedData.length} emails procesados`);
    setHasNewDataUploaded(false); // Hide 'Siguiente' button after proceeding
    setIsDataDirty(false); // Mark data as clean
    onComplete();
  };

  const isCellInvalid = (rowIndex, header, value) => {
    const isEmpty = value === null || value === undefined || String(value).trim() === '';
    const hasError = validationErrors[rowIndex] && validationErrors[rowIndex][header];
    return isEmpty || hasError;
  };

  const headersToShow = csvData.length > 0 ? Object.keys(csvData[0]) : [];

  return (
    <div className="p-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800">Subir lista de contactos</h2>
        <p className="text-gray-500 mb-6">Columna email obligatoria</p>
      </div>

      <div
        {...getRootProps()}
        className={`border-4 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
        ${isDragActive ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-gray-50 hover:border-gray-400'}`}
      >
        <input {...getInputProps()} />
        <p className="text-2xl mb-2">📤</p>
        {isDragActive ? (
          <p className="text-blue-600 font-semibold">Drop the file here!</p>
        ) : (
          <p className="text-gray-600">Sube tu Excel o CSV</p>
        )}
      </div>
      {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
      
      {editedData.length > 0 && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-lg">Previsualizacion ({editedData.length} filas)</h3>
            <div>
              {isEditing ? (
                <button onClick={handleSaveChanges} className={`px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors ${hasValidationErrors ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={hasValidationErrors}>
                  Guardar Cambios
                </button>
              ) : (
                <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-yellow-500 text-white font-semibold rounded-lg shadow-md hover:bg-yellow-600 transition-colors">
                  Editar
                </button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto border rounded-lg" style={{ maxHeight: '400px' }}>
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  {headersToShow.map(header => <th key={header} className="p-2 text-left font-medium">{header}</th>)}
                  {isEditing && <th className="p-2 text-left font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody className="bg-white">
                {editedData.map((row, i) => (
                  <tr key={i} className="border-t">
                    {headersToShow.map(header => (
                      <td key={header} className="p-1">
                        {isEditing ? (
                          <input
                            type="text"
                            value={row[header]}
                            onChange={(e) => handleCellChange(e, i, header)}
                            className={`w-full px-2 py-1 border rounded ${isCellInvalid(i, header, row[header]) ? 'border-red-500 bg-red-100' : 'border-gray-300'}`}
                          />
                        ) : (
                          <span className={`p-1 block truncate ${isCellInvalid(i, header, row[header]) ? 'bg-red-100' : ''}`}>{String(row[header])}</span>
                        )}
                      </td>
                    ))}
                    {isEditing && (
                      <td className="p-1">
                        <button onClick={() => handleDeleteRow(i)} className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700">
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-center mt-6">
            {editedData.length > 0 && hasNewDataUploaded && !isEditing && !hasValidationErrors && (
              <button onClick={handleProceed} className={`px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors`}>
                Confirmar
              </button>
            )}
            {hasValidationErrors ? (
              <p className="text-sm text-red-500 mt-2">Ingresa un correo valido antes de continuar</p>
            ) : isEditing ? (
              <p className="text-sm text-yellow-600 mt-2">Guarda tus datos antes de continuar</p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default DataIntake;

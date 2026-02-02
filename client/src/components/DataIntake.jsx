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
  const [newColumnName, setNewColumnName] = useState('');
  const [isAddingColumn, setIsAddingColumn] = useState(false);

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
        const arrayBuffer = event.target.result;
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (json.length === 0) {
          setError('The uploaded file is empty or could not be read.');
          return;
        }
        
        // This is a new special feature that replaces the empty headers with a more friendly name
        const processedDataForEmptyHeaders = json.map(row => {
          const newRow = {};
          Object.keys(row).forEach(key => {
            const newKey = key.startsWith('__EMPTY') ? `EMPTY` : key;
            newRow[newKey] = row[key];
          });
          return newRow;
        });

        // Filter out columns with EMPTY header and no data
        const headers = Object.keys(processedDataForEmptyHeaders[0]);
        const emptyHeaders = headers.filter(h => h.startsWith('EMPTY'));
        const columnsToDelete = [];

        emptyHeaders.forEach(header => {
          const isColumnEmpty = processedDataForEmptyHeaders.every(row => row[header] === '');
          if (isColumnEmpty) {
            columnsToDelete.push(header);
          }
        });

        const filteredData = processedDataForEmptyHeaders.map(row => {
          const newRow = { ...row };
          columnsToDelete.forEach(header => {
            delete newRow[header];
          });
          return newRow;
        });


        const originalHeaders = Object.keys(filteredData[0]);
        const emailHeaderCandidates = ['email', 'correo', 'mail'];
        const emailHeader = originalHeaders.find(h => emailHeaderCandidates.includes(h.toLowerCase()));

        if (!emailHeader) {
          setError('The file must contain a column with email addresses.');
          return;
        }

        const processedData = filteredData.map(row => {
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

    reader.readAsArrayBuffer(file);
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

  const handleAddRow = () => {
    const newRow = headersToShow.reduce((acc, header) => {
      acc[header] = '';
      return acc;
    }, {});
    setEditedData([...editedData, newRow]);
  };

  const handleAddColumn = () => {
    setIsAddingColumn(true);
  };

  const handleSaveNewColumn = () => {
    const trimmedName = newColumnName.trim();
    if (trimmedName && !headersToShow.includes(trimmedName)) {
      const newData = editedData.map(row => ({
        ...row,
        [trimmedName]: '',
      }));
      setEditedData(newData);
      setNewColumnName('');
      setIsAddingColumn(false);
    } else if (!trimmedName) {
      toast.error('El nombre de la columna no puede estar vacio.');
    } else {
      toast.error('La columna ya existe.');
    }
  };

  const handleDeleteColumn = (headerToDelete) => {
    if (headerToDelete === 'email') {
      toast.error('No se puede borrar la columna de email');
      return;
    }
    const newData = editedData.map(row => {
      const newRow = { ...row };
      delete newRow[headerToDelete];
      return newRow;
    });
    setEditedData(newData);
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

  const headersToShow = editedData.length > 0 ? Object.keys(editedData[0]) : [];

  return (
    <div className="p-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-[#01533c] rounded-2xl shadow-lg mb-4">
          <span className="text-white text-3xl">📤</span>
        </div>
        <h2 className="text-3xl font-bold text-[#01533c] mb-2">
          Subir lista de contactos
        </h2>
        <p className="text-gray-500 text-sm">Columna email obligatoria • Formatos: CSV, XLS, XLSX</p>
      </div>

      <div
        {...getRootProps()}
        className={`border-3 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all duration-300
        ${isDragActive 
          ? 'border-[#01533c] bg-gradient-to-br from-emerald-50 to-green-50 shadow-xl scale-105' 
          : 'border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100 hover:border-[#01533c]/50 hover:shadow-lg hover:scale-[1.02]'}`}
      >
        <input {...getInputProps()} />
        <div className="text-6xl mb-4">📤</div>
        {isDragActive ? (
          <>
            <p className="text-[#01533c] font-bold text-xl mb-2">¡Suelta el archivo aquí!</p>
            <p className="text-[#01533c]/70 text-sm">El archivo se procesará automáticamente</p>
          </>
        ) : (
          <>
            <p className="text-gray-700 font-semibold text-lg mb-2">Arrastra y suelta tu archivo</p>
            <p className="text-gray-500 text-sm">o haz clic para seleccionar</p>
          </>
        )}
      </div>
      {error && (
        <div className="mt-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
          <p className="text-red-600 font-medium text-center">{error}</p>
        </div>
      )}
      
      {editedData.length > 0 && (
        <div className="mt-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
              <h3 className="font-bold text-xl text-gray-800 mb-1">
                Previsualización de Datos
              </h3>
              <p className="text-sm text-gray-500">
                {editedData.length} {editedData.length === 1 ? 'fila' : 'filas'} • {headersToShow.length} {headersToShow.length === 1 ? 'columna' : 'columnas'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {isEditing ? (
                <button 
                  onClick={handleSaveChanges} 
                  className={`px-5 py-2.5 bg-[#01533c] text-white font-semibold rounded-xl shadow-md hover:shadow-lg hover:bg-[#014030] transition-all duration-200 transform hover:-translate-y-0.5 ${hasValidationErrors ? 'opacity-50 cursor-not-allowed' : ''}`} 
                  disabled={hasValidationErrors}
                >
                  💾 Guardar Cambios
                </button>
              ) : (
                <button 
                  onClick={() => setIsEditing(true)} 
                  className="px-5 py-2.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-semibold rounded-xl shadow-md hover:shadow-lg hover:from-yellow-600 hover:to-orange-600 transition-all duration-200 transform hover:-translate-y-0.5"
                >
                  ✏️ Editar
                </button>
              )}
              {isEditing && (
                <>
                  <button 
                    onClick={handleAddRow} 
                    className="px-5 py-2.5 bg-[#01533c] text-white font-semibold rounded-xl shadow-md hover:shadow-lg hover:bg-[#014030] transition-all duration-200 transform hover:-translate-y-0.5"
                  >
                    ➕ Fila
                  </button>
                  <button 
                    onClick={handleAddColumn} 
                    className={`px-5 py-2.5 bg-[#01533c] text-white font-semibold rounded-xl shadow-md hover:shadow-lg hover:bg-[#014030] transition-all duration-200 transform hover:-translate-y-0.5 ${isAddingColumn ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={isAddingColumn}
                  >
                    ➕ Columna
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="overflow-x-auto border-2 border-gray-200 rounded-xl shadow-lg" style={{ maxHeight: '500px' }}>
            <table className="min-w-full text-sm">
              <thead className="bg-gradient-to-r from-gray-100 to-gray-50 sticky top-0 z-10">
                <tr>
                  {headersToShow.map(header => (
                    <th key={header} className="p-3 text-left font-bold text-gray-700 border-b-2 border-gray-200">
                      <div className="flex items-center justify-between">
                        <span>{header}</span>
                        {isEditing && header !== 'email' && (
                          <button 
                            onClick={() => handleDeleteColumn(header)} 
                            className="ml-2 w-6 h-6 flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                            title="Eliminar columna"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                  {isEditing && !isAddingColumn && (
                    <th className="p-3 text-left font-bold text-gray-700 border-b-2 border-gray-200">Acciones</th>
                  )}
                  {isEditing && isAddingColumn && (
                    <th className="p-3 text-left font-bold text-gray-700 border-b-2 border-gray-200">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newColumnName}
                          onChange={(e) => setNewColumnName(e.target.value)}
                          placeholder="Nombre de columna"
                          className="px-3 py-1.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          onKeyPress={(e) => e.key === 'Enter' && handleSaveNewColumn()}
                        />
                        <button 
                          onClick={handleSaveNewColumn} 
                          className="px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                          title="Guardar"
                        >
                          ✓
                        </button>
                        <button 
                          onClick={() => setIsAddingColumn(false)} 
                          className="px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                          title="Cancelar"
                        >
                          ×
                        </button>
                      </div>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {editedData.map((row, i) => (
                  <tr key={i} className={`hover:bg-gray-50 transition-colors ${isCellInvalid(i, 'email', row.email) ? 'bg-red-50' : ''}`}>
                    {headersToShow.map(header => (
                      <td key={header} className="p-2">
                        {isEditing ? (
                          <input
                            type="text"
                            value={row[header]}
                            onChange={(e) => handleCellChange(e, i, header)}
                            className={`w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all ${isCellInvalid(i, header, row[header]) 
                              ? 'border-red-400 bg-red-50 focus:ring-red-500' 
                              : 'border-gray-300 focus:ring-[#01533c] focus:border-transparent'}`}
                          />
                        ) : (
                          <span className={`p-2 block truncate ${isCellInvalid(i, header, row[header]) ? 'text-red-600 font-medium' : 'text-gray-700'}`}>
                            {String(row[header])}
                          </span>
                        )}
                      </td>
                    ))}
                    {isEditing && (
                      <td className="p-2">
                        <button 
                          onClick={() => handleDeleteRow(i)} 
                          className="px-3 py-1.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-sm hover:shadow-md text-xs font-semibold"
                        >
                          Eliminar
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-center mt-8">
            {editedData.length > 0 && hasNewDataUploaded && !isEditing && !hasValidationErrors && (
              <button 
                onClick={handleProceed} 
                className="px-10 py-4 bg-[#01533c] text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:bg-[#014030] transition-all duration-200 transform hover:-translate-y-0.5 text-lg"
              >
                ✓ Confirmar y Continuar
              </button>
            )}
            {hasValidationErrors && (
              <div className="inline-flex items-center space-x-2 px-4 py-3 bg-red-50 border-2 border-red-200 rounded-xl">
                <span className="text-red-600 text-lg">⚠️</span>
                <p className="text-sm text-red-600 font-medium">Corrige los correos inválidos antes de continuar</p>
              </div>
            )}
            {isEditing && !hasValidationErrors && (
              <div className="inline-flex items-center space-x-2 px-4 py-3 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
                <span className="text-yellow-600 text-lg">💡</span>
                <p className="text-sm text-yellow-600 font-medium">Guarda tus cambios antes de continuar</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DataIntake;

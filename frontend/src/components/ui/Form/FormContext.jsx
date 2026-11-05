import React, { createContext, useContext } from 'react';

const FormContext = createContext();

export const FormProvider = ({ children, values, errors, touched, isSubmitting, isValid, handleChange, handleBlur, handleSubmit, setFieldValue, setFieldValues, validate, resetForm }) => {
  const value = {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    setFieldValues,
    validate,
    resetForm,
  };

  return (
    <FormContext.Provider value={value}>
      {children}
    </FormContext.Provider>
  );
};

export const useFormContext = () => {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useFormContext must be used within a FormProvider');
  }
  return context;
};

export default FormContext;

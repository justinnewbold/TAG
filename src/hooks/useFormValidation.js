import { useState, useCallback, useMemo } from 'react';

/**
 * Custom hook for form validation with real-time feedback
 * Integrates with the validation utilities
 */
export function useFormValidation(validationRules, options = {}) {
  const {
    validateOnChange = true,
    validateOnBlur = true,
    showErrorsOnSubmit = true,
  } = options;

  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitCount, setSubmitCount] = useState(0);

  // Validate a single field
  const validateField = useCallback((name, value) => {
    const validator = validationRules[name];
    if (!validator) return null;

    const result = validator(value);
    if (result.valid) return null;
    return result.error || result.errors?.[0] || 'Invalid value';
  }, [validationRules]);

  // Validate all fields
  const validateAll = useCallback(() => {
    const newErrors = {};
    let isValid = true;

    for (const [name, validator] of Object.entries(validationRules)) {
      const result = validator(values[name]);
      if (!result.valid) {
        isValid = false;
        newErrors[name] = result.error || result.errors?.[0] || 'Invalid value';
      }
    }

    setErrors(newErrors);
    return isValid;
  }, [validationRules, values]);

  // Handle field change
  const handleChange = useCallback((name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));

    if (validateOnChange && touched[name]) {
      const error = validateField(name, value);
      setErrors((prev) => ({ ...prev, [name]: error }));
    }
  }, [validateOnChange, touched, validateField]);

  // Handle field blur
  const handleBlur = useCallback((name) => {
    setTouched((prev) => ({ ...prev, [name]: true }));

    if (validateOnBlur) {
      const error = validateField(name, values[name]);
      setErrors((prev) => ({ ...prev, [name]: error }));
    }
  }, [validateOnBlur, validateField, values]);

  // Get field props for input elements
  const getFieldProps = useCallback((name) => ({
    value: values[name] || '',
    onChange: (e) => handleChange(name, e.target.value),
    onBlur: () => handleBlur(name),
    'aria-invalid': !!errors[name],
    'aria-describedby': errors[name] ? `${name}-error` : undefined,
  }), [values, handleChange, handleBlur, errors]);

  // Get error props for display
  const getErrorProps = useCallback((name) => ({
    id: `${name}-error`,
    role: 'alert',
    hidden: !errors[name] || (!touched[name] && !showErrorsOnSubmit && submitCount === 0),
    children: errors[name],
  }), [errors, touched, showErrorsOnSubmit, submitCount]);

  // Check if field has error
  const hasError = useCallback((name) => {
    return touched[name] && !!errors[name];
  }, [touched, errors]);

  // Handle form submission
  const handleSubmit = useCallback((onSubmit) => async (e) => {
    e?.preventDefault();

    setSubmitCount((c) => c + 1);
    setTouched(Object.keys(validationRules).reduce((acc, key) => ({ ...acc, [key]: true }), {}));

    const isValid = validateAll();
    if (!isValid) return false;

    setIsSubmitting(true);
    try {
      await onSubmit(values);
      return true;
    } finally {
      setIsSubmitting(false);
    }
  }, [validationRules, validateAll, values]);

  // Reset form
  const reset = useCallback((initialValues = {}) => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
    setSubmitCount(0);
  }, []);

  // Set field value programmatically
  const setFieldValue = useCallback((name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  // Set field error programmatically
  const setFieldError = useCallback((name, error) => {
    setErrors((prev) => ({ ...prev, [name]: error }));
    setTouched((prev) => ({ ...prev, [name]: true }));
  }, []);

  // Check if form is valid
  const isValid = useMemo(() => {
    return Object.values(errors).every((error) => !error);
  }, [errors]);

  // Check if form is dirty
  const isDirty = useMemo(() => {
    return Object.keys(touched).length > 0;
  }, [touched]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    isDirty,
    submitCount,
    handleChange,
    handleBlur,
    handleSubmit,
    getFieldProps,
    getErrorProps,
    hasError,
    validateField,
    validateAll,
    reset,
    setFieldValue,
    setFieldError,
    setValues,
  };
}

/**
 * Pre-built validation rules factory
 */
export const createValidators = {
  required: (message = 'This field is required') => (value) => ({
    valid: value !== null && value !== undefined && value !== '',
    error: message,
  }),

  minLength: (min, message) => (value) => ({
    valid: typeof value === 'string' && value.length >= min,
    error: message || `Must be at least ${min} characters`,
  }),

  maxLength: (max, message) => (value) => ({
    valid: typeof value === 'string' && value.length <= max,
    error: message || `Must be no more than ${max} characters`,
  }),

  pattern: (regex, message = 'Invalid format') => (value) => ({
    valid: regex.test(value),
    error: message,
  }),

  email: (message = 'Invalid email address') => (value) => ({
    valid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    error: message,
  }),

  number: (message = 'Must be a number') => (value) => ({
    valid: !isNaN(parseFloat(value)),
    error: message,
  }),

  range: (min, max, message) => (value) => {
    const num = parseFloat(value);
    return {
      valid: !isNaN(num) && num >= min && num <= max,
      error: message || `Must be between ${min} and ${max}`,
    };
  },

  match: (otherValue, message = 'Values do not match') => (value) => ({
    valid: value === otherValue,
    error: message,
  }),

  custom: (validateFn) => validateFn,

  compose: (...validators) => (value) => {
    for (const validator of validators) {
      const result = validator(value);
      if (!result.valid) return result;
    }
    return { valid: true };
  },
};

/**
 * Validated input component wrapper
 */
export function ValidatedInput({
  name,
  type = 'text',
  label,
  placeholder,
  formValidation,
  className = '',
  inputClassName = '',
  errorClassName = '',
  ...props
}) {
  const { getFieldProps, getErrorProps, hasError } = formValidation;
  const fieldProps = getFieldProps(name);
  const errorProps = getErrorProps(name);
  const showError = hasError(name);

  return (
    <div className={className}>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-300 mb-1">
          {label}
        </label>
      )}
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        className={`w-full px-4 py-2 bg-dark-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
          showError ? 'border-red-500' : 'border-dark-600'
        } ${inputClassName}`}
        {...fieldProps}
        {...props}
      />
      {showError && (
        <p className={`mt-1 text-sm text-red-400 ${errorClassName}`} {...errorProps}>
          {errorProps.children}
        </p>
      )}
    </div>
  );
}

export default useFormValidation;

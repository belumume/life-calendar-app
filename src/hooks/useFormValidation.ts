import { createSignal, createEffect } from 'solid-js';
import { z } from 'zod';

/**
 * Generic form validation hook for SolidJS
 * Reduces duplication of form validation logic across components
 */

export interface UseFormValidationOptions<T> {
  schema: z.ZodSchema<T>;
  onSubmit: (data: T) => Promise<void> | void;
  onError?: (error: Error) => void;
  resetOnSubmit?: boolean;
}

export interface FormField<T> {
  value: () => T;
  setValue: (v: T) => void;
  error: () => string | null;
  touched: () => boolean;
  setTouched: (v: boolean) => void;
  validate: () => boolean;
}

export interface UseFormValidationReturn<T> {
  fields: {
    [K in keyof T]: FormField<T[K]>;
  };
  errors: () => Partial<Record<keyof T, string>>;
  isSubmitting: () => boolean;
  isValid: () => boolean;
  validationError: () => string | null;
  handleSubmit: (e: Event) => Promise<void>;
  reset: () => void;
  setFieldValue: <K extends keyof T>(field: K, value: T[K]) => void;
  setFieldError: <K extends keyof T>(field: K, error: string | null) => void;
  validateField: <K extends keyof T>(field: K) => boolean;
  validateForm: () => boolean;
}

export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  options: UseFormValidationOptions<T>
): UseFormValidationReturn<T> {
  const { schema, onSubmit, onError, resetOnSubmit = true } = options;
  
  // State
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [validationError, setValidationError] = createSignal<string | null>(null);
  const [formErrors, setFormErrors] = createSignal<Partial<Record<keyof T, string>>>({});
  
  // Create fields with individual state
  const fields = {} as { [K in keyof T]: FormField<T[K]> };
  
  for (const key in initialValues) {
    const [value, setValue] = createSignal(initialValues[key]);
    const [error, setError] = createSignal<string | null>(null);
    const [touched, setTouched] = createSignal(false);
    
    fields[key] = {
      value,
      setValue: (v: T[typeof key]) => {
        setValue(() => v);
        setTouched(true);
        // Clear error when value changes
        setError(null);
        // Validate on change if touched
        if (touched()) {
          validateField(key);
        }
      },
      error,
      touched,
      setTouched,
      validate: () => validateField(key),
    };
  }
  
  // Validate individual field
  const validateField = <K extends keyof T>(field: K): boolean => {
    try {
      // Create object with single field for validation
      const fieldData = { [field]: fields[field].value() };
      const fieldSchema = z.object({ [field]: schema.shape[field] });
      fieldSchema.parse(fieldData);
      
      setFieldError(field, null);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldError = error.errors.find(e => e.path[0] === field);
        if (fieldError) {
          setFieldError(field, fieldError.message);
        }
      }
      return false;
    }
  };
  
  // Validate entire form
  const validateForm = (): boolean => {
    try {
      const formData = {} as T;
      for (const key in fields) {
        formData[key] = fields[key].value();
      }
      
      schema.parse(formData);
      setFormErrors({});
      setValidationError(null);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Partial<Record<keyof T, string>> = {};
        error.errors.forEach(err => {
          const field = err.path[0] as keyof T;
          if (field && !errors[field]) {
            errors[field] = err.message;
            setFieldError(field, err.message);
          }
        });
        setFormErrors(errors);
        
        // Set first error as general validation error
        if (error.errors.length > 0) {
          setValidationError(error.errors[0].message);
        }
      }
      return false;
    }
  };
  
  // Check if form is valid
  const isValid = () => {
    const errors = formErrors();
    return Object.keys(errors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    
    // Touch all fields
    for (const key in fields) {
      fields[key].setTouched(true);
    }
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setValidationError(null);
    
    try {
      const formData = {} as T;
      for (const key in fields) {
        formData[key] = fields[key].value();
      }
      
      await onSubmit(formData);
      
      if (resetOnSubmit) {
        reset();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setValidationError(errorMessage);
      
      if (onError) {
        onError(error as Error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Reset form to initial values
  const reset = () => {
    for (const key in fields) {
      fields[key].setValue(initialValues[key]);
      fields[key].setTouched(false);
      setFieldError(key, null);
    }
    setFormErrors({});
    setValidationError(null);
  };
  
  // Helper to set field value
  const setFieldValue = <K extends keyof T>(field: K, value: T[K]) => {
    fields[field].setValue(value);
  };
  
  // Helper to set field error
  const setFieldError = <K extends keyof T>(field: K, error: string | null) => {
    (fields[field] as any).error[1](error);
    
    // Update form errors
    setFormErrors(prev => {
      if (error) {
        return { ...prev, [field]: error };
      } else {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      }
    });
  };
  
  return {
    fields,
    errors: formErrors,
    isSubmitting,
    isValid,
    validationError,
    handleSubmit,
    reset,
    setFieldValue,
    setFieldError,
    validateField,
    validateForm,
  };
}

/**
 * Helper to create form field bindings for inputs
 */
export function createFieldProps<T>(field: FormField<T>) {
  return {
    value: field.value(),
    onInput: (e: Event) => {
      const target = e.target as HTMLInputElement;
      field.setValue(target.value as T);
    },
    onBlur: () => field.setTouched(true),
    'aria-invalid': field.error() !== null,
    'aria-describedby': field.error() ? `${field}-error` : undefined,
  };
}
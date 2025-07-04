import { describe, it, expect, vi } from 'vitest';
import { renderHook, fireEvent } from '@solidjs/testing-library';
import { z } from 'zod';
import { useFormValidation } from '../useFormValidation';
import { createRoot } from 'solid-js';

// Test schema
const TestSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  age: z.number().min(18, 'Must be at least 18'),
});

type TestFormData = z.infer<typeof TestSchema>;

describe('useFormValidation', () => {
  it('initializes with default values', () => {
    const { result } = renderHook(() =>
      useFormValidation<TestFormData>(
        { name: '', email: '', age: 0 },
        { schema: TestSchema, onSubmit: vi.fn() }
      )
    );

    expect(result.fields.name.value()).toBe('');
    expect(result.fields.email.value()).toBe('');
    expect(result.fields.age.value()).toBe(0);
    expect(result.isValid()).toBe(false);
  });

  it('validates individual fields on change', () => {
    const { result } = renderHook(() =>
      useFormValidation<TestFormData>(
        { name: '', email: '', age: 0 },
        { schema: TestSchema, onSubmit: vi.fn() }
      )
    );

    // Invalid name
    result.fields.name.setValue('a');
    expect(result.fields.name.error()).toBe('Name must be at least 2 characters');

    // Valid name
    result.fields.name.setValue('John');
    expect(result.fields.name.error()).toBeNull();
  });

  it('validates email format', () => {
    const { result } = renderHook(() =>
      useFormValidation<TestFormData>(
        { name: '', email: '', age: 0 },
        { schema: TestSchema, onSubmit: vi.fn() }
      )
    );

    // Invalid email
    result.fields.email.setValue('invalid');
    result.fields.email.validate();
    expect(result.fields.email.error()).toBe('Invalid email');

    // Valid email
    result.fields.email.setValue('test@example.com');
    result.fields.email.validate();
    expect(result.fields.email.error()).toBeNull();
  });

  it('tracks touched state', () => {
    const { result } = renderHook(() =>
      useFormValidation<TestFormData>(
        { name: '', email: '', age: 0 },
        { schema: TestSchema, onSubmit: vi.fn() }
      )
    );

    expect(result.fields.name.touched()).toBe(false);
    
    result.fields.name.setValue('test');
    expect(result.fields.name.touched()).toBe(true);
  });

  it('validates entire form on submit', async () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useFormValidation<TestFormData>(
        { name: '', email: '', age: 0 },
        { schema: TestSchema, onSubmit }
      )
    );

    const form = document.createElement('form');
    const event = new Event('submit', { bubbles: true, cancelable: true });
    
    await result.handleSubmit(event);
    
    expect(event.defaultPrevented).toBe(true);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(result.validationError()).toBeTruthy();
  });

  it('submits valid form data', async () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useFormValidation<TestFormData>(
        { name: 'John', email: 'john@example.com', age: 25 },
        { schema: TestSchema, onSubmit }
      )
    );

    const event = new Event('submit', { bubbles: true, cancelable: true });
    await result.handleSubmit(event);
    
    expect(onSubmit).toHaveBeenCalledWith({
      name: 'John',
      email: 'john@example.com',
      age: 25,
    });
  });

  it('resets form after successful submission', async () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useFormValidation<TestFormData>(
        { name: 'John', email: 'john@example.com', age: 25 },
        { schema: TestSchema, onSubmit, resetOnSubmit: true }
      )
    );

    result.fields.name.setValue('Jane');
    
    const event = new Event('submit', { bubbles: true, cancelable: true });
    await result.handleSubmit(event);
    
    expect(result.fields.name.value()).toBe('John'); // Reset to initial value
  });

  it('handles submission errors', async () => {
    const error = new Error('Submission failed');
    const onSubmit = vi.fn().mockRejectedValue(error);
    const onError = vi.fn();
    
    const { result } = renderHook(() =>
      useFormValidation<TestFormData>(
        { name: 'John', email: 'john@example.com', age: 25 },
        { schema: TestSchema, onSubmit, onError }
      )
    );

    const event = new Event('submit', { bubbles: true, cancelable: true });
    await result.handleSubmit(event);
    
    expect(result.validationError()).toBe('Submission failed');
    expect(onError).toHaveBeenCalledWith(error);
  });

  it('tracks submission state', async () => {
    const onSubmit = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
    const { result } = renderHook(() =>
      useFormValidation<TestFormData>(
        { name: 'John', email: 'john@example.com', age: 25 },
        { schema: TestSchema, onSubmit }
      )
    );

    expect(result.isSubmitting()).toBe(false);
    
    const event = new Event('submit', { bubbles: true, cancelable: true });
    const submitPromise = result.handleSubmit(event);
    
    expect(result.isSubmitting()).toBe(true);
    
    await submitPromise;
    
    expect(result.isSubmitting()).toBe(false);
  });

  it('manually sets field values and errors', () => {
    const { result } = renderHook(() =>
      useFormValidation<TestFormData>(
        { name: '', email: '', age: 0 },
        { schema: TestSchema, onSubmit: vi.fn() }
      )
    );

    result.setFieldValue('name', 'Test Name');
    expect(result.fields.name.value()).toBe('Test Name');
    
    result.setFieldError('name', 'Custom error');
    expect(result.fields.name.error()).toBe('Custom error');
  });

  it('validates form without submitting', () => {
    const { result } = renderHook(() =>
      useFormValidation<TestFormData>(
        { name: 'a', email: 'invalid', age: 10 },
        { schema: TestSchema, onSubmit: vi.fn() }
      )
    );

    const isValid = result.validateForm();
    
    expect(isValid).toBe(false);
    expect(result.errors()).toMatchObject({
      name: expect.any(String),
      email: expect.any(String),
      age: expect.any(String),
    });
  });

  it('resets form to initial values', () => {
    const { result } = renderHook(() =>
      useFormValidation<TestFormData>(
        { name: 'Initial', email: 'initial@example.com', age: 30 },
        { schema: TestSchema, onSubmit: vi.fn() }
      )
    );

    // Change values
    result.fields.name.setValue('Changed');
    result.fields.email.setValue('changed@example.com');
    result.setFieldError('name', 'Some error');
    
    // Reset
    result.reset();
    
    expect(result.fields.name.value()).toBe('Initial');
    expect(result.fields.email.value()).toBe('initial@example.com');
    expect(result.fields.name.error()).toBeNull();
    expect(result.fields.name.touched()).toBe(false);
  });
});
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { fetchJson } from '@/lib/fetch-json';
import type { TaskTemplate, TaskTemplateWithCreator } from '../types';
import type { CreateTemplateInput, UpdateTemplateInput } from '../schemas';
import { taskKeys, TASK_TEMPLATE_COLUMNS } from './keys';

/**
 * Fetch all task templates
 */
export function useTaskTemplates() {
  const supabase = createClient();

  return useQuery({
    queryKey: taskKeys.templates(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_templates')
        .select(TASK_TEMPLATE_COLUMNS)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TaskTemplateWithCreator[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch a single task template
 */
export function useTaskTemplate(templateId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: taskKeys.template(templateId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_templates')
        .select(TASK_TEMPLATE_COLUMNS)
        .eq('id', templateId)
        .single();

      if (error) throw error;
      return data as TaskTemplate;
    },
    enabled: !!templateId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Create a task template (council/admin only)
 */
export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTemplateInput) => {
      return fetchJson('/api/tasks/templates', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.templates() });
    },
  });
}

/**
 * Update a task template (council/admin only)
 */
export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateId,
      input,
    }: {
      templateId: string;
      input: UpdateTemplateInput;
    }) => {
      return fetchJson(`/api/tasks/templates/${templateId}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.templates() });
      queryClient.invalidateQueries({ queryKey: taskKeys.template(variables.templateId) });
    },
  });
}

/**
 * Delete a task template (council/admin only)
 */
export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      return fetchJson(`/api/tasks/templates/${templateId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.templates() });
    },
  });
}

/**
 * Create a task from a template (any member with organic_id)
 */
export function useCreateFromTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateId,
      sprintId,
      overrides,
    }: {
      templateId: string;
      sprintId?: string;
      overrides?: { title?: string; description?: string };
    }) => {
      return fetchJson(`/api/tasks/templates/${templateId}/instantiate`, {
        method: 'POST',
        body: JSON.stringify({ sprint_id: sprintId, ...overrides }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}
